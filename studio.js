// AutoPost Studio — step 1: idea -> scenes (script + image prompts) -> images. Free: text from your AI team, images from Pollinations (no key).
(() => {
"use strict";
const $ = s => document.querySelector(s), ls = { get: (k, d = "") => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
const toast = (t, ms) => window.toast && window.toast(t, ms);
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const STYLES = { re: "إعلان عقاري فاخر: لقطات سينمائية للمبنى والتشطيبات والإضاءة الطبيعية", kids: "قصة أطفال لطيفة بألوان زاهية ورسوم كرتونية بسيطة", tips: "نصائح تعليمية في التصوير والإضاءة بصور واقعية واضحة", free: "حسب الفكرة" };
let state = (() => { try { return JSON.parse(ls.get("ap_studio")) || {}; } catch (e) { return {}; } })();
state.scenes = state.scenes || [];
const save = () => ls.set("ap_studio", JSON.stringify(state));
// where the video will be used -> shape; quality -> size of the shortest edge
const FMT = { vert: ["تيك توك / ريلز / شورتس (9:16)", 9, 16], wide: ["يوتيوب / فيديو عريض (16:9)", 16, 9], feed: ["إنستجرام فيد (4:5)", 4, 5], sq: ["مربع: فيسبوك / لينكدإن (1:1)", 1, 1] };
const QUAL = { draft: ["مسودة سريعة (540)", 540], std: ["عادي (720)", 720], high: ["عالي (1080)", 1080] };
const dims = () => { const f = FMT[state.fmt || "vert"], q = QUAL[state.q || "std"][1], r16 = n => Math.round(n / 16) * 16, k = q / Math.min(f[1], f[2]); return [r16(f[1] * k), r16(f[2] * k)]; };
const imgUrl = (p, seed) => { const [w, h] = dims(); return `https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=${w}&height=${h}&nologo=true&seed=${seed}`; };

const sec = document.createElement("section"); sec.id = "studio"; sec.className = "hide";
sec.innerHTML = `<div class="box"><div class="lbl">الفكرة</div>
 <textarea id="st-idea" rows="3" placeholder="مثال: فيديو 30 ثانية لشقة 3 غرف في التجمع الخامس، تشطيب سوبر لوكس"></textarea>
 <div class="two"><button class="btn" id="st-sug">🎲 اقترح أفكار</button><button class="btn pri" id="st-auto">⚡ فكرة ومشاهد لوحدك</button></div>
 <div id="st-ideas"></div>
 <div class="lbl">الفيديو لإيه؟ <span>بيحدد المقاس</span></div>
 <select id="st-fmt">${Object.entries(FMT).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join("")}</select>
 <div class="lbl">الجودة</div>
 <select id="st-q">${Object.entries(QUAL).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join("")}</select>
 <p class="note" id="st-dim"></p>
 <div class="two"><select id="st-style">${Object.entries({ re: "عقاري", kids: "أطفال", tips: "نصايح تصوير", free: "حر" }).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
 <select id="st-n">${[3, 4, 5, 6, 8].map(n => `<option ${n === 5 ? "selected" : ""}>${n}</option>`).join("")}</select></div>
 <button class="btn pri" id="st-go">اكتب المشاهد</button>
 <p class="note">الكتابة بفريق الـAI اللي في الإعدادات. الصور من Pollinations (مجاني، من غير مفتاح)، وبروبمت الصورة بيتبعت لهم. مفيش حاجة بتتنشر لوحدها.</p></div>
 <div id="st-scenes"></div>`;
const host = document.querySelector("main") || document.body; host.appendChild(sec);

function render() {
  const box = $("#st-scenes"); if (!state.scenes.length) { box.innerHTML = ""; return; }
  box.innerHTML = `<div class="box"><div class="lbl">المشاهد (${state.scenes.length}) <span>عدّل أي نص قبل الصور</span></div>` + state.scenes.map((s, i) => `
   <div class="box" data-i="${i}"><div class="lbl">مشهد ${i + 1}</div>
    <div style="display:flex;gap:10px"><div style="flex:1">
     <textarea class="st-nar" rows="2" placeholder="التعليق الصوتي">${esc(s.narration)}</textarea>
     <textarea class="st-ip" rows="2" dir="ltr" placeholder="image prompt">${esc(s.image_prompt)}</textarea>
     <div class="two"><button class="btn sm st-gen">${s.seed ? "صورة تانية" : "ولّد الصورة"}</button><a class="btn sm ${s.seed ? "" : "hide"}" target="_blank" rel="noopener" href="${s.seed ? imgUrl(s.image_prompt, s.seed) : "#"}">فتح/حفظ</a></div></div>
     <div style="width:96px;aspect-ratio:${FMT[state.fmt||"vert"][1]}/${FMT[state.fmt||"vert"][2]};max-height:170px;border-radius:10px;background:#0002;overflow:hidden;flex:none">${s.seed ? `<img src="${imgUrl(s.image_prompt, s.seed)}" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.alt='فشلت — جرّب صورة تانية'">` : ""}</div></div></div>`).join("") +
   `<button class="btn" id="st-all">ولّد كل الصور</button></div>`;
  box.querySelectorAll("[data-i]").forEach(el => { const i = +el.dataset.i;
    el.querySelector(".st-nar").oninput = e => { state.scenes[i].narration = e.target.value; save(); };
    el.querySelector(".st-ip").oninput = e => { state.scenes[i].image_prompt = e.target.value; save(); };
    el.querySelector(".st-gen").onclick = () => { state.scenes[i].seed = Math.floor(Math.random() * 1e6); save(); render(); }; });
  $("#st-all").onclick = () => { state.scenes.forEach(s => { s.seed = Math.floor(Math.random() * 1e6); }); save(); render(); };
}

async function makeScenes() {
  const idea = $("#st-idea").value.trim(); if (!idea) return toast("اكتب الفكرة الأول");
  if (!window.APAI || !window.APAI.hasKey()) return toast("ضيف مفتاح AI في الإعدادات الأول (Gemini مجاني)", 6000);
  const n = +$("#st-n").value, style = STYLES[$("#st-style").value], b = $("#st-go"); b.disabled = true; b.textContent = "بيكتب…";
  const prompt = `اكتب سيناريو فيديو قصير من ${n} مشاهد بالظبط. شكل الفيديو: ${FMT[state.fmt || "vert"][0]}.\nالفكرة: ${idea}\nالنوع: ${style}\nلكل مشهد: "narration" جملة أو جملتين بالعامية المصرية البسيطة تتقال بصوت (حوالي 5 ثواني)، و"image_prompt" وصف بصري بالإنجليزي واضح ومحدد للصورة (العناصر، الإضاءة، زاوية الكاميرا، الأسلوب) من غير نصوص مكتوبة داخل الصورة. أول مشهد لازم يشد الانتباه في أول ثانيتين، وآخر مشهد فيه دعوة لتصرف (CTA).\nرجّع JSON فقط بالشكل: {"scenes":[{"narration":"...","image_prompt":"..."}]}`;
  try { const t = await window.APAI.ask([{ text: prompt }], true); const j = window.APAI.parseJSON(t); const sc = (j.scenes || j).filter(x => x && x.narration);
    if (!sc.length) throw new Error("الرد مش بالشكل المطلوب — جرّب تاني");
    state.idea = idea; state.scenes = sc.map(x => ({ narration: String(x.narration), image_prompt: String(x.image_prompt || ""), seed: 0 })); save(); render(); return true; }
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
$("#st-q").onchange = () => { state.q = $("#st-q").value; save(); dimTxt(); render(); };
if (state.idea) $("#st-idea").value = state.idea; render();
})();
