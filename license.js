// AutoPost — subscription (no server, no fees), help & feedback, what's new.
// Client side: free trial → pay by InstaPay / bank transfer with a personal reference → receive a signed code → paste it.
// Owner side (only on the owner's account): customers list, record payments, issue signed codes, see who paid / who didn't.
(() => {
"use strict";
const OWNER = "abdonassar317-alt";
const PUBLIC_KEY = "Sbg09MltEUuNOc+7mUIOBjW2ZjQFTBkCYu3KuU/tuIY=";
const TRIAL_DAYS = 90, GRACE_DAYS = 3;
const PLANS = { month: { months: 1, price: 200 }, year: { months: 12, price: 1200 } }; // year = 50% off
// Owner contact + payment details (shown to clients). Empty = hidden.
const CONTACT = { whatsapp: "+20 109 290 0137", email: "abdonassar317@gmail.com", instapay: "abdoazmynassar@instapay", instapay_phone: "01092900137", bank: "" };
const VERSION = "29";
const CHANGES = [
  ["26", "اشتراكات (فترة مجانية + شهري/سنوي) · المساعدة والاقتراحات · الجديد في التطبيق", "Subscriptions (free trial + monthly/yearly) · Help & feedback · What's new"],
  ["25", "تحليل المحتوى: أحسن وقت، التنوّع، مراجعة المعلومات، تجارب A/B · كشف الصور المكررة · وسوم الملفات · تصدير حزمة محتوى", "Content insights: best time, mix, info review dates, A/B tests · already-posted check · media tags · content pack export"],
  ["24", "واجهة إنجليزي/عربي · الوضع الغامق · رابط موافقة العميل · الأرقام الحقيقية", "English/Arabic UI · dark mode · client approval links · real metrics"],
];
const EN = () => window.apLang === "en", L = (ar, en) => EN() ? en : ar;
const DAY = 864e5, me = () => String(cfg.owner || "").toLowerCase(), isOwner = () => me() === OWNER;
const b64u = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const fmtD = d => new Date(d).toLocaleDateString(EN() ? "en-GB" : "ar-EG", { day: "numeric", month: "long", year: "numeric" });
const ref = u => "AP-" + String(u || "").toLowerCase();
const wa = (text) => CONTACT.whatsapp ? `https://wa.me/${CONTACT.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}` : "";

function decode(code) { try { const [body, sig] = code.trim().replace(/^AP-/, "").split(".");
  if (!nacl.sign.detached.verify(new TextEncoder().encode(body), unb64u(sig), unb64(PUBLIC_KEY))) return null;
  return JSON.parse(new TextDecoder().decode(unb64u(body))); } catch (e) { return null; } }
function sign(payload, sk) { const body = b64u(new TextEncoder().encode(JSON.stringify(payload)));
  return `AP-${body}.${b64u(nacl.sign.detached(new TextEncoder().encode(body), sk))}`; }
const addMonths = (d, n) => { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + n); return x; };

// ------------------------------------------------------------------ subscription state (same rules as publisher/license.py)
let lic = null;
async function loadLic() {
  let c = {}; try { c = JSON.parse(await readFile("config/license.json")); } catch (e) {}
  const now = Date.now();
  if (isOwner()) return lic = { ok: true, plan: "owner", cfg: c };
  const p = c.code ? decode(c.code) : null;
  if (p && String(p.u).toLowerCase() === me()) return lic = { ok: now < new Date(p.until) - 0 + GRACE_DAYS * DAY, plan: p.p, until: p.until, cfg: c };
  if (!c.trial_start) { c.trial_start = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    try { await commit([{ path: "config/license.json", b64: utf8b64(JSON.stringify(c, null, 2)) }], "start free trial"); } catch (e) {} }
  const until = new Date(new Date(c.trial_start) - 0 + TRIAL_DAYS * DAY).toISOString();
  return lic = { ok: now < new Date(until), plan: "trial", until, cfg: c, bad: !!c.code };
}
const daysLeft = () => lic?.until ? Math.ceil((new Date(lic.until) - Date.now()) / DAY) : 999;
const planName = p => ({ trial: L("فترة مجانية", "Free trial"), month: L("شهري", "Monthly"), year: L("سنوي", "Yearly"), owner: L("صاحب التطبيق", "Owner") }[p] || p);

function subBox() {
  if (!lic) return "";
  const d = daysLeft();
  const st = lic.plan === "owner" ? L("مجاني دايمًا ✓", "Always free ✓")
    : lic.ok ? `${planName(lic.plan)} — ${L("لحد", "until")} ${fmtD(lic.until)} (${L(`فاضل ${d} يوم`, `${d} days left`)})`
    : L("الاشتراك خلص — النشر واقف لحد ما تجدد. بياناتك وبوستاتك محفوظة.", "Subscription ended — posting is paused until you renew. Your data and posts are kept.");
  return `<div class="lbl">${L("الاشتراك", "Subscription")}</div><p style="margin:4px 0 8px">${esc(st)}</p>` +
    (lic.bad ? `<p class="hint" style="color:var(--bad)">${L("الكود المحفوظ مش صالح للحساب ده.", "The saved code isn't valid for this account.")}</p>` : "") +
    (lic.plan === "owner" ? `<button class="btn sm" id="adm-open">${L("العملاء والمدفوعات", "Customers & payments")}</button>`
      : `<div class="two"><button class="btn sm pri" id="sub-pay">${L("ادفع / جدّد", "Pay / renew")}</button><button class="btn sm" id="sub-code">${L("عندي كود اشتراك", "I have a code")}</button></div>`);
}
function paySheet() {
  const u = me(), r = ref(u);
  sheet(`<div class="wz"><h3>${L("الاشتراك", "Subscription")}</h3>
   <div class="sub">${L("الأداة بتتطور باستمرار — اشتراكك بيدعم التطوير وبيجيلك كل جديد تلقائي.", "AutoPost keeps improving — your subscription funds that and every update reaches you automatically.")}</div>
   ${Object.entries(PLANS).map(([k, p]) => `<div class="lrow"><b style="flex:1">${planName(k)}</b><span>${p.price} ${L("جنيه", "EGP")}${k === "year" ? ` <small class="mut">(${L("بدل", "instead of")} ${PLANS.month.price * 12} — ${L("خصم 50%", "50% off")})</small>` : ""}</span></div>`).join("")}
   <div class="lbl f">${L("طرق الدفع", "How to pay")}</div>
   ${CONTACT.instapay ? `<div class="lrow"><span style="flex:1">InstaPay: <b>${esc(CONTACT.instapay)}</b></span><button class="btn sm" data-cp="${esc(CONTACT.instapay)}">${L("نسخ", "Copy")}</button></div>` : ""}
   ${CONTACT.instapay_phone ? `<div class="lrow"><span style="flex:1">${L("أو InstaPay على رقم", "Or InstaPay to mobile")}: <b style="direction:ltr;unicode-bidi:embed">${esc(CONTACT.instapay_phone)}</b></span><button class="btn sm" data-cp="${esc(CONTACT.instapay_phone)}">${L("نسخ", "Copy")}</button></div>` : ""}
   ${CONTACT.instapay ? `<img src="instapay-qr.jpg" alt="InstaPay QR" style="display:block;width:180px;margin:6px auto;border-radius:8px;background:#fff"><p class="hint" style="text-align:center">${L("أو امسح الكود من تطبيق InstaPay", "Or scan with the InstaPay app")}</p>` : ""}
   ${CONTACT.bank ? `<div class="lrow"><span style="flex:1">${L("تحويل بنكي", "Bank transfer")}: <b>${esc(CONTACT.bank)}</b></span><button class="btn sm" data-cp="${esc(CONTACT.bank)}">${L("نسخ", "Copy")}</button></div>` : ""}
   ${!CONTACT.instapay && !CONTACT.bank ? `<p class="hint">${L("بيانات الدفع هتتضاف قريب.", "Payment details coming soon.")}</p>` : ""}
   <div class="box f"><b>${L("مهم:", "Important:")}</b> ${L("اكتب الكود ده في ملاحظة التحويل عشان دفعتك تتسجل على حسابك:", "Put this reference in the transfer note so the payment is matched to your account:")}<br><code style="font-size:16px">${esc(r)}</code> <button class="btn sm" data-cp="${esc(r)}">${L("نسخ", "Copy")}</button></div>
   <p class="hint">${L("بعد التحويل ابعت صورة الإيصال، وهيوصلك كود الاشتراك تحطه هنا.", "After paying, send the receipt and you'll get a subscription code to paste here.")}</p>
   ${CONTACT.whatsapp ? Object.keys(PLANS).map(k => `<a class="btn f" style="display:block;text-align:center" target="_blank" href="${wa(`AutoPost — ${L("دفعت اشتراك", "I paid for")} ${planName(k)} (${PLANS[k].price} EGP)\n${L("المرجع", "Reference")}: ${r}\nGitHub: ${u}\n${L("مرفق الإيصال", "Receipt attached")}`)}">${L("دفعت", "I paid")} ${planName(k)} — ${L("ابعت الإيصال على واتساب", "send receipt on WhatsApp")}</a>`).join("")
     : `<a class="btn f" style="display:block;text-align:center" href="mailto:${CONTACT.email}?subject=${encodeURIComponent("AutoPost payment " + r)}&body=${encodeURIComponent("GitHub: " + u + "\nReference: " + r)}">${L("ابعت الإيصال بالإيميل", "Send the receipt by email")}</a>`}
   <div class="nav"><button class="btn" onclick="closeSheet()">${L("قفل", "Close")}</button></div></div>`);
  document.querySelectorAll("[data-cp]").forEach(b => b.onclick = () => navigator.clipboard.writeText(b.dataset.cp).then(() => toast(L("اتنسخ", "Copied"))));
}
function codeSheet() {
  sheet(`<div class="wz"><h3>${L("كود الاشتراك", "Subscription code")}</h3><textarea id="sub-in" rows="4" placeholder="AP-…" style="direction:ltr"></textarea>
   <div class="nav"><button class="btn pri" id="sub-ok">${L("تفعيل", "Activate")}</button><button class="btn" onclick="closeSheet()">${L("إلغاء", "Cancel")}</button></div></div>`);
  $("#sub-ok").onclick = async () => { const c = $("#sub-in").value.trim(), p = decode(c);
    if (!p) return toast(L("الكود مش صحيح", "Invalid code"));
    if (String(p.u).toLowerCase() !== me()) return toast(L("الكود ده لحساب تاني", "This code belongs to another account"));
    const nc = { ...(lic?.cfg || {}), code: c };
    try { await commit([{ path: "config/license.json", b64: utf8b64(JSON.stringify(nc, null, 2)) }], "activate subscription"); closeSheet(); await loadLic(); paint(); toast(L(`اتفعّل لحد ${fmtD(p.until)} ✓`, `Active until ${fmtD(p.until)} ✓`), 6000); } catch (e) { toast(e.message); } };
}

// ------------------------------------------------------------------ owner: customers & payments
const SKK = "ap_sk";
const getSk = () => { try { const s = localStorage.getItem(SKK); return s ? unb64(s) : null; } catch (e) { return null; } };
let cust = null;
async function loadCust() { try { cust = JSON.parse(await readFile("config/customers.json")); } catch (e) { cust = { customers: [] }; } return cust; }
const saveCust = m => commit([{ path: "config/customers.json", b64: utf8b64(JSON.stringify(cust, null, 2)) }], m);
const cStatus = c => { const u = c.until ? new Date(c.until) : null, now = Date.now();
  if (!u) return ["", L("لسه مدفعش", "Not paid yet")];
  const d = Math.ceil((u - now) / DAY);
  return d < 0 ? ["bad", L(`مدفعش — خلص من ${-d} يوم`, `Unpaid — ended ${-d} days ago`)] : d <= 7 ? ["warn", L(`دافع — فاضل ${d} يوم`, `Paid — ${d} days left`)] : ["ok", L(`دافع لحد ${fmtD(u)}`, `Paid until ${fmtD(u)}`)]; };

async function adminSheet() {
  if (!getSk()) return keySheet();
  await loadCust();
  const list = cust.customers, paid = list.filter(c => cStatus(c)[0] === "ok" || cStatus(c)[0] === "warn").length;
  const income = list.flatMap(c => c.payments || []).filter(p => new Date(p.date) > Date.now() - 30 * DAY).reduce((a, p) => a + (+p.amount || 0), 0);
  sheet(`<div class="wz"><h3>${L("العملاء والمدفوعات", "Customers & payments")}</h3>
   <div class="sub">${L(`${list.length} عميل · ${paid} دافع · دخل آخر 30 يوم: ${income} جنيه`, `${list.length} customers · ${paid} paid · last 30 days: ${income} EGP`)}</div>
   ${list.map((c, i) => { const [cl, t] = cStatus(c); return `<div class="nrow ${cl === "ok" ? "" : cl}"><div><b>${esc(c.name || c.github)}</b> <small class="mut">${esc(c.github)} · ${esc(ref(c.github))}</small><br>${esc(t)}${c.payments?.length ? ` <small class="mut">· ${L("آخر دفعة", "last")}: ${c.payments.at(-1).amount} ${esc(c.payments.at(-1).method)}</small>` : ""}</div>
     <div class="na"><button class="btn sm pri" data-pay="${i}">${L("سجّل دفعة", "Record payment")}</button>${c.code ? `<button class="btn sm" data-code="${i}">${L("الكود", "Code")}</button>` : ""}</div></div>`; }).join("") || `<p class="hint">${L("مفيش عملاء لسه.", "No customers yet.")}</p>`}
   <div class="lbl f">${L("عميل جديد", "New customer")}</div><input id="cu-g" placeholder="${L("اسم حسابه على GitHub", "GitHub username")}" style="direction:ltr"><div class="two f"><input id="cu-n" placeholder="${L("الاسم", "Name")}"><input id="cu-p" placeholder="${L("واتساب", "WhatsApp")}" style="direction:ltr"></div>
   <button class="btn f" id="cu-add">${L("إضافة", "Add")}</button>
   <div class="nav"><button class="btn" onclick="closeSheet()">${L("قفل", "Close")}</button></div></div>`);
  $("#cu-add").onclick = async () => { const g = $("#cu-g").value.trim().replace(/^@/, ""); if (!g) return toast(L("اكتب اسم GitHub", "Enter the GitHub username"));
    if (list.some(c => c.github.toLowerCase() === g.toLowerCase())) return toast(L("موجود بالفعل", "Already added"));
    list.push({ github: g, name: $("#cu-n").value.trim(), phone: $("#cu-p").value.trim(), added: new Date().toISOString(), payments: [] });
    try { await saveCust("add customer " + g); adminSheet(); } catch (e) { toast(e.message); } };
  document.querySelectorAll("[data-pay]").forEach(b => b.onclick = () => recordPay(+b.dataset.pay));
  document.querySelectorAll("[data-code]").forEach(b => b.onclick = () => showCode(list[+b.dataset.code]));
}
function recordPay(i) { const c = cust.customers[i];
  sheet(`<div class="wz"><h3>${L("سجّل دفعة", "Record payment")} — ${esc(c.name || c.github)}</h3>
   <div class="sub">${L("سجّلها بس بعد ما تتأكد إن الفلوس وصلت حسابك والمرجع", "Only record it after the money is in your account with reference")} <b>${esc(ref(c.github))}</b></div>
   <div class="seg" id="rp-plan">${Object.keys(PLANS).map((k, j) => `<button data-v="${k}" class="${j ? "" : "on"}">${planName(k)} (${PLANS[k].price})</button>`).join("")}</div>
   <div class="two f"><select id="rp-m"><option>InstaPay</option><option>${L("تحويل بنكي", "Bank transfer")}</option><option>${L("كاش", "Cash")}</option></select><input id="rp-a" type="number" value="${PLANS.month.price}"></div>
   <input id="rp-r" class="f" placeholder="${L("رقم العملية (اختياري)", "Transaction ID (optional)")}" style="direction:ltr">
   <div class="nav"><button class="btn pri" id="rp-ok">${L("تأكيد وإصدار الكود", "Confirm & issue code")}</button><button class="btn" onclick="adminSheet()">${L("رجوع", "Back")}</button></div></div>`);
  let plan = "month";
  $("#rp-plan").querySelectorAll("button").forEach(b => b.onclick = () => { plan = b.dataset.v; $("#rp-plan").querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); $("#rp-a").value = PLANS[plan].price; });
  $("#rp-ok").onclick = async () => {
    const start = c.until && new Date(c.until) > Date.now() ? new Date(c.until) : new Date();
    const until = addMonths(start, PLANS[plan].months).toISOString().replace(/\.\d+Z$/, "Z");
    c.payments = [...(c.payments || []), { date: new Date().toISOString(), plan, amount: +$("#rp-a").value || 0, method: $("#rp-m").value, txn: $("#rp-r").value.trim() || undefined }];
    c.until = until; c.plan = plan; c.code = sign({ u: c.github.toLowerCase(), p: plan, until }, getSk());
    try { await saveCust("payment " + c.github); showCode(c); } catch (e) { toast(e.message); } };
}
function showCode(c) {
  const msg = `${L("أهلاً", "Hi")} ${c.name || ""} 👋\n${L("دفعتك وصلت، شكرًا! اشتراكك في AutoPost شغال لحد", "Payment received, thank you! Your AutoPost subscription is active until")} ${fmtD(c.until)}.\n${L("افتح الأداة ← الإعدادات ← «عندي كود اشتراك» والصق الكود ده:", "Open the app → Settings → “I have a code” and paste:")}\n\n${c.code}`;
  sheet(`<div class="wz"><h3>${L("كود الاشتراك", "Subscription code")}</h3><div class="sub">${esc(c.name || c.github)} — ${L("لحد", "until")} ${fmtD(c.until)}</div>
   <textarea rows="5" readonly style="direction:ltr">${esc(c.code)}</textarea>
   <div class="nav"><button class="btn pri" id="sc-cp">${L("نسخ الرسالة", "Copy message")}</button>${c.phone ? `<a class="btn" target="_blank" href="https://wa.me/${c.phone.replace(/\D/g, "").replace(/^0/, "20")}?text=${encodeURIComponent(msg)}">${L("ابعته واتساب", "Send on WhatsApp")}</a>` : ""}<button class="btn" onclick="adminSheet()">${L("رجوع", "Back")}</button></div></div>`);
  $("#sc-cp").onclick = () => navigator.clipboard.writeText(msg).then(() => toast(L("اتنسخ", "Copied")));
}
function keySheet() {
  sheet(`<div class="wz"><h3>${L("مفتاح إصدار الأكواد", "Code-signing key")}</h3>
   <div class="sub">${L("مرة واحدة على الجهاز ده: الصق مفتاحك السري (من ملف autopost-signing-key.txt). بيتحفظ على الجهاز بس، ومحدش يقدر يعمل كود من غيره. ماتبعتهوش لحد.", "Once per device: paste your secret key (from autopost-signing-key.txt). It stays on this device only. Never share it.")}</div>
   <textarea id="sk-in" rows="3" style="direction:ltr"></textarea>
   <div class="nav"><button class="btn pri" id="sk-ok">${L("حفظ", "Save")}</button><button class="btn" onclick="closeSheet()">${L("إلغاء", "Cancel")}</button></div></div>`);
  $("#sk-ok").onclick = () => { try { const k = unb64($("#sk-in").value.trim()); if (k.length !== 64) throw 0;
      const test = sign({ t: 1 }, k); if (!decode(test)) throw 0;
      localStorage.setItem(SKK, $("#sk-in").value.trim()); toast(L("تمام ✓", "Saved ✓")); adminSheet(); } catch (e) { toast(L("المفتاح مش صحيح", "Wrong key")); } };
}

