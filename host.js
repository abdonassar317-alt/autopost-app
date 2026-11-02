// AutoPost — accounts inside the app + hosted mode.
// A client signs up with name + e-mail + password (6-digit code by e-mail). No GitHub, no token on their side:
// their data lives in clients/<id>/ of the owner's private repo, reached through the owner's Apps Script gateway,
// which only ever lets them touch their own folder. The rest of the app keeps talking "GitHub" — this file answers
// those calls through the gateway (same trick as demo mode), so every screen works unchanged.
(() => {
"use strict";
const DEF_SERVER = "https://script.google.com/macros/s/AKfycbwrvyR0OptBwNgzHDNPCdv9ARgy_OUBzbMWxRCO00T85K_iQeqgOhNZ9H3CimophGEN_w/exec";
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };
const SERVER = ls.get("ap_server") || DEF_SERVER;
window.AP_SERVER = SERVER;
const L = (ar, en) => (window.apLang === "ar" ? ar : en);
const isDemo = /[?&]demo\b/.test(location.search);
const api = async (body) => { const r = await fetch(SERVER, { method: "POST", body: JSON.stringify(body) }); if (!r.ok) throw new Error("server " + r.status); return r.json(); };
window.apApi = api;

// ---------------------------------------------------------------- returning from a platform sign-in inside the small window
if (window.opener && window.opener !== window && /[?&]state=/.test(location.search)) {
  window.AP_POPUP = true;
  try { window.opener.postMessage({ apOAuth: location.search }, location.origin); } catch (e) {}
  document.addEventListener("DOMContentLoaded", () => { document.body.innerHTML = `<div style="font:16px system-ui;padding:40px;text-align:center">✓ ${L("تمام — راجع للتطبيق", "Done — back to the app")}</div>`; });
  setTimeout(() => window.close(), 400);
}

// ---------------------------------------------------------------- session
let sess = null; try { sess = JSON.parse(ls.get("ap_session") || "null"); } catch (e) {}
if (isDemo) sess = null;
const logout = () => { ls.set("ap_session", null); ls.set("ap_fc_" + (sess?.user?.id || ""), null); location.href = location.pathname; };

// ---------------------------------------------------------------- hosted mode: answer the app's GitHub calls through the gateway
if (sess?.s && sess?.user?.id) {
  const id = sess.user.id, BASE = `https://api.github.com/repos/${id}/hosted`;
  window.HOST = { user: sess.user, session: sess.s, logout };
  window.HOST_CFG = { owner: id, repo: "hosted", branch: "main", token: "hosted" };
  const real = window.fetch.bind(window);
  const J = (o, st = 200) => new Response(o == null ? null : JSON.stringify(o), { status: st, headers: { "Content-Type": "application/json" } });
  const ERR = { session: 401, not_found: 404, bad_path: 403, forbidden: 403, slow_down: 429, too_large: 413 };
  const MSG = {
    session: L("انتهت الجلسة — سجّل دخول تاني", "Session ended — please sign in again"), slow_down: L("استنى دقيقة وجرّب تاني", "Wait a minute and try again"),
    too_large: L("الملف كبير — الحد 30 ميجا في الحساب المُستضاف", "File too large — 30 MB max on hosted accounts"), not_ready: L("الخدمة مش جاهزة دلوقتي — جرّب بعد شوية", "Service not ready — try again later"),
  };
  async function g(op, extra = {}) {
    const r = await api({ action: "g", op, s: sess.s, ...extra });
    if (r.error === "session") { toastLater(MSG.session); setTimeout(logout, 1500); }
    return r;
  }
  window.HOST.g = g;
  const fail = (r) => J({ message: MSG[r.error] || r.msg || r.error }, ERR[r.error] || 400);
  const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", mp4: "video/mp4", mov: "video/quicktime", m4v: "video/mp4", webm: "video/webm", bin: "application/octet-stream" };
  const pend = {}; let n = 0;
  async function media(p) { // posts never change their files, so a fetched file is kept on this device
    const key = `https://media.autopost.local/${id}/${p}`;
    try { const c = await caches.open("ap-media"), hit = await c.match(key); if (hit) return hit; } catch (e) {}
    const r = await g("read", { path: p, bin: true }); if (r.error) return fail(r);
    const bin = Uint8Array.from(atob(r.b64), (c) => c.charCodeAt(0));
    const res = new Response(bin, { status: 200, headers: { "Content-Type": MIME[p.split(".").pop().toLowerCase()] || r.type || "application/octet-stream" } });
    try { (await caches.open("ap-media")).put(key, res.clone()); } catch (e) {}
    return res;
  }
  window.fetch = async (url, opt = {}) => {
    const u = typeof url === "string" ? url : url.url;
    if (!u.startsWith(BASE)) return real(url, opt);
    const U = new URL(u), path = decodeURIComponent(U.pathname.slice(new URL(BASE).pathname.length)), m = (opt.method || "GET").toUpperCase();
    const body = opt.body ? JSON.parse(opt.body) : {};
    let r;
    if (path === "" ) return J({ full_name: "AutoPost", private: true });
    if (path.startsWith("/contents/")) { const p = path.slice(10);
      if (/\.(jpe?g|png|webp|gif|mp4|mov|m4v|webm|bin)$/i.test(p)) return media(p);
      r = await g("read", { path: p }); return r.error ? fail(r) : new Response(r.text, { status: 200 }); }
    if (path.startsWith("/git/trees/") && m === "GET") { r = await g("tree"); return r.error ? fail(r) : J({ tree: r.tree }); }
    if (path === "/git/blobs") { r = await g("blob", { b64: body.content }); return r.error ? fail(r) : J({ sha: r.sha }, 201); }
    if (path.startsWith("/git/ref/")) return J({ object: { sha: "hosted" } });
    if (path.startsWith("/git/commits/")) return J({ tree: { sha: "hosted" } });
    if (path === "/git/trees") { const k = "t" + ++n; pend[k] = body.tree; return J({ sha: k }, 201); }
    if (path === "/git/commits") { const k = "c" + ++n; pend[k] = { tree: pend[body.tree], message: body.message }; return J({ sha: k }, 201); }
    if (path.startsWith("/git/refs/") && m === "PATCH") { const c = pend[body.sha]; if (!c) return J({ message: "lost commit" }, 422);
      r = await g("commit", { message: c.message, entries: c.tree.map((e) => ({ path: e.path, sha: e.sha })) }); return r.error ? fail(r) : J({ object: { sha: r.commit } }); }
    if (path === "/actions/secrets/public-key") { r = await g("pubkey"); return r.error ? fail(r) : J({ key: r.key, key_id: r.key_id }); }
    if (path.startsWith("/actions/secrets/") && m === "PUT") { r = await g("secret", { name: path.split("/").pop(), value: body.encrypted_value }); return r.error ? fail(r) : new Response(null, { status: 204 }); }
    if (path.startsWith("/actions/secrets")) { r = await g("secrets"); return r.error ? fail(r) : J({ total_count: r.secrets.length, secrets: r.secrets }); }
    if (path.endsWith("/dispatches")) { for (let i = 0; i < 3; i++) { r = await g("dispatch", { workflow: path.split("/")[3], inputs: body.inputs }); if (r.error !== "slow_down" || path.includes("publish.yml")) break; await new Promise((ok) => setTimeout(ok, 6000)); }
      return r.error ? fail(r) : new Response(null, { status: 204 }); }
    if (path.includes("/runs")) return J({ workflow_runs: [] });
    return J({ message: L("مش متاح في الحساب المُستضاف", "Not available on hosted accounts") }, 404);
  };
  // many files in one call (the list screen): the gateway reads them in parallel on its side
  window.readMany = async (paths) => { const out = {};
    for (let i = 0; i < paths.length; i += 100) { const r = await g("reads", { paths: paths.slice(i, i + 100) }); if (r.error) throw new Error(MSG[r.error] || r.error); Object.assign(out, r.files); }
    return out; };
}
function toastLater(t) { (window.toast ? toast : alert)(t); }

// ---------------------------------------------------------------- the sign-up / sign-in screen
async function kdf(pass, email) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode("autopost:" + email.trim().toLowerCase()), iterations: 150000, hash: "SHA-256" }, k, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const ERRS = () => ({
  bad_email: L("الإيميل مش مظبوط", "That e-mail doesn't look right"), bad_name: L("اكتب اسمك أو اسم البراند", "Enter your name or brand"),
  exists: L("الإيميل ده عليه حساب بالفعل — سجّل دخول", "This e-mail already has an account — sign in"), wrong_login: L("الإيميل أو كلمة السر غلط", "Wrong e-mail or password"),
  code_wrong: L("الكود غلط", "Wrong code"), code_expired: L("الكود خلص — اطلب كود جديد", "Code expired — ask for a new one"),
  too_many: L("طلبت أكواد كتير — استنى ساعة", "Too many codes — wait an hour"), locked: L("محاولات كتير — استنى 15 دقيقة", "Too many attempts — wait 15 minutes"),
  not_ready: L("التسجيل هيفتح قريب — كلمنا على واتساب", "Sign-ups open soon — message us on WhatsApp"), mail_quota: L("مش قادرين نبعت إيميلات النهارده — جرّب بكرة", "We can't send e-mails today — try tomorrow"),
  disabled: L("الحساب ده متوقف — كلمنا", "This account is paused — contact us"), bad_pass: L("كلمة السر مش مقبولة", "Password not accepted"),
});
const css = `#auth{position:fixed;inset:0;z-index:50;background:var(--bg);overflow:auto;display:flex;justify-content:center}
#auth .in{width:100%;max-width:400px;padding:max(40px,env(safe-area-inset-top)) 20px 40px}
#auth .brand{font-weight:700;font-size:17px;direction:ltr;display:flex;align-items:center;gap:8px}#auth .brand i{width:10px;height:10px;border-radius:3px;background:var(--ink);display:inline-block}
#auth h2{font-size:25px;margin:28px 0 4px;letter-spacing:-.2px}#auth .sub{color:var(--mut);font-size:14px;margin-bottom:18px}
#auth .lbl{margin-top:12px}#auth .go{width:100%;justify-content:center;margin-top:18px;padding:12px}
#auth .alt{display:flex;justify-content:space-between;gap:10px;margin-top:16px;font-size:14px}#auth .alt a{color:var(--ink);cursor:pointer}
#auth .err{color:var(--bad);font-size:13.5px;min-height:20px;margin-top:8px}#auth .foot{margin-top:34px;border-top:1px solid var(--line);padding-top:16px;font-size:13px;color:var(--mut);line-height:1.8}
#auth .foot a{color:var(--mut);cursor:pointer}#auth .code{letter-spacing:10px;font-size:24px;text-align:center;direction:ltr;font-weight:600}
#auth .pw{position:relative}#auth .pw button{position:absolute;inset-inline-end:8px;top:50%;transform:translateY(-50%);background:none;border:0;color:var(--mut);font:inherit;font-size:12.5px;cursor:pointer}
#auth .perks{margin:18px 0 0;padding:0;list-style:none;font-size:13.5px;color:var(--mut)}#auth .perks li{padding:3px 0}#auth .perks li:before{content:"✓ ";color:var(--ok)}`;
function screen(view = "signup", st = {}) {
  let el = document.getElementById("auth");
  if (!el) { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); el = document.createElement("div"); el.id = "auth"; el.setAttribute("data-i18n-skip", ""); document.body.appendChild(el); }
  document.documentElement.style.overflow = "hidden";
  const pw = (id, ph) => `<div class="pw"><input id="${id}" type="password" autocomplete="${view === "signin" ? "current-password" : "new-password"}" placeholder="${ph}" dir="ltr"><button type="button" data-eye="${id}">${L("إظهار", "Show")}</button></div>`;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const V = {
    signup: `<h2>${L("اعمل حسابك", "Create your account")}</h2><div class="sub">${L("3 شهور مجانًا — من غير فيزا ومن غير GitHub.", "3 months free — no card, no GitHub.")}</div>
      <div class="lbl">${L("الاسم أو اسم البراند", "Name or brand")}</div><input id="a-name" autocomplete="name">
      <div class="lbl">${L("الإيميل", "E-mail")}</div><input id="a-email" type="email" autocomplete="email" dir="ltr" value="${esc(st.email || "")}">
      <div class="lbl">${L("كلمة السر", "Password")} <span>${L("8 حروف على الأقل", "8+ characters")}</span></div>${pw("a-pass", "")}
      <div class="err" id="a-err"></div><button class="btn pri go" id="a-go">${L("اعمل الحساب", "Create account")}</button>
      <div class="alt"><span>${L("عندك حساب؟", "Have an account?")}</span><a data-v="signin">${L("سجّل دخول", "Sign in")}</a></div>
      <ul class="perks"><li>${L("انشر على إنستجرام وفيسبوك ولينكدإن ويوتيوب وتيك توك وأكتر", "Post to Instagram, Facebook, LinkedIn, YouTube, TikTok and more")}</li><li>${L("جدولة، تقويم، مسودات، وموافقة العميل", "Scheduling, calendar, drafts and client approval")}</li><li>${L("بعد الفترة المجانية 200 جنيه في الشهر", "200 EGP/month after the free period")}</li></ul>`,
    signin: `<h2>${L("أهلاً بيك تاني", "Welcome back")}</h2><div class="sub">${L("سجّل دخول بإيميلك", "Sign in with your e-mail")}</div>
      <div class="lbl">${L("الإيميل", "E-mail")}</div><input id="a-email" type="email" autocomplete="email" dir="ltr" value="${esc(st.email || "")}">
      <div class="lbl">${L("كلمة السر", "Password")}</div>${pw("a-pass", "")}
      <div class="err" id="a-err"></div><button class="btn pri go" id="a-go">${L("دخول", "Sign in")}</button>
      <div class="alt"><a data-v="forgot">${L("نسيت كلمة السر؟", "Forgot password?")}</a><a data-v="signup">${L("حساب جديد", "New account")}</a></div>`,
    code: `<h2>${L("اكتب الكود", "Enter the code")}</h2><div class="sub">${L("بعتنا كود من 6 أرقام على", "We sent a 6-digit code to")} <b dir="ltr">${esc(st.email)}</b>. ${L("بص في Spam لو مش لاقيه.", "Check Spam if you can't find it.")}</div>
      <input id="a-code" class="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••">
      ${st.reset ? `<div class="lbl">${L("كلمة السر الجديدة", "New password")}</div>${pw("a-pass", "")}` : ""}
      <div class="err" id="a-err"></div><button class="btn pri go" id="a-go">${st.reset ? L("غيّر كلمة السر", "Change password") : L("تأكيد", "Confirm")}</button>
      <div class="alt"><a id="a-resend">${L("ابعت كود تاني", "Send a new code")}</a><a data-v="${st.reset ? "signin" : "signup"}">${L("رجوع", "Back")}</a></div>`,
    forgot: `<h2>${L("نسيت كلمة السر", "Forgot password")}</h2><div class="sub">${L("هنبعتلك كود على إيميلك تغيّر بيه كلمة السر.", "We'll e-mail you a code to set a new password.")}</div>
      <div class="lbl">${L("الإيميل", "E-mail")}</div><input id="a-email" type="email" autocomplete="email" dir="ltr" value="${esc(st.email || "")}">
      <div class="err" id="a-err"></div><button class="btn pri go" id="a-go">${L("ابعت الكود", "Send code")}</button>
      <div class="alt"><span></span><a data-v="signin">${L("رجوع", "Back")}</a></div>`,
  };
  el.innerHTML = `<div class="in"><div class="brand"><i></i>AutoPost<span style="flex:1"></span><button id="a-lang" style="border:1px solid var(--line);background:var(--s);color:var(--ink);border-radius:8px;padding:2px 9px;font:inherit;font-size:12px;cursor:pointer">${window.apLang === "ar" ? "EN" : "ع"}</button></div>${V[view]}
    <div class="foot">${L("عايز تتفرج الأول؟", "Want to look around first?")} <a href="?demo">${L("جرّب الأداة ببيانات تجريبية", "Try it with sample data")}</a><br>
    <a id="a-gh">${L("متقدم: عندي GitHub وعايز بياناتي على حسابي", "Advanced: use my own GitHub")}</a></div></div>`;
  document.dir = window.apLang === "ar" ? "rtl" : "ltr";
  const $ = (s) => el.querySelector(s), err = (t) => ($("#a-err").textContent = t || "");
  el.querySelectorAll("[data-v]").forEach((a) => (a.onclick = () => screen(a.dataset.v, { email: $("#a-email")?.value || st.email })));
  el.querySelectorAll("[data-eye]").forEach((b) => (b.onclick = () => { const i = $("#" + b.dataset.eye); i.type = i.type === "password" ? "text" : "password"; b.textContent = i.type === "password" ? L("إظهار", "Show") : L("إخفاء", "Hide"); }));
  $("#a-lang").onclick = () => { ls.set("ap_lang", window.apLang === "ar" ? "en" : "ar"); location.reload(); };
  $("#a-gh").onclick = () => { ls.set("ap_mode", "github"); location.reload(); };
  const busy = async (fn) => { const b = $("#a-go"), t = b.textContent; b.disabled = true; b.textContent = L("لحظة…", "One moment…"); err("");
    try { await fn(); } catch (e) { err(ERRS()[e.message] || (/fetch|network|server/i.test(e.message) ? L("مفيش اتصال — اتأكد من النت وجرّب تاني", "No connection — check your internet and try again") : e.message)); }
    finally { if (document.body.contains(b)) { b.disabled = false; b.textContent = t; } } };
  const call = async (o) => { const r = await api(o); if (r.error) throw new Error(r.error); return r; };
  const done = (r) => { ls.set("ap_session", JSON.stringify({ s: r.session, user: r.user })); ls.set("ap_mode", null); location.href = location.pathname; };
  const go = () => busy(async () => {
    const email = ($("#a-email")?.value || st.email || "").trim(), pass = $("#a-pass")?.value || "";
    if (view === "signup") { const name = $("#a-name").value.trim(); if (!name) throw new Error("bad_name"); if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("bad_email");
      if (pass.length < 8) return err(L("كلمة السر 8 حروف على الأقل", "Password must be 8+ characters"));
      await call({ action: "signup", name, email, pass: await kdf(pass, email) }); return screen("code", { email }); }
    if (view === "signin") { try { done(await call({ action: "login", email, pass: await kdf(pass, email) })); } catch (e) { if (e.message === "unverified") return screen("code", { email }); throw e; } return; }
    if (view === "forgot") { if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("bad_email"); await call({ action: "forgot", email }); return screen("code", { email, reset: true }); }
    if (view === "code") { const code = $("#a-code").value.replace(/\D/g, ""); if (code.length !== 6) return err(L("الكود 6 أرقام", "The code is 6 digits"));
      if (st.reset) { if (pass.length < 8) return err(L("كلمة السر 8 حروف على الأقل", "Password must be 8+ characters")); return done(await call({ action: "reset", email, code, pass: await kdf(pass, email) })); }
      return done(await call({ action: "verify", email, code })); }
  });
  $("#a-go").onclick = go;
  el.querySelectorAll("input").forEach((i) => i.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); }));
  $("#a-code") && ($("#a-code").oninput = (e) => { if (e.target.value.replace(/\D/g, "").length === 6 && !st.reset) go(); });
  $("#a-resend") && ($("#a-resend").onclick = async () => { try { await call({ action: "resend", email: st.email, purpose: st.reset ? "reset" : "verify" }); err(""); toastLater(L("بعتنا كود جديد", "New code sent")); } catch (e) { err(ERRS()[e.message] || e.message); } });
  setTimeout(() => (el.querySelector("#a-code") || el.querySelector("input"))?.focus(), 50);
}
window.authScreen = screen;

