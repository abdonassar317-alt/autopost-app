// AutoPost — phase 2: autosave, drafts, per-platform captions, pre-schedule checks, calendar, "needs you now", setup link.
// Loaded after the main script; uses its globals (files, sel, items, brands, gh, commit, readFile, toast, sheet, ...).
(() => {
"use strict";
const DAY = 864e5;

// ------------------------------------------------------------------ platform rules (what each API really accepts)
// Sources: official API docs; kept conservative. "max" = images per post.
const RULES = {
  instagram: { cap: 2200, max: 10, ratio: [0.8, 1.91], video: [3, 900], note: "إنستجرام" },
  facebook:  { cap: 63206, max: 10, video: [1, 14400] },
  linkedin:  { cap: 3000, max: 20, video: [3, 1800] },
  youtube:   { cap: 5000, title: 100, video: [1, 43200], imagesToShort: true },
  pinterest: { cap: 500, max: 5, title: 100, noVideo: true },
  tiktok:    { cap: 2200, max: 35, video: [3, 600] },
  snapchat:  { max: 1, video: [5, 60] },
  x:         { cap: 280, max: 4, video: [1, 140] },
};
const NM = k => (typeof NAMES !== "undefined" && NAMES[k]) || k;

// read image size / video duration once per file
const metaCache = new WeakMap();
function fileMeta(f) {
  if (metaCache.has(f.file)) return metaCache.get(f.file);
  const pr = new Promise(res => {
    if (f.video) { const v = document.createElement("video"); v.preload = "metadata"; v.onloadedmetadata = () => res({ dur: v.duration, w: v.videoWidth, h: v.videoHeight }); v.onerror = () => res({}); v.src = f.url; }
    else { const i = new Image(); i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight }); i.onerror = () => res({}); i.src = f.url; }
  });
  metaCache.set(f.file, pr); return pr;
}

