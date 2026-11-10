// AutoPost Studio — step 1: idea -> scenes (script + image prompts) -> images. Free: text from your AI team, images from Pollinations (no key).
(() => {
"use strict";
const $ = s => document.querySelector(s), ls = { get: (k, d = "") => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
const toast = (t, ms) => window.toast && window.toast(t, ms);
const pushKeys = () => { try { window.apSyncKeys && window.apSyncKeys.push().then(ok => ok && toast("المفتاح اتزامن لباقي أجهزتك ✓", 3000)).catch(() => {}); } catch (e) {} };
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const NICHES = { any: "أي مجال (عام)", ads: "إعلان منتج / خدمة", edu: "تعليمي ونصايح", photo: "تصوير (فوتو وفيديو)", edit: "مونتاج وتحرير فيديو", photoedu: "تعليم التصوير", editedu: "تعليم المونتاج", re: "عقارات", food: "أكل ومطاعم", fit: "صحة ولياقة", beauty: "موضة وجمال", tech: "تقنية وذكاء اصطناعي", travel: "سفر وأماكن", kids: "أطفال وقصص", motiv: "تحفيز وتطوير ذات", fun: "كوميدي وترفيه", news: "أخبار وترند", custom: "مجال تاني (اكتبه)" };
const niche = () => { const k = ($("#st-style") || {}).value || "any", c = ($("#st-niche") || {}).value || ""; return k === "custom" ? (c.trim() || "أي مجال") : k === "any" ? "أي مجال — نوّع الأفكار بين مجالات مختلفة ومتجددة" : NICHES[k]; };
let state = (() => { try { return JSON.parse(ls.get("ap_studio")) || {}; } catch (e) { return {}; } })();
state.scenes = (state.scenes || []).filter(x => !x.own).map(x => ({ ...x, url: undefined })); let intro = null, outro = null;
const save = () => ls.set("ap_studio", JSON.stringify({ ...state, scenes: state.scenes.filter(x => !x.own).map(x => ({ ...x, url: undefined })) }));
const IP = { pol: { n: "Pollinations (مجاني، من غير مفتاح)" }, hf: { n: "Hugging Face FLUX (رصيد مجاني شهري)", k: "ap_key_hf", link: "https://huggingface.co/settings/tokens" },
  together: { n: "Together FLUX (مجاني/رخيص)", k: "ap_key_together", link: "https://api.together.ai/settings/api-keys" }, fal: { n: "fal.ai FLUX (رصيد تجريبي)", k: "ap_key_fal", link: "https://fal.ai/dashboard/keys" } };
const ip = () => IP[state.ip] ? state.ip : "pol";
const hasImg = s => s.own || (ip() === "pol" ? !!s.seed : !!s.url);
const src = s => (s.own || s.url) ? s.url : imgUrl(s.image_prompt, s.seed);
const b64blob = (b64, type) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type }); };
// one image from a key-based provider -> blob url (kept in memory only)
async function genKeyed(sc) { const p = ip(), key = ls.get(IP[p].k), [w, h] = dims(), r16 = n => Math.min(1440, Math.max(256, Math.round(n / 32) * 32)), W = r16(w), H = r16(h); if (!key) throw new Error("ضيف مفتاح " + IP[p].n.split(" ")[0]);
  let blob;
  if (p === "hf") { const r = await fetch("https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", Accept: "image/png" }, body: JSON.stringify({ inputs: sc.image_prompt, parameters: { width: W, height: H } }) });
    if (!r.ok) throw new Error("Hugging Face " + r.status + (r.status === 402 ? ": خلص الرصيد الشهري" : r.status === 401 ? ": المفتاح غلط" : "")); blob = await r.blob(); }
  else if (p === "together") { const r = await fetch("https://api.together.xyz/v1/images/generations", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify({ model: "black-forest-labs/FLUX.1-schnell-Free", prompt: sc.image_prompt, width: W, height: H, steps: 4, n: 1, response_format: "b64_json" }) });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error("Together: " + (d.error?.message || r.status)); blob = b64blob(d.data[0].b64_json, "image/png"); }
  else { const r = await fetch("https://fal.run/fal-ai/flux/schnell", { method: "POST", headers: { Authorization: "Key " + key, "Content-Type": "application/json" }, body: JSON.stringify({ prompt: sc.image_prompt, image_size: { width: W, height: H }, num_images: 1 }) });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error("fal.ai: " + (d.detail?.[0]?.msg || d.detail || r.status)); const ir = await fetch(d.images[0].url); blob = await ir.blob(); }
  if (sc.url) URL.revokeObjectURL(sc.url); sc.url = URL.createObjectURL(blob); sc.seed = 1; }
async function genScenes(list) { if (ip() === "pol") { list.forEach(x => { x.seed = Math.floor(Math.random() * 1e6); }); save(); render(); return; }
  for (let k = 0; k < list.length; k++) { toast(`بولّد صورة ${k + 1} من ${list.length}…`, 60000); try { await genKeyed(list[k]); render(); } catch (e) { toast(e.message, 8000); return; } } toast("الصور خلصت", 2500); }
// where the video will be used -> shape; quality -> size of the shortest edge
const FMT = { vert: ["تيك توك / ريلز / شورتس (9:16)", 9, 16], wide: ["يوتيوب / فيديو عريض (16:9)", 16, 9], feed: ["إنستجرام فيد (4:5)", 4, 5], sq: ["مربع: فيسبوك / لينكدإن (1:1)", 1, 1] };
const QUAL = { draft: ["مسودة سريعة (540)", 540], std: ["عادي (720)", 720], high: ["عالي (1080)", 1080] };
const dims = () => { const f = FMT[state.fmt || "vert"], q = QUAL[state.q || "std"][1], r16 = n => Math.round(n / 16) * 16, k = q / Math.min(f[1], f[2]); return [r16(f[1] * k), r16(f[2] * k)]; };
const IMGM = { flux: "Flux (أحسن جودة)", turbo: "Turbo (أسرع)", "": "تلقائي" };
const imgUrl = (p, seed) => { const [w, h] = dims(), m = state.im === undefined ? "flux" : state.im; return `https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=${w}&height=${h}&nologo=true&seed=${seed}${m ? "&model=" + m : ""}`; };

