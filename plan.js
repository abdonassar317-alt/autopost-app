// AutoPost — phase 2.5: catch-up on open, campaigns, ideas list, plan export/import (CSV), monthly client report.
(() => {
"use strict";
const NM = k => (typeof NAMES !== "undefined" && NAMES[k]) || k;
const DAY = 864e5;

// ------------------------------------------------------------------ catch-up: if a post is overdue when you open the app, start publishing now
async function catchUp() {
  if (!cfg.token) return;
  try { const n = JSON.parse(await readFile("state/next.json")); if (!n.next_due) return;
    const late = Date.now() - new Date(n.next_due); if (late < 5 * 60e3) return;
    const k = "catchup_" + n.next_due; try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, "1"); } catch (e) {}
    if (await runNow()) toast("فيه بوست ميعاده عدّى — شغّلت النشر دلوقتي", 6000);
  } catch (e) {}
}
setTimeout(catchUp, 2500);
document.addEventListener("visibilitychange", () => { if (!document.hidden) catchUp(); });

// ------------------------------------------------------------------ campaigns (a label that groups posts for one goal/client)
const brandBox = $("#c-brand")?.parentElement;
if (brandBox) { const d = document.createElement("div"); d.className = "f";
  d.innerHTML = `<div class="lbl">الحملة <span>اختياري — تجمّع البوستات اللي ليها هدف واحد</span></div><input id="c-camp" list="camp-list" placeholder="مثلاً: سلسلة التصوير / عميل X نوفمبر"><datalist id="camp-list"></datalist>`;
  brandBox.appendChild(d); }
const camps = () => [...new Set(items.map(x => x.p.campaign).filter(Boolean))];
function fillCamps() { const dl = $("#camp-list"); if (dl) dl.innerHTML = camps().map(c => `<option value="${esc(c)}">`).join(""); }
// put the campaign into every new post (hook the commit of post.json)
const _commit = window.commit;
window.commit = commit = async function (changes, message, onP) {
  const c = $("#c-camp")?.value.trim();
  if (c && /^schedule /.test(message || "")) changes = changes.map(ch => { if (!/\/post\.json$/.test(ch.path) || !ch.b64) return ch;
    try { const p = JSON.parse(decodeURIComponent(escape(atob(ch.b64)))); p.campaign = c; return { ...ch, b64: utf8b64(JSON.stringify(p, null, 2)) }; } catch (e) { return ch; } });
  return _commit(changes, message, onP);
};
// campaign filter on the list
let campFilter = "";
const seg = $("#l-seg");
if (seg) { const s = document.createElement("div"); s.className = "f"; s.id = "l-tools";
  s.innerHTML = `<select id="l-camp"><option value="">كل الحملات</option></select><div style="display:flex;gap:6px"><button class="btn sm" id="l-exp">تصدير</button><button class="btn sm" id="l-imp">استيراد</button><button class="btn sm" id="l-rep">تقرير شهري</button></div>`;
  seg.after(s); $("#l-camp").onchange = e => { campFilter = e.target.value; renderList(); };
  $("#l-exp").onclick = exportCSV; $("#l-imp").onclick = importCSV; $("#l-rep").onclick = openReport; }
const _rl = window.renderList;
window.renderList = renderList = function () {
  const sel = $("#l-camp"); if (sel) { const cur = sel.value; sel.innerHTML = `<option value="">كل الحملات</option>` + camps().map(c => `<option${c === cur ? " selected" : ""}>${esc(c)}</option>`).join(""); }
  fillCamps();
  if (filter === "ideas") { window.renderNow && renderNow(); return renderIdeas(); }
  if (!campFilter) return _rl();
  const all = items; items = items.filter(x => x.p.campaign === campFilter); try { _rl(); } finally { items = all; }
};

// ------------------------------------------------------------------ ideas list → draft
if (seg && !seg.querySelector("[data-v=ideas]")) { const b = document.createElement("button"); b.dataset.v = "ideas"; b.textContent = "أفكار";
  seg.insertBefore(b, seg.querySelector("[data-v=drafts]")); b.onclick = () => { filter = "ideas"; seg.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); renderList(); }; }