// ------------------------------------------------------------------ help & feedback + what's new
function helpBox() {
  const info = `AutoPost v${VERSION} · ${me() || "-"} · ${navigator.userAgent.match(/Android|iPhone|iPad|Mac|Windows|Linux/)?.[0] || ""}`;
  const link = (kind, txt) => CONTACT.whatsapp ? wa(`AutoPost — ${txt}\n\n…\n\n(${info})`) : `mailto:${CONTACT.email}?subject=${encodeURIComponent("AutoPost — " + txt)}&body=${encodeURIComponent("\n\n(" + info + ")")}`;
  return `<div class="lbl">${L("مساعدة واقتراحات", "Help & feedback")}</div>
   <p class="hint">${L("عندك فكرة تطوير أو قابلتك مشكلة؟ ابعتلنا — الأداة بتتطور باستمرار وكل اقتراح بيتقرا.", "Have an idea or hit a problem? Tell us — AutoPost is always improving and every suggestion is read.")}</p>
   <div class="two"><a class="btn sm" target="_blank" href="${link("idea", L("فكرة تطوير", "Feature idea"))}">💡 ${L("اقترح فكرة", "Suggest an idea")}</a><a class="btn sm" target="_blank" href="${link("bug", L("مشكلة في التطبيق", "Problem report"))}">🛠 ${L("بلّغ عن مشكلة", "Report a problem")}</a></div>
   <p class="hint f">${CONTACT.whatsapp ? `${L("واتساب", "WhatsApp")}: <a target="_blank" href="${wa("AutoPost")}" style="direction:ltr;unicode-bidi:embed">${esc(CONTACT.whatsapp)}</a> · ` : ""}${L("إيميل", "Email")}: <a href="mailto:${CONTACT.email}">${esc(CONTACT.email)}</a></p>
   <div class="lbl f">${L("الجديد في التطبيق", "What's new")} <small class="mut">v${VERSION}</small></div>
   ${CHANGES.map(([v, ar, en]) => `<div class="nrow"><div><b>v${v}</b> — ${esc(L(ar, en))}</div></div>`).join("")}`;
}