const sec = document.createElement("section"); sec.id = "studio"; sec.className = "hide";
sec.innerHTML = `<div class="two" id="st-modes"><button class="btn sm pri" data-m="img">🖼 صور</button><button class="btn sm" data-m="vid">🎥 فيديو (AI)</button><button class="btn sm" data-m="show">🎞 صور ← فيديو</button><button class="btn sm" data-m="voice">🎙 صوت</button><button class="btn sm" data-m="song">🎵 أغاني</button></div>
 <div class="box">
  <div class="lbl">الفيديو لإيه؟ <span>بيحدد المقاس</span></div>
 <select id="st-fmt">${Object.entries(FMT).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join("")}</select>
 <div class="lbl">الجودة</div>
 <select id="st-q">${Object.entries(QUAL).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join("")}</select>
<p class="note" id="st-dim"></p>
 <div id="st-nichebox">
 <div class="lbl">النوع <span>بيأثر على الأفكار والبرومبت</span></div>
 <select id="st-style">${Object.entries(NICHES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
 <input id="st-niche" class="hide" placeholder="اكتب مجالك: مثلاً مطعم كشري، عيادة أسنان، محل موبايلات…">
 </div>
 <div id="st-provbox"> <div class="lbl">مصدر الصور</div>
 <select id="st-ip">${Object.entries(IP).map(([k, v]) => `<option value="${k}">${v.n}</option>`).join("")}</select>
 <div class="two hide" id="st-ipk"><input id="st-ipkey" type="password" autocomplete="off" placeholder="المفتاح" dir="ltr"><a class="btn sm" id="st-iplink" target="_blank" rel="noopener">هات المفتاح</a></div>
 <div class="lbl">موديل Pollinations</div>
 <select id="st-im">${Object.entries(IMGM).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
</div></div>

 <div id="m-img"><div class="box"><div class="lbl">برومبت الصور</div>
  <textarea id="st-ipr" rows="3" placeholder="اوصف الصورة اللي عايزها (أي مجال)، بالعربي أو الإنجليزي"></textarea>
  <label class="chk"><input type="checkbox" id="st-enh" checked> الـAI يحسّن البرومبت لوحده (بالإنجليزي، تفاصيل أكتر)</label>
  <div class="two"><select id="st-icount">${[1, 2, 3, 4, 6].map(n => `<option ${n === 2 ? "selected" : ""}>${n}</option>`).join("")}</select><button class="btn pri" id="st-igo">🖼 ولّد الصور</button></div>
  <div id="st-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:8px"></div>
  <button class="btn hide" id="st-i2v">🎞 حوّل الصور دي لفيديو بصوت</button></div></div>

 <div id="m-vid" class="hide"><div class="box"><div class="lbl">توليد فيديو بالـAI <span>مدفوع غالباً (رصيد تجريبي عند التسجيل)</span></div>
  <textarea id="st-vpr" rows="3" placeholder="اوصف المشهد: الحركة، الكاميرا، الإضاءة. بأي مجال"></textarea>
  <label class="chk"><input type="checkbox" id="st-venh" checked> الـAI يحسّن البرومبت لوحده</label>
  <div class="lbl">مين يولّد الفيديو؟</div>
  <select id="st-veng"><option value="hf">مفتوح المصدر — Hugging Face (LTX / Wan) — مجاني</option><option value="fal">fal.ai (LTX وغيره) — رصيد تجريبي</option><option value="veo">Veo — Google AI Studio (مدفوع، بمفتاح Gemini)</option><option value="sora">Sora — OpenAI / ChatGPT (مدفوع، بمفتاح OpenAI)</option></select>
  <p class="note hide" id="st-vengnote"></p>
  <div id="st-hfbox"><div class="lbl">الموديل (مفتوح المصدر)</div><select id="st-hfm"><option value="ltx">LTX-Video — نص أو صورة ← فيديو (سريع)</option><option value="wan">Wan 2.2 — صورة ← فيديو (جودة أعلى، لازم صورة بداية)</option></select><div class="two"><input id="st-hftok" type="password" autocomplete="off" placeholder="توكن Hugging Face (اختياري — بيزوّد الحصة)" dir="ltr"><a class="btn sm" target="_blank" rel="noopener" href="https://huggingface.co/settings/tokens">هات التوكن</a></div></div>
  <div id="st-falbox"><div class="lbl">الموديل (fal.ai)</div>
  <select id="st-vm"><option value="fal-ai/ltx-video">LTX Video — نص ← فيديو (رخيص)</option><option value="fal-ai/ltx-video/image-to-video">LTX Video — صورة ← فيديو</option><option value="custom">موديل تاني (اكتب الاسم)</option></select>
  <input id="st-vcustom" class="hide" dir="ltr" placeholder="مثال: fal-ai/wan/v2.2-a14b/text-to-video">
  <div class="two"><input id="st-vkey" type="password" autocomplete="off" placeholder="مفتاح fal.ai" dir="ltr"><a class="btn sm" target="_blank" rel="noopener" href="https://fal.ai/dashboard/keys">هات المفتاح</a></div>
  <label class="btn sm" style="display:block;text-align:center">🖼 صورة بداية للفيديو (لموديلات صورة ← فيديو)<input type="file" id="st-vimg" accept="image/*" hidden></label></div>
  <button class="btn pri" id="st-vgo">🎥 ولّد الفيديو</button>
  <p class="note" id="st-vprog">التوليد بياخد دقيقة أو أكتر، وبيتحاسب على رصيد fal.ai. الفيديو الناتج قصير (كام ثانية).</p>
  <video id="st-vout" controls playsinline class="hide" style="width:100%;max-height:420px;border-radius:10px"></video>
  <a class="btn hide" id="st-vdl" target="_blank" rel="noopener" download>تحميل / فتح الفيديو</a></div></div>

 <div id="m-aud" class="hide"><div class="box"><div class="lbl" id="st-atitle">تعليق صوتي</div>
  <div id="a-purpose" class="hide"><div class="lbl">الغرض من الأغنية</div><select id="st-apurp"><option value="">عامة</option><option value="jingle">جِنجل / أغنية إعلان لبراند</option><option value="kids">أغنية أطفال تعليمية</option><option value="motiv">أغنية تحفيزية</option><option value="bg">موسيقى خلفية للفيديو (من غير كلام)</option><option value="intro">إنترو / أوتـرو لقناة</option><option value="love">رومانسية</option><option value="fun">كوميدي / ساخرة</option><option value="mahraganat">مهرجانات</option><option value="shaabi">شعبي</option><option value="bday">عيد ميلاد / حفلة</option><option value="wedding">زفاف / خطوبة</option><option value="ramadan">رمضان / عيد</option><option value="nation">وطنية</option><option value="sport">رياضية / تشجيع</option><option value="game">ألعاب / جيمنج</option><option value="calm">هادية للنوم / تأمل</option><option value="rap">راب</option></select></div>
  <textarea id="st-atx" rows="5" placeholder="اكتب النص اللي يتقال، أو وصف الأغنية (النوع، المزاج، اللغة)"></textarea>
  <button class="btn sm" id="st-awrite">✍️ فريق الـAI يكتب النص / الكلمات</button>
  <div id="a-voice"><div class="lbl">مين يقرا؟</div>
   <select id="st-aeng"><option value="gemini">Gemini (Google AI Studio) — مجاني</option><option value="om">OmniVoice (مفتوح المصدر، عربي مصري) — مجاني</option><option value="cb">Chatterbox (مفتوح المصدر، عربي) — مجاني، يحتاج توكن HF</option><option value="eleven">ElevenLabs — رصيد مجاني شهري (للاستخدام غير التجاري)</option><option value="openai">OpenAI TTS (ChatGPT) — مدفوع</option></select>
   <div class="two hide" id="st-ahfbox"><input class="hftok2" type="password" autocomplete="off" placeholder="توكن Hugging Face مجاني (بيزوّد الحصة)" dir="ltr"><a class="btn sm" target="_blank" rel="noopener" href="https://huggingface.co/settings/tokens">هات التوكن</a></div>
   <div class="two hide" id="st-akbox"><input id="st-akey" type="password" autocomplete="off" placeholder="مفتاح ElevenLabs" dir="ltr"><a class="btn sm" target="_blank" rel="noopener" href="https://elevenlabs.io/app/settings/api-keys">هات المفتاح</a></div>
   <select id="st-avoice"><option value="Kore">Kore — هادي</option><option value="Puck">Puck — شبابي</option><option value="Charon">Charon — رصين</option><option value="Aoede">Aoede — ناعم</option></select>
   <input id="st-astyle" placeholder="أسلوب الأداء (اختياري): حماسي / هادي / إعلان فخم" dir="rtl"></div>
  <div id="a-song" class="hide">
  <div id="a-sset" class="box" style="margin:8px 0"><div class="lbl">إعدادات الأغنية <span>كل اختيار بيدخل في البرومبت</span></div>
   <div class="lbl">المغني</div>
   <select id="st-sg-singer"><option value="">سيب الـAI يختار</option><option value="male">مغني (رجل)</option><option value="female">مغنية (ست)</option><option value="duet">ديو رجل وست</option><option value="choir">كورال / مجموعة</option><option value="kid">صوت طفل</option><option value="instr">من غير غناء (موسيقى بس)</option></select>
   <select id="st-sg-vstyle"><option value="">أسلوب الأداء: تلقائي</option><option value="soft">ناعم وحساس</option><option value="powerful">قوي وعالي</option><option value="raspy">خشن</option><option value="rap">راب / إلقاء إيقاعي</option><option value="whisper">همس</option><option value="autotune">أوتوتيون عصري</option><option value="tarab">طربي بمواويل</option></select>
   <select id="st-sg-lang"><option value="ar-eg">عامية مصرية</option><option value="ar">عربي فصحى</option><option value="ar-gulf">خليجي</option><option value="ar-lev">شامي</option><option value="en">إنجليزي</option><option value="fr">فرنساوي</option><option value="none">من غير كلمات</option></select>
   <div class="lbl">اللون الموسيقي</div>
   <select id="st-sg-genre"><option value="">تلقائي</option><option value="pop">بوب</option><option value="mahraganat">مهرجانات</option><option value="shaabi">شعبي</option><option value="oriental">شرقي / طرب</option><option value="hiphop">هيب هوب / تراب</option><option value="edm">إلكترونيك / EDM</option><option value="rock">روك</option><option value="acoustic">أكوستيك</option><option value="lofi">لو-فاي هادي</option><option value="jazz">جاز</option><option value="cinematic">سينمائي ملحمي</option><option value="rnb">آر آند بي</option><option value="reggae">ريجي</option><option value="nubian">نوبي / فولكلور</option></select>
   <div class="lbl">الإيقاع والمزاج</div>
   <select id="st-sg-tempo"><option value="">السرعة: تلقائي</option><option value="60">بطيء جداً (60 BPM)</option><option value="80">بطيء (80 BPM)</option><option value="100">متوسط (100 BPM)</option><option value="120">سريع نسبياً (120 BPM)</option><option value="140">سريع (140 BPM)</option><option value="160">سريع جداً (160 BPM)</option></select>
   <select id="st-sg-mood"><option value="">المزاج: تلقائي</option><option value="happy">فرحان ومبهج</option><option value="energetic">حماسي وطاقة عالية</option><option value="sad">حزين</option><option value="romantic">رومانسي</option><option value="epic">ملحمي وقوي</option><option value="calm">هادي ومريح</option><option value="dark">غامض ومظلم</option><option value="nostalgic">نوستالجيا</option><option value="funny">مرح وكوميدي</option></select>
   <select id="st-sg-rhythm"><option value="">نوع الإيقاع: تلقائي</option><option value="steady">ثابت وبسيط</option><option value="syncopated">متقطّع / سينكوب</option><option value="maqsum">مقسوم / إيقاع شرقي</option><option value="four">4 على الأرض (دانس)</option><option value="trap">تراب (هاي هات سريعة)</option><option value="swing">سوينج</option></select>
   <div class="lbl">الآلات <span>اختر لحد 3</span></div>
   <select id="st-sg-inst" multiple size="5"><option value="guitar">جيتار</option><option value="piano">بيانو</option><option value="oud">عود</option><option value="qanun">قانون</option><option value="nay">ناي</option><option value="violin">كمان</option><option value="tabla">طبلة / دربكة</option><option value="drums">درامز</option><option value="bass">بيس</option><option value="synth">سينث</option><option value="brass">نحاسيات</option><option value="strings">أوركسترا وترية</option><option value="accordion">أكورديون</option><option value="mizmar">مزمار / أرغول</option></select>
   <div class="lbl">البنية والمدة</div>
   <select id="st-sg-struct"><option value="">بنية تلقائية</option><option value="verse-chorus">كوبليه ومذهب</option><option value="hook">مذهب متكرر بس (هوك)</option><option value="intro-verse-chorus-outro">إنترو + كوبليه + مذهب + خاتمة</option><option value="loop">لوب موسيقي بسيط</option></select>
   <select id="st-sg-dur"><option value="15">15 ثانية</option><option value="30">30 ثانية</option><option value="60">دقيقة</option><option value="120">دقيقتين</option></select>
   <input id="st-sg-extra" placeholder="ملاحظات زيادة (اختياري): زي مرجع مشابه أو كلمة لازم تتكرر" dir="rtl">
  </div>
   <div class="lbl">مين يولّد الموسيقى؟</div>
   <select id="st-seng"><option value="mm">MiniMax Music 3 (مفتوح/مجاني، أغنية بصوت مغني) — HF</option><option value="mg">MusicGen (مفتوح المصدر، موسيقى بدون غنا) — HF</option><option value="lyria">Lyria — Google AI Studio (مدفوع، بمفتاح Gemini)</option><option value="fal">fal.ai (Stable Audio / MiniMax Music …)</option></select>
   <div class="two hide" id="st-shfbox"><input class="hftok2" type="password" autocomplete="off" placeholder="توكن Hugging Face مجاني (بيزوّد الحصة)" dir="ltr"><a class="btn sm" target="_blank" rel="noopener" href="https://huggingface.co/settings/tokens">هات التوكن</a></div>
   <div id="st-salt" class="hide"><select id="st-sm"><option value="fal-ai/stable-audio">Stable Audio — موسيقى</option><option value="fal-ai/minimax-music">MiniMax Music — أغنية بكلمات</option><option value="custom">موديل تاني (اكتب الاسم)</option></select>
   <input id="st-scustom" class="hide" dir="ltr" placeholder="slug من fal.ai"><p class="note">مفتاح fal.ai هو نفسه اللي في وضع الفيديو.</p></div>
   <p class="note">Lyria وfal مفيهمش حصة مجانية دايمة؛ لو الحساب مفيهوش رصيد هتظهر رسالة خطأ.</p></div>
  <button class="btn pri" id="st-ago">▶ ولّد</button>
  <p class="note" id="st-aprog"></p>
  <audio id="st-aout" controls class="hide" style="width:100%"></audio>
  <a class="btn hide" id="st-adl">تحميل</a></div></div>

 <details class="box" id="st-free"><summary class="lbl" style="cursor:pointer">🎁 فرص مجانية وبرامج للمطورين</summary>
  <p class="note">اتجمعت من مواقع تجميع وصفحات الشركات في نوفمبر 2026، والشروط بتتغيّر، فاتأكد منها قبل ما تبني عليها.</p>
  <ul class="note" style="line-height:1.9;padding-inline-start:18px">
   <li><b>Gemini API</b> — مستوى مجاني للنصوص والصوت. <a target="_blank" rel="noopener" href="https://aistudio.google.com/apikey">مفتاح</a></li>
   <li><b>Groq / Cerebras</b> — موديلات نصوص مجانية وسريعة. <a target="_blank" rel="noopener" href="https://console.groq.com/keys">Groq</a> · <a target="_blank" rel="noopener" href="https://cloud.cerebras.ai/platform">Cerebras</a></li>
   <li><b>OpenRouter</b> — موديلات مجانية بحد يومي صغير. <a target="_blank" rel="noopener" href="https://openrouter.ai/keys">مفتاح</a></li>
   <li><b>fal.ai</b> — رصيد تجريبي عند التسجيل للصور والفيديو والصوت، وصفحات بتذكر فيديو مجاني يومي لموديل MiniMax (غير مؤكد). <a target="_blank" rel="noopener" href="https://fal.ai/dashboard/keys">مفتاح</a></li>
   <li><b>ElevenLabs</b> — 10 آلاف رصيد شهرياً مجاناً (غير تجاري)، وفيه منح للشركات الناشئة. <a target="_blank" rel="noopener" href="https://elevenlabs.io/startup-grants">المنح</a></li>
   <li><b>Runware</b> — منحة للناشئين تصل لـ1000$ رصيد صور وفيديو. <a target="_blank" rel="noopener" href="https://runware.ai">الموقع</a></li>
   <li><b>Replicate · Stability AI</b> — حصص تجريبية صغيرة للصور والفيديو والموسيقى. <a target="_blank" rel="noopener" href="https://replicate.com">Replicate</a> · <a target="_blank" rel="noopener" href="https://platform.stability.ai">Stability</a></li>
   <li><b>Claude for Startups</b> — رصيد API للناشئين، والمؤسسين من غير تمويل ممكن يتقدموا. <a target="_blank" rel="noopener" href="https://claude.com/programs/startups">التفاصيل</a></li>
   <li><b>Google Cloud / NVIDIA Inception / Microsoft for Startups</b> — برامج رصيد سحابة ودعم للناشئين.</li>
   <li><b>Higgsfield API</b> — بيتحاسب بالاستخدام مش اشتراك. <a target="_blank" rel="noopener" href="https://higgsfield.ai/pricing">الصفحة</a></li>
  </ul></details>
 <div id="m-show" class="hide"><div class="box"><div class="lbl">الفكرة</div>
 <textarea id="st-idea" rows="3" placeholder="اكتب فكرتك في أي مجال، أو دوس «اقترح أفكار» وهو يختارلك"></textarea>
 <div class="box" style="margin:8px 0"><div class="lbl">صورك أنت <span>اختياري — الصور مبتتخزنش بعد قفل الصفحة</span></div>
  <label class="btn sm" style="display:block;text-align:center">➕ أضف صور ليك كمشاهد<input type="file" id="st-own" accept="image/*" multiple hidden></label>
  <div class="two"><label class="btn sm" style="text-align:center">🎞 صورة البداية<input type="file" id="st-in" accept="image/*" hidden></label><input id="st-in-t" placeholder="عنوان على البداية (اختياري)"></div>
  <div class="two"><label class="btn sm" style="text-align:center">🏁 صورة النهاية<input type="file" id="st-out" accept="image/*" hidden></label><input id="st-out-t" placeholder="نص النهاية: رقمك / اسم الحساب"></div>
  <p class="note" id="st-fr"></p></div>
 <div class="two"><button class="btn" id="st-sug">🎲 اقترح أفكار</button><button class="btn pri" id="st-auto">⚡ فكرة ومشاهد لوحدك</button></div>
 <div id="st-ideas"></div>
 <label class="chk"><input type="checkbox" id="st-dir" checked> مخرج AI يراجع السيناريو (فريقك كله يشتغل: واحد يكتب وواحد يراجع)</label>

 <select id="st-n">${[3, 4, 5, 6, 8].map(n => `<option ${n === 5 ? "selected" : ""}>${n}</option>`).join("")}</select>
 <button class="btn pri" id="st-go">اكتب المشاهد</button>
 <p class="note">الكتابة بفريق الـAI اللي في الإعدادات. مفيش حاجة بتتنشر لوحدها.</p></div>
 <div id="st-scenes"></div>
 <div class="box hide" id="st-vid"><div class="lbl">الفيديو <span>الصوت والتجميع جوه المتصفح، ببلاش</span></div>
  <select id="st-voice"><option value="Kore">صوت: هادي (Kore)</option><option value="Puck">صوت: شبابي (Puck)</option><option value="Charon">صوت: رصين (Charon)</option><option value="Aoede">صوت: ناعم (Aoede)</option></select>
  <button class="btn pri" id="st-mk">🎬 اصنع الفيديو</button>
  <p class="note" id="st-prog">سيب التاب مفتوح وظاهر وقت التصنيع، لأن المتصفح بيوقف التصنيع لو التاب اتخبّى. الصوت بيستخدم مفتاح Gemini بتاعك.</p>
  <video id="st-video" controls playsinline class="hide" style="width:100%;max-height:420px;border-radius:10px"></video>
  <a class="btn hide" id="st-dl">تحميل الفيديو</a></div></div>`;