let ideas = null;
async function loadIdeas() { if (ideas) return ideas; try { ideas = JSON.parse(await readFile("config/ideas.json")).ideas || []; } catch (e) { ideas = []; } return ideas; }
const saveIdeas = msg => commit([{ path: "config/ideas.json", b64: utf8b64(JSON.stringify({ ideas }, null, 2)) }], msg);
async function renderIdeas() {
  await loadIdeas();
  $("#l-items").innerHTML = `<div class="box"><div class="lbl">فكرة جديدة</div><textarea id="id-t" rows="2" placeholder="اكتب الفكرة بسرعة… (موضوع، زاوية، لينك مرجع)"></textarea>
    <div class="two f"><input id="id-c" list="camp-list" placeholder="الحملة (اختياري)"><button class="btn pri" id="id-add">إضافة</button></div></div>` +
    (ideas.length ? ideas.map((x, i) => `<div class="item" style="grid-template-columns:1fr auto"><div class="body"><div class="cap">${esc(x.text)}</div><div class="sub">${x.campaign ? esc(x.campaign) + " · " : ""}${new Date(x.at).toLocaleDateString("ar-EG")}</div></div>
      <div style="display:flex;gap:6px;align-items:center"><button class="btn sm pri" data-go="${i}">اعملها بوست</button><button class="btn sm" data-del="${i}">✕</button></div></div>`).join("") : '<div class="empty">مفيش أفكار لسه — اكتب أي حاجة تيجي في بالك وارجعلها بعدين</div>');
  $("#id-add").onclick = async () => { const t = $("#id-t").value.trim(); if (!t) return; ideas.unshift({ text: t, campaign: $("#id-c").value.trim() || undefined, at: new Date().toISOString() });
    try { await saveIdeas("add idea"); renderIdeas(); } catch (e) { toast(e.message); } };
  document.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => { const gone = ideas.splice(+b.dataset.del, 1)[0];
    try { await saveIdeas("delete idea"); renderIdeas(); undo("الفكرة اتمسحت", async () => { ideas.unshift(gone); await saveIdeas("restore idea"); renderIdeas(); }); } catch (e) { toast(e.message); } });
  document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { const x = ideas[+b.dataset.go]; tab("compose");
    $("#c-caption").value = x.text; $("#c-caption").dispatchEvent(new Event("input")); if (x.campaign) $("#c-camp").value = x.campaign;
    toast("الفكرة في البوست الجديد — ضيف الصور واحفظها مسودة أو جدولها", 5000); });
}
function undo(msg, fn) { const t = $("#toast"); toast(msg, 7000); const b = document.createElement("button"); b.textContent = "تراجع"; b.className = "btn sm"; b.style.marginInlineStart = "10px"; b.onclick = () => { t.style.display = "none"; fn().catch(e => toast(e.message)); }; t.appendChild(b); }

// ------------------------------------------------------------------ export / import the content plan (CSV opens in Excel / Google Sheets)
const csvCell = v => { v = String(v ?? ""); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
function parseCSV(t) { const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; } else cell += c; }
  if (cell || row.length) { row.push(cell); rows.push(row); } return rows.filter(r => r.some(x => x.trim())); }
