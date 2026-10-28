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
//   HUB_KV          (KV binding) remembers wrong attempts for the lockout
// ==========================================================

const HUB_PATH = "/study-guide";            // everything under here is locked
const HUB_HOME = "/study-guide/study-guide.html";
const UNLOCK_PAGE = "/unlock/";             // the passcode page
const UNLOCK_API = "/api/unlock";           // where the passcode form is sent
const LOCK_API = "/api/lock";               // visiting this signs you out
const COOKIE = "hub_pass";

const PASS_HOURS = 24;     // a correct passcode keeps you signed in this long
const MAX_TRIES = 5;       // wrong passcodes allowed within an hour...
const LOCK_MINUTES = 60;   // ...before the hub locks for this long

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

  // 3. A Knowledge Hub page: only send it with a valid pass
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

  // 4. Everything else on the site is public
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
    const expires = String(now + PASS_HOURS * 60 * 60 * 1000);
    const pass = `${expires}.${await sign(expires, passKey(env))}`;
    const cookie = `${COOKIE}=${pass}; Path=/; Max-Age=${PASS_HOURS * 60 * 60}; HttpOnly; Secure; SameSite=Lax`;
    return reply({ ok: true, next: nextPath }, cookie);
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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
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

// Catches every way of writing the hub address: /Study-Guide, //study-guide, %73tudy-guide...
function isHubPath(pathname) {
  let path = pathname;
  try { path = decodeURIComponent(pathname); } catch (e) {}
  path = path.replace(/\/+/g, "/").toLowerCase();
  return path === HUB_PATH || path.startsWith(HUB_PATH + "/");
}

// After unlocking, only ever send people back into the hub
function safeNext(path) {
  return /^\/study-guide\//i.test(path) ? path : HUB_HOME;
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