const host = document.querySelector("main") || document.body; host.appendChild(sec);
if (window.HOST) {
  sec.innerHTML = `<div class="box">
    <div class="lbl">استوديو الذكاء الاصطناعي <span>يعمل بحساب المستخدم</span></div>
    <p class="note">سجّل الدخول مرة واحدة، ثم استخدم أقوى النماذج المتاحة من دون نسخ مفاتيح أو استهلاك رصيد مالك AutoPost. قد يحصل الحساب الجديد على استخدام مجاني محدود، وأي استخدام إضافي يكون على حساب المستخدم لدى الخدمة.</p>
    <button class="btn pri" id="st-p-login" style="width:100%;justify-content:center">متابعة بحساب AI</button>
    <div id="st-p-ready" class="hide">
      <div class="seg" id="st-p-mode"><button class="on" data-v="text">كتابة محتوى</button><button data-v="image">إنشاء صورة</button></div>
      <div class="lbl f">اكتب ما تريد إنشاءه</div>
      <textarea id="st-p-prompt" rows="5" placeholder="مثال: اكتب منشورًا إعلانيًا قصيرًا لمطعم مصري عن عرض نهاية الأسبوع"></textarea>
      <button class="btn pri" id="st-p-go" style="width:100%;justify-content:center;margin-top:10px">إنشاء</button>
      <p class="note" id="st-p-status"></p>
      <div id="st-p-result"></div>
    </div>
  </div>`;
  const login = sec.querySelector("#st-p-login"), ready = sec.querySelector("#st-p-ready"), status = sec.querySelector("#st-p-status"), result = sec.querySelector("#st-p-result");
  let mode = "text";
  const connected = () => {
    const ok = !!window.puter?.auth?.isSignedIn?.();
    login.textContent = ok ? "حساب AI متصل ✓" : "متابعة بحساب AI";
    ready.classList.toggle("hide", !ok);
    return ok;
  };
  login.onclick = async () => {
    if (!window.puter) return toast("تعذر تحميل خدمة AI — حدّث الصفحة وحاول مرة أخرى", 6000);
    if (connected()) return;
    login.disabled = true;
    try { await puter.auth.signIn(); connected(); }
    catch (e) { toast("لم يكتمل تسجيل الدخول", 5000); }
    finally { login.disabled = false; }
  };
  sec.querySelectorAll("#st-p-mode button").forEach(b => b.onclick = () => {
    mode = b.dataset.v; sec.querySelectorAll("#st-p-mode button").forEach(x => x.classList.toggle("on", x === b));
    sec.querySelector("#st-p-prompt").placeholder = mode === "text" ? "مثال: اكتب منشورًا إعلانيًا قصيرًا لمطعم مصري عن عرض نهاية الأسبوع" : "مثال: صورة إعلانية احترافية لوجبة مصرية، إضاءة دافئة، من دون كتابة داخل الصورة";
  });
  sec.querySelector("#st-p-go").onclick = async e => {
    if (!connected()) return login.click();
    const prompt = sec.querySelector("#st-p-prompt").value.trim(); if (!prompt) return toast("اكتب وصفًا أولًا");
    const btn = e.currentTarget; btn.disabled = true; result.innerHTML = ""; status.textContent = mode === "text" ? "جارٍ إعداد المحتوى بأفضل نموذج متاح…" : "جارٍ إنشاء الصورة بأعلى جودة متاحة…";
    try {
      if (mode === "text") {
        const full = `اكتب محتوى سوشيال ميديا احترافيًا بالعربية المصرية الطبيعية. لا تخترع أسعارًا أو معلومات غير موجودة. ابدأ بجملة جذابة، ثم الفكرة بوضوح، واختم بدعوة مناسبة للتفاعل. الطلب: ${prompt}`;
        const r = await puter.ai.chat(full, { model: "gpt-6-luna", normalize: true, reasoning_effort: "medium" });
        const text = typeof r === "string" ? r : (r?.message?.content || r?.text || ""); if (!text) throw new Error("empty");
        result.innerHTML = `<textarea rows="10" id="st-p-text"></textarea><button class="btn" id="st-p-copy" style="margin-top:8px">نسخ النتيجة</button>`;
        result.querySelector("#st-p-text").value = text; result.querySelector("#st-p-copy").onclick = () => navigator.clipboard.writeText(result.querySelector("#st-p-text").value).then(() => toast("تم النسخ"));
      } else {
        const img = await puter.ai.txt2img(prompt, { model: "gpt-image-2.5-sunburst", quality: "high" });
        img.alt = "صورة مولدة بالذكاء الاصطناعي"; img.style = "width:100%;border-radius:12px;display:block"; result.appendChild(img);
        const a = document.createElement("a"); a.className = "btn"; a.textContent = "فتح الصورة وحفظها"; a.target = "_blank"; a.rel = "noopener"; a.href = img.src; a.style.marginTop = "8px"; result.appendChild(a);
      }
      status.textContent = "اكتمل ✓ — راجع النتيجة قبل استخدامها";
    } catch (err) { status.textContent = "تعذر التنفيذ. تأكد من رصيد حساب AI أو حاول مرة أخرى."; toast(status.textContent, 7000); }
    finally { btn.disabled = false; }
  };
  setTimeout(connected, 500);
  return;
}

