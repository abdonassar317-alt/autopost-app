// AutoPost — TikTok posting options (TikTok Content Posting API requirement).
// Before a post goes to TikTok the creator sees WHO it posts as and picks privacy / interaction / disclosure options
// that come from TikTok's creator_info endpoint. Nothing is pre-selected for privacy: the creator must choose.
(() => {
"use strict";
const A = () => window.apLang === "ar";
const T = (en, ar) => (A() ? ar : en);
const PRIV = {
  PUBLIC_TO_EVERYONE: ["Everyone", "الكل"],
  MUTUAL_FOLLOW_FRIENDS: ["Friends", "الأصدقاء"],
  FOLLOWER_OF_CREATOR: ["Followers", "المتابعين"],
  SELF_ONLY: ["Only me", "أنا بس"],
};
let info = null, loading = false, st = { privacy: "", comment: false, duet: false, stitch: false, disclose: false, own: false, brand: false };
const el = () => document.getElementById("c-tt");
const brand = () => brands[document.getElementById("c-brand")?.value || curBrand];
const connected = () => { try { return sel.has("tiktok") && !!brand() && hasSecret(brand(), "TT_REFRESH_TOKEN"); } catch (e) { return false; } };
const isVideo = () => { try { return files.some(f => f.video); } catch (e) { return false; } };

async function load(force) {
  if (loading) return;
  loading = true; render();
  try {
    if (force || !info) {
      let cur = null;
      try { cur = JSON.parse(await readFile("state/tiktok_creator.json")); } catch (e) {}
      if (force || !cur || !cur.ok) {
        const t0 = Date.now();
        await gh(`${R()}/actions/workflows/tiktok-creator-info.yml/dispatches`, { method: "POST", body: JSON.stringify({ ref: cfg.branch, inputs: { prefix: pre(brand()) } }) });
        for (let i = 0; i < 40; i++) {
          await new Promise(r => setTimeout(r, 3000));
          try { const n = JSON.parse(await readFile("state/tiktok_creator.json")); if (n.at > t0) { cur = n; break; } } catch (e) {}
        }
      }
      info = cur;
    }
  } catch (e) { info = { ok: false, error: e.message }; }
  loading = false; render();
}

function render() {
  const box = el(); if (!box) return;
  if (!connected()) { box.classList.add("hide"); box.innerHTML = ""; return; }
  box.classList.remove("hide");
  const head = `<div class="lbl" data-i18n-skip>${T("TikTok posting options", "إعدادات النشر على تيك توك")}<button class="btn sm" id="tt-ref" type="button" data-i18n-skip>${T("Refresh from TikTok", "تحديث من تيك توك")}</button></div>`;
  if (loading) { box.innerHTML = head + `<p class="hint" data-i18n-skip>${T("Loading your TikTok account options…", "بنجيب إعدادات حسابك من تيك توك…")}</p>`; bind(); return; }
  if (!info || !info.ok) {
    box.innerHTML = head + `<p class="hint" data-i18n-skip>${T("Couldn't load your TikTok options.", "ماقدرناش نجيب إعدادات تيك توك.")} ${esc(info?.error || "")}</p>`; bind(); return;
  }
  const opts = info.privacy_level_options || [];
  if (st.privacy && !opts.includes(st.privacy)) st.privacy = "";
  const vid = isVideo();
  const dis = (flag) => (flag ? " disabled" : "");
  const brandPrivate = st.disclose && st.brand && st.privacy === "SELF_ONLY";
  box.innerHTML = head + `
  <div data-i18n-skip>
   <p style="margin:0 0 10px"><b>${T("Posting as", "هتنزل باسم")}:</b> ${esc(info.nickname || info.username || "—")}</p>
   <div class="lbl" style="margin-top:6px">${T("Who can view this post", "مين يشوف البوست")} *</div>
   <select id="tt-priv"><option value="">${T("Select privacy…", "اختار الخصوصية…")}</option>${opts.map(o => `<option value="${o}"${st.privacy === o ? " selected" : ""}>${(PRIV[o] || [o, o])[A() ? 1 : 0]}</option>`).join("")}</select>
   <div class="lbl" style="margin-top:12px">${T("Allow users to", "اسمح للمستخدمين")}</div>
   <label class="chk"><input type="checkbox" id="tt-com"${st.comment && !info.comment_disabled ? " checked" : ""}${dis(info.comment_disabled)}> ${T("Comment", "يعلّقوا")}${info.comment_disabled ? ` <small>(${T("turned off in your TikTok settings", "مقفول من إعدادات تيك توك عندك")})</small>` : ""}</label>
   ${vid ? `<label class="chk"><input type="checkbox" id="tt-duet"${st.duet && !info.duet_disabled ? " checked" : ""}${dis(info.duet_disabled)}> Duet${info.duet_disabled ? ` <small>(${T("turned off in your TikTok settings", "مقفول من إعدادات تيك توك عندك")})</small>` : ""}</label>
   <label class="chk"><input type="checkbox" id="tt-stitch"${st.stitch && !info.stitch_disabled ? " checked" : ""}${dis(info.stitch_disabled)}> Stitch${info.stitch_disabled ? ` <small>(${T("turned off in your TikTok settings", "مقفول من إعدادات تيك توك عندك")})</small>` : ""}</label>` : ""}
   <div class="lbl" style="margin-top:12px">${T("Disclose post content", "الإفصاح عن محتوى تجاري")}</div>
   <label class="chk"><input type="checkbox" id="tt-disc"${st.disclose ? " checked" : ""}> ${T("This post promotes a brand, product or service", "البوست بيروّج لعلامة أو منتج أو خدمة")}</label>
   ${st.disclose ? `<label class="chk" style="margin-inline-start:22px"><input type="checkbox" id="tt-own"${st.own ? " checked" : ""}> ${T("Your brand — you're promoting yourself or your own business", "علامتك — بتروّج لنفسك أو لشغلك")}</label>
   <label class="chk" style="margin-inline-start:22px"><input type="checkbox" id="tt-brand"${st.brand ? " checked" : ""}> ${T("Branded content — you're promoting another brand or a third party", "محتوى لعلامة تانية — بتروّج لطرف تالت")}</label>
   <p class="hint">${!st.own && !st.brand ? T("Select at least one option to continue.", "اختار اختيار واحد على الأقل.") : st.brand ? T("Your post will be labeled “Paid partnership”.", "البوست هيظهر عليه «شراكة مدفوعة».") : T("Your post will be labeled “Promotional content”.", "البوست هيظهر عليه «محتوى ترويجي».")}</p>
   ${brandPrivate ? `<p class="hint" style="color:#b42318">${T("Branded content can't be set to private. Choose another privacy level.", "المحتوى لعلامة تانية مينفعش يبقى خاص. اختار خصوصية تانية.")}</p>` : ""}` : ""}
   <p class="hint">${st.disclose && st.brand ? T("By posting, you agree to TikTok's", "بالنشر إنت موافق على") + ` <a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noopener">Branded Content Policy</a> ${T("and", "و")} ` : T("By posting, you agree to TikTok's", "بالنشر إنت موافق على") + " "}<a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noopener">Music Usage Confirmation</a>.</p>
   <p class="hint">${T("Nothing is posted until you schedule or post it yourself.", "مفيش حاجة بتتنشر غير لما إنت تجدولها أو تنشرها.")}</p>
  </div>`;
  bind();
}

function bind() {
  const g = id => document.getElementById(id);
  if (g("tt-ref")) g("tt-ref").onclick = () => load(true);
  if (g("tt-priv")) g("tt-priv").onchange = e => { st.privacy = e.target.value; render(); };
  if (g("tt-com")) g("tt-com").onchange = e => { st.comment = e.target.checked; };
  if (g("tt-duet")) g("tt-duet").onchange = e => { st.duet = e.target.checked; };
  if (g("tt-stitch")) g("tt-stitch").onchange = e => { st.stitch = e.target.checked; };
  if (g("tt-disc")) g("tt-disc").onchange = e => { st.disclose = e.target.checked; if (!st.disclose) st.own = st.brand = false; render(); };
  if (g("tt-own")) g("tt-own").onchange = e => { st.own = e.target.checked; render(); };
  if (g("tt-brand")) g("tt-brand").onchange = e => { st.brand = e.target.checked; render(); };
}

// called by save(): returns null (TikTok not selected), {err} (something missing) or the settings stored on the post
window.ttCollect = plats => {
  if (!plats.includes("tiktok") || !connected()) return null;
  if (!info || !info.ok) return { err: T("Wait for the TikTok options to load (or press Refresh) before posting.", "استنى إعدادات تيك توك تتحمّل (أو دوس تحديث) قبل النشر.") };
  if (!st.privacy) return { err: T("Choose who can view this TikTok post.", "اختار مين يشوف بوست التيك توك.") };
  if (st.disclose && !st.own && !st.brand) return { err: T("TikTok: choose which kind of promotion this is.", "تيك توك: اختار نوع الترويج.") };
  if (st.disclose && st.brand && st.privacy === "SELF_ONLY") return { err: T("Branded content can't be private on TikTok.", "المحتوى لعلامة تانية مينفعش يبقى خاص على تيك توك.") };
  return { privacy: st.privacy, comment: !!st.comment, duet: !!st.duet, stitch: !!st.stitch, brand_organic: st.disclose && st.own, brand_content: st.disclose && st.brand };
};
window.ttRender = () => { render(); if (connected() && !info && !loading) load(false); };

document.addEventListener("click", e => { if (e.target.closest("#c-plats .chip")) setTimeout(window.ttRender, 0); });
document.addEventListener("change", e => { if (e.target.id === "c-brand") { info = null; window.ttRender(); } });
setTimeout(function wait() { if (typeof secretNames !== "undefined" && secretNames) window.ttRender(); else setTimeout(wait, 800); }, 800);
})();