async function checks(plats) {
  const errs = [], warns = [];
  const caps = perCaps(plats), main = $("#c-caption").value;
  const vids = files.filter(f => f.video), imgs = files.filter(f => !f.video);
  const metas = await Promise.all(files.map(fileMeta));
  for (const k of plats) {
    const r = RULES[k]; if (!r) continue;
    const cap = caps[k] ?? main;
    if (r.cap && cap.length > r.cap) (k === "x" ? warns : errs).push(`${NM(k)}: الكابشن ${cap.length} حرف والحد ${r.cap}${k === "x" ? " — اكتبله كابشن أقصر من «كابشن مختلف لمنصة»" : " — قصّره أو اكتب كابشن مختلف للمنصة دي"}`);
    if (vids.length && r.noVideo) warns.push(`${NM(k)}: الفيديو لسه مش مدعوم أوتوماتيك — هيوصلك تذكير`);
    if (!vids.length && r.max && imgs.length > r.max) {
      if (k === "snapchat") warns.push(`سناب: بينزل صورة واحدة في المرة — هتنزل ${imgs.length} ستوري`);
      else (k === "instagram" ? errs : warns).push(`${NM(k)}: الحد ${r.max} صور، وانت مختار ${imgs.length}${k === "instagram" ? "" : ` — هينزل أول ${r.max} بس`}`);
    }
    if (k === "youtube" && !vids.length && imgs.length) warns.push("يوتيوب: هيتعمل Short من الصور تلقائي (كل صورة 3.5 ثانية)");
    if (k === "instagram" && !vids.length) metas.forEach((m, i) => { if (m.w && m.h) { const q = m.w / m.h; if (q < r.ratio[0] || q > r.ratio[1]) errs.push(`إنستجرام: صورة ${i + 1} مقاسها ${m.w}×${m.h} خارج النسب المسموحة (من 4:5 لـ 1.91:1) — قصّها 4:5 أو 1:1`); } });
    if (vids.length && r.video) { const d = metas[files.indexOf(vids[0])]?.dur; if (d && (d < r.video[0] || d > r.video[1])) errs.push(`${NM(k)}: الفيديو ${Math.round(d)} ثانية — المسموح من ${r.video[0]} لـ ${r.video[1]} ثانية`); }
  }
  if (vids[0]) { const m = metas[files.indexOf(vids[0])]; if (m?.w && m.w > m.h && plats.some(k => ["tiktok", "snapchat"].includes(k))) warns.push("الفيديو عرضي — تيك توك وسناب بيفضّلوا الطولي 9:16"); }
  if (!main.trim() && !Object.keys(caps).length) warns.push("مفيش كابشن");
  if (/https?:\/\//.test(main) && plats.includes("instagram")) warns.push("إنستجرام: اللينكات في الكابشن مش بتبقى قابلة للضغط");
  // consistency check: "في البوست ده (N صور)" vs actual count
  const m = main.match(/\((\d+)\s*صور/); if (m && imgs.length && +m[1] !== imgs.length) warns.push(`الكابشن بيقول ${m[1]} صور والمختار ${imgs.length} — راجعه`);
  const listN = (main.match(/^\d+\.\s/gm) || []).length; if (listN && imgs.length > 1 && listN !== imgs.length) warns.push(`الكابشن فيه ${listN} نقاط والصور ${imgs.length} — اتأكد إنهم متطابقين (الفحص الآلي ممكن يغلط)`);
  return { errs, warns };
}
let checkT;
async function renderChecks() {
  const box = $("#c-check"); if (!box) return;
  const plats = PLATS.map(p => p[0]).filter(k => sel.has(k));
  if (!files.length || !plats.length) { box.classList.add("hide"); return; }
  const { errs, warns } = await checks(plats);
  box.classList.toggle("hide", !errs.length && !warns.length);
  box.innerHTML = `<div class="lbl">مراجعة قبل الجدولة</div>` +
    errs.map(e => `<div class="ck bad">✕ ${esc(e)}</div>`).join("") + warns.map(e => `<div class="ck warn">! ${esc(e)}</div>`).join("") +
    (errs.length ? `<p class="hint">لازم تصلّح اللي بعلامة ✕ قبل الجدولة. تقدر تحفظها مسودة.</p>` : "");
}
window.checkBlock = async plats => { const { errs } = await checks(plats); return errs.length ? errs[0] : ""; };
const scheduleChecks = () => { clearTimeout(checkT); checkT = setTimeout(renderChecks, 300); };

// ------------------------------------------------------------------ per-platform captions
const perCap = {};
window.setPerCap = (k, v) => { perCap[k] = v; renderPer(); const d = $("#c-per-wrap"); if (d) d.open = true; scheduleChecks(); autosave(); };
window.perCaps = plats => { const o = {}; for (const k of plats) if ((perCap[k] || "").trim()) o[k] = perCap[k]; return o; };
function renderPer() {
  const el = $("#c-per"); if (!el) return;
  const plats = PLATS.map(p => p[0]).filter(k => sel.has(k));
  el.innerHTML = plats.map(k => `<div class="lbl f">${esc(NM(k))} <span>${RULES[k]?.cap ? `حد ${RULES[k].cap}` : ""}</span></div><textarea data-pc="${k}" rows="3" placeholder="فاضي = نفس الكابشن الأساسي">${esc(perCap[k] || "")}</textarea>`).join("") || '<p class="hint">اختار المنصات الأول</p>';
  el.querySelectorAll("textarea").forEach(t => t.oninput = () => { perCap[t.dataset.pc] = t.value; scheduleChecks(); autosave(); });
}

// ------------------------------------------------------------------ autosave (IndexedDB, incl. files) — survives closing the app / no internet
const DB = new Promise(res => { try { const r = indexedDB.open("autopost", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } });
const kv = async (op, key, val) => { const db = await DB; if (!db) return null; return new Promise(res => { const tx = db.transaction("kv", op === "get" ? "readonly" : "readwrite"), st = tx.objectStore("kv"); const r = op === "get" ? st.get(key) : op === "del" ? st.delete(key) : st.put(val, key); r.onsuccess = () => res(r.result); r.onerror = () => res(null); }); };
let saveT, restoring = false;
function autosave() {
  if (restoring) return; clearTimeout(saveT);
  saveT = setTimeout(() => {
    const empty = !files.length && !$("#c-caption").value.trim();
    if (empty) return kv("del", "compose");
    kv("put", "compose", { at: Date.now(), caption: $("#c-caption").value, title: $("#c-title").value, date: $("#c-date").value, hour: $("#c-hour").value,
      brand: $("#c-brand").value, sel: [...sel], perCap: { ...perCap }, files: files.map(f => ({ name: f.file.name, type: f.file.type, blob: f.file })) });
  }, 700);
}
async function restore() {
  const d = await kv("get", "compose"); if (!d || files.length || $("#c-caption").value.trim()) return;
  restoring = true;
  $("#c-caption").value = d.caption || ""; $("#c-title").value = d.title || ""; if (d.date) $("#c-date").value = d.date; if (d.hour) $("#c-hour").value = d.hour;
  if (d.brand && brands[d.brand]) $("#c-brand").value = d.brand;
  sel.clear(); (d.sel || []).forEach(k => sel.add(k)); Object.assign(perCap, d.perCap || {});
  for (const f of d.files || []) { const file = new File([f.blob], f.name, { type: f.type }); files.push({ file, url: URL.createObjectURL(file), video: f.type.startsWith("video") }); }
  $("#c-caption").dispatchEvent(new Event("input")); renderThumbs(); renderChips(); renderPer(); restoring = false; scheduleChecks();
  const when = new Date(d.at).toLocaleString("ar-EG", { weekday: "long", hour: "2-digit", minute: "2-digit" });
  toast(`رجّعتلك آخر حاجة كنت بتكتبها (${when})`, 5000);
}
window.afterSaved = () => { kv("del", "compose"); for (const k in perCap) delete perCap[k]; renderPer(); scheduleChecks(); };

// hook into the main script without rewriting it
const _rt = window.renderThumbs; window.renderThumbs = renderThumbs = function () { _rt(); scheduleChecks(); autosave(); };
const _rc = window.renderChips; renderChips = function () { _rc(); document.querySelectorAll("#c-plats .chip").forEach(ch => { const o = ch.onclick; ch.onclick = () => { o(); renderPer(); scheduleChecks(); autosave(); }; }); renderPer(); };
["#c-caption", "#c-title", "#c-date", "#c-hour", "#c-brand"].forEach(s => $(s)?.addEventListener("input", () => { autosave(); scheduleChecks(); }));
$("#c-brand")?.addEventListener("change", autosave);

// ------------------------------------------------------------------ drafts & duplicates
window.schedDraft = id => { const x = items.find(i => i.id === id); closeSheet();
  if (!x.p.media?.length) return toast("المسودة دي من غير صور — اختار «نسخة في بوست جديد» وضيف الصور", 7000);
  sheet(`<div style="padding:10px"><div class="lbl">ميعاد النشر</div><div class="two"><input type="date" id="d-d"><input type="time" id="d-h" value="20:00"></div>
   <div class="two" style="margin-top:12px"><button class="btn pri" id="d-ok" style="justify-content:center">جدولة</button><button class="btn" onclick="closeSheet()">إلغاء</button></div></div>`);
  $("#d-d").valueAsDate = new Date(Date.now() + DAY);
  $("#d-ok").onclick = () => { const nd = new Date(`${$("#d-d").value}T${$("#d-h").value}`); if (isNaN(nd) || nd < Date.now()) return toast("اختار ميعاد جاي");
    closeSheet(); updatePost(id, p => { delete p.draft; p.time = nd.toISOString().replace(/\.\d+Z$/, "Z"); }, "schedule draft " + id).catch(e => toast(e.message)); };
};
window.dupPost = async id => { closeSheet(); const x = items.find(i => i.id === id); if (!x) return;
  try { toast("بيجهّز النسخة…", 20000); files.length = 0;
    for (const m of x.p.media) { const r = await fetch(`https://api.github.com${R()}/contents/posts/${id}/${m}?ref=${cfg.branch}`, { headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github.raw" }, cache: "no-store" });
      const b = await r.blob(); const file = new File([b], m, { type: b.type || (m.endsWith(".mp4") ? "video/mp4" : "image/jpeg") }); files.push({ file, url: URL.createObjectURL(file), video: file.type.startsWith("video") }); }
    $("#c-caption").value = x.p.caption || ""; $("#c-caption").dispatchEvent(new Event("input"));
    sel.clear(); x.p.platforms.forEach(k => sel.add(k)); Object.assign(perCap, x.p.captions || {});
    if (brands[x.p.brand]) $("#c-brand").value = x.p.brand;
    tab("compose"); renderThumbs(); renderChips(); toast("النسخة جاهزة — عدّل وجدول", 4000);
  } catch (e) { toast(e.message, 8000); } };

// ------------------------------------------------------------------ "needs you now"
const finishedP = (x, k) => { const v = x.s[k]; return v && (v.ok || v.skipped); };
window.renderNow = () => {
  const el = $("#now-panel"); if (!el) return;
  const now = Date.now(), rows = [];
  if (typeof authErr !== "undefined" && authErr) rows.push({ c: "bad", t: authErr, a: `<button class="btn sm" onclick="tab('settings')">الإعدادات</button>` });
  for (const x of items) {
    if (x.p.draft) continue;
    for (const k of x.p.platforms) { const v = x.s[k];
      if (v?.needs_action) rows.push({ c: "bad", t: `${NM(k)}: «${x.p.label || (x.p.caption || "").slice(0, 30)}» محتاج تدخل — ${String(v.error || "").slice(0, 90)}`, a: `<button class="btn sm" onclick="tab('brands')">الحسابات</button><button class="btn sm" onclick="retry('${x.id}')">جرّب تاني</button>` });
      else if (v && !v.ok && !v.skipped && v.attempts >= 3) rows.push({ c: "bad", t: `${NM(k)}: فشل 3 مرات — ${String(v.error || "").slice(0, 90)}`, a: `<button class="btn sm" onclick="retry('${x.id}')">جرّب تاني</button>` }); }
    const late = now - new Date(x.p.time) > 45 * 60e3 && x.p.platforms.some(k => !finishedP(x, k) && !(x.s[k] && !x.s[k].ok));
    if (late && now - new Date(x.p.time) < DAY) rows.push({ c: "warn", t: `«${x.p.label || (x.p.caption || "").slice(0, 30)}» ميعاده عدّى ولسه ماتنشرش — GitHub ممكن يتأخر شوية`, a: `<button class="btn sm" onclick="runNow().then(()=>toast('اتطلب النشر دلوقتي'))">انشر دلوقتي</button>` });
    const m = window.manualPending ? manualPending(x) : []; if (m.length) rows.push({ c: "warn", t: `وقت النشر بإيدك على ${m.map(NM).join("، ")}: «${x.p.label || (x.p.caption || "").slice(0, 30)}»`, a: manualBtn(x) });
  }
  const b = brands[curBrand] || {}; const c = b.linkedin?.connected_at; if (c && hasSecret(b, "LINKEDIN_TOKEN")) { const left = Math.round((new Date(c).getTime() + 59 * DAY - now) / DAY); if (left <= 7) rows.push({ c: left <= 0 ? "bad" : "warn", t: left <= 0 ? "لينكدإن: الربط انتهى" : `لينكدإن: الربط بيخلص بعد ${left} يوم`, a: `<button class="btn sm" onclick="liRenew()">جدّد</button>` }); }
  const drafts = items.filter(x => x.p.draft).length; if (drafts) rows.push({ c: "", t: `عندك ${drafts} مسودة`, a: `<button class="btn sm" onclick="document.querySelector('#l-seg [data-v=drafts]').click()">افتحها</button>` });
  const next = items.filter(x => !x.p.draft && new Date(x.p.time) > now).sort((a, b) => new Date(a.p.time) - new Date(b.p.time))[0];
  el.innerHTML = `<div class="box now"><div class="lbl">محتاجك دلوقتي ${rows.length ? `<span>${rows.length}</span>` : ""}</div>` +
    (rows.length ? rows.map(r => `<div class="nrow ${r.c}"><div>${esc(r.t)}</div><div class="na">${r.a || ""}</div></div>`).join("") : `<p class="hint">كله تمام ✓${next ? ` — الجاي: ${new Date(next.p.time).toLocaleString("ar-EG", { weekday: "long", hour: "2-digit", minute: "2-digit" })}` : ""}</p>`) + `</div>`;
};

// ------------------------------------------------------------------ calendar (month) with drag & drop + undo
let calMonth = new Date(); calMonth.setDate(1);
const dkey = d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
window.renderCal = () => {
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const first = new Date(y, m, 1), start = new Date(first); start.setDate(1 - ((first.getDay() + 1) % 7)); // weeks start Saturday
  const byDay = {}; for (const x of items) { const d = new Date(x.p.time); (byDay[dkey(d)] ||= []).push(x); }
  let h = `<div class="calh"><button class="btn sm" id="cal-p">‹</button><b>${first.toLocaleDateString("ar-EG", { month: "long", year: "numeric" })}</b><button class="btn sm" id="cal-n">›</button></div><div class="cal">`;
  ["سبت", "حد", "اتنين", "تلات", "أربع", "خميس", "جمعة"].forEach(d => h += `<div class="cwd">${d}</div>`);
  const today = dkey(new Date());
  const cells = Math.ceil(((first - start) / DAY + new Date(y, m + 1, 0).getDate()) / 7) * 7;
  for (let i = 0; i < cells; i++) { const d = new Date(start); d.setDate(start.getDate() + i); const k = dkey(d);
    const its = (byDay[k] || []).sort((a, b) => new Date(a.p.time) - new Date(b.p.time));
    h += `<div class="cd${d.getMonth() !== m ? " out" : ""}${k === today ? " today" : ""}" data-day="${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}"><span class="cn">${d.getDate()}</span>` +
      its.map(x => { const done = x.p.platforms.every(k2 => finishedP(x, k2)), fail = x.p.platforms.some(k2 => x.s[k2] && !x.s[k2].ok && !x.s[k2].skipped);
        return `<div class="cp${x.p.draft ? " dr" : done ? " ok" : fail ? " bad" : ""}" draggable="${!done}" data-id="${x.id}" title="${esc(x.p.label || x.p.caption || "")}">${new Date(x.p.time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} ${esc((x.p.label || x.p.caption || "").slice(0, 18))}</div>`; }).join("") + `</div>`; }
  $("#l-items").innerHTML = h + `</div><p class="hint">اسحب البوست ليوم تاني عشان تغيّر ميعاده (نفس الساعة). على الموبايل: دوس عليه.</p>`;
  $("#cal-p").onclick = () => { calMonth.setMonth(m - 1); renderCal(); }; $("#cal-n").onclick = () => { calMonth.setMonth(m + 1); renderCal(); };
  document.querySelectorAll(".cp").forEach(el => { el.ondragstart = e => e.dataTransfer.setData("text", el.dataset.id); el.onclick = () => menu(el.dataset.id); });
  document.querySelectorAll(".cd").forEach(el => { el.ondragover = e => { e.preventDefault(); el.classList.add("over"); }; el.ondragleave = () => el.classList.remove("over");
    el.ondrop = e => { e.preventDefault(); el.classList.remove("over"); moveTo(e.dataTransfer.getData("text"), el.dataset.day); }; });
};
window.moveTo = (id, day) => moveTo(id, day);
function moveTo(id, day) {
  const x = items.find(i => i.id === id); if (!x) return;
  const old = new Date(x.p.time), [Y, M, D] = day.split("-").map(Number), nd = new Date(old); nd.setFullYear(Y, M - 1, D);
  if (dkey(nd) === dkey(old)) return; if (nd < Date.now() && !x.p.draft) return toast("مينفعش تنقله لميعاد فات");
  const label = nd.toLocaleString("ar-EG", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  sheet(`<div style="padding:12px"><div class="lbl">تنقل البوست لـ ${label}؟</div><div class="two" style="margin-top:12px"><button class="btn pri" id="mv-ok" style="justify-content:center">نقل</button><button class="btn" onclick="closeSheet()">إلغاء</button></div></div>`);
  $("#mv-ok").onclick = async () => { closeSheet(); const prev = x.p.time;
    try { await updatePost(id, p => p.time = nd.toISOString().replace(/\.\d+Z$/, "Z"), "move " + id); renderCal(); undoToast("اتنقل", async () => { await updatePost(id, p => p.time = prev, "undo move " + id); renderCal(); }); }
    catch (e) { toast(e.message, 8000); } };
}
function undoToast(msg, fn) { const t = $("#toast"); toast(msg, 7000); const b = document.createElement("button"); b.textContent = "تراجع"; b.className = "btn sm"; b.style.marginInlineStart = "10px";
  b.onclick = () => { t.style.display = "none"; fn().catch(e => toast(e.message)); }; t.appendChild(b); }

// ------------------------------------------------------------------ setup link for a new device (token encrypted with a passphrase; nothing leaves your devices)
const b64u = a => btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const ub64 = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
async function keyFrom(pass, salt) { const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]); }
$("#setup-link") && ($("#setup-link").onclick = () => {
  if (!cfg.token) return toast("اربط GitHub الأول");
  sheet(`<div class="wz"><h3>رابط إعداد لجهاز جديد</h3><div class="sub">اختار كلمة سر (8 حروف على الأقل). هتكتبها على الجهاز التاني. الرابط من غيرها مالوش لازمة.</div>
   <input id="sl-p" type="password" autocomplete="new-password" placeholder="كلمة سر"><div class="nav"><button class="btn pri" id="sl-ok">اعمل الرابط</button><button class="btn" onclick="closeSheet()">إلغاء</button></div></div>`);
  $("#sl-ok").onclick = async () => { const pass = $("#sl-p").value; if (pass.length < 8) return toast("كلمة السر 8 حروف على الأقل");
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(JSON.stringify({ owner: cfg.owner, repo: cfg.repo, branch: cfg.branch, token: cfg.token }));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await keyFrom(pass, salt), data));
    const link = `${location.origin}${location.pathname}#setup=${b64u(salt)}.${b64u(iv)}.${b64u(ct)}`;
    try { await navigator.clipboard.writeText(link); } catch (e) {}
    sheet(`<div class="wz"><h3>الرابط اتنسخ ✓</h3><div class="sub">ابعته لنفسك (واتساب/تليجرام) وافتحه على الجهاز التاني، واكتب كلمة السر. ماتبعتش كلمة السر في نفس الرسالة.</div>
     <textarea readonly dir="ltr" rows="3" style="font-size:11px">${esc(link)}</textarea>${navigator.share ? '<div class="nav"><button class="btn pri" id="sl-sh">مشاركة</button></div>' : ""}</div>`);
    $("#sl-sh") && ($("#sl-sh").onclick = () => navigator.share({ url: link }).catch(() => {})); };
});
async function setupFromLink() {
  const m = location.hash.match(/^#setup=([\w-]+)\.([\w-]+)\.([\w-]+)$/); if (!m) return;
  sheet(`<div class="wz"><h3>إعداد الجهاز ده</h3><div class="sub">اكتب كلمة السر اللي عملت بيها الرابط</div><input id="su-p" type="password" autocomplete="off">
   <div class="nav"><button class="btn pri" id="su-ok">تمام</button><button class="btn" onclick="closeSheet();history.replaceState(null,'',location.pathname)">إلغاء</button></div></div>`);
  $("#su-ok").onclick = async () => {
    try { const k = await keyFrom($("#su-p").value, ub64(m[1])); const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ub64(m[2]) }, k, ub64(m[3]));
      const c = JSON.parse(new TextDecoder().decode(pt)); for (const [kk, v] of Object.entries(c)) store.set(kk, v);
      history.replaceState(null, "", location.pathname); toast("الجهاز اتظبط ✓", 3000); setTimeout(() => location.reload(), 900);
    } catch (e) { toast("كلمة السر غلط"); } };
}

// ------------------------------------------------------------------ styles + start
const css = document.createElement("style");
css.textContent = `.ck{font-size:13px;padding:6px 0;border-bottom:1px solid var(--line)}.ck.bad{color:var(--bad)}.ck.warn{color:#9a6700}
.now .lbl span{background:var(--bad);color:#fff;border-radius:999px;padding:0 8px;font-size:12px}.nrow{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:8px 0;border-top:1px solid var(--line);font-size:13.5px}
.nrow.bad{color:var(--bad)}.nrow.warn{color:#9a6700}.nrow .na{display:flex;gap:6px;flex-shrink:0}
.calh{display:flex;align-items:center;justify-content:space-between;margin:6px 0 10px}.cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
.cwd{font-size:11.5px;color:var(--mut);text-align:center;padding:4px 0}.cd{min-height:92px;background:var(--s);border:1px solid var(--line);border-radius:10px;padding:4px;overflow:hidden}
.cd.out{opacity:.45}.cd.today{border-color:var(--ink)}.cd.over{background:#eef4ff}.cn{font-size:11.5px;color:var(--mut)}
.cp{font-size:11px;background:#fff;border:1px solid var(--line);border-inline-start:3px solid #888;border-radius:6px;padding:2px 4px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:grab}
.cp.ok{border-inline-start-color:var(--ok)}.cp.bad{border-inline-start-color:var(--bad)}.cp.dr{border-style:dashed}
@media(max-width:600px){.cd{min-height:64px}.cp{font-size:10px}}
#act-compose{display:grid;grid-template-columns:1fr auto auto;gap:8px}`;
document.head.appendChild(css);
renderPer(); setTimeout(restore, 600); setupFromLink();
})();

