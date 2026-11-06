// AutoPost — phase 4: optional, free AI helper.
// Mode 1 (default, no key): builds a ready prompt → you paste it in any free chat (Gemini / ChatGPT / Claude) and paste the answer back.
// Mode 2: your own FREE Gemini API key (Google AI Studio), kept on this device only. Text you send goes to Google; on the free tier
// Google may use it to improve its products. Nothing AI-written is ever published automatically — it only lands in the editor.
(() => {
"use strict";
const NM = k => (typeof NAMES !== "undefined" && NAMES[k]) || k;
const LIMITS = { instagram: 2200, facebook: 5000, linkedin: 3000, youtube: 5000, pinterest: 500, tiktok: 2200, snapchat: 250, x: 280 };
const ls = { get: (k, d = "") => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
const PROV = { gemini: { n: "Gemini (مجاني)", k: "ap_gemini", link: "https://aistudio.google.com/apikey" },
  groq: { n: "Groq (مجاني)", k: "ap_key_groq", link: "https://console.groq.com/keys", url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile" },
  openrouter: { n: "OpenRouter (موديلات مجانية)", k: "ap_key_openrouter", link: "https://openrouter.ai/keys", url: "https://openrouter.ai/api/v1/chat/completions", model: "openrouter/free" },
  openai: { n: "ChatGPT / OpenAI (مدفوع)", k: "ap_key_openai", link: "https://platform.openai.com/api-keys", url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" } };
const prov = () => (PROV[ls.get("ap_ai_prov")] || ls.get("ap_ai_prov") === "all") ? ls.get("ap_ai_prov") : "gemini";
const keyed = () => Object.keys(PROV).filter(p => ls.get(PROV[p].k));
const hasKey = () => prov() === "all" ? keyed().length > 0 : !!ls.get(PROV[prov()].k);

// ------------------------------------------------------------------ style memory (examples the user picks, per account; stored in config/library.json)
let lib = null;
async function loadLib() { if (lib) return lib; try { lib = JSON.parse(await readFile("config/library.json")); } catch (e) { lib = {}; } lib.styles ||= {}; return lib; }
const styleOf = async () => { await loadLib(); const b = $("#c-brand")?.value || curBrand; return lib.styles[b] || { examples: [], notes: "" }; };

const RULES = `قواعد مهمة:
- اكتب بالعربي المصري البسيط إلا لو اتطلب لغة تانية.
- ممنوع تخترع معلومات أو أرقام أو أسعار أو أسماء أو نتايج أو مصادر. لو معلومة ناقصة اكتب مكانها [ضيف: ...].
- مفيش وعود مبالغ فيها ولا كلام شكله مكتوب بالذكاء الاصطناعي (ابعد عن «في عالم…» و«هل تساءلت يومًا»).
- التزم بحدود الحروف لكل منصة.`;
async function context(extra = "") {
  const st = await styleOf(); const b = brands[$("#c-brand")?.value || curBrand];
  return `أنا بكتب بوستات سوشيال ميديا لحساب «${b?.name || ""}».` +
    (st.notes ? `\nملاحظات عن الأسلوب: ${st.notes}` : "") +
    (st.examples.length ? `\nأمثلة من كتابتي — قلّد الأسلوب والطول والإيموجي، مش المحتوى:\n${st.examples.map((e, i) => `--- مثال ${i + 1} ---\n${e}`).join("\n")}` : "") +
    `\n${RULES}${extra ? "\n" + extra : ""}`;
}

// ------------------------------------------------------------------ Gemini (free key) — picks the newest free "flash" text model available to the key
async function models(key) {
  const cached = ls.get("ap_gemini_model");
  try { const r = await (await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}&pageSize=200`)).json();
    const ok = (r.models || []).filter(m => (m.supportedGenerationMethods || []).includes("generateContent") && /flash/i.test(m.name) && !/image|tts|audio|live|thinking|exp|omni/i.test(m.name))
      .map(m => m.name.replace("models/", "")).sort((a, b) => (parseFloat(b.match(/\d+(\.\d+)?/)?.[0] || 0) - parseFloat(a.match(/\d+(\.\d+)?/)?.[0] || 0)) || (/lite/.test(a) - /lite/.test(b)));
    return [...new Set([cached, ...ok.slice(0, 8), "gemini-3.5-flash", "gemini-3-flash-preview", "gemini-3.1-flash-lite"].filter(Boolean))]; } catch (e) { return [cached, "gemini-flash-latest"].filter(Boolean); } }
// OpenAI-compatible providers (Groq / OpenRouter / OpenAI) — text only
async function oai(p, parts, json) {
  const P = PROV[p], key = ls.get(P.k); if (parts.some(x => x.inline_data)) throw new Error("التسجيل الصوتي شغال مع Gemini بس — اختار Gemini أو اكتب الفكرة نص");
  const c = new AbortController(), t = setTimeout(() => c.abort(), 30000);
  try { const r = await fetch(P.url, { method: "POST", signal: c.signal, headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({ model: P.model, temperature: 0.8, messages: [{ role: "user", content: parts.map(x => x.text || "").join("\n") }], ...(json && p !== "openrouter" ? { response_format: { type: "json_object" } } : {}) }) });
    const d = await r.json().catch(() => ({}));
    if (r.status === 429) throw new Error("خلصت الحصة المجانية — جرّب بعد شوية");
    if (r.status === 401) throw new Error("المفتاح غلط أو منتهي");
    if (r.status === 402 || (r.status === 429 && p === "openai")) throw new Error("حسابك محتاج رصيد");
    if (!r.ok) throw new Error(P.n + ": " + (d.error?.message || r.status));
    const txt = (d.choices?.[0]?.message?.content || "").trim(); if (!txt) throw new Error("رد فاضي"); return txt;
  } catch (e) { if (e.name === "AbortError") throw new Error(P.n + " بطيء — جرّب تاني"); throw e; } finally { clearTimeout(t); } }
const one = (p, parts, json) => p === "gemini" ? gemini(parts, json) : oai(p, parts, json);
// "all together": every provider with a key drafts in parallel, then one of them merges the best parts into the final answer
async function team(parts, json) {
  const ks = keyed(); if (!ks.length) throw new Error("ضيف مفتاح واحد على الأقل");
  if (parts.some(x => x.inline_data)) { if (ks.includes("gemini")) return gemini(parts, json); throw new Error("التسجيل الصوتي محتاج Gemini"); }
  if (ks.length === 1) return one(ks[0], parts, json);
  const res = await Promise.allSettled(ks.map(p => one(p, parts, json).then(t => [p, t])));
  const ok = res.filter(r => r.status === "fulfilled").map(r => r.value);
  if (!ok.length) throw res[0].reason;
  if (ok.length === 1) return ok[0][1];
  const task = parts.map(x => x.text || "").join("\n");
  const judge = `ده الطلب الأصلي:\n"""\n${task}\n"""\n\nوده ${ok.length} ردود من مساعدين مختلفين:\n` + ok.map(([p, t], i) => `--- رد ${i + 1} ---\n${t}`).join("\n\n") +
    `\n\nاختار أحسن ما في كل رد وادمجهم في رد نهائي واحد أفضل منهم كلهم، وصحّح أي غلط أو حشو. التزم بنفس الصيغة والشكل اللي الطلب الأصلي طلبها بالظبط${json ? " (JSON صالح فقط)" : ""}. اكتب الرد النهائي بس من غير شرح.`;
  const order = [ok.find(([p]) => p === "gemini"), ...ok].filter(Boolean);
  for (const [p] of order) { try { return await one(p, [{ text: judge }], json); } catch (e) {} }
  return ok[0][1];
}
const ask = (parts, json) => prov() === "all" ? team(parts, json) : one(prov(), parts, json);
// tries newest first; a model that hangs (>12s) or is unavailable is skipped, and the first one that answers is remembered
async function gemini(parts, json) {
  const key = ls.get("ap_gemini"); let last = null;
  for (const m of await models(key)) {
    const c = new AbortController(), t = setTimeout(() => c.abort(), 12000);
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: "POST", signal: c.signal, headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.8, ...(json ? { responseMimeType: "application/json" } : {}) } }) });
      const d = await r.json(); clearTimeout(t);
      if (r.status === 429) throw new Error("خلصت الحصة المجانية للنهارده أو الدقيقة دي — جرّب كمان شوية أو استخدم «انسخ الـprompt»");
      if (!r.ok) { last = new Error("Gemini: " + (d.error?.message || r.status)); if (r.status === 404 || r.status === 503 || r.status >= 500) { if (ls.get("ap_gemini_model") === m) ls.set("ap_gemini_model", ""); continue; } throw last; }
      const txt = (d.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
      if (!txt) { last = new Error("Gemini رجّع رد فاضي"); continue; }
      ls.set("ap_gemini_model", m); return txt;
    } catch (e) { clearTimeout(t); if (e.name === "AbortError") { last = new Error("Gemini بطيء"); if (ls.get("ap_gemini_model") === m) ls.set("ap_gemini_model", ""); continue; } throw e; }
  }
  throw last || new Error("Gemini مش متاح دلوقتي");
}

const parseJSON = t => { const m = t.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, t]; const s = m[1].trim(); const i = Math.min(...["{", "["].map(c => { const k = s.indexOf(c); return k < 0 ? 1e9 : k; }));
  try { return JSON.parse(s.slice(i)); } catch (e) { const j = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]")); return JSON.parse(s.slice(i, j + 1)); } };

// run a task: with a key → Gemini; without → show the prompt to copy into a free chat, then paste the answer back
function run(task, onResult) {
  const out = $("#ai-out");
  const go = async () => {
    const prompt = await task.prompt();
    if (hasKey() && !task.forceCopy) { out.innerHTML = '<p class="hint">بيكتب…</p>';
      try { const t = await ask([...(task.parts || []), { text: prompt }], task.json); onResult(task.json ? parseJSON(t) : t, t); }
      catch (e) { out.innerHTML = `<p class="hint" style="color:var(--bad)">${esc(e.message)}</p>`; } return; }
    out.innerHTML = `<div class="lbl f">1. انسخ الطلب ده وافتح أي شات مجاني</div><textarea rows="4" readonly id="ai-p">${esc(prompt)}</textarea>
      <div class="libbar"><button class="btn sm pri" id="ai-cp">انسخ</button><a class="btn sm" target="_blank" rel="noopener" href="https://gemini.google.com/app">Gemini</a><a class="btn sm" target="_blank" rel="noopener" href="https://chatgpt.com/">ChatGPT</a><a class="btn sm" target="_blank" rel="noopener" href="https://claude.ai/new">Claude</a></div>
      <div class="lbl f">2. الصق الرد هنا</div><textarea rows="5" id="ai-paste"></textarea><button class="btn pri" id="ai-use" style="margin-top:8px">كمّل</button>`;
    $("#ai-cp").onclick = () => navigator.clipboard.writeText(prompt).then(() => toast("اتنسخ — الصقه في الشات"));
    $("#ai-use").onclick = () => { const t = $("#ai-paste").value.trim(); if (!t) return; try { onResult(task.json ? parseJSON(t) : t, t); } catch (e) { toast("الرد مش بالشكل المطلوب — اطلب منه يرجّع JSON بس"); } };
  };
  go();
}
const showText = (t, apply) => { $("#ai-out").innerHTML = `<div class="lbl f">النتيجة <span>راجعها قبل الاستخدام</span></div><textarea rows="8" id="ai-r">${esc(t)}</textarea>
  <div class="libbar"><button class="btn sm pri" id="ai-rep">استخدمه بدل الكابشن</button><button class="btn sm" id="ai-add">ضيفه تحت</button><button class="btn sm" id="ai-cp2">انسخ</button></div>`;
  const val = () => $("#ai-r").value; const cap = $("#c-caption");
  $("#ai-rep").onclick = () => { cap.value = val(); cap.dispatchEvent(new Event("input")); closeSheet(); toast("اتحط في الكابشن — راجعه"); };
  $("#ai-add").onclick = () => { cap.value = (cap.value ? cap.value + "\n\n" : "") + val(); cap.dispatchEvent(new Event("input")); closeSheet(); };
  $("#ai-cp2").onclick = () => navigator.clipboard.writeText(val()).then(() => toast("اتنسخ")); };

// ------------------------------------------------------------------ caption assistant (compose screen)
const bar = document.querySelector(".libbar");
if (bar) { const b = document.createElement("button"); b.className = "btn sm"; b.id = "lb-ai"; b.textContent = "✨ مساعد"; b.onclick = openAssistant; bar.prepend(b); }
function openAssistant() {
  const plats = PLATS.map(p => p[0]).filter(k => sel.has(k));
  sheet(`<div class="wz"><h3>✨ مساعد الكتابة</h3><div class="sub">${hasKey() ? "شغال بمفتاحك الخاص." : "ببلاش من غير مفتاح: هيجهّزلك طلب تنسخه في أي شات مجاني."} مفيش حاجة بتتنشر لوحدها — النتيجة بتيجي هنا تراجعها.</div>
   <textarea id="ai-in" rows="3" placeholder="اكتب الفكرة أو ملاحظاتك هنا (أو سيبها فاضية لو هتشتغل على الكابشن الحالي)"></textarea>
   <div class="two f"><select id="ai-tone"><option>مصري بسيط</option><option>احترافي</option><option>حماسي</option><option>تعليمي</option><option>English</option></select><select id="ai-len"><option value="short">قصير</option><option value="mid" selected>متوسط</option><option value="long">طويل</option></select></div>
   <div class="aig">
    <button class="btn" data-t="write">اكتب كابشن من الفكرة</button><button class="btn" data-t="rewrite">حسّن الكابشن الحالي</button>
    <button class="btn" data-t="short">اختصره</button><button class="btn" data-t="hooks">5 بدايات (هوك)</button>
    <button class="btn" data-t="cta">نداء للتفاعل</button><button class="btn" data-t="tags">هاشتاجات</button>
    <button class="btn" data-t="per">نسخة لكل منصة${plats.length ? ` (${plats.length})` : ""}</button><button class="btn" data-t="check">راجع الكابشن (أخطاء/وضوح)</button>
    ${hasKey() ? '<button class="btn" data-t="voice">🎙 سجّل ملاحظة صوتية</button>' : ""}<button class="btn" data-t="style">أسلوبي</button>
   </div><div id="ai-out"></div><div class="nav"><button class="btn" onclick="closeSheet()">قفل</button></div></div>`);
  const input = () => $("#ai-in").value.trim(), cap = () => $("#c-caption").value.trim(), tone = () => $("#ai-tone").value, len = () => ({ short: "قصير (سطرين لـ 4)", mid: "متوسط", long: "طويل ومفصّل" })[$("#ai-len").value];
  const T = {
    write: { prompt: async () => `${await context()}\nاكتب كابشن ${len()} بأسلوب ${tone()} للمنصات: ${plats.map(NM).join("، ") || "إنستجرام"}.\nالفكرة/الملاحظات:\n${input() || cap()}\n${files.length ? `البوست فيه ${files.length} ${files.some(f => f.video) ? "ملف (فيه فيديو)" : "صور"}.` : ""}\nرجّع الكابشن بس.` },
    rewrite: { prompt: async () => `${await context()}\nحسّن الكابشن ده بأسلوب ${tone()} وطول ${len()} من غير ما تغيّر المعنى أو المعلومات:\n${cap() || input()}\nرجّع الكابشن بس.` },
    short: { prompt: async () => `${await context()}\nاختصر الكابشن ده لأقل من 400 حرف مع الحفاظ على الفكرة والمعلومات:\n${cap() || input()}\nرجّع الكابشن بس.` },
    hooks: { prompt: async () => `${await context()}\nاكتب 5 بدايات (أول سطر) مختلفة وقوية للبوست ده، كل واحدة في سطر:\n${cap() || input()}` },
    cta: { prompt: async () => `${await context()}\nاكتب 3 نداءات للتفاعل (سؤال للكومنتات/حفظ/مشاركة) مناسبة للبوست ده، كل واحد في سطر:\n${cap() || input()}` },
    tags: { prompt: async () => `${await context()}\nاقترح 12 هاشتاج (عربي وإنجليزي، خليط واسع ومتخصص) للبوست ده، في سطر واحد:\n${cap() || input()}` },
    check: { prompt: async () => `${await context()}\nراجع الكابشن ده: أخطاء إملائية، جمل مش واضحة، معلومات محتاجة تتأكد، وتناقض بين العنوان والنقاط. اكتب الملاحظات في نقط قصيرة، ومتعيدش كتابته:\n${cap()}` },
  };
  document.querySelectorAll(".aig [data-t]").forEach(b => b.onclick = () => { const t = b.dataset.t;
    if (t === "style") return openStyle();
    if (t === "voice") return voice();
    if (t === "per") { if (!plats.length) return toast("اختار المنصات الأول"); if (!cap() && !input()) return toast("اكتب كابشن أو فكرة الأول");
      return run({ json: true, prompt: async () => `${await context()}\nاكتب نسخة مناسبة من الكابشن ده لكل منصة، ملتزم بالحدود: ${plats.map(k => `${k} (حد ${LIMITS[k] || 2000} حرف)`).join("، ")}.\n- linkedin: أهدى ومهني. x: أقل من 280 حرف. pinterest: وصف قصير بكلمات بحث. youtube: أول سطر يصلح عنوان.\nالكابشن:\n${cap() || input()}\nرجّع JSON بس بالشكل: {"instagram":"...","linkedin":"..."} للمنصات دي بس: ${plats.join(", ")}` },
        o => { $("#ai-out").innerHTML = `<div class="lbl f">نسخة لكل منصة <span>هتتحط في «كابشن مختلف لمنصة»</span></div>` + plats.filter(k => o[k]).map(k => `<div class="lbl f">${esc(NM(k))} <span>${o[k].length}/${LIMITS[k] || ""}</span></div><textarea rows="3" data-k="${k}">${esc(o[k])}</textarea>`).join("") + `<button class="btn pri" id="ai-per" style="margin-top:8px">استخدمهم</button>`;
          $("#ai-per").onclick = () => { document.querySelectorAll("#ai-out textarea[data-k]").forEach(t => setPerCap(t.dataset.k, t.value)); closeSheet(); toast("اتحطوا في «كابشن مختلف لمنصة» — راجعهم"); }; }); }
    if (["rewrite", "short", "check"].includes(t) && !cap()) return toast("مفيش كابشن أكتب فيه");
    if (t === "write" && !input() && !cap()) return toast("اكتب الفكرة الأول");
    run(T[t], txt => showText(txt));
  });
}

// voice note → draft caption (needs the free Gemini key; audio goes to Google)
async function voice() {
  if (!navigator.mediaDevices?.getUserMedia) return toast("الجهاز ده مش بيدعم التسجيل");
  let rec, chunks = [];
  $("#ai-out").innerHTML = `<p class="hint">اضغط ابدأ واتكلم عن فكرة البوست (لحد دقيقتين).</p><div class="libbar"><button class="btn pri" id="v-go">ابدأ</button><button class="btn" id="v-stop" disabled>خلصت</button></div>`;
  $("#v-go").onclick = async () => { try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); rec = new MediaRecorder(s); rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = async () => { s.getTracks().forEach(t => t.stop()); const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      const b64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(",")[1]); fr.readAsDataURL(blob); });
      run({ parts: [{ inline_data: { mime_type: (blob.type || "audio/webm").split(";")[0], data: b64 } }], prompt: async () => `${await context()}\nده تسجيل صوتي فيه فكرة بوست. اكتب كابشن ${len2()} منه بنفس كلام المتكلم ومن غير ما تضيف معلومات مش في التسجيل. رجّع الكابشن بس.` }, txt => showText(txt)); };
    rec.start(); $("#v-go").disabled = true; $("#v-stop").disabled = false; setTimeout(() => rec.state === "recording" && rec.stop(), 120000); } catch (e) { toast("محتاج إذن المايك"); } };
  $("#v-stop").onclick = () => rec?.state === "recording" && rec.stop();
  const len2 = () => ({ short: "قصير", mid: "متوسط", long: "طويل" })[$("#ai-len")?.value || "mid"];
}

// style memory: choose examples from your past captions (or paste), editable and clearable
async function openStyle() {
  await loadLib(); if (!items.length) await loadList(); const b = $("#c-brand")?.value || curBrand; const st = lib.styles[b] || { examples: [], notes: "" };
  const past = [...new Set(items.filter(x => (x.p.brand || "default") === b && x.p.caption).map(x => x.p.caption))].slice(0, 30);
  $("#ai-out").innerHTML = `<div class="lbl f">أسلوبي لـ ${esc(brands[b]?.name || b)} <span>بيتبعت مع كل طلب — اختار لحد 5 أمثلة</span></div>
   ${past.map((c, i) => `<label class="lrow" style="font-size:13px;align-items:flex-start"><input type="checkbox" data-i="${i}" style="width:auto;margin-top:4px" ${st.examples.includes(c) ? "checked" : ""}> ${esc(c.slice(0, 120))}…</label>`).join("") || '<p class="hint">مفيش كابشنز قديمة — الصق أمثلة تحت.</p>'}
   <textarea id="st-x" rows="3" placeholder="أو الصق مثال من كتابتك (افصل الأمثلة بسطر ---)">${esc(st.examples.filter(e => !past.includes(e)).join("\n---\n"))}</textarea>
   <input id="st-n" class="f" placeholder="ملاحظات: مثلاً «جمل قصيرة، إيموجي قليل، بخاطب المصورين المبتدئين»" value="${esc(st.notes || "")}">
   <div class="libbar"><button class="btn pri" id="st-s">حفظ</button><button class="btn" id="st-c">مسح الأسلوب</button></div>`;
  const save = async v => { lib.styles[b] = v; try { await commit([{ path: "config/library.json", b64: utf8b64(JSON.stringify(lib, null, 2)) }], "style memory"); toast("اتحفظ"); } catch (e) { toast(e.message); } };
  $("#st-s").onclick = () => { const ex = [...document.querySelectorAll("#ai-out [data-i]:checked")].map(x => past[+x.dataset.i]).concat($("#st-x").value.split(/\n\s*---\s*\n/).map(s => s.trim()).filter(Boolean)).slice(0, 5);
    save({ examples: ex, notes: $("#st-n").value.trim() }); };
  $("#st-c").onclick = () => save({ examples: [], notes: "" });
}

// ------------------------------------------------------------------ ideas, plan by time, long text → posts (ideas tab)
const _ri = window.renderList;
window.renderList = renderList = function () { _ri(); if (filter !== "ideas") return;
  setTimeout(() => { const box = document.querySelector("#l-items .box"); if (!box || box.querySelector(".aiideas")) return;
    const d = document.createElement("div"); d.className = "libbar aiideas";
    d.innerHTML = `<button class="btn sm" data-m="ideas">✨ اقترح أفكار</button><button class="btn sm" data-m="plan">✨ خطة على قد وقتي</button><button class="btn sm" data-m="split">✨ نص طويل ← بوستات</button>`;
    box.appendChild(d); d.querySelectorAll("button").forEach(b => b.onclick = () => openIdeaAI(b.dataset.m)); }, 50); };
async function openIdeaAI(mode) {
  const M = {
    ideas: { t: "اقترح أفكار", f: `<input id="ia-g" placeholder="الهدف (مثلاً: أجيب عملاء تصوير عقارات)"><input id="ia-a" class="f" placeholder="الجمهور (مثلاً: سماسرة ومطورين في القاهرة)"><div class="two f"><select id="ia-l"><option>عربي مصري</option><option>English</option><option>الاتنين</option></select><input id="ia-n" type="number" value="10" min="3" max="30"></div>`,
      p: async () => `${await context()}\nاقترح ${$("#ia-n").value} فكرة بوست مختلفة (زوايا وصيغ متنوعة: تعليمي، كواليس، قبل/بعد، سؤال، قصة عميل بدون اختراع تفاصيل).\nالهدف: ${$("#ia-g").value}\nالجمهور: ${$("#ia-a").value}\nاللغة: ${$("#ia-l").value}\nرجّع JSON بس: [{"idea":"الفكرة في جملة","format":"صور/فيديو/كاروسيل","why":"ليه ممكن تنفع (اقتراح محتاج تجربة)"}]` },
    plan: { t: "خطة على قد وقتي", f: `<div class="two"><input id="ia-h" type="number" value="3" min="1" max="40" placeholder="ساعات في الأسبوع"><input id="ia-pw" type="number" value="3" min="1" max="21" placeholder="بوستات في الأسبوع"></div><textarea id="ia-mat" class="f" rows="3" placeholder="عندك إيه جاهز؟ (صور، فيديوهات، مشاريع، مواضيع)"></textarea>`,
      p: async () => `${await context()}\nعندي ${$("#ia-h").value} ساعة في الأسبوع وعايز ${$("#ia-pw").value} بوست في الأسبوع. خطط لأسبوعين بشكل واقعي على قد الوقت ده (لو الوقت مش كفاية قلل العدد وقول ليه). استغل الجاهز ده:\n${$("#ia-mat").value}\nرجّع JSON بس: [{"day":"اليوم (مثلاً: الأحد الأسبوع 1)","idea":"البوست","format":"صور/فيديو","prep_minutes":30}]` },
    split: { t: "نص طويل ← بوستات", f: `<textarea id="ia-txt" rows="6" placeholder="الصق مقالة، ملاحظات، سكريبت فيديو…"></textarea><input id="ia-k" type="number" class="f" value="5" min="2" max="15">`,
      p: async () => `${await context()}\nقسّم النص ده لـ ${$("#ia-k").value} بوستات مستقلة، كل بوست بفكرة واحدة واضحة، من النص بس ومن غير معلومات جديدة.\nالنص:\n${$("#ia-txt").value}\nرجّع JSON بس: [{"idea":"عنوان قصير","caption":"كابشن البوست"}]` },
  }[mode];
  sheet(`<div class="wz"><h3>✨ ${M.t}</h3><div class="sub">النتيجة اقتراحات — بتتضاف لقائمة الأفكار لما تختارها، مش بتتنشر.</div>${M.f}<button class="btn pri f" id="ia-go">اطلب</button><div id="ai-out"></div><div class="nav"><button class="btn" onclick="closeSheet()">قفل</button></div></div>`);
  $("#ia-go").onclick = () => run({ json: true, prompt: M.p }, arr => { if (!Array.isArray(arr)) arr = arr.items || arr.ideas || [];
    $("#ai-out").innerHTML = `<div class="lbl f">${arr.length} اقتراح <span>اختار اللي عاجبك</span></div>` + arr.map((x, i) => `<label class="lrow" style="font-size:13.5px;align-items:flex-start"><input type="checkbox" data-i="${i}" checked style="width:auto;margin-top:4px"> <span>${x.day ? `<b>${esc(x.day)}:</b> ` : ""}${esc(x.idea || "")}${x.format ? ` <small class="mut">(${esc(x.format)}${x.prep_minutes ? ` · ${x.prep_minutes} دقيقة` : ""})</small>` : ""}${x.why ? `<br><small class="mut">${esc(x.why)}</small>` : ""}${x.caption ? `<br><small class="mut">${esc(x.caption.slice(0, 140))}…</small>` : ""}</span></label>`).join("") +
      `<button class="btn pri" id="ia-add" style="margin-top:8px">ضيف المختار للأفكار</button>`;
    $("#ia-add").onclick = async () => { let ideas = []; try { ideas = JSON.parse(await readFile("config/ideas.json")).ideas || []; } catch (e) {}
      const picked = [...document.querySelectorAll("#ai-out [data-i]:checked")].map(c => arr[+c.dataset.i]);
      ideas.unshift(...picked.map(x => ({ text: [x.day, x.idea, x.caption].filter(Boolean).join(" — "), at: new Date().toISOString(), source: "ai" })));
      try { await commit([{ path: "config/ideas.json", b64: utf8b64(JSON.stringify({ ideas }, null, 2)) }], "ideas from assistant"); closeSheet(); toast(`اتضاف ${picked.length} فكرة`); document.querySelector("#l-seg [data-v=ideas]")?.click(); }
      catch (e) { toast(e.message); } }; });
}

// ------------------------------------------------------------------ settings: AI box
const set = $("#settings");
if (set) { const box = document.createElement("div"); box.className = "box";
  box.innerHTML = `<div class="lbl">الذكاء الاصطناعي <span>اختياري وببلاش</span></div>
   <p class="note">من غير مفتاح: المساعد بيجهّز الطلب وانت تلصقه في أي شات مجاني. بمفتاح Gemini مجاني من <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a> بيكتب جوه الأداة على طول. المفتاح بيتحفظ على الجهاز ده بس. اللي بتبعته بيروح لجوجل، وفي الخطة المجانية جوجل ممكن تستخدمه لتحسين منتجاتها — ماتحطش بيانات سرية.</p>
   <select id="ai-prov"><option value="all">🤝 الكل مع بعض (أحسن نتيجة)</option>${Object.entries(PROV).map(([k, v]) => `<option value="${k}">${v.n}</option>`).join("")}</select>
   <div class="two"><input id="ai-key" type="password" autocomplete="off" placeholder="المفتاح (اختياري)" dir="ltr"><button class="btn" id="ai-test">حفظ واختبار</button></div>
   <p class="note" id="ai-getkey"></p>`;
  set.insertBefore(box, set.children[1]);
  const sync = () => { const p = $("#ai-prov").value; if (p === "all") { $("#ai-key").value = ""; $("#ai-key").disabled = true; $("#ai-getkey").textContent = `كل مفتاح تحفظه من القايمة هيشتغل مع التانيين: كل واحد بيكتب مسودة، وبعدين واحد بيدمج أحسن ما فيهم. مفاتيح محفوظة دلوقتي: ${keyed().length}. لازم تحفظ كل مفتاح بنفسه (اختار الشركة، الصق المفتاح، حفظ واختبار) وبعدين ارجع هنا.`; return; } $("#ai-key").disabled = false; $("#ai-key").value = ls.get(PROV[p].k); $("#ai-getkey").innerHTML = `هات المفتاح من <a href="${PROV[p].link}" target="_blank" rel="noopener">هنا</a>` + (p === "openai" ? " — ChatGPT API مدفوع (رصيد منفصل عن اشتراك ChatGPT)." : p === "gemini" ? "" : " — النص بس، من غير تسجيل صوتي."); };
  $("#ai-prov").value = prov(); sync(); $("#ai-prov").onchange = () => { ls.set("ap_ai_prov", $("#ai-prov").value); sync(); };
  $("#ai-test").onclick = async () => { const p = $("#ai-prov").value, k = $("#ai-key").value.trim(); ls.set("ap_ai_prov", p); if (p === "all") { try { const t = await ask([{ text: "رد بكلمة واحدة: تمام" }]); return toast(`شغال ✓ ${keyed().length} مساعدين مع بعض — ${t.slice(0, 20)}`, 6000); } catch (e) { return toast(e.message, 8000); } } ls.set(PROV[p].k, k); if (p === "gemini") ls.set("ap_gemini_model", ""); if (!k) return toast("هيشتغل من غير مفتاح (نسخ ولصق)");
    try { const t = await ask([{ text: "رد بكلمة واحدة: تمام" }]); toast(`شغال ✓ ${p === "gemini" ? "(" + ls.get("ap_gemini_model") + ")" : PROV[p].n} — ${t.slice(0, 20)}`, 6000); } catch (e) { toast(e.message, 8000); } }; }

const css = document.createElement("style");
css.textContent = `.aig{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0}.aig .btn{justify-content:center;font-size:13px}#ai-out textarea{width:100%}`;
document.head.appendChild(css);
})();
