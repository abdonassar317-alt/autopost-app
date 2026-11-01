// AutoPost — demo mode (?demo): try the app as a brand-new client with sample data.
// Everything lives in memory in this tab: nothing is read from or written to GitHub, nothing is posted. Refresh = fresh start.
(() => {
"use strict";
if (!/[?&]demo\b/.test(location.search)) return;
const iso = (d, h, m = 0) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, m, 0, 0); return x.toISOString().replace(/\.\d+Z$/, "Z"); };
const FILES = {
  "config/brands.json": { brands: { default: { name: "Nour Café", secret_prefix: "",
    instagram: { user_id: "1789", username: "nourcafe.eg" }, facebook: { page_id: "1001", name: "Nour Café" },
    linkedin: { author: "urn:li:person:demo", name: "Nour Café", connected_at: iso(-10, 12) }, youtube: { privacy: "public", channel: "Nour Café", connected_at: iso(-10, 12) },
    tiktok: { name: "nourcafe", connected_at: iso(-10, 12) }, telegram_chat_id: "1", ig_to_fb: true } } },
};
const post = (id, p, s) => { FILES[`posts/${id}/post.json`] = { brand: "default", kind: "images", ...p }; if (s) FILES[`posts/${id}/status.json`] = s; };
const ok = (at, extra = {}) => ({ ok: true, at, ...extra });
post("d1", { label: "Latte art", time: iso(-6, 18), media: ["1.jpg", "2.jpg"], platforms: ["instagram", "facebook", "linkedin"], campaign: "November",
  caption: "Latte art Monday ☕\nEvery cup is drawn by hand.\n\n#coffee #cairo" },
  { instagram: ok(iso(-6, 18, 2), { url: "https://instagram.com", metrics: { likes: 184, comments: 22 } }), facebook: ok(iso(-6, 18, 2), { metrics: { reactions: 61 } }), linkedin: ok(iso(-6, 18, 3)) });
post("d2", { label: "New matcha", time: iso(-3, 13), media: ["2.jpg"], platforms: ["instagram", "youtube", "tiktok"], campaign: "November",
  caption: "Our matcha is here 🍵 Iced or hot?" },
  { instagram: ok(iso(-3, 13, 1), { metrics: { likes: 241, comments: 37 } }), youtube: ok(iso(-3, 13, 4), { metrics: { views: 1320, likes: 58 } }), tiktok: ok(iso(-3, 13, 1), { manual: true }) });
post("d3", { label: "Croissant Friday", time: iso(1, 9), media: ["3.jpg", "5.jpg"], platforms: ["instagram", "facebook", "tiktok"], campaign: "November",
  caption: "Fresh croissants every Friday from 8am 🥐", review_by: iso(20, 9) });
post("d4", { label: "Night menu", time: iso(2, 20), media: ["4.jpg"], platforms: ["instagram", "linkedin"], campaign: "Winter",
  caption: "Open till 2am this winter 🌙", needs_approval: true });
post("d5", { label: "Cold brew", time: iso(4, 17), media: ["6.jpg"], platforms: ["instagram", "youtube"], draft: true, caption: "Cold brew season is not over 😎" });
post("d6", { label: "Menu reveal", time: iso(6, 19), media: ["5.jpg", "1.jpg", "2.jpg"], platforms: ["instagram", "facebook", "linkedin", "youtube"], campaign: "Winter",
  caption: "The winter menu — swipe 👉\n1. Spiced latte\n2. Hot chocolate\n3. Matcha" });
FILES["config/ideas.json"] = { ideas: [{ id: "i1", text: "Behind the scenes: how we roast the beans", at: iso(-1, 10) }, { id: "i2", text: "Customer of the week", at: iso(-1, 10) }] };

