// AutoPost — insights from YOUR data: best time, content mix, info that may go stale, simple experiments,
// plus "already posted?" check and media tags. Every suggestion says what it's based on; nothing changes posts by itself.
(() => {
"use strict";
const DAY = 864e5;
const NM = k => (typeof NAMES !== "undefined" && NAMES[k]) || k;
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const METRIC = { youtube: ["views", "مشاهدات"], instagram: ["likes", "إعجابات"], facebook: ["reactions", "رياكتات"] };
const EN = () => window.apLang === "en", L = (ar, en) => EN() ? en : ar;
const WD = d => new Date(2026, 10, 1 + +d).toLocaleDateString(EN() ? "en-US" : "ar-EG", { weekday: "long" }); // Nov 1 2026 is a Sunday
const LOC = () => EN() ? "en-GB" : "ar-EG";
const label = x => x.p.label || (x.p.caption || "").split("\n")[0].slice(0, 40);

// ------------------------------------------------------------------ tools row buttons
function addButtons() { const t = $("#l-tools div"); if (!t || t.querySelector("#in-btn")) return;
  const b = document.createElement("button"); b.className = "btn sm"; b.id = "in-btn"; b.textContent = "تحليل محتوايا"; b.onclick = openInsights; t.appendChild(b); }
setInterval(addButtons, 1500);

async function openInsights() {
  if (!items.length) await loadList();
  sheet(`<div class="wz"><h3>تحليل محتوايا</h3><div class="sub">مبني على بوستاتك وأرقامك الحقيقية بس. الأنماط دي ملاحظات تستاهل تجربة، مش أسباب مؤكدة.</div>
   <div class="seg" id="in-seg"><button data-v="time" class="on">أحسن وقت</button><button data-v="mix">تنوّع المحتوى</button><button data-v="fresh">معلومات تتراجع</button><button data-v="exp">تجارب</button></div><div id="in-out" class="f"></div>
   <div class="nav"><button class="btn" onclick="closeSheet()">قفل</button></div></div>`);
  const show = v => { $("#in-seg").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.v === v)); ({ time: bestTime, mix: mixMap, fresh: freshness, exp: experiments })[v](); };
  $("#in-seg").querySelectorAll("button").forEach(b => b.onclick = () => show(b.dataset.v)); show("time");
}

// ------------------------------------------------------------------ best posting time (needs 10+ posts with the same metric)
// engagement score per platform, compared to that platform's own median (so YouTube views and Instagram likes can be pooled)
const SCORE = {
  instagram: m => (m.likes ?? 0) + 2 * (m.comments ?? 0) + 3 * (m.saves ?? 0) + 3 * (m.shares ?? 0) + (m.reach ? m.reach / 20 : 0),
  facebook: m => (m.reactions ?? 0) + 2 * (m.comments ?? 0) + 3 * (m.shares ?? 0),
  youtube: m => (m.views ?? 0) + 5 * (m.likes ?? 0) + 10 * (m.comments ?? 0),
};
const SLOTS = [0, 3, 6, 9, 12, 15, 18, 21], slotOf = h => Math.floor(h / 3) * 3;
const slotTxt = s => EN() ? `${s}:00–${s + 3}:00` : `${s}–${s + 3}`;
// general starting points when there's no data yet (Egypt, evenings & lunch) — to test, not facts
const START = [[4, 21], [5, 13], [6, 21], [0, 21], [2, 18]];
function points() {
  const pts = [];
  for (const [k, f] of Object.entries(SCORE)) {
    const raw = items.map(x => { const m = x.s[k]?.metrics; if (!m || m.unavailable) return null; const v = f(m); return v > 0 || Object.keys(m).some(n => typeof m[n] === "number") ? { x, k, v, t: new Date(x.s[k]?.at || x.p.time) } : null; }).filter(Boolean);
    const med = median(raw.map(o => o.v)) || 1;
    raw.forEach(o => pts.push({ ...o, r: o.v / med }));
  }
  return pts;
}
function nextAt(day, slot) { const d = new Date(); d.setMinutes(0, 0, 0); const h = slot + 1; let add = (day - d.getDay() + 7) % 7; if (!add && d.getHours() >= h) add = 7; d.setDate(d.getDate() + add); d.setHours(h); return d; }
function useSlot(day, slot) { try { localStorage.setItem("ap_best", JSON.stringify({ day: +day, slot: +slot })); } catch (e) {}
  if (typeof closeSheet === "function") closeSheet(); const d = nextAt(+day, +slot), pad = n => String(n).padStart(2, "0");
  document.querySelector('.tabs button[data-tab="compose"]')?.click();
  setTimeout(() => { const dt = $("#c-date"), hr = $("#c-hour"); if (dt) dt.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; if (hr) hr.value = `${pad(d.getHours())}:00`; window.apQuick && window.apQuick();
    toast(L(`اتحط ${WD(day)} ${pad(d.getHours())}:00 — وهيبقى زرار «أحسن وقت ⭐» تحت التاريخ`, `Set to ${WD(day)} ${pad(d.getHours())}:00 — also saved as the “Best time ⭐” chip`), 6000); }, 120); }
