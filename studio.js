// AutoPost Studio — step 1: idea -> scenes (script + image prompts) -> images. Free: text from your AI team, images from Pollinations (no key).
(() => {
"use strict";
const $ = s => document.querySelector(s), ls = { get: (k, d = "") => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
const toast = (t, ms) => window.toast && window.toast(t, ms);
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const STYLES = { re: "إعلان عقاري فاخر: لقطات سينمائية للمبنى والتشطيبات والإضاءة الطبيعية", kids: "قصة أطفال لطيفة بألوان زاهية ورسوم كرتونية بسيطة", tips: "نصائح تعليمية في التصوير والإضاءة بصور واقعية واضحة", free: "حسب الفكرة" };
let state = (() => { try { return JSON.parse(ls.get("ap_studio")) || {}; } catch (e) { return {}; } })();
state.scenes = (state.scenes || []).filter(x => !x.own); let intro = null, outro = null;
const save = () => ls.set("ap_studio", JSON.stringify({ ...state, scenes: state.scenes.filter(x => !x.own) }));
const src = s => s.own ? s.url : imgUrl(s.image_prompt, s.seed);
// where the video will be used -> shape; quality -> size of the shortest edge
const FMT = { vert: ["تيك توك / ريلز / شورتس (9:16)", 9, 16], wide: ["يوتيوب / فيديو عريض (16:9)", 16, 9], feed: ["إنستجرام فيد (4:5)", 4, 5], sq: ["مربع: فيسبوك / لينكدإن (1:1)", 1, 1] };
const QUAL = { draft: ["مسودة سريعة (540)", 540], std: ["عادي (720)", 720], high: ["عالي (1080)", 1080] };
const dims = () => { const f = FMT[state.fmt || "vert"], q = QUAL[state.q || "std"][1], r16 = n => Math.round(n / 16) * 16, k = q / Math.min(f[1], f[2]); return [r16(f[1] * k), r16(f[2] * k)]; };
const IMGM = { flux: "Flux (أحسن جودة)", turbo: "Turbo (أسرع)", "": "تلقائي" };
const imgUrl = (p, seed) => { const [w, h] = dims(), m = state.im === undefined ? "flux" : state.im; return `https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=${w}&height=${h}&nologo=true&seed=${seed}${m ? "&model=" + m : ""}`; };

const sec = document.createElement("section"); sec.id = "studio"; sec.className = "hide";
sec.innerHTML = `<div class="box"><div class="lbl">الفكرة</div>
 <textarea id="st-idea" rows="3" placeholder="مثال: فيديو 30 ثانية لشقة 3 غرف في التجمع الخامس، تشطيب سوبر لوكس"></textarea>
 <div class="box" style="margin:8px 0"><div class="lbl">صورك أنت <span>اختياري — الصور مبتتخزنش بعد قفل الصفحة</span></div>
  <label class="btn sm" style="display:block;text-align:center">➕ أضف صور ليك كمشاهد<input type="file" id="st-own" accept="image/*" multiple hidden></label>
  <div class="two"><label class="btn sm" style="text-align:center">🎞 صورة البداية<input type="file" id="st-in" accept="image/*" hidden></label><input id="st-in-t" placeholder="عنوان على البداية (اختياري)"></div>
  <div class="two"><label class="btn sm" style="text-align:center">🏁 صورة النهاية<input type="file" id="st-out" accept="image/*" hidden></label><input id="st-out-t" placeholder="نص النهاية: رقمك / اسم الحساب"></div>
  <p class="note" id="st-fr"></p></div>
 <div class="two"><button class="btn" id="st-sug">🎲 اقترح أفكار</button><button class="btn pri" id="st-auto">⚡ فكرة ومشاهد لوحدك</button></div>
 <div id="st-ideas"></div>
 <div class="lbl">الفيديو لإيه؟ <span>بيحدد المقاس</span></div>
 <select id="st-fmt">${Object.entries(FMT).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join("")}</select>
 <div class="lbl">الجودة</div>
 <select id="st-q">${Object.entries(QUAL).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join("")}</select>
 <div class="lbl">موديل الصور</div>
 <select id="st-im">${Object.entries(IMGM).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
 <label class="chk"><input type="checkbox" id="st-dir" checked> مخرج AI يراجع السيناريو (فريقك كله يشتغل: واحد يكتب وواحد يراجع)</label>
 <p class="note" id="st-dim"></p>
 <div class="two"><select id="st-style">${Object.entries({ re: "عقاري", kids: "أطفال", tips: "نصايح تصوير", free: "حر" }).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
 <select id="st-n">${[3, 4, 5, 6, 8].map(n => `<option ${n === 5 ? "selected" : ""}>${n}</option>`).join("")}</select></div>
 <button class="btn pri" id="st-go">اكتب المشاهد</button>
 <p class="note">الكتابة بفريق الـAI اللي في الإعدادات. الصور من Pollinations (مجاني، من غير مفتاح)، وبروبمت الصورة بيتبعت لهم. مفيش حاجة بتتنشر لوحدها.</p></div>
 <div id="st-scenes"></div>
 <div class="box hide" id="st-vid"><div class="lbl">الفيديو <span>الصوت والتجميع جوه المتصفح، ببلاش</span></div>
  <select id="st-voice"><option value="Kore">صوت: هادي (Kore)</option><option value="Puck">صوت: شبابي (Puck)</option><option value="Charon">صوت: رصين (Charon)</option><option value="Aoede">صوت: ناعم (Aoede)</option></select>
  <button class="btn pri" id="st-mk">🎬 اصنع الفيديو</button>
  <p class="note" id="st-prog">سيب التاب مفتوح وظاهر وقت التصنيع، لأن المتصفح بيوقف التصنيع لو التاب اتخبّى. الصوت بيستخدم مفتاح Gemini بتاعك.</p>
  <video id="st-video" controls playsinline class="hide" style="width:100%;max-height:420px;border-radius:10px"></video>
  <a class="btn hide" id="st-dl">تحميل الفيديو</a></div>`;
const host = document.querySelector("main") || document.body; host.appendChild(sec);

const frTxt = () => { $("#st-fr").textContent = `بداية: ${intro ? "✓" : "—"} · نهاية: ${outro ? "✓" : "—"} (كل واحدة بتظهر حوالي 2.5 ثانية)`; };
$("#st-own").onchange = e => { [...e.target.files].forEach(f => state.scenes.push({ narration: "", image_prompt: "", own: true, url: URL.createObjectURL(f), seed: 1 })); e.target.value = ""; render(); toast("اكتب تعليق لكل صورة (أو سيبه فاضي = صورة 3 ثواني من غير صوت)", 5000); };
$("#st-in").onchange = e => { if (e.target.files[0]) { intro = URL.createObjectURL(e.target.files[0]); frTxt(); render(); } };
$("#st-out").onchange = e => { if (e.target.files[0]) { outro = URL.createObjectURL(e.target.files[0]); frTxt(); render(); } };
function render() {
  $("#st-vid").classList.toggle("hide", !state.scenes.some(x => x.seed) && !intro && !outro);
  const box = $("#st-scenes"); if (!state.scenes.length) { box.innerHTML = ""; return; }
  box.innerHTML = `<div class="box"><div class="lbl">المشاهد (${state.scenes.length}) <span>عدّل أي نص قبل الصور</span></div>` + state.scenes.map((s, i) => `
   <div class="box" data-i="${i}"><div class="lbl">مشهد ${i + 1}</div>
    <div style="display:flex;gap:10px"><div style="flex:1">
     <textarea class="st-nar" rows="2" placeholder="التعليق الصوتي">${esc(s.narration)}</textarea>
     ${s.own ? "" : `<textarea class="st-ip" rows="2" dir="ltr" placeholder="image prompt">${esc(s.image_prompt)}</textarea>`}
     <div class="two">${s.own ? "" : `<button class="btn sm st-gen">${s.seed ? "صورة تانية" : "ولّد الصورة"}</button>`}<button class="btn sm st-up">▲</button><button class="btn sm st-dn">▼</button><button class="btn sm st-del">حذف</button><a class="btn sm ${s.seed ? "" : "hide"}" target="_blank" rel="noopener" href="${s.seed ? src(s) : "#"}">فتح/حفظ</a></div></div>
     <div style="width:96px;aspect-ratio:${FMT[state.fmt||"vert"][1]}/${FMT[state.fmt||"vert"][2]};max-height:170px;border-radius:10px;background:#0002;overflow:hidden;flex:none">${s.seed ? `<img src="${src(s)}" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.alt='فشلت — جرّب صورة تانية'">` : ""}</div></div></div>`).join("") +
   `<button class="btn" id="st-all">ولّد كل الصور</button></div>`;
  box.querySelectorAll("[data-i]").forEach(el => { const i = +el.dataset.i;
    el.querySelector(".st-nar").oninput = e => { state.scenes[i].narration = e.target.value; save(); };
    const ip = el.querySelector(".st-ip"); if (ip) ip.oninput = e => { state.scenes[i].image_prompt = e.target.value; save(); };
    const gn = el.querySelector(".st-gen"); if (gn) gn.onclick = () => { state.scenes[i].seed = Math.floor(Math.random() * 1e6); save(); render(); };
    const mv = d => { const j = i + d; if (j < 0 || j >= state.scenes.length) return; [state.scenes[i], state.scenes[j]] = [state.scenes[j], state.scenes[i]]; save(); render(); };
    el.querySelector(".st-up").onclick = () => mv(-1); el.querySelector(".st-dn").onclick = () => mv(1);
    el.querySelector(".st-del").onclick = () => { state.scenes.splice(i, 1); save(); render(); }; });
  $("#st-all").onclick = () => { state.scenes.forEach(s => { if (!s.own) s.seed = Math.floor(Math.random() * 1e6); }); save(); render(); };
}

async function makeScenes() {
  const idea = $("#st-idea").value.trim(); if (!idea) return toast("اكتب الفكرة الأول");
  if (!window.APAI || !window.APAI.hasKey()) return toast("ضيف مفتاح AI في الإعدادات الأول (Gemini مجاني)", 6000);
  const n = +$("#st-n").value, style = STYLES[$("#st-style").value], b = $("#st-go"); b.disabled = true; b.textContent = "بيكتب…";
  const prompt = `اكتب سيناريو فيديو قصير من ${n} مشاهد بالظبط. شكل الفيديو: ${FMT[state.fmt || "vert"][0]}.\nالفكرة: ${idea}\nالنوع: ${style}\nلكل مشهد: "narration" جملة أو جملتين بالعامية المصرية البسيطة تتقال بصوت (حوالي 5 ثواني)، و"image_prompt" وصف بصري بالإنجليزي واضح ومحدد للصورة (العناصر، الإضاءة، زاوية الكاميرا، الأسلوب) من غير نصوص مكتوبة داخل الصورة. أول مشهد لازم يشد الانتباه في أول ثانيتين، وآخر مشهد فيه دعوة لتصرف (CTA).\nرجّع JSON فقط بالشكل: {"scenes":[{"narration":"...","image_prompt":"..."}]}`;
  try { const t = await window.APAI.ask([{ text: prompt }], true); const j = window.APAI.parseJSON(t); const sc = (j.scenes || j).filter(x => x && x.narration);
    if (!sc.length) throw new Error("الرد مش بالشكل المطلوب — جرّب تاني");
    let fin = sc;
    if ($("#st-dir").checked) { b.textContent = "المخرج بيراجع…"; try { const rv = await window.APAI.ask([{ text: `إنت مخرج فيديوهات سوشيال ميديا محترف. راجع السيناريو ده وحسّنه: خلّي التعليق الصوتي أقصر وأقوى وأطبيعي بالعامية المصرية (جملة أو جملتين لكل مشهد، حوالي 5 ثواني)، وزوّد تفاصيل بصرية في image_prompt (إضاءة، زاوية، حركة) وخلّي الصور متناسقة في الأسلوب والألوان، ومتغيّرش عدد المشاهد (${sc.length}). الفكرة: ${idea}\nالسيناريو الحالي:\n${JSON.stringify({ scenes: sc })}\nرجّع JSON بنفس الشكل فقط.` }], true);
        const j2 = window.APAI.parseJSON(rv), s2 = (j2.scenes || j2).filter(x => x && x.narration); if (s2.length === sc.length) fin = s2; } catch (e) { toast("المراجعة فشلت، هستخدم النسخة الأولى", 4000); } }
    state.idea = idea; state.scenes = fin.map(x => ({ narration: String(x.narration), image_prompt: String(x.image_prompt || ""), seed: 0 })); save(); render(); return true; }
  catch (e) { toast(e.message, 7000); return false; } finally { b.disabled = false; b.textContent = "اكتب المشاهد"; }
}
$("#st-go").onclick = makeScenes;
async function suggest(btn, label) {
  if (!window.APAI || !window.APAI.hasKey()) { toast("ضيف مفتاح AI في الإعدادات الأول (Gemini مجاني)", 6000); return null; }
  const hint = $("#st-idea").value.trim(), style = STYLES[$("#st-style").value]; btn.disabled = true; btn.textContent = "بيفكر…";
  const used = (state.used || []).slice(-15).join(" | ");
  const prompt = `اقترح 5 أفكار فيديوهات قصيرة مختلفة ومبتكرة ومناسبة للنشر على السوشيال ميديا في مصر.\nالنوع: ${style}\n${hint ? "اتجاه من المستخدم: " + hint + "\n" : ""}${used ? "أفكار اتعملت قبل كده (متكررهاش): " + used + "\n" : ""}كل فكرة لازم يكون ليها هوك قوي في أول ثانيتين. لكل فكرة: "title" عنوان قصير، و"idea" وصف في جملتين.\nرجّع JSON فقط: {"ideas":[{"title":"...","idea":"..."}]}`;
  try { const j = window.APAI.parseJSON(await window.APAI.ask([{ text: prompt }], true)); const a = (j.ideas || j).filter(x => x && x.idea); if (!a.length) throw new Error("مفيش أفكار — جرّب تاني"); return a; }
  catch (e) { toast(e.message, 7000); return null; } finally { btn.disabled = false; btn.textContent = label; }
}
const useIdea = x => { $("#st-idea").value = x.idea; state.used = [...(state.used || []), x.title].slice(-40); save(); };
$("#st-sug").onclick = async () => { const a = await suggest($("#st-sug"), "🎲 اقترح أفكار"); if (!a) return;
  $("#st-ideas").innerHTML = a.map((x, i) => `<div class="box"><b>${esc(x.title)}</b><div class="note">${esc(x.idea)}</div><button class="btn sm" data-k="${i}">استخدم الفكرة دي</button></div>`).join("");
  $("#st-ideas").querySelectorAll("[data-k]").forEach(bn => bn.onclick = () => { useIdea(a[+bn.dataset.k]); $("#st-ideas").innerHTML = ""; toast("اتحطت — دوس «اكتب المشاهد»"); }); };
// full auto: invent an idea, write the scenes, generate every image
$("#st-auto").onclick = async () => { const a = await suggest($("#st-auto"), "⚡ فكرة ومشاهد لوحدك"); if (!a) return;
  const x = a[0]; useIdea(x); $("#st-ideas").innerHTML = ""; toast("الفكرة: " + x.title, 4000);
  if (await makeScenes()) { state.scenes.forEach(s => { s.seed = Math.floor(Math.random() * 1e6); }); save(); render(); toast("جاهز — راجع المشاهد والصور قبل أي حاجة", 6000); } };
const dimTxt = () => { const [w, h] = dims(); $("#st-dim").textContent = `المقاس: ${w}×${h}. لو غيّرته بعد توليد الصور، دوس «ولّد كل الصور» تاني.`; };
$("#st-fmt").value = state.fmt || "vert"; $("#st-q").value = state.q || "std"; dimTxt();
$("#st-fmt").onchange = () => { state.fmt = $("#st-fmt").value; save(); dimTxt(); render(); };
$("#st-im").value = state.im === undefined ? "flux" : state.im; $("#st-im").onchange = () => { state.im = $("#st-im").value; save(); render(); };
$("#st-q").onchange = () => { state.q = $("#st-q").value; save(); dimTxt(); render(); };
if (state.idea) $("#st-idea").value = state.idea; render();

// ---------------------------------------------------------------- video: voice (Gemini TTS) + Ken Burns images + captions -> recorded in the browser
const wait = ms => new Promise(r => setTimeout(r, ms));
async function tts(text, voice, ctx) {
  const key = ls.get("ap_gemini"); if (!key) return null;
  for (const m of ["gemini-3.1-flash-tts-preview", "gemini-3.8-flash-tts"]) {
    try { const c = new AbortController(), t = setTimeout(() => c.abort(), 40000);
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: "POST", signal: c.signal, headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } }) }); clearTimeout(t);
      if (!r.ok) continue; const p = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.inlineData; if (!p) continue;
      const bin = Uint8Array.from(atob(p.data), ch => ch.charCodeAt(0));
      if (/wav|mpeg|mp3|ogg/i.test(p.mimeType)) return await ctx.decodeAudioData(bin.buffer.slice(0));
      const rate = +(p.mimeType.match(/rate=(\d+)/)?.[1] || 24000), n = Math.floor(bin.length / 2), dv = new DataView(bin.buffer), buf = ctx.createBuffer(1, n, rate), ch = buf.getChannelData(0);
      for (let i = 0; i < n; i++) ch[i] = dv.getInt16(i * 2, true) / 32768; return buf;
    } catch (e) {} }
  return null;
}
// Pollinations is free but rate-limited (answers 402/429 now and then) -> retry with a pause
async function bitmap(url) { let last = "الصورة فشلت";
  const alt = url.startsWith("blob:") ? [url] : [url, url.replace(/&model=\w+/, "") + (url.includes("&model=flux") ? "&model=turbo" : "&model=flux"), url.replace(/&model=\w+/, "")];
  for (let a = 0; a < 8; a++) { try { const r = await fetch(alt[a % alt.length]); const ct = r.headers.get("content-type") || "";
      if (r.ok && ct.startsWith("image/")) return await createImageBitmap(await r.blob()); last = "خدمة الصور مشغولة (" + r.status + ")"; } catch (e) { last = "الصورة فشلت"; }
    await wait(2500 + a * 2500); }
  throw new Error(last + " — جرّب كمان شوية"); }