// ------------------------------------------------------------------ precise, free wake-up (Google Apps Script reads state/next.json)
(() => {
const DAY = 864e5;
window.bumpNext = async t => { try {
  let cur = null; try { cur = JSON.parse(await readFile("state/next.json")); } catch (e) {}
  if (cur?.next_due && new Date(cur.next_due) <= new Date(t)) return;
  await commit([{ path: "state/next.json", b64: utf8b64(JSON.stringify({ next_due: t, checked_at: cur?.checked_at || null, set_by: "app" })) }], "next run");
} catch (e) { console.warn("bumpNext", e); } };
const gas = () => `// AutoPost wake-up — runs every 5 minutes on YOUR Google account (free) and starts publishing exactly on time.
const OWNER = "${cfg.owner}", REPO = "${cfg.repo}", BRANCH = "${cfg.branch || "main"}";
const TOKEN_ONCE = ""; // ← paste the GitHub token here, press Run on "setup", then delete it from this line

function setup() {
  const p = PropertiesService.getScriptProperties();
  if (TOKEN_ONCE) p.setProperty("GITHUB_TOKEN", TOKEN_ONCE);
  if (!p.getProperty("GITHUB_TOKEN")) throw new Error("Paste the token in TOKEN_ONCE first");
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("check").timeBased().everyMinutes(5).create();
  check();
  Logger.log("Done — AutoPost wake-up is on. You can now delete the token from TOKEN_ONCE.");
}

function check() {
  const p = PropertiesService.getScriptProperties(), tok = p.getProperty("GITHUB_TOKEN");
  const api = "https://api.github.com/repos/" + OWNER + "/" + REPO;
  const r = UrlFetchApp.fetch(api + "/contents/state/next.json?ref=" + BRANCH + "&t=" + Date.now(), {
    headers: { Authorization: "Bearer " + tok, Accept: "application/vnd.github.raw" }, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) { Logger.log("read next.json: " + r.getResponseCode()); return; }
  const next = JSON.parse(r.getContentText()).next_due;
  if (!next || new Date(next) > new Date()) return;
  if (p.getProperty("LAST") === next && Date.now() - Number(p.getProperty("LAST_AT") || 0) < 20 * 60000) return; // a run for this is already going
  const d = UrlFetchApp.fetch(api + "/actions/workflows/publish.yml/dispatches", { method: "post", contentType: "application/json",
    headers: { Authorization: "Bearer " + tok, Accept: "application/vnd.github+json" }, payload: JSON.stringify({ ref: BRANCH }), muteHttpExceptions: true });
  Logger.log("dispatch " + d.getResponseCode() + " for " + next);
  p.setProperty("LAST", next); p.setProperty("LAST_AT", String(Date.now()));
}`;
const tokUrl = () => "https://github.com/settings/personal-access-tokens/new?" + new URLSearchParams({ name: "AutoPost wake-up", description: "Starts AutoPost publishing on time (Google Apps Script)", target_name: cfg.owner, actions: "write", contents: "read" });
$("#wake-btn") && ($("#wake-btn").onclick = () => {
  if (!cfg.token) return toast("اربط GitHub الأول");
  sheet(`<div class="wz"><h3>منبّه النشر</h3><div class="sub">مرة واحدة، 4 خطوات. كله مجاني وعلى حسابك.</div><ol class="steps">
   <li>اعمل توكن صغير: <a href="${esc(tokUrl())}" target="_blank" rel="noopener">افتح GitHub</a> ← Repository access: <b>Only select</b> ← <b>${esc(cfg.repo)}</b> ← الصلاحيات متعلّمة (Actions: write) ← <b>Generate</b> ← انسخه</li>
   <li>افتح <a href="https://script.new" target="_blank" rel="noopener">script.new</a> (مشروع Apps Script جديد) وامسح اللي فيه والصق الكود (زرار النسخ تحت)</li>
   <li>الصق التوكن بين علامتين التنصيص في سطر <code>TOKEN_ONCE</code></li>
   <li>اختار <b>setup</b> من فوق ← <b>Run</b> ← وافق على الصلاحيات ← بعد ما يقول Done امسح التوكن من السطر واحفظ</li></ol>
   <div class="nav"><button class="btn pri" id="wk-copy">انسخ الكود</button><button class="btn" onclick="closeSheet()">قفل</button></div>
   <p class="hint">بيقرا ملف واحد صغير كل 5 دقايق وبيشغّل النشر بس لما ييجي ميعاد بوست، فبيوفّر دقايق GitHub كمان.</p></div>`);
  $("#wk-copy").onclick = async () => { try { await navigator.clipboard.writeText(gas()); toast("الكود اتنسخ ✓"); } catch (e) { toast("ماقدرتش أنسخ — حدّد الكود يدوي"); } };
});
window.wakeCode = gas;
})();