const fs = {}; for (const [k, v] of Object.entries(FILES)) fs[k] = JSON.stringify(v, null, 2);
let head = "c0"; const commits = { c0: "t0" }, trees = { t0: { ...fs } }, blobs = {}; let n = 0;
const J = (o, st = 200) => new Response(o == null ? null : JSON.stringify(o), { status: st, headers: { "Content-Type": "application/json" } });
const real = window.fetch.bind(window);
window.fetch = async (url, opt = {}) => {
  const u = typeof url === "string" ? url : url.url; if (!u.startsWith("https://api.github.com")) return real(url, opt);
  const path = new URL(u).pathname.replace(/^\/repos\/[^/]+\/[^/]+/, ""), m = (opt.method || "GET").toUpperCase(), body = opt.body ? JSON.parse(opt.body) : {};
  const cur = trees[commits[head]];
  if (path.startsWith("/contents/")) { const p = decodeURIComponent(path.slice(10)); return p in cur ? new Response(cur[p], { status: 200 }) : J({ message: "Not Found" }, 404); }
  if (path.startsWith("/git/trees/") && m === "GET") return J({ tree: Object.keys(cur).map(p => ({ path: p, type: "blob", sha: "x" })) });
  if (path === "/git/blobs") { const id = "b" + (++n); blobs[id] = decodeURIComponent(escape(atob(body.content))); return J({ sha: id }, 201); }
  if (path === "/git/trees") { const id = "t" + (++n), t = { ...trees[body.base_tree] }; for (const e of body.tree) { if (e.sha === null) delete t[e.path]; else t[e.path] = blobs[e.sha]; } trees[id] = t; return J({ sha: id }, 201); }
  if (path === "/git/commits") { const id = "c" + (++n); commits[id] = body.tree; return J({ sha: id }, 201); }
  if (path.startsWith("/git/commits/")) return J({ tree: { sha: commits[path.split("/").pop()] } });
  if (path.startsWith("/git/ref")) { if (m === "PATCH") { head = body.sha; return J({ object: { sha: head } }); } return J({ object: { sha: head } }); }
  if (path.includes("/dispatches")) { setTimeout(() => window.toast && toast("Demo: nothing is really posted ✓"), 600); return new Response(null, { status: 204 }); }
  if (path.startsWith("/actions/runs") || path.includes("/runs")) return J({ workflow_runs: [] });
  return J({});
};
window.DEMO_CFG = { owner: "demo-client", repo: "autopost-data", branch: "main", token: "demo" };
window.DEMO_SECRETS = new Set(["IG_TOKEN", "META_TOKEN", "LINKEDIN_TOKEN", "LI_CLIENT_SECRET", "YT_REFRESH_TOKEN", "YT_CLIENT_SECRET", "TELEGRAM_BOT_TOKEN", "TT_REFRESH_TOKEN"]);
const img = { "1.jpg": 1, "2.jpg": 2, "3.jpg": 3, "4.jpg": 4, "5.jpg": 5, "6.jpg": 6 };
window.DEMO_RAW = async (pid, f) => `demo/${img[f] || 1}.jpg`;
window.AP_DEMO = true;
// never overwrite the real account settings saved on this device
const _set = Storage.prototype.setItem;
Storage.prototype.setItem = function (k, v) { if (this === localStorage && ["owner", "repo", "branch", "token", "ap_sk"].includes(k)) return; return _set.call(this, k, v); };
const ar = () => { try { return localStorage.getItem("ap_lang") === "ar"; } catch (e) { return false; } };
document.addEventListener("DOMContentLoaded", () => {
  const b = document.createElement("div");
  b.style.cssText = "position:sticky;top:0;z-index:30;background:#fbbf24;color:#1c1c1e;font:600 13px/1.4 system-ui,sans-serif;padding:8px 12px;display:flex;gap:10px;align-items:center;justify-content:center;text-align:center";
  b.setAttribute("data-i18n-skip", "");
  b.innerHTML = `<span>${ar() ? "وضع تجريبي — بتشوف الأداة زي عميل جديد. مفيش حاجة بتتنشر أو بتتحفظ." : "Demo mode — you're seeing AutoPost as a new client. Nothing is posted or saved."}</span><a href="./" style="color:inherit;text-decoration:underline;white-space:nowrap">${ar() ? "خروج" : "Exit"}</a>`;
  document.body.prepend(b);
});
})();