function wrap(ctx, text, maxW) { const words = text.split(/\s+/), lines = []; let cur = ""; for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; }

async function makeVideo() {
  const btn = $("#st-mk"), prog = $("#st-prog"), voice = $("#st-voice").value, [W, H] = dims(), q = state.q || "std";
  const sc = state.scenes.filter(x => x.seed); if (!sc.length && !intro && !outro) return toast("ولّد الصور أو ضيف صورك الأول");
  if (typeof MediaRecorder === "undefined") return toast("المتصفح ده مش بيدعم تصنيع الفيديو — جرّب Chrome أو Safari حديث", 7000);
  btn.disabled = true; $("#st-video").classList.add("hide"); $("#st-dl").classList.add("hide");
  try {
    const AC = window.AudioContext || window.webkitAudioContext, actx = new AC(); await actx.resume();
    const items = []; let noVoice = false;
    const list = [...(intro ? [{ url: intro, text: $("#st-in-t").value.trim(), fixed: 2.5 }] : []), ...sc.map(x => ({ url: src(x), text: x.narration.trim(), voice: true })), ...(outro ? [{ url: outro, text: $("#st-out-t").value.trim(), fixed: 2.5 }] : [])];
    for (let i = 0; i < list.length; i++) { prog.textContent = `بحضّر ${i + 1} من ${list.length} (صورة + صوت)…`; const L = list[i];
      const au = L.voice && L.text ? await tts(L.text, voice, actx) : null, img = await bitmap(L.url);
      if (L.voice && L.text && !au) noVoice = true; items.push({ img, au, text: L.text, dur: au ? au.duration + 0.5 : (L.fixed || 3) }); }
    const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H; const g = canvas.getContext("2d");
    const vs = canvas.captureStream(30), dest = actx.createMediaStreamDestination();
    const stream = new MediaStream([...vs.getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const mime = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"].find(m => MediaRecorder.isTypeSupported(m)) || "";
    const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: { draft: 2.5e6, std: 5e6, high: 8e6 }[q] }), chunks = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const total = items.reduce((a, x) => a + x.dur, 0), starts = []; let acc = 0; items.forEach(x => { starts.push(acc); acc += x.dur; });
    const done = new Promise(r => { rec.onstop = r; });
    const fs = Math.round(W * 0.052);
    const draw = t => { // t seconds
      let i = starts.findIndex((s, k) => t >= s && (k === items.length - 1 || t < starts[k + 1])); const it = items[i], p = Math.min(1, (t - starts[i]) / it.dur);
      g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
      const zoom = 1.04 + 0.12 * (i % 2 ? 1 - p : p), sw = it.img.width, sh = it.img.height, sr = Math.max(W / sw, H / sh) * zoom, dw = sw * sr, dh = sh * sr;
      g.drawImage(it.img, (W - dw) / 2 + (i % 2 ? 1 : -1) * (p - 0.5) * W * 0.04, (H - dh) / 2, dw, dh);
      const grd = g.createLinearGradient(0, H * 0.62, 0, H); grd.addColorStop(0, "rgba(0,0,0,0)"); grd.addColorStop(1, "rgba(0,0,0,.7)"); g.fillStyle = grd; g.fillRect(0, H * 0.62, W, H * 0.38);
      g.font = `700 ${fs}px "Segoe UI", Tahoma, Arial, sans-serif`; g.direction = "rtl"; g.textAlign = "center"; g.textBaseline = "alphabetic";
      const lines = wrap(g, it.text, W * 0.84), lh = fs * 1.35; let y = H * 0.9 - (lines.length - 1) * lh; g.lineWidth = fs * 0.14; g.lineJoin = "round";
      g.globalAlpha = Math.min(1, p * 8); for (const l of lines) { g.strokeStyle = "rgba(0,0,0,.85)"; g.strokeText(l, W / 2, y); g.fillStyle = "#fff"; g.fillText(l, W / 2, y); y += lh; } g.globalAlpha = 1; };
    draw(0); rec.start(250); const t0 = actx.currentTime + 0.3;
    items.forEach((x, k) => { if (!x.au) return; const s = actx.createBufferSource(); s.buffer = x.au; s.connect(dest); s.start(t0 + starts[k]); });
    await new Promise(res => { const tick = () => { const t = actx.currentTime - t0; if (t >= total) return res(); draw(Math.max(0, t)); prog.textContent = `بصنّع الفيديو… ${Math.min(99, Math.round(t / total * 100))}% (سيب التاب ظاهر)`; setTimeout(tick, 33); }; tick(); });
    await wait(300); rec.stop(); await done; actx.close();
    const type = (rec.mimeType || mime || "video/webm").split(";")[0], blob = new Blob(chunks, { type }), url = URL.createObjectURL(blob), ext = type.includes("mp4") ? "mp4" : "webm";
    const v = $("#st-video"); v.src = url; v.classList.remove("hide"); const a = $("#st-dl"); a.href = url; a.download = `autopost-studio.${ext}`; a.classList.remove("hide");
    prog.textContent = `خلص ✓ ${W}×${H} · ${Math.round(total)} ثانية · ${ext.toUpperCase()}${noVoice ? " · من غير صوت (محتاج مفتاح Gemini)" : ""}${ext === "webm" ? " — لو عايزه mp4 لتيك توك حوّله أو جرّب Chrome/Safari حديث" : ""}`;
  } catch (e) { prog.textContent = "فشل: " + e.message; toast(e.message, 7000); } finally { btn.disabled = false; }
}
$("#st-mk").onclick = makeVideo; frTxt();
})();