const frTxt = () => { $("#st-fr").textContent = `بداية: ${intro ? "✓" : "—"} · نهاية: ${outro ? "✓" : "—"} (كل واحدة بتظهر حوالي 2.5 ثانية)`; };
$("#st-own").onchange = e => { [...e.target.files].forEach(f => state.scenes.push({ narration: "", image_prompt: "", own: true, url: URL.createObjectURL(f), seed: 1 })); e.target.value = ""; render(); toast("اكتب تعليق لكل صورة (أو سيبه فاضي = صورة 3 ثواني من غير صوت)", 5000); };
$("#st-in").onchange = e => { if (e.target.files[0]) { intro = URL.createObjectURL(e.target.files[0]); frTxt(); render(); } };
$("#st-out").onchange = e => { if (e.target.files[0]) { outro = URL.createObjectURL(e.target.files[0]); frTxt(); render(); } };
function render() {
  $("#st-vid").classList.toggle("hide", !state.scenes.some(hasImg) && !intro && !outro);
  const box = $("#st-scenes"); if (!state.scenes.length) { box.innerHTML = ""; return; }
  box.innerHTML = `<div class="box"><div class="lbl">المشاهد (${state.scenes.length}) <span>عدّل أي نص قبل الصور</span></div>` + state.scenes.map((s, i) => `
   <div class="box" data-i="${i}"><div class="lbl">مشهد ${i + 1}</div>
    <div style="display:flex;gap:10px"><div style="flex:1">
     <textarea class="st-nar" rows="2" placeholder="التعليق الصوتي">${esc(s.narration)}</textarea>
     ${s.own ? "" : `<textarea class="st-ip" rows="2" dir="ltr" placeholder="image prompt">${esc(s.image_prompt)}</textarea>`}
     <div class="two">${s.own ? "" : `<button class="btn sm st-gen">${hasImg(s) ? "صورة تانية" : "ولّد الصورة"}</button>`}<button class="btn sm st-up">▲</button><button class="btn sm st-dn">▼</button><button class="btn sm st-del">حذف</button><a class="btn sm ${hasImg(s) ? "" : "hide"}" target="_blank" rel="noopener" href="${hasImg(s) ? src(s) : "#"}">فتح/حفظ</a></div></div>
     <div style="width:96px;aspect-ratio:${FMT[state.fmt||"vert"][1]}/${FMT[state.fmt||"vert"][2]};max-height:170px;border-radius:10px;background:#0002;overflow:hidden;flex:none">${hasImg(s) ? `<img src="${src(s)}" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.alt='فشلت — جرّب صورة تانية'">` : ""}</div></div></div>`).join("") +
   `<button class="btn" id="st-all">ولّد كل الصور</button></div>`;
  box.querySelectorAll("[data-i]").forEach(el => { const i = +el.dataset.i;
    el.querySelector(".st-nar").oninput = e => { state.scenes[i].narration = e.target.value; save(); };
    const ip = el.querySelector(".st-ip"); if (ip) ip.oninput = e => { state.scenes[i].image_prompt = e.target.value; save(); };
    const gn = el.querySelector(".st-gen"); if (gn) gn.onclick = () => genScenes([state.scenes[i]]);
    const mv = d => { const j = i + d; if (j < 0 || j >= state.scenes.length) return; [state.scenes[i], state.scenes[j]] = [state.scenes[j], state.scenes[i]]; save(); render(); };
    el.querySelector(".st-up").onclick = () => mv(-1); el.querySelector(".st-dn").onclick = () => mv(1);
    el.querySelector(".st-del").onclick = () => { state.scenes.splice(i, 1); save(); render(); }; });
  $("#st-all").onclick = () => genScenes(state.scenes.filter(x => !x.own));
}

async function makeScenes() {
  const idea = $("#st-idea").value.trim(); if (!idea) return toast("اكتب الفكرة الأول");
  if (!window.APAI || !window.APAI.hasKey()) return toast("ضيف مفتاح AI في الإعدادات الأول (Gemini مجاني)", 6000);
  const n = +$("#st-n").value, style = niche(), b = $("#st-go"); b.disabled = true; b.textContent = "بيكتب…";
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
  const hint = $("#st-idea").value.trim(), style = niche(); btn.disabled = true; btn.textContent = "بيفكر…";
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
  if (await makeScenes()) { await genScenes(state.scenes.filter(x => !x.own)); toast("جاهز — راجع المشاهد والصور قبل أي حاجة", 6000); } };
const dimTxt = () => { const [w, h] = dims(); $("#st-dim").textContent = `المقاس: ${w}×${h}. لو غيّرته بعد توليد الصور، دوس «ولّد كل الصور» تاني.`; };
$("#st-fmt").value = state.fmt || "vert"; $("#st-q").value = state.q || "std"; dimTxt();
$("#st-fmt").onchange = () => { state.fmt = $("#st-fmt").value; save(); dimTxt(); render(); };
const ipSync = () => { const p = ip(); $("#st-ipk").classList.toggle("hide", p === "pol"); if (p !== "pol") { $("#st-ipkey").value = ls.get(IP[p].k); $("#st-iplink").href = IP[p].link; } };
$("#st-ip").value = ip(); ipSync(); $("#st-ip").onchange = () => { state.ip = $("#st-ip").value; save(); ipSync(); render(); };
$("#st-ipkey").onchange = e => { ls.set(IP[ip()].k, e.target.value.trim()); pushKeys(); };
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
  const sc = state.scenes.filter(hasImg); if (!sc.length && !intro && !outro) return toast("ولّد الصور أو ضيف صورك الأول");
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

// ---------------------------------------------------------------- modes: images only / AI video only / images -> narrated video
const MODES = ["img", "vid", "show", "voice", "song"];
const SEC = m => (m === "voice" || m === "song") ? "aud" : m;
function setMode(m) { state.mode = m; save(); ["img", "vid", "show", "aud"].forEach(k => $("#m-" + k).classList.toggle("hide", k !== SEC(m)));
  document.querySelectorAll("#st-modes [data-m]").forEach(b => b.classList.toggle("pri", b.dataset.m === m)); $("#st-provbox").classList.toggle("hide", m === "vid" || SEC(m) === "aud"); if (SEC(m) === "aud") setA(m); nicheVis(); }
document.querySelectorAll("#st-modes [data-m]").forEach(b => b.onclick = () => setMode(b.dataset.m));

async function enhance(text, kind) { // AI turns a short idea into a detailed English prompt
  if (!window.APAI || !window.APAI.hasKey()) return text;
  try { const t = await window.APAI.ask([{ text: `حوّل الفكرة دي لبرومبت إنجليزي واحد مفصّل ${kind === "video" ? "لتوليد فيديو قصير (حركة الكاميرا، الحركة في المشهد، الإضاءة، الأسلوب)" : "لتوليد صورة (العناصر، الإضاءة، زاوية الكاميرا، الأسلوب، الألوان)"}، من غير أي نص مكتوب داخل الصورة.\nنوع المحتوى: ${niche()}\nالشكل: ${FMT[state.fmt || "vert"][0]}\nالفكرة: ${text}\nرجّع البرومبت بس من غير شرح ولا علامات.` }]); return t.replace(/^["'`\s]+|["'`\s]+$/g, "") || text; }
  catch (e) { return text; } }

// -------- images only
let gallery = [];
function drawGallery() { const g = $("#st-grid"); g.innerHTML = gallery.map((x, i) => `<div><div style="aspect-ratio:${FMT[state.fmt || "vert"][1]}/${FMT[state.fmt || "vert"][2]};background:#0002;border-radius:10px;overflow:hidden"><img src="${x.url}" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.alt='فشلت'"></div><a class="btn sm" style="display:block;text-align:center;margin-top:4px" href="${x.url}" target="_blank" rel="noopener" download="image-${i + 1}.png">فتح / حفظ</a></div>`).join(""); $("#st-i2v").classList.toggle("hide", !gallery.length); }
$("#st-igo").onclick = async () => { const raw = $("#st-ipr").value.trim(); if (!raw) return toast("اكتب برومبت الصور"); const n = +$("#st-icount").value, b = $("#st-igo"); b.disabled = true; b.textContent = "بيشتغل…";
  try { const prompt = $("#st-enh").checked ? await enhance(raw, "image") : raw; gallery = [];
    for (let i = 0; i < n; i++) { if (ip() === "pol") { const seed = Math.floor(Math.random() * 1e6); gallery.push({ url: imgUrl(prompt, seed), prompt }); }
      else { const sc = { image_prompt: prompt }; await genKeyed(sc); gallery.push({ url: sc.url, prompt }); } drawGallery(); }
    toast("الصور اتولّدت" + ($("#st-enh").checked ? " — البرومبت: " + prompt.slice(0, 80) : ""), 6000); }
  catch (e) { toast(e.message, 8000); } finally { b.disabled = false; b.textContent = "🖼 ولّد الصور"; } };
$("#st-i2v").onclick = () => { gallery.forEach(x => state.scenes.push({ narration: "", image_prompt: x.prompt, own: true, url: x.url, seed: 1 })); setMode("show"); render(); toast("اكتب تعليق لكل صورة (أو سيبه فاضي) وبعدين «اصنع الفيديو»", 6000); };

// -------- AI video (fal.ai queue API), alone
$("#st-vm").onchange = () => $("#st-vcustom").classList.toggle("hide", $("#st-vm").value !== "custom");
$("#st-vkey").value = ls.get("ap_key_fal"); $("#st-vkey").onchange = e => { ls.set("ap_key_fal", e.target.value.trim()); pushKeys(); };
const toData = f => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });
const ENG = { hf: "مجاني ومن غير مفتاح. بيشتغل على سيرفرات Hugging Face العامة (ZeroGPU)، وليك حصة GPU يومية صغيرة (حوالي دقيقتين بدون حساب، وأكتر بتوكن مجاني). ممكن تستنى في الدور، والفيديو قصير (2–4 ثواني).", fal: "", veo: "بيستخدم مفتاح Gemini اللي في الإعدادات. Veo مفيهوش حصة مجانية، ولازم تفعّل الدفع في Google AI Studio، وبيظهر في حسابك بس لو متاح.", sora: "بيستخدم مفتاح OpenAI اللي في الإعدادات (خانة ChatGPT). Sora بيتحاسب بالثانية من رصيد الـAPI، ولازم الحساب يكون مسموح له بيه." };
const engSync = () => { const e = $("#st-veng").value; $("#st-falbox").classList.toggle("hide", e !== "fal"); $("#st-hfbox").classList.toggle("hide", e !== "hf"); const n = $("#st-vengnote"); n.textContent = ENG[e]; n.classList.toggle("hide", !ENG[e]); };
document.querySelectorAll(".hftok2").forEach(i => { i.value = ls.get("ap_key_hf"); i.onchange = e => { ls.set("ap_key_hf", e.target.value.trim()); document.querySelectorAll(".hftok2,#st-hftok").forEach(x => x.value = e.target.value.trim()); pushKeys(); }; });
$("#st-hftok").value = ls.get("ap_key_hf"); $("#st-hftok").onchange = e => { ls.set("ap_key_hf", e.target.value.trim()); document.querySelectorAll(".hftok2").forEach(x => x.value = e.target.value.trim()); pushKeys(); };
$("#st-veng").value = state.veng || "hf"; engSync(); $("#st-veng").onchange = () => { state.veng = $("#st-veng").value; save(); engSync(); };
const vsize = () => { const f = state.fmt || "vert"; return f === "wide" ? ["1280x720", "16:9"] : f === "vert" ? ["720x1280", "9:16"] : ["720x1280", "9:16"]; };
// -------- Open-source models via Hugging Face Spaces (Gradio REST API)
const HFS = { ltx: "Lightricks/ltx-video-distilled", wan: "zerogpu-aoti/wan2-2-fp8da-aoti-faster", mm: "MiniMaxAI/MiniMax-Music3", mg: "facebook/MusicGen", cb: "ResembleAI/Chatterbox-Multilingual-TTS", om: "k2-fsa/OmniVoice" };
const hfBase = id => "https://" + id.replace("/", "-").replace(/[._]/g, "-").toLowerCase() + ".hf.space";
const hfH = () => { const t = ls.get("ap_key_hf"); return t ? { Authorization: "Bearer " + t } : {}; };
async function hfUpload(id, blob) { const fd = new FormData(); fd.append("files", blob, "in.png"); const r = await fetch(hfBase(id) + "/gradio_api/upload", { method: "POST", headers: hfH(), body: fd }); if (!r.ok) throw new Error("رفع الصورة فشل " + r.status); const j = await r.json(); return { path: j[0], meta: { _type: "gradio.FileData" } }; }
function hfFind(x, re) { if (!x || typeof x !== "object") return null; if (typeof x.url === "string" && (!re || re.test(x.url))) return x.url; if (typeof x.path === "string" && (!re || re.test(x.path)) && !x.url) return { path: x.path }; for (const k of Object.keys(x)) { const f = hfFind(x[k], re); if (f) return f; } return null; }
async function hfCall(id, api, data, prog, label, re) { const base = hfBase(id), H = { ...hfH(), "Content-Type": "application/json" }, t0 = Date.now();
  prog.textContent = label + " — بيتصل بالسيرفر…"; const r = await fetch(base + "/gradio_api/call/" + api, { method: "POST", headers: H, body: JSON.stringify({ data }) }); const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.event_id) throw new Error("Hugging Face: " + (j.detail || j.error || r.status).toString().slice(0, 140) + (r.status === 404 || r.status >= 500 ? " (السيرفر نايم أو واقع — جرّب بعد شوية)" : ""));
  const tick = setInterval(() => { prog.textContent = `${label} — بيتولّد (ممكن يستنى في الدور)… ${Math.round((Date.now() - t0) / 1000)} ث`; }, 1000);
  try { const c = new AbortController(), to = setTimeout(() => c.abort(), 600000); let txt; try { txt = await (await fetch(base + "/gradio_api/call/" + api + "/" + j.event_id, { headers: hfH(), signal: c.signal })).text(); } finally { clearTimeout(to); }
    const ev = [...txt.matchAll(/event: (\w+)\s*\ndata: ([^\n]*)/g)].pop(); if (!ev) throw new Error("رد فاضي من السيرفر");
    if (ev[1] === "error") { let m = ev[2]; try { m = JSON.parse(m); } catch (e) {} const ms = (typeof m === "string" ? m : JSON.stringify(m)); throw new Error(/quota|GPU|exceeded/i.test(ms) ? "حصة الـGPU المجانية خلصت النهارده — حط توكن Hugging Face أو جرّب بكره" : "Hugging Face: " + (ms === "null" ? "السيرفر رفض — غالباً حصة الـGPU المجانية للزوار خلصت. حط توكن Hugging Face مجاني (من خانة التوكن) وجرّب تاني" : ms.slice(0, 160))); }
    const out = JSON.parse(ev[2]), f = hfFind(out, re); if (!f) throw new Error("مفيش ملف في الرد: " + ev[2].slice(0, 100)); const url = typeof f === "string" ? f : base + "/gradio_api/file=" + f.path; return url; }
  catch (e) { if (e.name === "AbortError") throw new Error("اتأخر — جرّب تاني"); throw e; } finally { clearInterval(tick); } }
const hfBlob = async url => { const r = await fetch(url, { headers: hfH() }); if (!r.ok) throw new Error("تحميل الملف فشل " + r.status); const b = await r.blob(), m = (url.match(/\.(wav|mp3|flac|ogg|m4a|mp4|webm|mov)(\?|$)/i) || [])[1]; return m ? new Blob([b], { type: ({ wav: "audio/wav", mp3: "audio/mpeg", flac: "audio/flac", ogg: "audio/ogg", m4a: "audio/mp4", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime" })[m.toLowerCase()] }) : b; };
async function runHF(prompt, prog) { const m = $("#st-hfm").value, f = $("#st-vimg").files[0], tall = (state.fmt || "vert") !== "wide", NEG = "worst quality, inconsistent motion, blurry, jittery, distorted", V = /\.(mp4|webm|mov)/i;
  if (m === "wan") { if (!f) throw new Error("Wan بيحتاج صورة بداية — ارفع صورة فوق"); const img = await hfUpload(HFS.wan, f);
    return await hfBlob(await hfCall(HFS.wan, "generate_video", [img, prompt || "make this image come alive, cinematic motion, smooth animation", 6, NEG, 3.5, 1, 1, 42, true], prog, "Wan 2.2", V)).then(b => URL.createObjectURL(b)); }
  const h = tall ? 704 : 512, w = tall ? 512 : 704;
  if (f) { const img = await hfUpload(HFS.ltx, f); return await hfBlob(await hfCall(HFS.ltx, "image_to_video", [prompt || "the scene starts to move, cinematic", NEG, img, null, h, w, "image-to-video", 3, 9, 42, true, 1, true], prog, "LTX-Video", V)).then(b => URL.createObjectURL(b)); }
  return await hfBlob(await hfCall(HFS.ltx, "text_to_video", [prompt, NEG, null, null, h, w, "text-to-video", 3, 9, 42, true, 1, true], prog, "LTX-Video", V)).then(b => URL.createObjectURL(b)); }
async function runFal(prompt, prog) { const key = ls.get("ap_key_fal"); let model = $("#st-vm").value === "custom" ? $("#st-vcustom").value.trim() : $("#st-vm").value; if (!key) throw new Error("ضيف مفتاح fal.ai الأول"); if (!model) throw new Error("اكتب اسم الموديل");
  const body = { prompt }; const f = $("#st-vimg").files[0]; if (f) body.image_url = await toData(f); const H = { Authorization: "Key " + key, "Content-Type": "application/json" };
  const r = await fetch("https://queue.fal.run/" + model, { method: "POST", headers: H, body: JSON.stringify(body) }); const q = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("fal.ai: " + (q.detail?.[0]?.msg || q.detail || r.status) + (r.status === 403 || r.status === 401 ? " (المفتاح أو الرصيد)" : ""));
  const t0 = Date.now(); let st = q;
  while (Date.now() - t0 < 600000) { await wait(4000); const sr = await fetch(q.status_url, { headers: H }); st = await sr.json().catch(() => ({})); prog.textContent = `بيتولّد… ${st.status || ""}${st.queue_position != null ? " (الدور " + st.queue_position + ")" : ""} — ${Math.round((Date.now() - t0) / 1000)} ث`; if (st.status === "COMPLETED") break; if (st.status === "FAILED" || (sr.status >= 400 && sr.status !== 429)) throw new Error("fal.ai: فشل التوليد"); }
  if (st.status !== "COMPLETED") throw new Error("اتأخر — جرّب تاني");
  const res = await (await fetch(q.response_url, { headers: H })).json(); const url = res.video?.url || res.videos?.[0]?.url; if (!url) throw new Error("مفيش فيديو في الرد: " + JSON.stringify(res).slice(0, 120)); return url; }
async function runVeo(prompt, prog) { const key = ls.get("ap_gemini"); if (!key) throw new Error("ضيف مفتاح Gemini في الإعدادات"); const H = { "x-goog-api-key": key, "Content-Type": "application/json" }, base = "https://generativelanguage.googleapis.com/v1beta/";
  let model = "veo-3.1-generate-preview"; try { const l = await (await fetch(base + "models?pageSize=200", { headers: H })).json(); const v = (l.models || []).filter(m => /veo/i.test(m.name) && (m.supportedGenerationMethods || []).some(x => /predictLongRunning/i.test(x))).map(m => m.name.replace("models/", "")); if (v.length) model = v.find(x => /fast/.test(x)) || v[0]; } catch (e) {}
  const r = await fetch(base + "models/" + model + ":predictLongRunning", { method: "POST", headers: H, body: JSON.stringify({ instances: [{ prompt }], parameters: { aspectRatio: vsize()[1] } }) }); const op = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("Veo: " + (op.error?.message || r.status).toString().slice(0, 160)); const t0 = Date.now(); let d = op;
  while (!d.done && Date.now() - t0 < 600000) { await wait(6000); d = await (await fetch(base + op.name, { headers: H })).json(); prog.textContent = `Veo بيولّد… ${Math.round((Date.now() - t0) / 1000)} ث`; if (d.error) throw new Error("Veo: " + d.error.message); }
  if (!d.done) throw new Error("اتأخر — جرّب تاني"); const uri = d.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri || d.response?.videos?.[0]?.uri; if (!uri) throw new Error("Veo: مفيش فيديو في الرد (ممكن اتحجب)");
  const vr = await fetch(uri, { headers: { "x-goog-api-key": key } }); if (!vr.ok) throw new Error("تحميل الفيديو فشل " + vr.status); return URL.createObjectURL(await vr.blob()); }
async function runSora(prompt, prog) { const key = ls.get("ap_key_openai"); if (!key) throw new Error("ضيف مفتاح OpenAI في الإعدادات (خانة ChatGPT)"); const H = { Authorization: "Bearer " + key }, base = "https://api.openai.com/v1/videos";
  const r = await fetch(base, { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify({ model: "sora-2", prompt, size: vsize()[0], seconds: "8" }) }); const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("Sora: " + (j.error?.message || r.status).toString().slice(0, 160)); const t0 = Date.now(); let d = j;
  while (d.status !== "completed" && Date.now() - t0 < 900000) { if (d.status === "failed") throw new Error("Sora: " + (d.error?.message || "فشل التوليد")); await wait(6000); d = await (await fetch(base + "/" + j.id, { headers: H })).json(); prog.textContent = `Sora بيولّد… ${d.progress != null ? d.progress + "%" : d.status || ""} — ${Math.round((Date.now() - t0) / 1000)} ث`; }
  if (d.status !== "completed") throw new Error("اتأخر — جرّب تاني"); const vr = await fetch(base + "/" + j.id + "/content", { headers: H }); if (!vr.ok) throw new Error("تحميل الفيديو فشل " + vr.status); return URL.createObjectURL(await vr.blob()); }
$("#st-vgo").onclick = async () => { const raw = $("#st-vpr").value.trim(), prog = $("#st-vprog"), b = $("#st-vgo"), eng = $("#st-veng").value;
  if (!raw && !((eng === "fal" || eng === "hf") && $("#st-vimg").files[0])) return toast("اكتب برومبت الفيديو");
  b.disabled = true; $("#st-vout").classList.add("hide"); $("#st-vdl").classList.add("hide");
  try { prog.textContent = "بجهّز البرومبت…"; const prompt = $("#st-venh").checked && raw ? await enhance(raw, "video") : raw;
    const url = await (eng === "veo" ? runVeo : eng === "sora" ? runSora : eng === "hf" ? runHF : runFal)(prompt, prog);
    const v = $("#st-vout"); v.src = url; v.classList.remove("hide"); const a = $("#st-vdl"); a.href = url; a.setAttribute("download", "ai-video.mp4"); a.classList.remove("hide"); prog.textContent = "خلص ✓ " + (prompt ? "— البرومبت: " + prompt.slice(0, 100) : ""); }
  catch (e) { prog.textContent = "فشل: " + e.message; toast(e.message, 8000); } finally { b.disabled = false; } };

$("#st-style").value = state.style || "any"; const nSync = () => $("#st-niche").classList.toggle("hide", $("#st-style").value !== "custom");
$("#st-style").onchange = () => { state.style = $("#st-style").value; save(); nSync(); }; nSync(); $("#st-niche").value = state.niche || ""; $("#st-niche").oninput = () => { state.niche = $("#st-niche").value; save(); };
setMode(MODES.includes(state.mode) ? state.mode : (state.mode === "aud" ? "voice" : "img"));

// ---------------------------------------------------------------- audio mode: voice-over (Gemini TTS / OpenAI TTS) and songs/music (Lyria / fal.ai)
var amode = "voice";
function nicheVis() { $("#st-nichebox").classList.toggle("hide", state.mode === "song"); }
function setA(a) { amode = a; nicheVis(); $("#st-atitle").textContent = a === "voice" ? "🎙 تعليق صوتي" : "🎵 أغنية / موسيقى"; $("#a-voice").classList.toggle("hide", a !== "voice"); $("#a-song").classList.toggle("hide", a !== "song"); $("#a-purpose").classList.toggle("hide", a !== "song");
  $("#st-atx").placeholder = a === "voice" ? "اكتب النص اللي يتقال بصوت" : "وصف الأغنية: النوع، المزاج، اللغة، وكلماتها لو عندك"; }
const seSync = () => { $("#st-salt").classList.toggle("hide", $("#st-seng").value !== "fal"); $("#st-shfbox").classList.toggle("hide", !/^(mm|mg)$/.test($("#st-seng").value)); }; $("#st-seng").onchange = seSync; seSync();
$("#st-sm").onchange = () => $("#st-scustom").classList.toggle("hide", $("#st-sm").value !== "custom");

const SG = id => { const e = $("#st-sg-" + id); return e ? e.value : ""; };
const selText = id => { const e = $("#st-sg-" + id); return e && e.value ? e.selectedOptions[0].text : ""; };
function songSpec(forLyrics) { // turns the song settings into a clear English/Arabic brief
  const inst = [...$("#st-sg-inst").selectedOptions].slice(0, 3).map(o => o.text), L = [];
  const singer = selText("singer"), vs = selText("vstyle"), lang = selText("lang"), genre = selText("genre"), tempo = SG("tempo"), mood = selText("mood"), rh = selText("rhythm"), st = selText("struct"), dur = selText("dur"), ex = $("#st-sg-extra").value.trim();
  if (genre) L.push("اللون: " + genre); if (tempo) L.push(`السرعة: ${tempo} BPM`); if (mood) L.push("المزاج: " + mood); if (rh) L.push("الإيقاع: " + rh);
  if (inst.length) L.push("الآلات: " + inst.join("، ")); if (singer) L.push("المغني: " + singer); if (vs && SG("singer") !== "instr") L.push("أسلوب الغناء: " + vs);
  if (lang && SG("singer") !== "instr") L.push("اللغة: " + lang); if (st) L.push("البنية: " + st); L.push("المدة: " + dur); if (ex) L.push("ملاحظات: " + ex);
  return L.join(" | "); }
function pcmWav(u8, rate) { const n = u8.length, b = new ArrayBuffer(44 + n), v = new DataView(b), w = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + n, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n, true); new Uint8Array(b, 44).set(u8); return new Blob([b], { type: "audio/wav" }); }
const b64u8 = b => Uint8Array.from(atob(b), c => c.charCodeAt(0));
const audioBlob = (p) => { const u8 = b64u8(p.data); if (/l16|pcm/i.test(p.mimeType)) return pcmWav(u8, +(p.mimeType.match(/rate=(\d+)/)?.[1] || 24000)); return new Blob([u8], { type: p.mimeType.split(";")[0] }); };
async function geminiAudio(model, parts, cfg) { const key = ls.get("ap_gemini"); if (!key) throw new Error("ضيف مفتاح Gemini في الإعدادات");
  const c = new AbortController(), t = setTimeout(() => c.abort(), 120000);
  try { const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: "POST", signal: c.signal, headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ contents: [{ parts }], generationConfig: cfg }) });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error((r.status === 429 ? "الحصة/الرصيد خلصت (" : "Google (") + (d.error?.message || r.status).toString().slice(0, 90) + ")");
    const p = (d.candidates?.[0]?.content?.parts || []).find(x => x.inlineData); if (!p) throw new Error("مفيش صوت في الرد"); return audioBlob(p.inlineData); }
  catch (e) { if (e.name === "AbortError") throw new Error("اتأخر — جرّب تاني"); throw e; } finally { clearTimeout(t); } }
async function voiceOut(text) { const eng = $("#st-aeng").value, voice = $("#st-avoice").value, style = $("#st-astyle").value.trim(), line = style ? `${style}: ${text}` : text;
  if (eng === "cb" || eng === "om") { const pr = $("#st-aprog"), V = /\.(wav|mp3|flac|ogg|m4a)/i, fem = /Kore|Aoede/.test(voice);
    const u = eng === "cb" ? await hfCall(HFS.cb, "generate_tts_audio", [text, "ar", null, 0.5, 0.8, 0, 0.5], pr, "Chatterbox", V) : await hfCall(HFS.om, "_design_fn", [text, "Egyptian Arabic", 32, 2, true, 1, null, true, true, fem ? "Female / 女" : "Male / 男", "Auto", "Auto", "Auto", "Auto", "Auto"], pr, "OmniVoice", V); return await hfBlob(u); }
  if (eng === "eleven") { const key = ls.get("ap_key_eleven"); if (!key) throw new Error("ضيف مفتاح ElevenLabs"); const vid = { Kore: "21m00Tcm4TlvDq8ikWAM", Puck: "pNInz6obpgDQGcFmaJgB", Charon: "ErXwobaMiAZAvYXQzNvP", Aoede: "21m00Tcm4TlvDq8ikWAM" }[voice];
    const r = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + vid + "?output_format=mp3_44100_128", { method: "POST", headers: { "xi-api-key": key, "Content-Type": "application/json" }, body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error("ElevenLabs: " + (d.detail?.message || d.detail?.status || r.status)); } return await r.blob(); }
  if (eng === "openai") { const key = ls.get("ap_key_openai"); if (!key) throw new Error("ضيف مفتاح OpenAI في الإعدادات"); const r = await fetch("https://api.openai.com/v1/audio/speech", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: { Kore: "coral", Puck: "ash", Charon: "onyx", Aoede: "nova" }[voice] || "alloy", input: text, ...(style ? { instructions: style } : {}), response_format: "mp3" }) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error("OpenAI: " + (d.error?.code === "insufficient_quota" ? "رصيد الـAPI صفر" : d.error?.message || r.status)); } return await r.blob(); }
  let last; for (const m of ["gemini-3.1-flash-tts-preview", "gemini-3.8-flash-tts"]) { try { return await geminiAudio(m, [{ text: line }], { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } }); } catch (e) { last = e; } } throw last; }