async function exportCSV() {
  if (!items.length) await loadList();
  const head = ["date", "time", "platforms", "campaign", "label", "caption", "status", "links"];
  const rows = items.slice().sort((a, b) => new Date(a.p.time) - new Date(b.p.time)).map(x => { const d = new Date(x.p.time);
    return [d.toLocaleDateString("en-CA"), d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), x.p.platforms.join(" "), x.p.campaign || "", x.p.label || "", x.p.caption || "",
      x.p.draft ? "draft" : x.p.platforms.every(k => x.s[k]?.ok || x.s[k]?.skipped) ? "done" : "scheduled", Object.values(x.s).map(v => v?.url).filter(Boolean).join(" ")]; });
  const csv = "﻿" + [head, ...rows].map(r => r.map(csvCell).join(",")).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `autopost-plan-${new Date().toLocaleDateString("en-CA")}.csv`; a.click();
  toast("الخطة اتنزلت — تتفتح في Excel أو Google Sheets");
}
function importCSV() {
  sheet(`<div class="wz"><h3>استيراد خطة</h3><div class="sub">ملف CSV فيه الأعمدة: date, time, platforms, caption (واختياري: campaign, label). كل سطر هيبقى <b>مسودة</b> تضيفلها الصور بعدين.</div>
   <input type="file" id="im-f" accept=".csv,text/csv"><div id="im-r"></div><div class="nav"><button class="btn pri hide" id="im-s">استيراد كمسودات</button><button class="btn" onclick="closeSheet()">إلغاء</button></div></div>`);
  let rows = [];
  $("#im-f").onchange = async e => { const t = await e.target.files[0].text(); const all = parseCSV(t.replace(/^﻿/, "")); const h = all[0].map(x => x.trim().toLowerCase());
    const ix = k => h.indexOf(k); if (ix("date") < 0 || ix("caption") < 0) return $("#im-r").innerHTML = '<p class="hint" style="color:var(--bad)">لازم يبقى فيه عمود date وعمود caption</p>';
    const valid = new Set(PLATS.map(p => p[0]));
    rows = all.slice(1).map(r => { const when = new Date(`${r[ix("date")]}T${(ix("time") >= 0 && r[ix("time")]) || "20:00"}`);
      const plats = (ix("platforms") >= 0 ? r[ix("platforms")] : "instagram").split(/[\s,;|]+/).filter(k => valid.has(k));
      return { when, plats: plats.length ? plats : ["instagram"], caption: r[ix("caption")] || "", campaign: ix("campaign") >= 0 ? r[ix("campaign")] : "", label: ix("label") >= 0 ? r[ix("label")] : "" }; }).filter(r => !isNaN(r.when));
    $("#im-r").innerHTML = `<div class="lbl f">${rows.length} سطر</div>` + rows.slice(0, 30).map(r => `<div class="lrow" style="font-size:13px">${r.when.toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · ${r.plats.map(NM).join("، ")} · ${esc(r.caption.slice(0, 40))}</div>`).join("");
    $("#im-s").classList.toggle("hide", !rows.length); };
  $("#im-s").onclick = async () => { const btn = $("#im-s"); btn.disabled = true;
    try { const ch = rows.map((r, i) => { const pid = r.when.toISOString().replace(/[-:]/g, "").slice(0, 13).replace("T", "-") + "-i" + Math.random().toString(36).slice(2, 6);
        const p = { brand: $("#c-brand").value || curBrand, time: r.when.toISOString().replace(/\.\d+Z$/, "Z"), kind: "images", media: [], platforms: r.plats, caption: r.caption, draft: true };
        if (r.campaign) p.campaign = r.campaign; if (r.label) p.label = r.label; return { path: `posts/${pid}/post.json`, b64: utf8b64(JSON.stringify(p, null, 2)) }; });
      await commit(ch, `import ${rows.length} drafts`); closeSheet(); toast(`اتعمل ${rows.length} مسودة ✓`); filter = "drafts"; loadList();
    } catch (e) { toast(e.message, 8000); btn.disabled = false; } };
}