// when to show it: brand-new visitor (no account on this device, no GitHub link, not the demo / a setup link / an OAuth return)
const hasGitHub = !!ls.get("token");
const returning = /[?&](code|state|error)=/.test(location.search) || /^#setup=/.test(location.hash);
if (!sess && !isDemo && !hasGitHub && !returning && ls.get("ap_mode") !== "github") {
  const show = () => screen(ls.get("ap_known") ? "signin" : "signup");
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", show) : show();
}

// ---------------------------------------------------------------- settings: account box (hosted) / turn-on box (owner)
function settingsBoxes() {
  const set = document.getElementById("settings"); if (!set) return;
  if (window.HOST) {
    ls.set("ap_known", "1");
    // things that only make sense with your own GitHub
    ["#wake-box", "#act-settings"].forEach((s) => document.querySelector(s)?.classList.add("hide"));
    document.getElementById("setup-link")?.closest(".box")?.classList.add("hide");
    document.getElementById("s-owner")?.closest(".box")?.classList.add("hide");
    if (!document.getElementById("acct-box")) {
      const b = document.createElement("div"); b.className = "box"; b.id = "acct-box"; b.setAttribute("data-i18n-skip", "");
      const u = HOST.user, esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";");
      b.innerHTML = `<div class="lbl">${L("حسابك", "Your account")}</div><p style="margin:2px 0"><b>${esc(u.name)}</b></p><p class="note" style="margin:0 0 10px" dir="ltr">${esc(u.email)}</p>
        <p class="hint">${L("على أي جهاز تاني: افتح AutoPost وسجّل دخول بنفس الإيميل.", "On any other device: open AutoPost and sign in with the same e-mail.")}</p>
        <div class="two"><button class="btn sm" id="acct-pw">${L("تغيير كلمة السر", "Change password")}</button><button class="btn sm" id="acct-out" style="color:var(--bad)">${L("تسجيل خروج", "Sign out")}</button></div>`;
      set.prepend(b);
      b.querySelector("#acct-out").onclick = logout;
      b.querySelector("#acct-pw").onclick = async () => { try { await api({ action: "forgot", email: u.email }); } catch (e) {} screen("code", { email: u.email, reset: true }); };
    }
    const who = document.getElementById("who"); if (who && who.textContent !== HOST.user.email) who.textContent = HOST.user.email;
    return;
  }
  if (String(window.cfg?.owner || (typeof cfg !== "undefined" ? cfg.owner : "")).toLowerCase() === "abdonassar317-alt" && !document.getElementById("host-box") && !isDemo) {
    const b = document.createElement("div"); b.className = "box"; b.id = "host-box"; b.setAttribute("data-i18n-skip", "");
    b.innerHTML = `<div class="lbl">${L("حسابات جوه التطبيق (للعملاء)", "Accounts inside the app (clients)")}</div>
      <p class="note">${L("العميل يسجّل بإيميل وباسورد بس، وبياناته تتحفظ في فولدر لوحده في الريبو الخاص بتاعك. إنت مش محتاج تعمل حاجة غير قبول الدفع.", "Clients sign up with e-mail + password only; their data lives in its own folder in your private repo. You only approve payments.")}</p>
      <div id="host-st" class="hint">…</div>
      <div id="host-k" class="f" style="display:none"><div class="lbl">${L("مفتاح صندوق المدفوعات (ADMIN_KEY)", "Payment-inbox key (ADMIN_KEY)")}</div><input id="host-kin" dir="ltr" autocomplete="off" placeholder="ADMIN_KEY"></div><div class="two f"><button class="btn sm pri" id="host-on">${L("تشغيل / تحديث", "Turn on / refresh")}</button><button class="btn sm" id="host-users">${L("الحسابات", "Accounts")}</button></div>`;
    const anchor = document.getElementById("sub-box"); if (anchor) anchor.after(b); else set.appendChild(b);
    const key = () => { const v = b.querySelector("#host-kin")?.value.trim(); if (v) ls.set("ap_inbox_key", v); return ls.get("ap_inbox_key") || ""; };
    if (!ls.get("ap_inbox_key")) b.querySelector("#host-k").style.display = "";
    const st = async () => { const el = b.querySelector("#host-st");
      try { const r = await api({ action: "hello" }); el.textContent = r.version ? (r.hosted ? L("✓ شغال — العملاء يقدروا يسجّلوا", "✓ On — clients can sign up") : L("مقفول — دوس «تشغيل»", "Off — press Turn on"))
        : L("محتاج تحدّث كود Apps Script الأول (tools/payments-inbox.gs) وتعمل New version", "Update the Apps Script code first (tools/payments-inbox.gs) and deploy a New version"); }
      catch (e) { el.textContent = L("مش قادر أوصل للسيرفر", "Can't reach the server"); } };
    st();
    b.querySelector("#host-on").onclick = async (ev) => { const btn = ev.target;
      if (!key()) { b.querySelector("#host-k").style.display = ""; return toast(L("الصق مفتاح صندوق المدفوعات في الخانة الأول", "Paste the payment-inbox key in the box first"), 7000); }
      btn.disabled = true;
      try {
        // the vault: clients' tokens are sealed to this key; the private half lives only in your GitHub Secrets (VAULT_KEY)
        let pub = ""; try { pub = JSON.parse(await readFile("config/vault.json")).public_key || ""; } catch (e) {}
        if (!pub) { const kp = nacl.box.keyPair(), b64 = (u8) => btoa(String.fromCharCode(...u8));
          await putSecret("VAULT_KEY", b64(kp.secretKey)); pub = b64(kp.publicKey);
          await commit([{ path: "config/vault.json", b64: utf8b64(JSON.stringify({ public_key: pub, note: "AutoPost hosted clients' secrets are sealed to this key; the private key is the VAULT_KEY repo secret" }, null, 2)) }], "vault key"); }
        const r = await api({ action: "admin_config", key: key(), gh_token: cfg.token, repo: `${cfg.owner}/${cfg.repo}`, vault_pub: pub });
        if (r.error) throw new Error(r.error === "unknown action" ? L("حدّث كود Apps Script الأول", "Update the Apps Script code first") : (r.msg || r.error));
        toast(L("✓ اتشغّل — رابط التسجيل للعملاء هو رابط التطبيق نفسه", "✓ On — clients sign up at the app link itself"), 7000); st();
      } catch (e) { toast(e.message, 8000); } finally { btn.disabled = false; } };
    b.querySelector("#host-users").onclick = async () => {
      if (!key()) return toast(L("الصق مفتاح صندوق المدفوعات الأول", "Paste the payment-inbox key first"));
      const r = await api({ action: "admin_users", key: key() }).catch((e) => ({ error: e.message }));
      if (r.error) return toast(r.error);
      const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";");
      sheet(`<div class="wz" data-i18n-skip><h3>${L("حسابات العملاء", "Client accounts")}</h3><div class="sub">${r.users.length} · ${L("المرجع في التحويل", "transfer reference")}: AP-&lt;id&gt;</div>
        ${r.users.map((u) => `<div class="nrow"><div><b>${esc(u.name)}</b> <small class="mut" dir="ltr">${esc(u.email)}</small><br><small class="mut">AP-${esc(u.id)} · ${new Date(u.created).toLocaleDateString()}${u.verified ? "" : " · " + L("لسه ماأكدش", "not verified")}${u.disabled ? " · " + L("متوقف", "paused") : ""}</small></div>
          <div class="na"><button class="btn sm" data-dis="${esc(u.id)}" data-v="${u.disabled ? "" : "1"}">${u.disabled ? L("تشغيل", "Resume") : L("إيقاف", "Pause")}</button></div></div>`).join("") || `<p class="hint">${L("مفيش حسابات لسه.", "No accounts yet.")}</p>`}
        <div class="nav"><button class="btn" onclick="closeSheet()">${L("قفل", "Close")}</button></div></div>`);
      document.querySelectorAll("[data-dis]").forEach((x) => (x.onclick = async () => { await api({ action: "admin_disable", key: key(), id: x.dataset.dis, disabled: !!x.dataset.v }); closeSheet(); b.querySelector("#host-users").click(); }));
    };
  }
}
// ---------------------------------------------------------------- hosted: connect platforms with one tap (the owner's developer apps)
function hostedConnect() {
  if (!window.HOST || window.AP_POPUP || typeof brands === "undefined") return;
  const wait = async (file, step, t0) => { for (let i = 0; i < 25; i++) { await new Promise((r) => setTimeout(r, 5000));
    try { const t = JSON.parse(await readFile(file)); if ((t.at || 0) >= t0 - 60000 && (!step || t.step === step)) return t; } catch (e) {} }
    throw new Error(L("استنى دقيقة وجرّب تاني", "Taking long — try again in a minute")); };
  const start = async (wf) => { const t0 = Date.now(); await gh(`${R()}/actions/workflows/${wf}/dispatches`, { method: "POST", body: JSON.stringify({ ref: cfg.branch, inputs: { code: "", redirect: YT_REDIRECT, prefix: pre(brands[curBrand]) } }) }); return t0; };
  const guard = (fn) => async () => { try { await fn(); } catch (e) { toast(e.message, 8000); } };
  window.wzLinkedIn = () => liGo(LI_CLIENT_ID_DEFAULT);
  window.wzYouTube = window.ytSwitch = guard(async () => {
    toast(L("بيجهّز ربط يوتيوب… ثواني", "Preparing YouTube sign-in…"), 30000);
    const t = await wait("state/youtube.json", "id", await start("youtube-connect.yml"));
    if (!t.client_id) throw new Error(L("ربط يوتيوب مش متاح دلوقتي", "YouTube connection isn't available right now"));
    sessionStorage.setItem("ytw_pending", JSON.stringify({ brand: curBrand }));
    toast(L("لو جوجل قال «التطبيق غير موثّق»: Advanced ← Go to AutoPost ← Allow", "If Google says “unverified app”: Advanced → Go to AutoPost → Allow"), 12000);
    oGo("https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({ client_id: t.client_id, redirect_uri: YT_REDIRECT, response_type: "code", access_type: "offline", prompt: "select_account consent", state: oState("ytw"), scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly" }));
  });
  window.wzTikTok = guard(async () => {
    toast(L("بيجهّز ربط تيك توك… ثواني", "Preparing TikTok sign-in…"), 30000);
    const t = await wait("state/tiktok.json", "id", await start("tiktok-connect.yml"));
    if (!t.client_key) throw new Error(L("ربط تيك توك مش متاح دلوقتي", "TikTok connection isn't available right now"));
    sessionStorage.setItem("tt_pending", JSON.stringify({ brand: curBrand }));
    oGo("https://www.tiktok.com/v2/auth/authorize/?" + new URLSearchParams({ client_key: t.client_key, scope: "user.info.basic,video.publish", response_type: "code", redirect_uri: YT_REDIRECT, state: oState("tt") }));
  });
  const _pin = window.wzPinterest;
  window.wzPinterest = guard(async () => { const b = brands[curBrand];
    if (hasSecret(b, "PIN_REFRESH_TOKEN") && b.pinterest?.boards?.length) return _pin();
    toast(L("بيجهّز ربط بنترست… ثواني", "Preparing Pinterest sign-in…"), 30000);
    const t = await wait("state/pinterest.json", "id", await start("pinterest-connect.yml"));
    if (!t.client_id) throw new Error(L("ربط بنترست للعملاء لسه مش متاح", "Pinterest isn't available for accounts yet"));
    sessionStorage.setItem("pin_pending", JSON.stringify({ brand: curBrand }));
    oGo("https://www.pinterest.com/oauth/?" + new URLSearchParams({ client_id: t.client_id, redirect_uri: YT_REDIRECT, response_type: "code", scope: "boards:read,pins:read,pins:write,user_accounts:read", state: oState("pin") }));
  });
  // Meta (Instagram / Facebook) lets other people's accounts connect only after Meta reviews the app
  const metaNote = (orig) => () => { sheet(`<div class="wz" data-i18n-skip><h3>${L("إنستجرام وفيسبوك", "Instagram & Facebook")}</h3>
    <div class="sub">${L("الربط بضغطة لحسابات العملاء مستني موافقة Meta على تطبيق AutoPost. لحد ما توافق، البوستات بتوصلك تذكير بالصور والكابشن جاهزين تنزلهم بضغطة.", "One-tap connection for client accounts is waiting for Meta to approve the AutoPost app. Until then you get a reminder with the photos and caption ready to post in one tap.")}</div>
    <div class="nav"><button class="btn pri" onclick="closeSheet()">${L("تمام", "OK")}</button><button class="btn" id="meta-adv">${L("متقدم: عندي توكن", "Advanced: I have a token")}</button></div></div>`); document.getElementById("meta-adv").onclick = () => orig(); };
  window.wzInstagram = () => wzFacebook(); // clients: Instagram comes with their Facebook Page (one tap)
}

document.addEventListener("DOMContentLoaded", () => { hostedConnect(); settingsBoxes(); setTimeout(settingsBoxes, 800); setTimeout(settingsBoxes, 3000); });
})();