async function songOut(text) { let eng = $("#st-seng").value; const pr = $("#st-aprog"), A = /\.(wav|mp3|flac|ogg|m4a)/i;
  if (eng === "lyria" && !ls.get("ap_gemini")) { eng = "mm"; $("#st-seng").value = "mm"; seSync(); toast("مفيش مفتاح Gemini — حوّلت تلقائيًا للموديل المجاني MiniMax", 5000); }
  if (eng === "mg") return await hfBlob(await hfCall(HFS.mg, "predict_batched", [songSpec() + ". " + text.replace(/\n\[مواصفات:[\s\S]*$/, "").slice(0, 200), null], pr, "MusicGen", A));
  if (eng === "mm") { const lyr = text.replace(/\n\[مواصفات:[\s\S]*$/, "").replace(/^النوع:[^.]*\.\s*/, ""), st = { mode: "simple", description: songSpec() + ". " + (text.match(/^النوع:[^.]*/) || [""])[0], instrumental: /بدون كلام|موسيقى/.test(text), title: "", lyrics: lyr, global_meta: "", vocals: "", arrangement: "" };
    return await hfBlob(await hfCall(HFS.mm, "simple_generate", [st, +SG("dur") || 30, 0, true, 0, 30, 1.7], pr, "MiniMax Music 3", A)); }
  if (eng === "lyria") { let last; for (const m of ["lyria-3-clip-preview", "lyria-3.5", "lyria-3-pro-preview"]) { try { return await geminiAudio(m, [{ text }], { responseModalities: ["AUDIO", "TEXT"] }); } catch (e) { last = e; if (/الحصة|الرصيد/.test(e.message)) break; } } throw last; }
  const key = ls.get("ap_key_fal"); if (!key) throw new Error("ضيف مفتاح fal.ai (في وضع الفيديو)"); const model = $("#st-sm").value === "custom" ? $("#st-scustom").value.trim() : $("#st-sm").value; if (!model) throw new Error("اكتب اسم الموديل");
  const H = { Authorization: "Key " + key, "Content-Type": "application/json" }, body = /minimax-music/.test(model) ? { prompt: songSpec().slice(0, 300) || text.slice(0, 300), lyrics: text.replace(/\n\[مواصفات:[\s\S]*$/, "") } : /stable-audio/.test(model) ? { prompt: text.replace(/\n\[مواصفات:/, " (").replace(/\]$/, ")"), seconds_total: Math.min(47, +SG("dur") || 30) } : { prompt: text, lyrics: text };
  const r = await fetch("https://queue.fal.run/" + model, { method: "POST", headers: H, body: JSON.stringify(body) }); const q = await r.json().catch(() => ({})); if (!r.ok) throw new Error("fal.ai: " + (q.detail?.[0]?.msg || q.detail || r.status));
  const t0 = Date.now(); let st = q; while (Date.now() - t0 < 600000) { await wait(4000); st = await (await fetch(q.status_url, { headers: H })).json().catch(() => ({})); $("#st-aprog").textContent = `بيتولّد… ${st.status || ""} — ${Math.round((Date.now() - t0) / 1000)} ث`; if (st.status === "COMPLETED") break; if (st.status === "FAILED") throw new Error("fal.ai: فشل التوليد"); }
  if (st.status !== "COMPLETED") throw new Error("اتأخر — جرّب تاني"); const res = await (await fetch(q.response_url, { headers: H })).json(); const url = res.audio_file?.url || res.audio?.url || res.audio_url || res.music?.url; if (!url) throw new Error("مفيش صوت في الرد: " + JSON.stringify(res).slice(0, 100)); return await (await fetch(url)).blob(); }
$("#st-ago").onclick = async () => { const text = $("#st-atx").value.trim(), b = $("#st-ago"), pr = $("#st-aprog"); if (!text) return toast("اكتب النص أو وصف الأغنية"); b.disabled = true; $("#st-aout").classList.add("hide"); $("#st-adl").classList.add("hide"); pr.textContent = "بيشتغل…";
  try { const purp = { jingle: "أغنية إعلانية قصيرة جذابة لبراند", kids: "أغنية أطفال تعليمية مرحة", motiv: "أغنية تحفيزية", bg: "موسيقى خلفية بدون كلام", intro: "إنترو قصير لقناة", love: "أغنية رومانسية", fun: "أغنية كوميدية ساخرة", mahraganat: "مهرجان مصري", shaabi: "أغنية شعبي مصري", bday: "أغنية عيد ميلاد وحفلة", wedding: "أغنية زفاف", ramadan: "أغنية رمضان وعيد", nation: "أغنية وطنية", sport: "أغنية تشجيع رياضية", game: "موسيقى ألعاب", calm: "موسيقى هادية للنوم والتأمل", rap: "راب" }[$("#st-apurp").value], blob = await (amode === "voice" ? voiceOut(text) : songOut(`${purp ? "النوع: " + purp + ". " : ""}${text}\n[مواصفات: ${songSpec()}]`)), url = URL.createObjectURL(blob), ext = /mpeg|mp3/.test(blob.type) ? "mp3" : /wav/.test(blob.type) ? "wav" : (blob.type.split("/")[1] || "audio");
    const a = $("#st-aout"); a.src = url; a.classList.remove("hide"); const d = $("#st-adl"); d.href = url; d.download = "autopost-audio." + ext; d.classList.remove("hide"); pr.textContent = "خلص ✓"; a.play().catch(() => {}); }
  catch (e) { pr.textContent = "فشل: " + e.message; toast(e.message, 8000); } finally { b.disabled = false; } };
$("#st-awrite").onclick = async () => { const t = $("#st-atx").value.trim(); if (!t) return toast("اكتب فكرة الأول"); const b = $("#st-awrite"); b.disabled = true;
  try { const p = amode === "voice" ? `اكتب تعليق صوتي قصير بالعامية المصرية عن الفكرة دي، مناسب للقراءة بصوت (حوالي 20 ثانية)، من غير عناوين ولا علامات. المجال: ${niche()}\nالفكرة: ${t}` : `اكتب كلمات أغنية قصيرة (مذهب وكوبليه) عن الفكرة دي، ${$("#st-apurp").selectedOptions[0].text !== "عامة" ? "الغرض: " + $("#st-apurp").selectedOptions[0].text + "،" : ""} وفي أول سطر وصف الأسلوب الموسيقي بين أقواس. اللغة والأسلوب حسب المواصفات دي: ${songSpec()}\nالفكرة: ${t}`;
    if (window.APAI && window.APAI.hasKey()) $("#st-atx").value = await window.APAI.ask([{ text: p }]);
    else { if (!window.puter) throw new Error("خدمة AI لسه بتتحمّل — جرّب بعد ثواني"); if (!puter.auth.isSignedIn()) await puter.auth.signIn(); const r = await puter.ai.chat(p, { model: "gpt-5-nano", normalize: true }); $("#st-atx").value = typeof r === "string" ? r : (r?.message?.content || r?.text || ""); if (!$("#st-atx").value) throw new Error("مفيش رد — جرّب تاني"); }
  } catch (e) { toast(e.message || "تعذر كتابة النص", 6000); } finally { b.disabled = false; } };
$("#st-akey").value = ls.get("ap_key_eleven"); $("#st-akey").onchange = e => { ls.set("ap_key_eleven", e.target.value.trim()); pushKeys(); };
const aeSync = () => { $("#st-akbox").classList.toggle("hide", $("#st-aeng").value !== "eleven"); $("#st-ahfbox").classList.toggle("hide", !/^(om|cb)$/.test($("#st-aeng").value)); }; $("#st-aeng").onchange = aeSync; aeSync();
})();
