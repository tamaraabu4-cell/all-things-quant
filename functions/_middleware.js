// ==========================================================
// Heritage Edge: the Knowledge Hub lock
//
// Cloudflare runs this file on its servers before sending any page.
// If someone asks for a Knowledge Hub page without a valid pass,
// they are sent to the passcode page instead, so the notes never
// leave Cloudflare unless the passcode was right.
//
// The passcode is NOT in this file. It lives in Cloudflare's settings:
//   HUB_PASSCODE    (secret)  your 6-digit passcode
//   SESSION_SECRET  (secret)  a long random string that signs the pass
//   HUB_KV          (KV binding) remembers wrong attempts for the lockout,
//                               and the devices allowed to use Face ID / Touch ID
// ==========================================================

const HUB_PATHS = ["/hub", "/study-guide"];  // everything under these is locked
const HUB_HOME = "/hub/";                    // where you land after unlocking
const UNLOCK_PAGE = "/unlock/";             // the passcode page
const UNLOCK_API = "/api/unlock";           // where the passcode form is sent
const LOCK_API = "/api/lock";               // visiting this signs you out
const PASSKEY_API = "/api/passkey/";        // Face ID / Touch ID (passkeys)
const COOKIE = "hub_pass";

const PASS_HOURS = 24;     // a correct passcode keeps you signed in this long
const MAX_TRIES = 5;       // wrong passcodes allowed within an hour...
const LOCK_MINUTES = 60;   // ...before the hub locks for this long
const MAX_DEVICES = 10;    // most Face ID / Touch ID devices you can add

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // 1. The passcode form was submitted
  if (url.pathname === UNLOCK_API) {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    return handleUnlock(request, env, url);
  }

  // 2. Sign out: delete the pass
  if (url.pathname === LOCK_API) {
    const res = redirect(url, "/");
    res.headers.append("Set-Cookie", `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
    return res;
  }

  // 3. Face ID / Touch ID: adding a device, or unlocking with one
  if (url.pathname.startsWith(PASSKEY_API)) {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    return handlePasskey(request, env, url, url.pathname.slice(PASSKEY_API.length));
  }

  // 4. A Knowledge Hub page: only send it with a valid pass
  if (isHubPath(url.pathname)) {
    if (await hasValidPass(request, env)) {
      const page = await next();
      const res = new Response(page.body, page);
      res.headers.set("Cache-Control", "private, no-store");   // never store notes in shared caches
      return res;
    }
    const wanted = url.pathname + url.search;
    return redirect(url, `${UNLOCK_PAGE}?next=${encodeURIComponent(wanted)}`, 302);
  }

  // 5. Everything else on the site is public
  return next();
}

// ---------- the passcode check ----------

async function handleUnlock(request, env, url) {
  // The passcode page asks for a short JSON answer (so it can play the unlock
  // animation before opening the hub). Without JavaScript, the browser posts
  // the form normally and gets sent back to a page instead.
  const wantsJson = (request.headers.get("Accept") || "").includes("application/json");

  if (!env.HUB_PASSCODE || !env.SESSION_SECRET || !env.HUB_KV) {
    if (wantsJson) return json({ ok: false, error: "setup" }, 500);
    return new Response("The Knowledge Hub lock isn't set up yet.", { status: 500 });
  }

  const form = await request.formData();
  const entered = String(form.get("pin") || "");
  const nextPath = safeNext(String(form.get("next") || ""));
  const reply = (outcome, cookie) => {
    const res = wantsJson ? json(outcome) : outcomeRedirect(url, nextPath, outcome);
    if (cookie) res.headers.append("Set-Cookie", cookie);
    return res;
  };

  // Locked after too many wrong tries?
  const now = Date.now();
  const state = (await env.HUB_KV.get("lockout", "json")) || { fails: 0, until: 0 };
  if (state.until > now) return reply({ ok: false, error: "locked", until: state.until });

  // Right passcode: clear the wrong-try count and give a pass
  if (/^\d{6}$/.test(entered) && (await samePasscode(entered, env))) {
    await env.HUB_KV.delete("lockout");
    return reply({ ok: true, next: nextPath }, await passCookie(env));
  }

  // Wrong passcode: count it, and lock the hub after too many
  const fails = state.fails + 1;
  if (fails >= MAX_TRIES) {
    const until = now + LOCK_MINUTES * 60 * 1000;
    await env.HUB_KV.put("lockout", JSON.stringify({ fails: 0, until }), {
      expirationTtl: LOCK_MINUTES * 60 + 60,
    });
    return reply({ ok: false, error: "locked", until });
  }
  await env.HUB_KV.put("lockout", JSON.stringify({ fails, until: 0 }), { expirationTtl: 60 * 60 });
  return reply({ ok: false, error: "wrong", left: MAX_TRIES - fails });
}

// Without JavaScript: go to the hub, or back to the passcode page with a message
function outcomeRedirect(url, nextPath, outcome) {
  if (outcome.ok) return redirect(url, outcome.next);
  const params = new URLSearchParams({ next: nextPath, error: outcome.error });
  if (outcome.left !== undefined) params.set("left", String(outcome.left));
  if (outcome.until) params.set("until", String(outcome.until));
  return redirect(url, `${UNLOCK_PAGE}?${params}`);
}

function json(data, status = 200, cookie) {
  const res = new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
  if (cookie) res.headers.append("Set-Cookie", cookie);
  return res;
}

// ---------- Face ID / Touch ID (passkeys) ----------
//
// How it works, in plain words:
// - "Add this device" (only once you're unlocked): your Mac or iPhone makes a
//   key pair. The private half never leaves the device and only comes out
//   after Face ID / Touch ID. The public half is saved here, in HUB_KV.
// - "Unlock with Face ID": Cloudflare sends a one-off random puzzle (the
//   challenge), your device signs it after Face ID, and Cloudflare checks the
//   signature with the saved public half. Right signature = a normal pass.
// Passkeys can't be guessed, so they still work during a passcode lockout.

const PASSKEY_STORE = "passkeys";

async function handlePasskey(request, env, url, action) {
  if (!env.HUB_PASSCODE || !env.SESSION_SECRET || !env.HUB_KV) return json({ ok: false, error: "setup" }, 500);
  // Only this site's own pages may use these addresses
  if (request.headers.get("Origin") !== url.origin) return json({ ok: false, error: "origin" }, 403);

  const rpId = siteIdFor(url.hostname);
  const devices = (await env.HUB_KV.get(PASSKEY_STORE, "json")) || [];
  const here = devices.filter((d) => d.rpId === rpId);   // keys only work on the address they were made on
  let body = {};
  try { body = await request.json(); } catch (e) {}

  // ----- Unlocking (no pass needed) -----
  if (action === "login-options") {
    if (!here.length) return json({ ok: true, available: false });
    return json({
      ok: true,
      available: true,
      publicKey: {
        challenge: await newChallenge("login", env),
        rpId,
        timeout: 120000,
        userVerification: "required",
        allowCredentials: here.map((d) => ({ type: "public-key", id: d.id, transports: d.transports })),
      },
    });
  }

  if (action === "login") {
    try {
      const device = here.find((d) => d.id === body.id);
      if (!device) return json({ ok: false, error: "unknown-device" });
      const client = readClientData(body.clientDataJSON);
      if (!(await clientDataOk(client.data, "webauthn.get", "login", url, env))) return json({ ok: false, error: "failed" });
      const authData = fromB64url(body.authenticatorData);
      if (!(await authDataOk(authData, rpId))) return json({ ok: false, error: "failed" });
      const signed = concatBytes(authData, new Uint8Array(await crypto.subtle.digest("SHA-256", client.bytes)));
      if (!(await signatureOk(device, fromB64url(body.signature), signed))) return json({ ok: false, error: "failed" });

      device.lastUsed = Date.now();
      await env.HUB_KV.put(PASSKEY_STORE, JSON.stringify(devices));
      return json({ ok: true, next: safeNext(String(body.next || "")) }, 200, await passCookie(env));
    } catch (e) {
      return json({ ok: false, error: "failed" });
    }
  }

  // ----- Everything below needs you to be unlocked already -----
  if (!(await hasValidPass(request, env))) return json({ ok: false, error: "signed-out" }, 401);

  if (action === "list") {
    return json({
      ok: true,
      devices: here.map(({ id, name, created, lastUsed }) => ({ id, name, created, lastUsed })),
    });
  }

  if (action === "register-options") {
    return json({
      ok: true,
      publicKey: {
        challenge: await newChallenge("register", env),
        rp: { name: "Heritage Edge", id: rpId },
        user: { id: b64url(new TextEncoder().encode("heritage-edge-owner")), name: "Tamara", displayName: "Tamara" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "preferred", userVerification: "required" },
        excludeCredentials: here.map((d) => ({ type: "public-key", id: d.id, transports: d.transports })),
        attestation: "none",
        timeout: 120000,
      },
    });
  }

  if (action === "register") {
    try {
      if (here.length >= MAX_DEVICES) return json({ ok: false, error: "too-many" });
      const client = readClientData(body.clientDataJSON);
      if (!(await clientDataOk(client.data, "webauthn.create", "register", url, env))) return json({ ok: false, error: "failed" });
      const authData = fromB64url(body.authenticatorData);
      if (!(await authDataOk(authData, rpId))) return json({ ok: false, error: "failed" });
      const id = String(body.id || "");
      if (!/^[A-Za-z0-9_-]{16,1400}$/.test(id) || attestedId(authData) !== id) return json({ ok: false, error: "failed" });
      if (devices.some((d) => d.id === id)) return json({ ok: false, error: "already-added" });
      const alg = Number(body.alg);
      if (alg !== -7 && alg !== -257) return json({ ok: false, error: "unsupported" });
      await importDeviceKey(body.publicKey, alg);   // fails if the key isn't valid

      devices.push({
        id,
        publicKey: String(body.publicKey),
        alg,
        rpId,
        name: String(body.name || "Device").replace(/[^\w ()\-.]/g, "").slice(0, 40) || "Device",
        transports: (Array.isArray(body.transports) ? body.transports : []).filter((t) => /^[a-z-]{2,20}$/.test(t)).slice(0, 6),
        created: Date.now(),
        lastUsed: 0,
      });
      await env.HUB_KV.put(PASSKEY_STORE, JSON.stringify(devices));
      return json({ ok: true });
    } catch (e) {
      return json({ ok: false, error: "failed" });
    }
  }

  if (action === "remove") {
    const left = devices.filter((d) => d.id !== body.id);
    await env.HUB_KV.put(PASSKEY_STORE, JSON.stringify(left));
    return json({ ok: true });
  }

  return json({ ok: false, error: "unknown" }, 404);
}

// theheritageedge.com and www. share one set of keys; any other address has its own
function siteIdFor(hostname) {
  return hostname === "theheritageedge.com" || hostname.endsWith(".theheritageedge.com") ? "theheritageedge.com" : hostname;
}

// A one-off puzzle that expires in 5 minutes. It's signed, so nobody can make their own.
async function newChallenge(purpose, env) {
  const nonce = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const text = `${purpose}.${Date.now() + 5 * 60 * 1000}.${nonce}`;
  const tag = await sign(text, `${env.SESSION_SECRET}:passkey`);
  return b64url(new TextEncoder().encode(`${text}.${tag}`));
}

async function challengeOk(challenge, purpose, env) {
  let text;
  try { text = new TextDecoder().decode(fromB64url(challenge)); } catch (e) { return false; }
  const [p, expires, nonce, tag, extra] = text.split(".");
  if (extra !== undefined || p !== purpose || !nonce || !tag || !(Number(expires) > Date.now())) return false;
  return safeEqual(tag, await sign(`${p}.${expires}.${nonce}`, `${env.SESSION_SECRET}:passkey`));
}

function readClientData(value) {
  const bytes = fromB64url(value);
  return { bytes, data: JSON.parse(new TextDecoder().decode(bytes)) };
}

// The browser writes down what was asked, by which site; check all of it
async function clientDataOk(data, type, purpose, url, env) {
  return data.type === type && data.origin === url.origin && (await challengeOk(String(data.challenge || ""), purpose, env));
}

// The device's note: made for this site, the person was present, and Face ID / Touch ID passed
async function authDataOk(authData, rpId) {
  if (authData.length < 37) return false;
  const expected = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rpId)));
  for (let i = 0; i < 32; i++) if (authData[i] !== expected[i]) return false;
  const flags = authData[32];
  return (flags & 0x01) !== 0 && (flags & 0x04) !== 0;
}

// The new key's ID, as written inside the device's note when it was made
function attestedId(authData) {
  if (!(authData[32] & 0x40) || authData.length < 55) return null;
  const length = (authData[53] << 8) | authData[54];
  return b64url(authData.slice(55, 55 + length));
}

function importDeviceKey(publicKey, alg) {
  const algorithm = alg === -7 ? { name: "ECDSA", namedCurve: "P-256" } : { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
  return crypto.subtle.importKey("spki", fromB64url(publicKey), algorithm, false, ["verify"]);
}

async function signatureOk(device, signature, signed) {
  const key = await importDeviceKey(device.publicKey, device.alg);
  if (device.alg === -7) {
    return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, derToRaw(signature), signed);
  }
  return crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, key, signature, signed);
}

// Devices write ECDSA signatures in one format (DER); Cloudflare's checker wants another (r and s side by side)
function derToRaw(der) {
  let i = 2;
  if (der[0] !== 0x30) throw new Error("bad signature");
  if (der[1] & 0x80) i = 2 + (der[1] & 0x7f);
  const out = new Uint8Array(64);
  for (let part = 0; part < 2; part++) {
    if (der[i] !== 0x02) throw new Error("bad signature");
    let length = der[i + 1];
    let start = i + 2;
    i = start + length;
    while (length > 32 && der[start] === 0) { start++; length--; }
    if (length > 32) throw new Error("bad signature");
    out.set(der.slice(start, start + length), part * 32 + (32 - length));
  }
  return out;
}

function b64url(bytes) {
  let text = "";
  for (const b of new Uint8Array(bytes)) text += String.fromCharCode(b);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(value) {
  const base64 = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const text = atob(base64 + "===".slice((base64.length + 3) % 4));
  return Uint8Array.from(text, (c) => c.charCodeAt(0));
}

function concatBytes(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

// ---------- the pass (a signed cookie) ----------

// The pass is "expiry time . signature". Without SESSION_SECRET nobody can
// make a signature that matches, so a pass can't be faked or extended.
// Changing your passcode also signs out every old pass.
async function hasValidPass(request, env) {
  if (!env.SESSION_SECRET || !env.HUB_PASSCODE) return false;
  const value = getCookie(request, COOKIE);
  if (!value) return false;
  const [expires, signature] = value.split(".");
  if (!expires || !signature || !(Number(expires) > Date.now())) return false;
  return safeEqual(signature, await sign(expires, passKey(env)));
}

async function passCookie(env) {
  const expires = String(Date.now() + PASS_HOURS * 60 * 60 * 1000);
  const pass = `${expires}.${await sign(expires, passKey(env))}`;
  return `${COOKIE}=${pass}; Path=/; Max-Age=${PASS_HOURS * 60 * 60}; HttpOnly; Secure; SameSite=Lax`;
}

function passKey(env) {
  return `${env.SESSION_SECRET}:${env.HUB_PASSCODE}`;
}

// Compares signatures of both passcodes, so the check takes the same time
// whether the first digit is right or not
async function samePasscode(entered, env) {
  const a = await sign(entered, env.SESSION_SECRET);
  const b = await sign(String(env.HUB_PASSCODE).trim(), env.SESSION_SECRET);
  return safeEqual(a, b);
}

async function sign(text, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(text));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------- small helpers ----------

// Catches every way of writing a hub address: /Hub, //hub, /%68ub, /Study-Guide...
function isHubPath(pathname) {
  let path = pathname;
  try { path = decodeURIComponent(pathname); } catch (e) {}
  path = path.replace(/\/+/g, "/").toLowerCase();
  return HUB_PATHS.some((hub) => path === hub || path.startsWith(hub + "/"));
}

// After unlocking, only ever send people back into the hub
function safeNext(path) {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return HUB_HOME;
  return isHubPath(path.split("?")[0]) ? path : HUB_HOME;
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

function redirect(url, path, status = 303) {
  return new Response(null, {
    status,
    headers: { Location: new URL(path, url.origin).toString(), "Cache-Control": "no-store" },
  });
}
