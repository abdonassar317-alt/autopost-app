// AutoPost — rest of phase 2: week view, caption templates + hashtag groups, media library, batch scheduling, duplicate check.
(() => {
"use strict";
const DAY = 864e5;
const NM = k => (typeof NAMES !== "undefined" && NAMES[k]) || k;

// ------------------------------------------------------------------ shared library (config/library.json, synced between devices)
let lib = null;
async function loadLib() { if (lib) return lib; try { lib = JSON.parse(await readFile("config/library.json")); } catch (e) { lib = {}; } lib.templates ||= []; lib.hashtags ||= []; return lib; }
async function saveLib(msg) { await commit([{ path: "config/library.json", b64: utf8b64(JSON.stringify(lib, null, 2)) }], msg); }
function insertAtCursor(t, text) { const s = t.selectionStart ?? t.value.length, e = t.selectionEnd ?? s; t.value = t.value.slice(0, s) + text + t.value.slice(e); t.selectionStart = t.selectionEnd = s + text.length; t.dispatchEvent(new Event("input")); t.focus(); }

// buttons under the caption
const capBox = $("#c-caption")?.parentElement;
if (capBox) {
  const bar = document.createElement("div"); bar.className = "libbar";
  bar.innerHTML = `<button class="btn sm" id="lb-t">قوالب</button><button class="btn sm" id="lb-h"># هاشتاجات</button><button class="btn sm" id="lb-m">من المكتبة</button><button class="btn sm" id="lb-b">جدولة دفعة</button>`;
  capBox.insertBefore(bar, $("#c-per-wrap"));
  $("#lb-t").onclick = () => openTemplates(); $("#lb-h").onclick = () => openHashtags(); $("#lb-m").onclick = () => openMedia(); $("#lb-b").onclick = () => openBatch();
}

async function openTemplates() {
  if (!cfg.token) return toast("اربط GitHub الأول"); await loadLib();
  sheet(`<div class="wz"><h3>قوالب الكابشن</h3><div class="sub">دوس على قالب يتحط مكان المؤشر. استخدم {رقم} و{تاريخ} لو عايز.</div>
   ${lib.templates.map((t, i) => `<div class="lrow"><button class="btn" style="flex:1;justify-content:flex-start" data-use="${i}"><b>${esc(t.name)}</b>&nbsp;<small class="mut">${esc(t.text.slice(0, 50))}…</small></button><button class="btn sm" data-del="${i}" aria-label="حذف">✕</button></div>`).join("") || '<p class="hint">مفيش قوالب لسه.</p>'}
   <div class="lbl f">احفظ الكابشن الحالي كقالب</div><div class="two"><input id="tp-n" placeholder="اسم القالب"><button class="btn pri" id="tp-s">حفظ</button></div>
   <div class="nav"><button class="btn" onclick="closeSheet()">قفل</button></div></div>`);
  document.querySelectorAll("[data-use]").forEach(b => b.onclick = () => { const t = lib.templates[+b.dataset.use].text.replace(/\{(تاريخ|date)\}/g, new Date().toLocaleDateString("ar-EG")); closeSheet(); insertAtCursor($("#c-caption"), t); });
  document.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => { lib.templates.splice(+b.dataset.del, 1); try { await saveLib("delete template"); openTemplates(); } catch (e) { toast(e.message); } });
  $("#tp-s").onclick = async () => { const n = $("#tp-n").value.trim(), t = $("#c-caption").value; if (!n || !t.trim()) return toast("اكتب اسم والكابشن مايبقاش فاضي");
    lib.templates.push({ name: n, text: t }); try { await saveLib("add template"); toast("القالب اتحفظ"); openTemplates(); } catch (e) { toast(e.message); } };
}
async function openHashtags() {
  if (!cfg.token) return toast("اربط GitHub الأول"); await loadLib();
  sheet(`<div class="wz"><h3>مجموعات الهاشتاجات</h3>
   ${lib.hashtags.map((h, i) => `<div class="lrow"><button class="btn" style="flex:1;justify-content:flex-start" data-use="${i}"><b>${esc(h.name)}</b>&nbsp;<small class="mut" dir="ltr">${esc(h.tags.slice(0, 50))}</small></button><button class="btn sm" data-del="${i}">✕</button></div>`).join("") || '<p class="hint">مفيش مجموعات لسه.</p>'}
   <div class="lbl f">مجموعة جديدة</div><input id="hg-n" placeholder="الاسم (مثلاً: تصوير)"><textarea id="hg-t" rows="2" placeholder="#تصوير #photography ..."></textarea><button class="btn pri" id="hg-s" style="margin-top:8px">حفظ</button>
   <div class="nav"><button class="btn" onclick="closeSheet()">قفل</button></div></div>`);
  document.querySelectorAll("[data-use]").forEach(b => b.onclick = () => { const t = $("#c-caption"); closeSheet(); insertAtCursor(t, (t.value && !t.value.endsWith("\n") ? "\n\n" : "") + lib.hashtags[+b.dataset.use].tags); });
  document.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => { lib.hashtags.splice(+b.dataset.del, 1); try { await saveLib("delete hashtags"); openHashtags(); } catch (e) { toast(e.message); } });
  $("#hg-s").onclick = async () => { const n = $("#hg-n").value.trim(), t = $("#hg-t").value.trim(); if (!n || !t) return toast("اكتب الاسم والهاشتاجات");
    lib.hashtags.push({ name: n, tags: t }); try { await saveLib("add hashtags"); openHashtags(); } catch (e) { toast(e.message); } };
}