// ------------------------------------------------------------------ monthly client report → printable page (Save as PDF from the print dialog — free)
async function openReport() {
  if (!items.length) await loadList();
  const months = [...new Set(items.map(x => { const d = new Date(x.p.time); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }))].sort().reverse();
  sheet(`<div class="wz"><h3>تقرير شهري</h3><div class="sub">صفحة نضيفة تبعتها للعميل: اللي اتنشر وروابطه. اطبعها واختار «Save as PDF».</div>
   <div class="two f"><select id="rp-m">${months.map(m => `<option>${m}</option>`).join("")}</select><select id="rp-b">${Object.entries(brands).map(([k, b]) => `<option value="${esc(k)}"${k === curBrand ? " selected" : ""}>${esc(b.name || k)}</option>`).join("")}</select></div>
   <select id="rp-c" class="f"><option value="">كل الحملات</option>${camps().map(c => `<option>${esc(c)}</option>`).join("")}</select>
   <div class="nav"><button class="btn pri" id="rp-go">افتح التقرير</button><button class="btn" onclick="closeSheet()">إلغاء</button></div></div>`);
  $("#rp-go").onclick = () => { const m = $("#rp-m").value, b = $("#rp-b").value, c = $("#rp-c").value;
    const list = items.filter(x => (x.p.brand || "default") === b && !x.p.draft && (!c || x.p.campaign === c) && (() => { const d = new Date(x.p.time); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === m; })())
      .sort((a, z) => new Date(a.p.time) - new Date(z.p.time));
    let ok = 0, man = 0, fail = 0; const per = {};
    const rows = list.map(x => { const cells = x.p.platforms.map(k => { const v = x.s[k] || {}; per[k] ||= { ok: 0, all: 0 }; per[k].all++;
        if (v.ok && !v.manual) { ok++; per[k].ok++; return v.url ? `<a href="${esc(v.url)}">${esc(NM(k))} ↗</a>` : esc(NM(k)) + " ✓"; }
        if (v.ok && v.manual) { man++; return `${esc(NM(k))} (يدوي)`; } if (v.ok === false) { fail++; return `<span style="color:#b42318">${esc(NM(k))} ✕</span>`; } return `${esc(NM(k))} …`; }).join(" · ");
      return `<tr><td>${new Date(x.p.time).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td><td>${esc(x.p.label || (x.p.caption || "").split("\n")[0].slice(0, 70))}</td><td>${cells}</td><td>${window.metricsCells ? metricsCells(x) : ""}</td></tr>`; }).join("");
    const title = `تقرير ${brands[b]?.name || b} — ${new Date(m + "-01").toLocaleDateString("ar-EG", { month: "long", year: "numeric" })}${c ? " — " + c : ""}`;
    const html = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:system-ui,"Segoe UI",Tahoma;margin:32px;color:#1c1c1e}h1{font-size:22px}
      .k{display:flex;gap:16px;margin:16px 0}.k div{border:1px solid #ddd;border-radius:10px;padding:10px 14px}.k b{display:block;font-size:22px}table{width:100%;border-collapse:collapse;font-size:13px}
      td,th{border-bottom:1px solid #eee;padding:8px;text-align:start;vertical-align:top}a{color:#0a66c2}small{color:#777}@media print{button{display:none}}</style>
      <h1>${esc(title)}</h1><div class="k"><div><b>${list.length}</b>بوست</div><div><b>${ok}</b>نشر تلقائي</div><div><b>${man}</b>نشر يدوي</div>${fail ? `<div><b>${fail}</b>فشل</div>` : ""}</div>
      <p><small>${Object.entries(per).map(([k, v]) => `${esc(NM(k))}: ${v.ok}/${v.all}`).join(" · ")}</small></p>
      <table><tr><th>الميعاد</th><th>البوست</th><th>المنصات</th><th>الأرقام (من المنصة نفسها)</th></tr>${rows || '<tr><td colspan="3">مفيش بوستات في الشهر ده</td></tr>'}</table>
      <p><small>الأرقام جاية من المنصات نفسها ومتحدّثة يوميًا. كل رقم بنوعه (مشاهدة غير وصول غير إعجاب) ومش متجمّعين. «مش متاح» يعني المنصة مش بتدّي الرقم ده لصلاحيات الحساب الحالية. مفيش أي رقم متقدّر أو تجريبي.</small></p><button onclick="print()">طباعة / حفظ PDF</button></html>`;
    const w = window.open("", "_blank"); if (!w) return toast("المتصفح منع الصفحة — اسمح بالنوافذ المنبثقة"); w.document.write(html); w.document.close(); closeSheet(); };
}
})();

// ------------------------------------------------------------------ real metrics (each number keeps its own name; nothing summed across different metrics)
(() => {
const NM = k => (typeof NAMES !== "undefined" && NAMES[k]) || k;
const LBL = { views: "مشاهدة", reach: "وصول", likes: "إعجاب", reactions: "تفاعل (رياكت)", comments: "تعليق", saves: "حفظ", shares: "مشاركة", interactions: "تفاعلات" };
window.metricsLine = x => {
  const parts = [];
  for (const [k, v] of Object.entries(x.s || {})) { const m = v?.metrics; if (!m || !NAMES[k]) continue;
    const nums = Object.entries(LBL).filter(([f]) => typeof m[f] === "number").map(([f, l]) => `${m[f]} ${l}`);
    if (nums.length) parts.push(`<b>${esc(NM(k))}:</b> ${nums.join(" · ")}`); }
  if (!parts.length) return "";
  const at = Object.values(x.s).map(v => v?.metrics?.at).filter(Boolean).sort().pop();
  return `<div class="mt">${parts.join(" &nbsp; ")}<small> — آخر تحديث ${new Date(at).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}</small></div>`;
};
window.metricsCells = x => x.p.platforms.map(k => { const m = x.s[k]?.metrics; if (!m) return "";
  if (m.unavailable) return `<small>${esc(NM(k))}: مش متاح</small>`;
  const nums = Object.entries(LBL).filter(([f]) => typeof m[f] === "number").map(([f, l]) => `${m[f]} ${l}`);
  return nums.length ? `<small><b>${esc(NM(k))}</b>: ${nums.join("، ")}</small>` : ""; }).filter(Boolean).join("<br>");
const css = document.createElement("style"); css.textContent = `#l-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center}#l-tools select{flex:1 1 160px;width:auto}#l-tools>div{display:flex;flex-wrap:wrap;gap:6px}.mt{font-size:12px;color:var(--mut);margin-top:6px;line-height:1.7}.mt b{color:var(--ink);font-weight:600}`; document.head.appendChild(css);
})();