// ------------------------------------------------------------------ paint into settings + needs-you-now
function paint() {
  const set = document.getElementById("settings"); if (!set) return;
  let a = $("#sub-box"); if (!a) { a = document.createElement("div"); a.className = "box"; a.id = "sub-box"; (set.querySelector("#lang-box") || set.firstChild)?.after ? (set.querySelector("#lang-box") ? set.querySelector("#lang-box").after(a) : set.prepend(a)) : set.prepend(a); }
  a.innerHTML = subBox(); a.style.display = lic ? "" : "none";
  $("#sub-pay") && ($("#sub-pay").onclick = paySheet); $("#sub-code") && ($("#sub-code").onclick = codeSheet); $("#adm-open") && ($("#adm-open").onclick = adminSheet);
  let h = $("#help-box"); if (!h) { h = document.createElement("div"); h.className = "box"; h.id = "help-box"; set.appendChild(h); } h.innerHTML = helpBox();
}
window.adminSheet = adminSheet;
const _rn = window.renderNow;
window.renderNow = () => { _rn && _rn(); const el = $("#now-panel .now"); if (!el || !lic || lic.plan === "owner") return; const d = daysLeft();
  if (lic.ok && d > 7) return;
  const r = document.createElement("div"); r.className = "nrow " + (lic.ok ? "warn" : "bad");
  r.innerHTML = `<div>${lic.ok ? L(`${planName(lic.plan)}: فاضل ${d} يوم`, `${planName(lic.plan)}: ${d} days left`) : L("الاشتراك خلص — النشر واقف (بياناتك محفوظة)", "Subscription ended — posting paused (your data is kept)")}</div><div class="na"><button class="btn sm pri">${L("جدّد", "Renew")}</button></div>`;
  r.querySelector("button").onclick = paySheet; el.prepend(r); };