window.apUseSlot = useSlot;
function bestTime() {
  const pts = points(), n = pts.length;
  const cell = {}; pts.forEach(o => { const key = o.t.getDay() + "-" + slotOf(o.t.getHours()); (cell[key] ||= []).push(o.r); });
  const posted = {}; items.filter(x => x.p.time && new Date(x.p.time) < new Date()).forEach(x => { const t = new Date(x.p.time); const key = t.getDay() + "-" + slotOf(t.getHours()); posted[key] = (posted[key] || 0) + 1; });
  const ranked = Object.entries(cell).filter(([, a]) => a.length >= 2).map(([key, a]) => ({ key, med: median(a), n: a.length })).sort((a, b) => b.med - a.med);
  const enough = n >= 6 && ranked.length >= 2;
  const top = enough ? ranked.slice(0, 3).map(r => { const [d, s] = r.key.split("-").map(Number); return { d, s, why: L(`أداء ${Math.round(r.med * 100)}% من المعتاد · ${r.n} بوست`, `${Math.round(r.med * 100)}% of your usual · ${r.n} posts`) }; })
    : START.map(([d, h]) => ({ d, s: slotOf(h), why: L("نقطة بداية للتجربة", "a starting point to test") }));
  // untested slots worth one try (close to the winners, never posted there)
  const tryNext = (enough ? top : START.map(([d, h]) => ({ d, s: slotOf(h) }))).flatMap(t => [[(t.d + 1) % 7, t.s], [t.d, (t.s + 3) % 24]]).filter(([d, s]) => !posted[d + "-" + s]).slice(0, 2);
  const maxR = Math.max(1, ...Object.values(cell).map(a => median(a)));
  const grid = `<div class="bt-grid"><div></div>${SLOTS.map(s => `<div class="bt-h">${s}</div>`).join("")}` +
    [6, 0, 1, 2, 3, 4, 5].map(d => `<div class="bt-d">${WD(d).replace(/^ال/, "")}</div>` + SLOTS.map(s => { const a = cell[d + "-" + s]; const v = a ? median(a) : null;
      const isTop = top.some(t => t.d === d && t.s === s);
      return `<button class="bt-c${isTop ? " top" : ""}" title="${WD(d)} ${slotTxt(s)}${a ? ` · ${a.length}` : ""}" onclick="apUseSlot(${d},${s})" style="${v != null ? `background:color-mix(in srgb,var(--pri,#2563eb) ${Math.round(15 + 70 * Math.min(1, v / maxR))}%,transparent)` : posted[d + "-" + s] ? "background:var(--soft)" : ""}">${isTop ? "★" : ""}</button>`; }).join("")).join("") + `</div>`;
  const most = Object.entries(posted).sort((a, b) => b[1] - a[1])[0];
  const total = Object.values(posted).reduce((a, b) => a + b, 0);
  let h = `<div class="nrow"><div><b>${enough ? L("أحسن أوقات ليك", "Your best times") : L("ابدأ بالأوقات دي", "Start with these times")}</b>` +
    `<div class="bt-top">${top.map(t => `<button class="btn sm${t === top[0] ? " pri" : ""}" onclick="apUseSlot(${t.d},${t.s})">${WD(t.d)} ${slotTxt(t.s)}<small>${t.why}</small></button>`).join("")}</div>` +
    `<small class="mut">${enough ? L(`من ${n} رقم حقيقي (إنستجرام/فيسبوك/يوتيوب)، كل منصة مقارنة بنفسها. اضغط أي وقت يتحطلك في الجدولة.`, `From ${n} real numbers (Instagram/Facebook/YouTube), each platform compared to itself. Tap a time to schedule there.`)
      : L(`لسه الأرقام قليلة (${n} من 6). دي أوقات شائعة في مصر (بالليل والضهر) كبداية — مش أرقام مؤكدة. انشر فيها أسبوعين والتحليل هيتعلم من أرقامك لوحده.`, `Not enough numbers yet (${n} of 6). These are common times in Egypt (evenings & lunch) as a start — not proven. Post at them for two weeks and this learns from your numbers.`)}</small></div></div>`;
  h += `<div class="nrow"><div><b>${L("الخريطة", "Map")}</b> <small class="mut">${L("كل ما المربع أغمق = أداء أحسن · رمادي = نزلت فيه ومفيش أرقام · ★ الأحسن", "Darker = better · grey = posted, no numbers · ★ best")}</small>${grid}</div></div>`;
  if (most && total >= 4 && most[1] / total >= 0.6) { const [d, s] = most[0].split("-").map(Number);
    h += `<div class="nrow"><div>⚠️ ${L(`${Math.round(most[1] / total * 100)}% من بوستاتك نازلة ${WD(d)} ${slotTxt(s)}. لو نزلت كله في نفس الميعاد مش هنعرف إيه الأحسن — غيّر شوية.`, `${Math.round(most[1] / total * 100)}% of your posts went out ${WD(d)} ${slotTxt(s)}. Same slot every time hides what works best — vary a little.`)}</div></div>`; }
  if (tryNext.length) h += `<div class="nrow"><div><b>${L("جرّب مرة", "Try once")}</b> — ${L("أوقات قريبة من الأحسن ماجربتهاش:", "slots near your best you haven't tried:")} ${tryNext.map(([d, s]) => `<a href="#" onclick="apUseSlot(${d},${s});return false">${WD(d)} ${slotTxt(s)}</a>`).join(" · ")}</div></div>`;
  const per = Object.keys(SCORE).map(k => { const c = pts.filter(o => o.k === k).length; return `${NM(k)} ${c}`; }).join(" · ");
  h += `<div class="nrow"><div><small class="mut">${L("أرقام متاحة:", "Numbers available:")} ${per}. ${L("تيك توك ولينكدإن وبنترست مش بيدّوا أرقام للتطبيقات الجديدة.", "TikTok, LinkedIn and Pinterest don't give numbers to new apps.")}</small></div></div>`;
  $("#in-out").innerHTML = h;
}
if (!document.getElementById("bt-css")) { const st = document.createElement("style"); st.id = "bt-css"; st.textContent = `.bt-grid{display:grid;grid-template-columns:auto repeat(8,1fr);gap:3px;margin-top:8px;font-size:11px;direction:ltr}.bt-h{text-align:center;color:var(--mut)}.bt-d{color:var(--mut);padding-inline-end:4px;white-space:nowrap;direction:rtl}.bt-c{aspect-ratio:1.4;border:1px solid var(--line,#ddd);border-radius:5px;background:none;cursor:pointer;font-size:11px;padding:0;color:var(--ink)}.bt-c.top{outline:2px solid var(--pri,#2563eb)}.bt-top{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.bt-top .btn{display:flex;flex-direction:column;align-items:flex-start;line-height:1.3}.bt-top small{font-size:10.5px;opacity:.75;font-weight:400}`; document.head.appendChild(st); }

// ------------------------------------------------------------------ content mix map (last 60 days) — shows repetition, suggests angles, no fixed quotas
function kindOf(p) { if (p.kind === "video") return "فيديو"; const n = (p.media || []).length; return n > 1 ? "كاروسيل" : n === 1 ? "صورة واحدة" : "نص"; }
function styleOf(c = "") { if (/\?|؟/.test(c.split("\n")[0])) return "سؤال"; if ((c.match(/^\d+\.\s/gm) || []).length >= 3) return "قايمة/نصايح"; if (/قبل|بعد|before|after/i.test(c)) return "قبل/بعد"; if (/عميل|قصة|حكاية|story/i.test(c)) return "قصة"; return "عام"; }
function mixMap() {
  const since = Date.now() - 60 * DAY, list = items.filter(x => !x.p.draft && new Date(x.p.time) > since);
  if (list.length < 5) { $("#in-out").innerHTML = `<p class="hint">${L(`محتاج 5 بوستات على الأقل في آخر 60 يوم (عندك ${list.length}).`, `Needs at least 5 posts in the last 60 days (you have ${list.length}).`)}</p>`; return; }
  const count = f => { const m = {}; list.forEach(x => { const k = f(x); m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const bar = (rows) => rows.map(([k, n]) => `<div class="mxr"><span>${esc(k)}</span><i style="width:${Math.round(n / list.length * 100)}%"></i><b>${n}</b></div>`).join("");
  const kinds = count(x => kindOf(x.p)), styles = count(x => styleOf(x.p.caption)), camps = count(x => x.p.campaign || "من غير حملة");
  const tips = [];
  if (kinds[0][1] / list.length > 0.7) tips.push(L(`أغلب بوستاتك «${kinds[0][0]}» — ممكن تجرّب ${["فيديو", "كاروسيل", "صورة واحدة"].filter(k => k !== kinds[0][0]).join(" أو ")} في كام بوست وتقارن.`, `Most of your posts are one format — try a few of the other formats and compare.`));
  if (styles[0][1] / list.length > 0.7) tips.push(L(`أغلب الكابشنز بأسلوب «${styles[0][0]}» — زوايا تانية ممكنة: سؤال للجمهور، قبل/بعد، كواليس الشغل.`, `Most captions use the same style — other angles: a question to your audience, before/after, behind the scenes.`));
  if (!list.some(x => kindOf(x.p) === "فيديو")) tips.push("مفيش فيديو خالص في آخر 60 يوم — حتى Short قصير من الصور بيتعمل لوحده على يوتيوب.");
  $("#in-out").innerHTML = `<div class="lbl">الشكل</div>${bar(kinds)}<div class="lbl f">الأسلوب (تقدير آلي من الكابشن)</div>${bar(styles)}<div class="lbl f">الحملات</div>${bar(camps)}` +
    (tips.length ? `<div class="lbl f">اقتراحات</div>${tips.map(t => `<div class="nrow"><div>${esc(t)}</div></div>`).join("")}` : `<p class="hint">التنوّع كويس.</p>`) +
    `<p class="hint">مفيش نسبة «صح» للكل — ده بس عشان تشوف بتكرر إيه.</p>`;
}

// ------------------------------------------------------------------ information lifecycle: posts with a "review by" date (prices, offers, rules…)
function freshness() {
  const now = Date.now(), list = items.filter(x => x.p.review_by).sort((a, b) => new Date(a.p.review_by) - new Date(b.p.review_by));
  $("#in-out").innerHTML = `<p class="hint">لما بوست فيه معلومة ممكن تتغير (سعر، عرض، موعد، قانون) حط له «راجعها في» من ⋯ في المجدول. هيظهرلك في «محتاجك دلوقتي» لما الميعاد ييجي — من غير ما أعدّل حاجة لوحدي.</p>` +
    (list.map(x => { const late = new Date(x.p.review_by) < now; return `<div class="nrow ${late ? "warn" : ""}"><div>«${esc(label(x))}» — ${late ? L("محتاجة مراجعة من", "review overdue since") : L("راجعها في", "review on")} ${new Date(x.p.review_by).toLocaleDateString(LOC(), { day: "numeric", month: "long" })}${x.p.info_source ? `<br><small class="mut">${L("المصدر", "Source")}: ${esc(x.p.info_source)}</small>` : ""}</div><div class="na"><button class="btn sm" onclick="setReview('${x.id}')">تعديل</button></div></div>`; }).join("") || '<p class="hint">مفيش بوستات عليها ميعاد مراجعة.</p>');
}
window.setReview = id => { const x = items.find(i => i.id === id); closeSheet();
  sheet(`<div class="wz"><h3>المعلومة دي ممكن تتغير؟</h3><div class="sub">«${esc(label(x))}»</div><div class="lbl">راجعها في</div><input type="date" id="rv-d" value="${x.p.review_by ? x.p.review_by.slice(0, 10) : ""}">
   <div class="lbl f">المصدر (اختياري)</div><input id="rv-s" value="${esc(x.p.info_source || "")}" placeholder="لينك أو اسم المصدر"><div class="nav"><button class="btn pri" id="rv-ok">حفظ</button><button class="btn" id="rv-clr">مسح</button><button class="btn" onclick="closeSheet()">إلغاء</button></div></div>`);
  $("#rv-ok").onclick = () => { const d = $("#rv-d").value; if (!d) return toast("اختار تاريخ"); closeSheet(); updatePost(id, p => { p.review_by = d; p.info_source = $("#rv-s").value.trim() || undefined; }, "review date " + id).catch(e => toast(e.message)); };
  $("#rv-clr").onclick = () => { closeSheet(); updatePost(id, p => { delete p.review_by; delete p.info_source; }, "clear review date " + id).catch(e => toast(e.message)); };
};
// add to post menu + needs-you-now
const _menu = window.menu;
window.menu = id => { _menu(id); const p = $("#sheet-p"); if (!p) return; const b = document.createElement("button"); b.innerHTML = `${ic("clock")}معلومة ممكن تتغير؟ (ميعاد مراجعة)`; b.onclick = () => setReview(id);
  const e = document.createElement("button"); e.innerHTML = `${ic("plus")}ضمّه لتجربة`; e.onclick = () => joinExp(id); p.append(b, e); };
const _rn = window.renderNow;
window.renderNow = () => { _rn && _rn(); const el = $("#now-panel .now"); if (!el) return; const now = Date.now();
  items.filter(x => x.p.review_by && new Date(x.p.review_by) < now).forEach(x => { const d = document.createElement("div"); d.className = "nrow warn";
    d.innerHTML = `<div>${L("راجع", "Review")} «${esc(label(x))}» — ${L("المعلومة ممكن تكون اتغيرت", "the info may have changed")}</div><div class="na"><button class="btn sm" onclick="setReview('${x.id}')">تمام</button></div>`; el.appendChild(d); });
  items.filter(x => x.p.review_by && !x.p.draft && new Date(x.p.time) > now && new Date(x.p.review_by) < new Date(x.p.time)).forEach(x => { const d = document.createElement("div"); d.className = "nrow warn";
    d.innerHTML = `<div>«${esc(label(x))}» ${L("هيتنشر بعد ميعاد مراجعة معلومته — اتأكد منها قبل النشر", "goes out after its info review date — check it before it posts")}</div>`; el.appendChild(d); }); };

// ------------------------------------------------------------------ experiments: A vs B on one metric, honest about sample size
let exps = null;
async function loadExps() { if (exps) return exps; try { exps = JSON.parse(await readFile("config/experiments.json")).experiments || []; } catch (e) { exps = []; } return exps; }
const saveExps = m => commit([{ path: "config/experiments.json", b64: utf8b64(JSON.stringify({ experiments: exps }, null, 2)) }], m);
async function experiments() {
  await loadExps();
  const res = e => { const [plat, f] = e.metric.split(":"); const g = v => items.filter(x => x.p.exp?.id === e.id && x.p.exp.v === v).map(x => x.s[plat]?.metrics?.[f]).filter(n => typeof n === "number");
    const A = g("A"), B = g("B"); return { A, B, mA: median(A), mB: median(B) }; };
  $("#in-out").innerHTML = `<p class="hint">مثال: «هل الكابشن القصير أحسن؟» — تحط كل بوست في مجموعة A أو B من ⋯ ← «ضمّه لتجربة»، والأداة تقارن الرقم اللي تختاره.</p>` +
    exps.map(e => { const r = res(e), enough = r.A.length >= 5 && r.B.length >= 5;
      return `<div class="box"><b>${esc(e.name)}</b><br><small class="mut">${esc(e.hypothesis)} · ${esc(NM(e.metric.split(":")[0]))} / ${esc(e.metric.split(":")[1])}</small>
        <div class="two f"><div>A (${esc(e.a)}): <b>${r.mA ?? "—"}</b> <small>(${r.A.length} ${L("بوست", "posts")})</small></div><div>B (${esc(e.b)}): <b>${r.mB ?? "—"}</b> <small>(${r.B.length} ${L("بوست", "posts")})</small></div></div>
        <p class="hint">${enough ? (Math.abs(r.mA - r.mB) / Math.max(1, Math.max(r.mA, r.mB)) < 0.15 ? "الفرق صغير — غالبًا مفيش فرق حقيقي." : L(`${r.mA > r.mB ? "A" : "B"} أعلى في الوسيط. ده مؤشر مش دليل — حاجات تانية (الموضوع، اليوم) ممكن تأثر.`, `${r.mA > r.mB ? "A" : "B"} has the higher median. A hint, not proof — topic and day can matter too.`)) : "محتاج 5 بوستات على الأقل في كل مجموعة قبل أي استنتاج."}</p></div>`; }).join("") +
    `<div class="lbl f">تجربة جديدة</div><input id="ex-n" placeholder="الاسم (مثلاً: كابشن قصير ولا طويل)"><input id="ex-h" class="f" placeholder="الفرضية (مثلاً: القصير بياخد إعجابات أكتر)">
     <div class="two f"><input id="ex-a" placeholder="A (مثلاً: قصير)"><input id="ex-b" placeholder="B (مثلاً: طويل)"></div>
     <select id="ex-m" class="f">${Object.entries(METRIC).map(([k, [f, ar]]) => `<option value="${k}:${f}">${NM(k)} — ${L(ar, f)}</option>`).join("")}</select><button class="btn pri f" id="ex-s">إنشاء</button>`;
  $("#ex-s").onclick = async () => { const n = $("#ex-n").value.trim(); if (!n) return toast("اكتب اسم التجربة");
    exps.push({ id: Math.random().toString(36).slice(2, 8), name: n, hypothesis: $("#ex-h").value.trim(), a: $("#ex-a").value.trim() || "A", b: $("#ex-b").value.trim() || "B", metric: $("#ex-m").value, at: new Date().toISOString() });
    try { await saveExps("new experiment"); experiments(); } catch (e) { toast(e.message); } };
}
async function joinExp(id) { await loadExps(); closeSheet(); if (!exps.length) return toast("اعمل تجربة الأول من «تحليل محتوايا ← تجارب»");
  sheet(`<div class="wz"><h3>ضمّه لتجربة</h3>${exps.map(e => `<div class="lrow"><span style="flex:1">${esc(e.name)}</span><button class="btn sm" data-e="${e.id}" data-v="A">A: ${esc(e.a)}</button><button class="btn sm" data-e="${e.id}" data-v="B">B: ${esc(e.b)}</button></div>`).join("")}
   <div class="nav"><button class="btn" data-e="" data-v="">شيله من التجارب</button><button class="btn" onclick="closeSheet()">إلغاء</button></div></div>`);
  document.querySelectorAll("[data-e]").forEach(b => b.onclick = () => { closeSheet(); updatePost(id, p => { if (b.dataset.e) p.exp = { id: b.dataset.e, v: b.dataset.v }; else delete p.exp; }, "experiment " + id).catch(e => toast(e.message)); }); }

// ------------------------------------------------------------------ "already posted?" — fingerprint of each original file, saved with the post
const fp = async f => { const h = await crypto.subtle.digest("SHA-256", await f.arrayBuffer()); return [...new Uint8Array(h)].slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join(""); };
const _c = window.commit;
window.commit = commit = async function (changes, message, onP) {
  if (/^schedule /.test(message || "") && files.length) { const hs = await Promise.all(files.map(f => fp(f.file || f)));
    changes = changes.map(ch => { if (!/\/post\.json$/.test(ch.path) || !ch.b64) return ch; try { const p = JSON.parse(decodeURIComponent(escape(atob(ch.b64)))); p.hashes = hs; return { ...ch, b64: utf8b64(JSON.stringify(p, null, 2)) }; } catch (e) { return ch; } }); }
  return _c(changes, message, onP);
};
$("#c-files")?.addEventListener("change", () => setTimeout(async () => {
  if (!items.length) { try { await loadList(); } catch (e) { return; } }
  const seen = {}; items.forEach(x => (x.p.hashes || []).forEach(h => (seen[h] ||= []).push(x)));
  const hits = []; for (const f of files) { const h = await fp(f.file || f); if (seen[h]) hits.push(seen[h][0]); }
  if (hits.length) { const x = hits[0]; toast(L(`${hits.length} من الملفات دي اتستخدمت قبل كده — في «${label(x)}» (${new Date(x.p.time).toLocaleDateString(LOC(), { day: "numeric", month: "short" })})`, `${hits.length} of these files were used before — in «${label(x)}» (${new Date(x.p.time).toLocaleDateString(LOC(), { day: "numeric", month: "short" })})`), 8000); }
}, 120));

// ------------------------------------------------------------------ media tags (in the media library)
let lib = null;
async function loadLib() { try { lib = JSON.parse(await readFile("config/library.json")); } catch (e) { lib = {}; } lib.media_tags ||= {}; window.mediaTags = lib.media_tags; return lib; }
new MutationObserver(async () => { const g = $("#md-g"); if (!g || g.dataset.tagged) return; g.dataset.tagged = "1"; await loadLib();
  const bar = document.createElement("div"); bar.className = "libbar"; bar.innerHTML = `<input id="md-tag" placeholder="وسم (مثلاً: شقة التجمع، لوجو، داخلي)" style="flex:1"><button class="btn sm" id="md-tag-add">وسّم المختار</button>`;
  g.before(bar);
  const paint = () => document.querySelectorAll(".mdi").forEach(el => { const t = lib.media_tags[el.dataset.k] || []; let s = el.querySelector(".tg"); if (!s) { s = document.createElement("em"); s.className = "tg"; el.appendChild(s); } s.textContent = t.join("، "); });
  paint(); new MutationObserver(paint).observe(g, { childList: true });
  $("#md-tag-add").onclick = async () => { const t = $("#md-tag").value.trim(); const sel = [...document.querySelectorAll(".mdi.on")].map(e => e.dataset.k); if (!t || !sel.length) return toast("اختار ملفات واكتب وسم");
    sel.forEach(k => { lib.media_tags[k] = [...new Set([...(lib.media_tags[k] || []), t])]; });
    try { await commit([{ path: "config/library.json", b64: utf8b64(JSON.stringify(lib, null, 2)) }], "media tags"); paint(); toast("اتوسموا"); } catch (e) { toast(e.message); } };
}).observe(document.body, { childList: true, subtree: true });

const css = document.createElement("style");
css.textContent = `.mxr{display:grid;grid-template-columns:110px 1fr 30px;gap:8px;align-items:center;font-size:13px;margin:4px 0}.mxr i{display:block;height:8px;border-radius:4px;background:var(--ink);opacity:.75}
.mdi .tg{position:absolute;top:2px;inset-inline-start:2px;font-size:10px;font-style:normal;background:var(--s);color:var(--ink);border-radius:4px;padding:0 3px;max-width:90%;overflow:hidden;white-space:nowrap}#in-seg{overflow-x:auto;max-width:100%}`;
document.head.appendChild(css);
})();
