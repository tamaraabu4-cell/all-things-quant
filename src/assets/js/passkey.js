// ==========================================================
// Heritage Edge: Face ID / Touch ID helpers (passkeys)
// Used by the passcode page (/unlock/) and the Devices page (/hub/devices/).
// The checking happens on Cloudflare (functions/_middleware.js).
//
// Safari only shows Face ID / Touch ID straight after a tap or click, so each
// page fetches its "puzzle" (challenge) in advance and keeps it fresh;
// the tap then goes straight to Face ID with nothing to wait for.
// ==========================================================

window.HubPasskey = (function () {
  function supported() {
    return !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.create);
  }

  // What to call it on this device
  function label() {
    var ua = navigator.userAgent;
    var touchScreen = navigator.maxTouchPoints > 1;
    if (/iPhone|iPad/.test(ua) || (/Macintosh/.test(ua) && touchScreen)) return "Face ID";
    if (/Macintosh/.test(ua)) return "Touch ID";
    if (/Windows/.test(ua)) return "Windows Hello";
    return "your fingerprint or face";
  }

  // A friendly name for the Devices list, e.g. "Mac · Safari"
  function deviceName() {
    var ua = navigator.userAgent;
    var touchScreen = navigator.maxTouchPoints > 1;
    var device = /iPhone/.test(ua) ? "iPhone"
      : /iPad/.test(ua) || (/Macintosh/.test(ua) && touchScreen) ? "iPad"
      : /Macintosh/.test(ua) ? "Mac"
      : /Android/.test(ua) ? "Android"
      : /Windows/.test(ua) ? "Windows PC" : "Device";
    var browser = /Edg\//.test(ua) ? "Edge"
      : /Firefox\//.test(ua) ? "Firefox"
      : /Chrome\//.test(ua) || /CriOS\//.test(ua) ? "Chrome"
      : /Safari\//.test(ua) ? "Safari" : "";
    return browser ? device + " (" + browser + ")" : device;
  }

  function toBytes(value) {
    var base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    var text = atob(base64 + "===".slice((base64.length + 3) % 4));
    return Uint8Array.from(text, function (c) { return c.charCodeAt(0); });
  }

  function toText(buffer) {
    var text = "";
    new Uint8Array(buffer).forEach(function (b) { text += String.fromCharCode(b); });
    return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function post(action, data) {
    return fetch("/api/passkey/" + action, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(data || {}),
    }).then(function (res) { return res.json(); });
  }

  function credentialList(list) {
    return (list || []).map(function (c) {
      return { type: "public-key", id: toBytes(c.id), transports: c.transports };
    });
  }

  // ----- Unlocking -----
  // Returns null if no device has been added for this address yet
  function prepareUnlock() {
    if (!supported()) return Promise.resolve(null);
    return post("login-options").then(function (result) {
      if (!result.ok || !result.available) return null;
      var o = result.publicKey;
      return {
        challenge: toBytes(o.challenge),
        rpId: o.rpId,
        timeout: o.timeout,
        userVerification: o.userVerification,
        allowCredentials: credentialList(o.allowCredentials),
      };
    }).catch(function () { return null; });
  }

  // Call straight from a tap/click, with options from prepareUnlock()
  function unlock(options, next) {
    return navigator.credentials.get({ publicKey: options }).then(function (cred) {
      return post("login", {
        id: toText(cred.rawId),
        clientDataJSON: toText(cred.response.clientDataJSON),
        authenticatorData: toText(cred.response.authenticatorData),
        signature: toText(cred.response.signature),
        next: next,
      });
    });
  }

  // ----- Adding this device -----
  function prepareAdd() {
    return post("register-options").then(function (result) {
      if (!result.ok) throw new Error(result.error || "failed");
      var o = result.publicKey;
      return {
        challenge: toBytes(o.challenge),
        rp: o.rp,
        user: { id: toBytes(o.user.id), name: o.user.name, displayName: o.user.displayName },
        pubKeyCredParams: o.pubKeyCredParams,
        authenticatorSelection: o.authenticatorSelection,
        excludeCredentials: credentialList(o.excludeCredentials),
        attestation: o.attestation,
        timeout: o.timeout,
      };
    });
  }

  // Call straight from a tap/click, with options from prepareAdd()
  function add(options) {
    return navigator.credentials.create({ publicKey: options }).then(function (cred) {
      var r = cred.response;
      if (!r.getPublicKey || !r.getAuthenticatorData) throw new Error("old-browser");
      return post("register", {
        id: toText(cred.rawId),
        clientDataJSON: toText(r.clientDataJSON),
        authenticatorData: toText(r.getAuthenticatorData()),
        publicKey: toText(r.getPublicKey()),
        alg: r.getPublicKeyAlgorithm(),
        transports: r.getTransports ? r.getTransports() : [],
        name: deviceName(),
      });
    });
  }

  return {
    supported: supported,
    label: label,
    prepareUnlock: prepareUnlock,
    unlock: unlock,
    prepareAdd: prepareAdd,
    add: add,
    list: function () { return post("list"); },
    remove: function (id) { return post("remove", { id: id }); },
  };
})();