// owner: unpaid customers in needs-you-now
const _rn2 = window.renderNow;
window.renderNow = () => { _rn2(); if (!isOwner() || !cust) return; const el = $("#now-panel .now"); if (!el) return;
  const due = cust.customers.filter(c => c.until && new Date(c.until) - Date.now() < 3 * DAY);
  if (due.length) { const r = document.createElement("div"); r.className = "nrow warn"; r.innerHTML = `<div>${L(`${due.length} عميل اشتراكه خلص أو قرب يخلص: `, `${due.length} customers ended or ending soon: `)}${due.map(c => esc(c.name || c.github)).join("، ")}</div><div class="na"><button class="btn sm" onclick="adminSheet()">${L("العملاء", "Customers")}</button></div>`; el.appendChild(r); } };

async function init() {
  if (!cfg.token || !cfg.owner) return setTimeout(init, 3000);
  try { await loadLic(); if (isOwner() && getSk()) await loadCust(); } catch (e) {}
  paint(); window.renderNow && renderNow();
  try { const seen = localStorage.getItem("ap_seen_v"); if (seen && seen !== VERSION) toast(L(`اتحدّث التطبيق لـ v${VERSION} — شوف الجديد في الإعدادات`, `Updated to v${VERSION} — see What's new in Settings`), 6000); localStorage.setItem("ap_seen_v", VERSION); } catch (e) {}
}
setInterval(() => { if (lic && !$("#sub-box")) paint(); }, 1500);
init();
})();
