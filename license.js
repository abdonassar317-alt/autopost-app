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
const CONTACT = { whatsapp: "+20 109 290 0137", email: "abdonassar317@gmail.com", instapay: "abdoazmynassar@instapay", instapay_phone: "01092900137", inbox: "https://script.google.com/macros/s/AKfycbwrvyR0OptBwNgzHDNPCdv9ARgy_OUBzbMWxRCO00T85K_iQeqgOhNZ9H3CimophGEN_w/exec", bank: "" };
const VERSION = "41";
const CHANGES = [
  ["41", "تيك توك: البوست بيوصل صندوق تيك توك لوحده · تذكير بضغطة لبروفايل فيسبوك الشخصي", "TikTok: posts land in your TikTok inbox · one-tap reminder for your personal Facebook profile"],
  ["40", "ربط المنصات بقى أسرع (خطوة واحدة بدل اتنين)", "Faster platform connections (one step instead of two)"],
  ["39", "إصلاح ربط فيسبوك وإنستجرام ويوتيوب وتيك توك من النافذة الصغيرة", "Fixed Facebook, Instagram, YouTube and TikTok sign-in from the small window"],
  ["38", "ربط فيسبوك وإنستجرام بضغطة (تسجيل دخول فيسبوك)", "One-tap Facebook & Instagram connection (Facebook login)"],
  ["37", "ربط المنصات في نافذة صغيرة بترجع لوحدها · حسابات العملاء بتربط لينكدإن ويوتيوب وتيك توك بضغطة", "Platform sign-in in a small window that closes itself · client accounts connect LinkedIn, YouTube and TikTok in one tap"],
  ["36", "حساب جوه التطبيق بالإيميل (من غير GitHub) · قايمة أسرع بكتير · بحث في البوستات · اختصارات كيبورد ومواعيد سريعة", "Sign up with e-mail inside the app (no GitHub) · much faster lists · post search · keyboard shortcuts & quick times"],
  ["32", "ارفع صورة التحويل جوه التطبيق والاشتراك يتفعّل لوحده بعد المراجعة", "Upload your transfer screenshot in the app — activates automatically after review"],
  ["30", "صفحة أسعار ودفع جديدة", "New pricing & payment screens"],
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
    (payReq?.status === "pending" ? `<p class="hint" style="color:var(--warn)">⏳ ${L("صورة التحويل بتتراجع — الاشتراك هيتفعّل لوحده أول ما تتأكد.", "Your transfer is being reviewed — it will activate automatically.")}</p>` : "") +
    (payReq?.status === "rejected" ? `<p class="hint" style="color:var(--bad)">${L("طلب الدفع اترفض", "Payment request rejected")}${payReq.reason ? ": " + esc(payReq.reason) : ""}</p>` : "") +
    (lic.bad ? `<p class="hint" style="color:var(--bad)">${L("الكود المحفوظ مش صالح للحساب ده.", "The saved code isn't valid for this account.")}</p>` : "") +
    (lic.plan === "owner" ? `<button class="btn sm" id="adm-open">${L("العملاء والمدفوعات", "Customers & payments")}</button>`
      : `<div class="two"><button class="btn sm pri" id="sub-pay">${L("ادفع / جدّد", "Pay / renew")}</button><button class="btn sm" id="sub-code">${L("عندي كود اشتراك", "I have a code")}</button></div>`);
}
const FEATURES = () => [
  L("كل المنصات: إنستجرام، فيسبوك، لينكدإن، يوتيوب، بنترست، تيك توك، سناب، X", "Every platform: Instagram, Facebook, LinkedIn, YouTube, Pinterest, TikTok, Snapchat, X"),
  L("حسابات وعملاء وبوستات من غير حد", "Unlimited accounts, clients and posts"),
  L("رابط موافقة للعميل + تقرير شهري PDF", "Client approval links + monthly PDF report"),
  L("تحليل محتواك وأحسن وقت للنشر", "Content insights and best time to post"),
  L("مساعد كتابة بالذكاء الاصطناعي (اختياري)", "Optional AI writing assistant"),
  window.HOST ? L("بياناتك خاصة بحسابك — ومفاتيح الربط متشفّرة", "Your data is private to your account — connection keys are encrypted") : L("بياناتك على حسابك إنت — مش عندنا", "Your data stays in your account — not ours"),
  L("كل التحديثات الجديدة تلقائي", "Every new update, automatically"),
];
let payPlan = "year";
function paySheet() {
  const P = PLANS, mo = P.month.price, yr = P.year.price, perMo = Math.round(yr / 12), save = mo * 12 - yr;
  const card = (k) => { const on = payPlan === k, y = k === "year";
    return `<button class="pc${on ? " on" : ""}" data-plan="${k}">
      ${y ? `<span class="pc-badge">${L("الأوفر", "Best value")}</span>` : ""}
      <span class="pc-name">${planName(k)}</span>
      <span class="pc-price"><b>${y ? perMo : mo}</b> ${L("جنيه", "EGP")}<small>/${L("شهر", "mo")}</small></span>
      <span class="pc-sub">${y ? L(`${yr} جنيه في السنة · وفّر ${save} جنيه`, `${yr} EGP a year · save ${save} EGP`) : L("ادفع شهر بشهر", "Pay month to month")}</span>
      <i class="pc-dot"></i></button>`; };
  const trial = lic?.plan === "trial" && lic.ok ? `<div class="pp-trial">${L(`إنت في الفترة المجانية — فاضل ${daysLeft()} يوم. مش لازم تدفع دلوقتي.`, `You're on the free trial — ${daysLeft()} days left. No need to pay yet.`)}</div>` : "";
  sheet(`<div class="wz pp"><div class="pp-head"><div class="pp-logo">A</div><h3>AutoPost</h3>
     <p>${L("انشر على كل المنصات من مكان واحد — بأقل سعر.", "Post everywhere from one place — for less.")}</p></div>
   ${trial}
   <div class="pp-cards">${card("year")}${card("month")}</div>
   <ul class="pp-feat">${FEATURES().map(f => `<li>${esc(f)}</li>`).join("")}</ul>
   <div class="pp-cmp">${L("أدوات الجدولة المعروفة بتبدأ من 5$ لكل حساب، وبعضها 99$ للمستخدم. هنا كل حساباتك بـ", "Well-known schedulers start at $5 per account, some at $99 per user. Here, all your accounts for")} <b>${mo} ${L("جنيه", "EGP")}</b>.</div>
   <button class="btn pri pp-go" id="pp-go">${L("كمّل للدفع", "Continue to payment")} — ${payPlan === "year" ? yr : mo} ${L("جنيه", "EGP")}</button>
   <div class="pp-trust"><span>✓ ${L("من غير كارت", "No card needed")}</span><span>✓ ${L("مفيش تجديد تلقائي", "No auto-renew")}</span><span>✓ ${L("بياناتك محفوظة دايمًا", "Your data is always kept")}</span></div>
   <p class="hint" style="text-align:center">${L("الأداة بتتطور كل أسبوع — عندك فكرة؟", "AutoPost improves every week — got an idea?")} <a target="_blank" href="${wa("AutoPost — " + L("فكرة تطوير", "Feature idea"))}">${L("قولنا", "Tell us")}</a></p>
   <div class="nav"><button class="btn" onclick="closeSheet()">${L("بعدين", "Later")}</button></div></div>`);
  document.querySelectorAll("[data-plan]").forEach(b => b.onclick = () => { payPlan = b.dataset.plan; paySheet(); });
  $("#pp-go").onclick = payStep;
}
function payStep() {
  const u = me(), r = ref(u), k = payPlan, amt = PLANS[k].price;
  const row = (label, val) => `<div class="pm-row"><div><small>${label}</small><b>${esc(val)}</b></div><button class="btn sm" data-cp="${esc(val)}">${L("نسخ", "Copy")}</button></div>`;
  sheet(`<div class="wz pp"><div class="pp-steps"><span class="done">1 ${L("الخطة", "Plan")}</span><span class="on">2 ${L("الدفع", "Pay")}</span><span>3 ${L("التفعيل", "Activate")}</span></div>
   <div class="pm-amt"><small>${planName(k)}</small><b>${amt}</b> ${L("جنيه", "EGP")}</div>
   <div class="pm-box">
     <div class="pm-title">InstaPay</div>
     ${CONTACT.instapay ? `<img class="pm-qr" src="instapay-qr.jpg" alt="InstaPay QR"><p class="hint" style="text-align:center;margin-top:0">${L("امسح الكود من تطبيق InstaPay", "Scan with the InstaPay app")}</p>` : ""}
     ${CONTACT.instapay ? row(L("العنوان", "Address"), CONTACT.instapay) : ""}
     ${CONTACT.instapay_phone ? row(L("أو رقم الموبايل", "Or mobile number"), CONTACT.instapay_phone) : ""}
     ${CONTACT.bank ? row(L("تحويل بنكي", "Bank transfer"), CONTACT.bank) : ""}
   </div>
   <div class="pm-ref"><div><small>${CONTACT.inbox ? L("اختياري: لو InstaPay فيه خانة ملاحظة اكتب فيها", "Optional: if InstaPay shows a note field, type") : L("اكتب ده في خانة الملاحظة في InstaPay", "Type this in the InstaPay note field")}</small><b>${esc(r)}</b></div><button class="btn sm" data-cp="${esc(r)}">${L("نسخ", "Copy")}</button></div>
   ${uploadBlock(k)}
   ${CONTACT.inbox ? "" : `<div>${CONTACT.whatsapp ? `<a class="btn pri pp-go" target="_blank" href="${wa(`AutoPost — ${L("دفعت", "Paid")} ${planName(k)} (${amt} EGP)\n${L("المرجع", "Reference")}: ${r}\nGitHub: ${u}\n${L("مرفق الإيصال", "Receipt attached")}`)}">${L("دفعت — ابعت الإيصال على واتساب", "I've paid — send the receipt on WhatsApp")}</a>`
     : `<a class="btn pri pp-go" href="mailto:${CONTACT.email}?subject=${encodeURIComponent("AutoPost payment " + r)}">${L("ابعت الإيصال بالإيميل", "Send the receipt by email")}</a>`}</div>`}
   <p class="hint" style="text-align:center">${L("هيوصلك كود التفعيل على واتساب عادة في نفس اليوم. تحطه من الإعدادات ← «عندي كود اشتراك».", "You'll get your activation code on WhatsApp, usually the same day. Paste it in Settings → “I have a code”.")}</p>
   <div class="nav"><button class="btn" id="pm-back">${L("رجوع", "Back")}</button><button class="btn" id="pm-code">${L("عندي الكود", "I have the code")}</button></div></div>`);
  document.querySelectorAll("[data-cp]").forEach(b => b.onclick = () => navigator.clipboard.writeText(b.dataset.cp).then(() => toast(L("اتنسخ ✓", "Copied ✓"))));
  $("#pm-back").onclick = paySheet; $("#pm-code").onclick = codeSheet; wireUpload(k);
}
const ppCss = document.createElement("style");
ppCss.textContent = `.pp{padding:6px 6px 0}.pp-head{text-align:center;padding:10px 0 6px}.pp-head h3{margin:8px 0 2px;font-size:22px;letter-spacing:-.02em}.pp-head p{margin:0;color:var(--mut);font-size:14px}
.pp-logo{width:48px;height:48px;border-radius:14px;background:var(--ink);color:var(--s);display:grid;place-items:center;font-weight:800;font-size:22px;margin:0 auto}
.pp-trial{background:var(--soft);border-radius:10px;padding:10px 12px;font-size:13px;text-align:center;margin:10px 0 0}
.pp-cards{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}
.pc{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:start;font:inherit;color:var(--ink);background:var(--s);border:1.5px solid var(--line);border-radius:14px;padding:16px 14px 14px;cursor:pointer;transition:border-color .15s,transform .15s}
.pc:active{transform:scale(.98)}.pc.on{border-color:var(--ink);box-shadow:0 0 0 3px color-mix(in srgb,var(--ink) 10%,transparent)}
.pc-badge{position:absolute;top:-10px;inset-inline-start:12px;background:var(--ink);color:var(--s);font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px}
.pc-name{font-size:13px;color:var(--mut);font-weight:600}.pc-price{font-size:13px}.pc-price b{font-size:30px;letter-spacing:-.03em;font-variant-numeric:tabular-nums}.pc-price small{color:var(--mut)}
.pc-sub{font-size:12px;color:var(--mut);line-height:1.4}.pc.on .pc-sub{color:var(--ok)}
.pc-dot{position:absolute;top:14px;inset-inline-end:12px;width:18px;height:18px;border-radius:50%;border:1.5px solid var(--line)}.pc.on .pc-dot{border:5px solid var(--ink)}
.pp-feat{list-style:none;padding:0;margin:4px 0 12px;display:grid;gap:9px}.pp-feat li{font-size:14px;padding-inline-start:26px;position:relative;line-height:1.45}
.pp-feat li:before{content:"";position:absolute;inset-inline-start:0;top:2px;width:18px;height:18px;border-radius:50%;background:var(--soft) no-repeat center/11px url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2 6.5l2.5 2.5L10 3.5' fill='none' stroke='%231f7a4d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")}
.pp-cmp{font-size:13px;color:var(--mut);background:var(--soft);border-radius:10px;padding:10px 12px;margin-bottom:12px;line-height:1.5}.pp-cmp b{color:var(--ink)}
.pp-go{color:var(--s)!important;background:var(--ink)!important;width:100%;padding:15px;font-size:16px;border-radius:12px;display:flex;text-decoration:none}
.pp-trust{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 14px;font-size:12px;color:var(--mut);margin:10px 0 4px}
.pp-steps{display:flex;gap:6px;justify-content:center;margin:6px 0 14px}.pp-steps span{font-size:12px;padding:5px 10px;border-radius:20px;background:var(--soft);color:var(--mut)}.pp-steps .on{background:var(--ink);color:var(--s)}.pp-steps .done{color:var(--ok)}
.pm-amt{text-align:center;margin-bottom:12px}.pm-amt small{display:block;color:var(--mut);font-size:13px}.pm-amt b{font-size:36px;letter-spacing:-.03em}
.pm-box{border:1px solid var(--line);border-radius:14px;padding:12px;margin-bottom:10px}.pm-title{font-weight:700;margin-bottom:8px}
.pm-qr{display:block;width:170px;margin:0 auto 6px;border-radius:10px;background:#fff;padding:4px}
.pm-row,.pm-ref{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line)}.pm-row>div,.pm-ref>div{flex:1;min-width:0}.pm-row small,.pm-ref small{display:block;color:var(--mut);font-size:12px}.pm-row b,.pm-ref b{direction:ltr;unicode-bidi:embed;word-break:break-all}
.pm-up{border:1px solid var(--line);border-radius:14px;padding:12px;margin:10px 0}.pm-drop{display:flex;justify-content:center;align-items:center;min-height:90px;border:1.5px dashed var(--line);border-radius:12px;margin:8px 0 10px;cursor:pointer;color:var(--mut);font-size:14px;text-align:center;padding:8px}
.rq{display:flex;gap:10px;border:1px solid var(--line);border-radius:12px;padding:10px;margin:8px 0}.rq-img{width:84px;height:120px;object-fit:cover;border-radius:8px;cursor:zoom-in;background:var(--soft)}.rq-img.big{position:fixed;inset:5vh 5vw;width:90vw;height:90vh;object-fit:contain;z-index:60;background:#000c;cursor:zoom-out}
.rq-b{flex:1;min-width:0;font-size:14px}.rq-cs{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.rq-c{font-size:12px;padding:2px 8px;border-radius:20px;background:var(--soft)}.rq-c.y{color:var(--ok)}.rq-c.n{color:var(--bad)}.rq-warn{background:color-mix(in srgb,var(--bad) 12%,transparent);color:var(--bad);border-radius:8px;padding:6px 8px;font-size:13px;margin:4px 0}.rq-btns{display:flex;flex-wrap:wrap;gap:6px}.rq-n{background:var(--bad);color:#fff;border-radius:20px;padding:0 7px;font-size:12px}
.pm-ref{border:1.5px dashed var(--ink);border-radius:12px;padding:10px 12px;margin-bottom:12px}`;
document.head.appendChild(ppCss);
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
  const reqHtml = await requestsBlock();
  sheet(`<div class="wz"><h3>${L("العملاء والمدفوعات", "Customers & payments")}</h3>
   <div class="sub">${L(`${list.length} عميل · ${paid} دافع · دخل آخر 30 يوم: ${income} جنيه`, `${list.length} customers · ${paid} paid · last 30 days: ${income} EGP`)}</div>
   ${reqHtml}<div class="lbl f">${L("العملاء", "Customers")}</div>
   ${list.map((c, i) => { const [cl, t] = cStatus(c); return `<div class="nrow ${cl === "ok" ? "" : cl}"><div><b>${esc(c.name || c.github)}</b> <small class="mut">${esc(c.github)} · ${esc(ref(c.github))}</small><br>${esc(t)}${c.payments?.length ? ` <small class="mut">· ${L("آخر دفعة", "last")}: ${c.payments.at(-1).amount} ${esc(c.payments.at(-1).method)}</small>` : ""}</div>
     <div class="na"><button class="btn sm pri" data-pay="${i}">${L("سجّل دفعة", "Record payment")}</button>${c.code ? `<button class="btn sm" data-code="${i}">${L("الكود", "Code")}</button>` : ""}</div></div>`; }).join("") || `<p class="hint">${L("مفيش عملاء لسه.", "No customers yet.")}</p>`}
   <div class="lbl f">${L("عميل جديد", "New customer")}</div><input id="cu-g" placeholder="${L("اسم حسابه على GitHub", "GitHub username")}" style="direction:ltr"><div class="two f"><input id="cu-n" placeholder="${L("الاسم", "Name")}"><input id="cu-p" placeholder="${L("واتساب", "WhatsApp")}" style="direction:ltr"></div>
   <button class="btn f" id="cu-add">${L("إضافة", "Add")}</button>
   <div class="nav"><button class="btn" onclick="closeSheet()">${L("قفل", "Close")}</button></div></div>`);
  $("#cu-add").onclick = async () => { const g = $("#cu-g").value.trim().replace(/^@/, ""); if (!g) return toast(L("اكتب اسم GitHub", "Enter the GitHub username"));
    if (list.some(c => c.github.toLowerCase() === g.toLowerCase())) return toast(L("موجود بالفعل", "Already added"));
    list.push({ github: g, name: $("#cu-n").value.trim(), phone: $("#cu-p").value.trim(), added: new Date().toISOString(), payments: [] });
    try { await saveCust("add customer " + g); adminSheet(); } catch (e) { toast(e.message); } };
  wireRequests();
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
  $("#rp-ok").onclick = async () => { grant(c, plan, +$("#rp-a").value || 0, $("#rp-m").value, $("#rp-r").value.trim());
    try { await saveCust("payment " + c.github); showCode(c); } catch (e) { toast(e.message); } };
}
function grant(c, plan, amount, method, txn) {
  const start = c.until && new Date(c.until) > Date.now() ? new Date(c.until) : new Date();
  const until = addMonths(start, PLANS[plan].months).toISOString().replace(/\.\d+Z$/, "Z");
  c.payments = [...(c.payments || []), { date: new Date().toISOString(), plan, amount, method, txn: txn || undefined }];
  c.until = until; c.plan = plan; c.code = sign({ u: c.github.toLowerCase(), p: plan, until }, getSk()); return c;
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

// ------------------------------------------------------------------ payment inbox (Apps Script web app on the owner's Google account)
const IKEY = "ap_inbox_key";
const inboxGet = async q => (await fetch(CONTACT.inbox + "?" + new URLSearchParams(q))).json();
const inboxPost = async b => (await fetch(CONTACT.inbox, { method: "POST", body: JSON.stringify(b) })).json();
async function shrink(file) { const bmp = await createImageBitmap(file), k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", .82).split(",")[1]; }
let payReq = null; // client's latest request
async function checkReq() { if (!CONTACT.inbox || isOwner()) return;
  try { payReq = await inboxGet({ action: "status", user: me() }); } catch (e) { return; }
  if (payReq.status === "approved" && payReq.code && lic?.cfg?.code !== payReq.code) { const p = decode(payReq.code);
    if (p && String(p.u).toLowerCase() === me()) { try { await commit([{ path: "config/license.json", b64: utf8b64(JSON.stringify({ ...(lic?.cfg || {}), code: payReq.code }, null, 2)) }], "activate subscription"); await loadLic(); paint();
      toast(L(`دفعتك اتقبلت ✓ اشتراكك شغال لحد ${fmtD(p.until)}`, `Payment approved ✓ Active until ${fmtD(p.until)}`), 8000); } catch (e) {} } }
  paint(); }
function uploadBlock(k) {
  if (!CONTACT.inbox) return "";
  return `<div class="pm-up"><div class="pm-title">${L("بعد ما تحوّل: ارفع صورة التحويل", "After you pay: upload the transfer screenshot")}</div>
    <label class="pm-drop" id="pm-drop"><input type="file" accept="image/*" id="pm-file" hidden><span id="pm-drop-t">📷 ${L("اختار سكرين التحويل من الموبايل", "Choose the transfer screenshot")}</span></label>
    <button class="btn pri pp-go" id="pm-send" disabled>${L("ابعت للمراجعة", "Send for review")}</button>
    <p class="hint" style="text-align:center">${L("الصورة بتروح لصاحب التطبيق بس. أول ما يتأكد إن الفلوس وصلت، الاشتراك بيتفعّل عندك لوحده — مش محتاج تعمل حاجة.", "Only the app owner sees it. Once the money is confirmed, your subscription activates by itself.")}</p></div>`;
}
function wireUpload(k) {
  if (!CONTACT.inbox) return; let img = null;
  $("#pm-file").onchange = async e => { const f = e.target.files[0]; if (!f) return; try { img = await shrink(f); $("#pm-drop-t").innerHTML = `<img src="data:image/jpeg;base64,${img}" style="max-height:160px;border-radius:8px">`; $("#pm-send").disabled = false; } catch (x) { toast(L("الصورة مش مقروءة", "Can't read that image")); } };
  $("#pm-send").onclick = async () => { if (!img) return; $("#pm-send").disabled = true; $("#pm-send").textContent = L("بيتبعت…", "Sending…");
    try { const r = await inboxPost({ action: "submit", user: me(), plan: k, image: img, s: window.HOST?.session }); if (r.error) throw new Error(r.error);
      payReq = { status: "pending", plan: k }; closeSheet(); paint();
      sheet(`<div class="wz pp" style="text-align:center"><div class="pp-logo" style="background:var(--ok)">✓</div><h3>${L("وصلت!", "Received!")}</h3><p class="hint">${L("صورة التحويل اتبعتت للمراجعة. أول ما تتأكد، الاشتراك هيتفعّل عندك لوحده وهيظهرلك إشعار هنا. عادة في نفس اليوم.", "Your screenshot is in review. Once confirmed, your subscription activates automatically — usually the same day.")}</p><div class="nav"><button class="btn pri" onclick="closeSheet()">${L("تمام", "OK")}</button></div></div>`);
    } catch (e) { toast(L("ماتبعتتش: ", "Not sent: ") + e.message, 6000); $("#pm-send").disabled = false; $("#pm-send").textContent = L("ابعت للمراجعة", "Send for review"); } };
}
const ikey = () => { try { return localStorage.getItem(IKEY) || ""; } catch (e) { return ""; } };
async function requestsBlock() {
  if (!CONTACT.inbox) return `<p class="hint">${L("صندوق صور التحويل مش متفعّل لسه.", "The payment-screenshot inbox isn't set up yet.")}</p>`;
  if (!ikey()) return `<div class="lbl f">${L("مفتاح صندوق المدفوعات", "Payment inbox key")}</div><div class="two"><input id="ik-in" style="direction:ltr" placeholder="ADMIN_KEY"><button class="btn sm" id="ik-ok">${L("حفظ", "Save")}</button></div>`;
  let rs = []; try { const r = await inboxGet({ action: "list", key: ikey() }); if (r.error) throw new Error(r.error); rs = r.requests || []; } catch (e) { return `<p class="hint" style="color:var(--bad)">${L("مش قادر أوصل لصندوق المدفوعات: ", "Can't reach the payment inbox: ")}${esc(e.message)}</p>`; }
  const pend = rs.filter(r => r.status === "pending");
  window.__reqs = rs;
  const yes = (b, t) => `<span class="rq-c ${b ? "y" : "n"}">${b ? "✓" : "✗"} ${t}</span>`;
  return `<div class="lbl f">${L("طلبات الدفع", "Payment requests")} ${pend.length ? `<span class="rq-n">${pend.length}</span>` : ""}</div>` +
    (pend.map(r => `<div class="rq"><img src="data:image/jpeg;base64,${r.img}" class="rq-img" onclick="this.classList.toggle('big')"><div class="rq-b">
      <b>${esc(r.user)}</b> — ${planName(r.plan)} <b>${r.price}</b> ${L("جنيه", "EGP")}<br><small class="mut">${new Date(r.at).toLocaleString(EN() ? "en-GB" : "ar-EG")}</small>
      <div class="rq-cs">${yes(r.check?.amount_ok, L("المبلغ", "Amount"))}${yes(r.check?.ref_ok, L("المرجع", "Reference"))}${yes(r.check?.instapay, "InstaPay")}</div>
      ${r.check?.amounts?.length ? `<small class="mut">${L("أرقام في الصورة", "Numbers seen")}: ${r.check.amounts.join(" · ")}</small>` : ""}
      <p class="hint" style="margin:6px 0">${L("اتأكد من تطبيق InstaPay إن المبلغ وصل فعلًا قبل القبول.", "Check your InstaPay app that the money really arrived before approving.")}</p>
      ${r.check && !r.check.amount_ok ? `<div class="rq-warn">⚠️ ${L(`المبلغ في الصورة مش ${r.price} جنيه — اتأكد من InstaPay قبل ما توافق`, `The screenshot doesn't show ${r.price} EGP — check InstaPay before approving`)}</div>` : ""}
      <div class="rq-btns">${Object.keys(PLANS).map(k => `<button class="btn sm ${k === r.plan ? "pri" : ""}" data-ok="${r.id}" data-plan="${k}">${L("قبول", "Approve")} ${planName(k)} (${PLANS[k].price})</button>`).join("")}<button class="btn sm" data-no="${r.id}">${L("رفض", "Reject")}</button></div></div></div>`).join("") || `<p class="hint">${L("مفيش طلبات جديدة.", "No new requests.")}</p>`);
}
function wireRequests() {
  $("#ik-ok") && ($("#ik-ok").onclick = () => { try { localStorage.setItem(IKEY, $("#ik-in").value.trim()); } catch (e) {} adminSheet(); });
  document.querySelectorAll("[data-ok]").forEach(b => b.onclick = async () => { const r0 = __reqs.find(x => x.id === b.dataset.ok), plan = b.dataset.plan || r0.plan;
    if (plan !== r0.plan && !confirm(L(`العميل طالب ${planName(r0.plan)} بس هتفعّله ${planName(plan)} (${PLANS[plan].price} جنيه). تمام؟`, `Client asked for ${planName(r0.plan)} but you'll activate ${planName(plan)}. OK?`))) return;
    const r = { ...r0, plan, price: PLANS[plan].price }; b.disabled = true;
    let c = cust.customers.find(x => x.github.toLowerCase() === r.user); if (!c) { c = { github: r.user, name: "", phone: r.contact || "", added: new Date().toISOString(), payments: [] }; cust.customers.push(c); }
    grant(c, r.plan, r.price, "InstaPay", "req " + r.id);
    try { await saveCust("payment " + r.user); const x = await inboxPost({ action: "decide", key: ikey(), id: r.id, approve: true, code: c.code }); if (x.error) throw new Error(x.error);
      toast(L(`اتفعّل ${r.user} لحد ${fmtD(c.until)} ✓ — هيوصله لوحده`, `${r.user} active until ${fmtD(c.until)} ✓ — delivered automatically`), 6000); adminSheet(); } catch (e) { toast(e.message); b.disabled = false; } });
  document.querySelectorAll("[data-no]").forEach(b => b.onclick = async () => { const why = prompt(L("سبب الرفض (هيظهر للعميل):", "Reason (shown to the client):"), L("المبلغ موصلش", "Payment not received")); if (why === null) return;
    try { await inboxPost({ action: "decide", key: ikey(), id: b.dataset.no, approve: false, reason: why }); adminSheet(); } catch (e) { toast(e.message); } });
}
// ------------------------------------------------------------------ help & feedback + what's new
function helpBox() {
  const info = `AutoPost v${VERSION} · ${me() || "-"} · ${navigator.userAgent.match(/Android|iPhone|iPad|Mac|Windows|Linux/)?.[0] || ""}`;
  const link = (kind, txt) => CONTACT.whatsapp ? wa(`AutoPost — ${txt}\n\n…\n\n(${info})`) : `mailto:${CONTACT.email}?subject=${encodeURIComponent("AutoPost — " + txt)}&body=${encodeURIComponent("\n\n(" + info + ")")}`;
  return `<div class="lbl">${L("مساعدة واقتراحات", "Help & feedback")}</div>
   <p class="hint">${L("عندك فكرة تطوير أو قابلتك مشكلة؟ ابعتلنا — الأداة بتتطور باستمرار وكل اقتراح بيتقرا.", "Have an idea or hit a problem? Tell us — AutoPost is always improving and every suggestion is read.")}</p>
   <a class="btn sm" style="width:100%;justify-content:center;margin-bottom:8px" target="_blank" href="guide/">📘 ${L("دليل الاستخدام بالصور", "Illustrated user guide")}</a>
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
  paint(); window.renderNow && renderNow(); checkReq(); setInterval(checkReq, 5 * 60e3);
  try { const seen = localStorage.getItem("ap_seen_v"); if (seen && seen !== VERSION) toast(L(`اتحدّث التطبيق لـ v${VERSION} — شوف الجديد في الإعدادات`, `Updated to v${VERSION} — see What's new in Settings`), 6000); localStorage.setItem("ap_seen_v", VERSION); } catch (e) {}
}
setInterval(() => { if (lic && !$("#sub-box")) paint(); }, 1500);
init();
})();