// ------------------------------------------------------------------ media library: every file ever uploaded, searchable by the post's text
async function rawBlob(path) { const r = await fetch(`https://api.github.com${R()}/contents/${path}?ref=${cfg.branch}`, { headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github.raw" }, cache: "no-store" }); if (!r.ok) throw new Error("GitHub " + r.status); return r.blob(); }
async function openMedia() {
  if (!cfg.token) return toast("اربط GitHub الأول");
  sheet(`<div class="wz"><h3>مكتبة الملفات</h3><input id="md-q" placeholder="دوّر بكلمة من الكابشن أو العنوان"><div id="md-g" class="mdg"><p class="hint">جاري التحميل…</p></div>
   <div class="nav"><button class="btn pri" id="md-add">ضيف المختار للبوست</button><button class="btn" onclick="closeSheet()">قفل</button></div></div>`);
  try {
    if (!items.length) await loadList();
    const all = []; for (const x of items) for (const m of x.p.media || []) all.push({ id: x.id, m, text: `${x.p.label || ""} ${x.p.caption || ""}`, video: !/\.(jpe?g|png|webp)$/i.test(m), done: x.p.platforms.every(k => x.s[k]?.ok) });
    const picked = new Set();
    const draw = () => { const q = $("#md-q").value.trim(); const list = all.filter(a => !q || a.text.includes(q) || (window.mediaTags?.[a.id + "/" + a.m] || []).some(t => t.includes(q))).slice(0, 120);
      $("#md-g").innerHTML = list.map((a, i) => `<label class="mdi${picked.has(a.id + "/" + a.m) ? " on" : ""}" data-k="${esc(a.id + "/" + a.m)}">${a.video ? `<div class="vid">${ic("play")}</div>` : `<img data-pid="${esc(a.id)}" data-f="${esc(a.m)}" alt="">`}<small>${a.done ? "اتنشر" : "مجدول"}</small></label>`).join("") || '<p class="hint">مفيش نتايج</p>';
      fillThumbs(); document.querySelectorAll(".mdi").forEach(el => el.onclick = () => { const k = el.dataset.k; picked.has(k) ? picked.delete(k) : picked.add(k); el.classList.toggle("on"); }); };
    $("#md-q").oninput = draw; draw();
    $("#md-add").onclick = async () => { if (!picked.size) return toast("اختار ملف"); $("#md-add").disabled = true;
      try { for (const k of picked) { const b = await rawBlob("posts/" + k); const name = k.split("/").pop(); const f = new File([b], name, { type: b.type || (name.endsWith(".mp4") ? "video/mp4" : "image/jpeg") }); files.push({ file: f, url: URL.createObjectURL(f), video: f.type.startsWith("video") }); }
        closeSheet(); renderThumbs(); toast(`اتضاف ${picked.size} ملف`); } catch (e) { toast(e.message); $("#md-add").disabled = false; } };
  } catch (e) { $("#md-g").innerHTML = `<p class="hint">${esc(e.message)}</p>`; }
}

// ------------------------------------------------------------------ duplicate files in the same post (same bytes picked twice)
const hashOf = async f => { const b = await crypto.subtle.digest("SHA-256", await f.arrayBuffer()); return [...new Uint8Array(b)].slice(0, 8).map(x => x.toString(16).padStart(2, "0")).join(""); };
$("#c-files")?.addEventListener("change", () => setTimeout(async () => { const seen = new Map(); let dup = 0;
  for (const f of files) { const h = await hashOf(f.file); if (seen.has(h)) dup++; else seen.set(h, 1); }
  if (dup) toast(`فيه ${dup} صورة متكررة في البوست ده — شيل المتكرر`, 6000); }, 50));

// ------------------------------------------------------------------ batch scheduling: many files → many posts in one go, reviewed before saving
function openBatch() {
  if (!cfg.token) return toast("اربط GitHub الأول");
  const plats = PLATS.map(p => p[0]).filter(k => sel.has(k));
  sheet(`<div class="wz"><h3>جدولة دفعة</h3><div class="sub">اختار كل الملفات مرة واحدة بالترتيب، وحدد كام ملف في كل بوست — هتشوف مراجعة قبل الحفظ.</div>
   <input type="file" id="bt-f" accept="image/*,video/*" multiple>
   <div class="two f"><div><div class="lbl">ملفات في كل بوست</div><input id="bt-n" type="number" min="1" max="10" value="5"></div><div><div class="lbl">كل كام يوم</div><input id="bt-e" type="number" min="1" max="30" value="1"></div></div>
   <div class="two f"><div><div class="lbl">أول يوم</div><input id="bt-d" type="date"></div><div><div class="lbl">الساعة</div><input id="bt-h" type="time" value="20:00"></div></div>
   <div class="lbl f">الكابشنز <span>كابشن لكل بوست، افصل بينهم بسطر فيه --- بس. لو كابشن واحد هيتكرر. {رقم} = رقم البوست</span></div>
   <textarea id="bt-c" rows="5">${esc($("#c-caption").value)}</textarea>
   <p class="hint">المنصات: ${plats.map(NM).join("، ") || "اختار منصات من الشاشة الأساسية الأول"} · الحساب: ${esc(brands[$("#c-brand").value]?.name || "")}</p>
   <div id="bt-r"></div>
   <div class="nav"><button class="btn" id="bt-p">مراجعة</button><button class="btn pri hide" id="bt-s">جدولة الكل</button><button class="btn" onclick="closeSheet()">إلغاء</button></div></div>`);
  $("#bt-d").valueAsDate = new Date(Date.now() + DAY);
  let plan = [];
  $("#bt-p").onclick = () => {
    const fs = [...$("#bt-f").files], n = Math.max(1, Math.min(10, +$("#bt-n").value || 1)), every = Math.max(1, +$("#bt-e").value || 1);
    if (!fs.length) return toast("اختار الملفات"); if (!plats.length) return toast("اختار منصات الأول");
    const caps = $("#bt-c").value.split(/\n\s*---\s*\n/).map(s => s.trim()).filter(Boolean);
    const start = new Date(`${$("#bt-d").value}T${$("#bt-h").value || "20:00"}`); if (isNaN(start) || start < Date.now()) return toast("اختار ميعاد جاي");
    plan = []; for (let i = 0, k = 0; i < fs.length; k++) {
      const group = [];
      if (fs[i].type.startsWith("video")) group.push(fs[i++]);          // a video is always its own post
      else while (i < fs.length && group.length < n && !fs[i].type.startsWith("video")) group.push(fs[i++]);
      plan.push({ files: group, when: new Date(start.getTime() + k * every * DAY), caption: (caps[k] ?? caps[caps.length - 1] ?? "").replace(/\{(رقم|n)\}/g, k + 1) }); }
    const warn = caps.length > 1 && caps.length !== plan.length ? `<p class="hint" style="color:var(--bad)">عدد الكابشنز (${caps.length}) مش زي عدد البوستات (${plan.length}) — الزيادة/الناقص هياخد آخر كابشن.</p>` : "";
    $("#bt-r").innerHTML = warn + `<div class="lbl f">${plan.length} بوست</div>` + plan.map((p, i) => `<div class="lrow" style="font-size:13px"><b>${i + 1}</b> ${p.when.toLocaleString("ar-EG", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · ${p.files.length} ملف · ${esc(p.caption.split("\n")[0].slice(0, 40))}</div>`).join("");
    $("#bt-s").classList.remove("hide");
  };
  $("#bt-s").onclick = async () => { if (!plan.length) return; const btn = $("#bt-s"); btn.disabled = true;
    try { const changes = []; let earliest = null;
      for (let i = 0; i < plan.length; i++) { const p = plan[i]; btn.textContent = `بيجهّز ${i + 1}/${plan.length}…`;
        const pid = p.when.toISOString().replace(/[-:]/g, "").slice(0, 13).replace("T", "-") + "-b" + Math.random().toString(36).slice(2, 6); const media = [];
        for (let j = 0; j < p.files.length; j++) { const f = p.files[j];
          if (f.type.startsWith("video")) { const ext = (f.name.split(".").pop() || "mp4").toLowerCase(); changes.push({ path: `posts/${pid}/${j + 1}.${ext}`, b64: await fileB64(f) }); media.push(`${j + 1}.${ext}`); }
          else { const jp = await toJpeg(f); changes.push({ path: `posts/${pid}/${j + 1}.jpg`, b64: jp.b64 }); media.push(`${j + 1}.jpg`); } }
        const t = p.when.toISOString().replace(/\.\d+Z$/, "Z"); if (!earliest || t < earliest) earliest = t;
        changes.push({ path: `posts/${pid}/post.json`, b64: utf8b64(JSON.stringify({ brand: $("#c-brand").value, time: t, kind: p.files[0].type.startsWith("video") ? "video" : "images", media, platforms: plats, caption: p.caption, label: `دفعة ${i + 1}` }, null, 2)) }); }
      btn.textContent = "بيرفع…"; await commit(changes, `batch schedule ${plan.length} posts`); if (earliest && window.bumpNext) bumpNext(earliest);
      closeSheet(); toast(`اتجدول ${plan.length} بوست ✓`, 5000); tab("list");
    } catch (e) { toast(e.message, 8000); btn.disabled = false; btn.textContent = "جدولة الكل"; } };
}

// ------------------------------------------------------------------ week view (adds to the month calendar)
let mode = "month", weekStart = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 1) % 7)); return d; })();
const _cal = window.renderCal;
window.renderCal = () => {
  if (mode === "month") { _cal(); addToggle(); return; }
  const days = [...Array(7)].map((_, i) => new Date(weekStart.getTime() + i * DAY));
  const end = new Date(weekStart.getTime() + 7 * DAY);
  const its = items.filter(x => { const t = new Date(x.p.time); return t >= weekStart && t < end; }).sort((a, b) => new Date(a.p.time) - new Date(b.p.time));
  $("#l-items").innerHTML = `<div class="calh"><button class="btn sm" id="wk-p">‹</button><b>${days[0].toLocaleDateString("ar-EG", { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}</b><button class="btn sm" id="wk-n">›</button></div>
   <div class="wk">${days.map(d => { const di = its.filter(x => new Date(x.p.time).toDateString() === d.toDateString());
     return `<div class="wd${d.toDateString() === new Date().toDateString() ? " today" : ""}" data-day="${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}"><div class="wdh">${d.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric" })}</div>${di.map(x => `<div class="cp${x.p.draft ? " dr" : x.p.platforms.every(k => x.s[k]?.ok || x.s[k]?.skipped) ? " ok" : ""}" draggable="true" data-id="${x.id}">${new Date(x.p.time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} ${esc((x.p.label || x.p.caption || "").slice(0, 40))}<br><small>${x.p.platforms.map(NM).join(" · ")}</small></div>`).join("") || '<small class="mut">—</small>'}</div>`; }).join("")}</div>`;
  $("#wk-p").onclick = () => { weekStart = new Date(weekStart.getTime() - 7 * DAY); renderCal(); }; $("#wk-n").onclick = () => { weekStart = new Date(weekStart.getTime() + 7 * DAY); renderCal(); };
  document.querySelectorAll(".wk .cp").forEach(el => { el.onclick = () => menu(el.dataset.id); el.ondragstart = e => e.dataTransfer.setData("text", el.dataset.id); });
  document.querySelectorAll(".wd").forEach(el => { el.ondragover = e => e.preventDefault(); el.ondrop = e => { e.preventDefault(); moveTo(e.dataTransfer.getData("text"), el.dataset.day); }; });
  addToggle();
};
function addToggle() { const h = document.querySelector(".calh"); if (!h || h.querySelector(".mtog")) return; const t = document.createElement("div"); t.className = "seg mtog";
  t.innerHTML = `<button class="${mode === "month" ? "on" : ""}" data-m="month">شهر</button><button class="${mode === "week" ? "on" : ""}" data-m="week">أسبوع</button>`;
  h.appendChild(t); t.querySelectorAll("button").forEach(b => b.onclick = () => { mode = b.dataset.m; renderCal(); }); }

const css = document.createElement("style");
css.textContent = `.libbar{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.lrow{display:flex;gap:6px;align-items:center;margin:4px 0}.mut{color:var(--mut)}
.mdg{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:6px;max-height:50vh;overflow:auto;margin-top:8px}
.mdi{position:relative;border:2px solid transparent;border-radius:8px;overflow:hidden;aspect-ratio:4/5;background:var(--s);cursor:pointer}.mdi.on{border-color:var(--ink)}
.mdi img{width:100%;height:100%;object-fit:cover}.mdi small{position:absolute;bottom:2px;inset-inline-start:4px;font-size:10px;background:#fff;border-radius:4px;padding:0 3px}
.wk{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}.wd{background:var(--s);border:1px solid var(--line);border-radius:10px;padding:6px;min-height:160px}.wd.today{border-color:var(--ink)}
.wdh{font-size:12px;color:var(--mut);margin-bottom:4px}.wk .cp{white-space:normal}
@media(max-width:700px){.wk{grid-template-columns:1fr}.wd{min-height:auto}}.mtog{margin:0}`;
document.head.appendChild(css);
})();
