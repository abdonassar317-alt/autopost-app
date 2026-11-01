// AutoPost — client approval without a server: encrypted snapshot on GitHub Pages, key in the link's #fragment,
// client replies with a code (WhatsApp/copy) that you paste back here.
(() => {
"use strict";
const DAY = 864e5;
const NM = k => (typeof NAMES !== "undefined" && NAMES[k]) || k;
const b64u = a => { let s = ""; const u = new Uint8Array(a); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const ub64 = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
const bin2b64 = a => { let s = ""; const u = new Uint8Array(a); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };

// same formula as content_hash() in publisher/run.py
window.approvalHash = async p => { const caps = p.captions || {};
  const raw = (p.caption || "") + "\n#\n" + Object.keys(caps).sort().map(k => `${k}=${caps[k]}`).join("\n") + "\n#\n" + (p.media || []).join(",");
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw)); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16); };

async function shrink(blob) { // small JPEG for the review page (fast to open on the client's phone)
  const img = await createImageBitmap(blob); const s = Math.min(1, 900 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(b => r(b), "image/jpeg", 0.82)); }
async function rawBlob(path) { const r = await fetch(`https://api.github.com${R()}/contents/${path}?ref=${cfg.branch}`, { headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github.raw" }, cache: "no-store" }); if (!r.ok) throw new Error("GitHub " + r.status); return r.blob(); }

// buttons in the list tools
const tools = $("#l-tools div");
if (tools) { const a = document.createElement("button"); a.className = "btn sm"; a.textContent = "رابط موافقة"; a.onclick = openReview;
  const b = document.createElement("button"); b.className = "btn sm"; b.textContent = "رد العميل"; b.onclick = pasteReply; tools.append(a, b); }

async function openReview() {
  if (!items.length) await loadList();
  const camps = [...new Set(items.map(x => x.p.campaign).filter(Boolean))];
  sheet(`<div class="wz"><h3>رابط موافقة للعميل</h3><div class="sub">العميل يشوف البوستات الجاية ويوافق أو يطلب تعديل — من غير حساب ومن غير سيرفر. البوستات اللي في الرابط <b>مش هتتنشر غير بعد موافقته</b>.</div>
   <div class="two f"><select id="rv-b">${Object.entries(brands).map(([k, b]) => `<option value="${esc(k)}"${k === curBrand ? " selected" : ""}>${esc(b.name || k)}</option>`).join("")}</select><select id="rv-c"><option value="">كل الحملات</option>${camps.map(c => `<option>${esc(c)}</option>`).join("")}</select></div>
   <div class="two f"><div><div class="lbl">من</div><input type="date" id="rv-f"></div><div><div class="lbl">لحد</div><input type="date" id="rv-t"></div></div>
   <div class="two f"><div><div class="lbl">الرابط يشتغل لمدة</div><select id="rv-e"><option value="3">3 أيام</option><option value="7" selected>أسبوع</option><option value="14">أسبوعين</option></select></div><div><div class="lbl">رقم واتساب بتاعك (اختياري)</div><input id="rv-w" dir="ltr" placeholder="2010…" inputmode="tel"></div></div>
   <div id="rv-r" class="f"></div>
   <div class="nav"><button class="btn pri" id="rv-go">اعمل الرابط</button><button class="btn" onclick="closeSheet()">إلغاء</button></div></div>`);
  const now = new Date(); $("#rv-f").valueAsDate = now; $("#rv-t").valueAsDate = new Date(now.getTime() + 7 * DAY);
  try { $("#rv-w").value = localStorage.getItem("ap_wa") || ""; } catch (e) {}
  const pick = () => { const b = $("#rv-b").value, c = $("#rv-c").value, f = new Date($("#rv-f").value + "T00:00"), t = new Date($("#rv-t").value + "T23:59");
    return items.filter(x => (x.p.brand || "default") === b && (!c || x.p.campaign === c) && !x.p.draft && new Date(x.p.time) >= f && new Date(x.p.time) <= t && new Date(x.p.time) > Date.now() && !x.p.platforms.every(k => x.s[k]?.ok || x.s[k]?.skipped))
      .sort((a, z) => new Date(a.p.time) - new Date(z.p.time)); };
  const preview = () => { const l = pick(); $("#rv-r").innerHTML = `<div class="hint">${l.length} بوست هيتبعت للمراجعة</div>`; };
  ["#rv-b", "#rv-c", "#rv-f", "#rv-t"].forEach(s => $(s).onchange = preview); preview();
  $("#rv-go").onclick = async () => { const list = pick(); if (!list.length) return toast("مفيش بوستات جاية في الفترة دي"); const btn = $("#rv-go"); btn.disabled = true;
    try { const wa = $("#rv-w").value.replace(/\D/g, ""); try { localStorage.setItem("ap_wa", wa); } catch (e) {}
      const rid = [...crypto.getRandomValues(new Uint8Array(9))].map(b => b.toString(16).padStart(2, "0")).join("");
      const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]); const rawKey = await crypto.subtle.exportKey("raw", key);
      const enc = async bytes => { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes); const o = new Uint8Array(12 + ct.byteLength); o.set(iv); o.set(new Uint8Array(ct), 12); return o; };
      const changes = [], posts = []; let n = 0;
      for (const x of list) { const media = [];
        for (const m of x.p.media || []) { btn.textContent = `بيجهّز ${++n}…`; const isV = !/\.(jpe?g|png|webp)$/i.test(m);
          if (isV) { media.push({ video: true }); continue; }
          const small = await shrink(await rawBlob(`posts/${x.id}/${m}`)); const f = `m${changes.length}.bin`;
          changes.push({ path: `reviews/${rid}/${f}`, b64: bin2b64(await enc(new Uint8Array(await small.arrayBuffer()))) }); media.push({ f }); }
        posts.push({ id: x.id, time: x.p.time, platforms: x.p.platforms.map(NM), caption: x.p.caption, captions: Object.fromEntries(Object.entries(x.p.captions || {}).map(([k, v]) => [NM(k), v])), label: x.p.label || "", media }); }
      const expires = new Date(Date.now() + (+$("#rv-e").value) * DAY).toISOString();
      const data = { v: 1, rid, brand: brands[$("#rv-b").value]?.name || "", from: cfg.owner, expires, wa, posts };
      changes.push({ path: `reviews/${rid}/data.bin`, b64: bin2b64(await enc(new TextEncoder().encode(JSON.stringify(data)))) });
      changes.push({ path: `reviews/${rid}/meta.json`, b64: utf8b64(JSON.stringify({ expires, posts: list.map(x => x.id) })) });
      for (const x of list) { x.p.needs_approval = true; x.p.review = rid; delete x.p.approved_hash; changes.push({ path: `posts/${x.id}/post.json`, b64: utf8b64(JSON.stringify(x.p, null, 2)) }); }
      btn.textContent = "بيرفع…"; await commit(changes, `client review ${rid}`);
      await gh(`${R()}/actions/workflows/review-publish.yml/dispatches`, { method: "POST", body: JSON.stringify({ ref: cfg.branch, inputs: { rid } }) });
      const link = `${location.origin}${location.pathname.replace(/[^/]*$/, "")}review.html?r=${rid}#${b64u(rawKey)}`;
      try { await navigator.clipboard.writeText(link); } catch (e) {}
      sheet(`<div class="wz"><h3>رابط الموافقة جاهز ✓</h3><div class="sub">بيشتغل خلال دقيقة أو اتنين (لحد ما GitHub ينشره)، لحد ${new Date(expires).toLocaleDateString("ar-EG", { day: "numeric", month: "long" })}. البوستات دي واقفة لحد ما توصل موافقة العميل.</div>
        <textarea readonly dir="ltr" rows="3" style="font-size:11px">${esc(link)}</textarea>
        <div class="nav"><a class="btn pri" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent("البوستات الجاية جاهزة للمراجعة: " + link)}">ابعته واتساب</a><button class="btn" onclick="closeSheet()">تمام</button></div></div>`);
      renderList();
    } catch (e) { toast(e.message, 8000); btn.disabled = false; btn.textContent = "اعمل الرابط"; } };
}

function pasteReply() {
  sheet(`<div class="wz"><h3>رد العميل</h3><div class="sub">الصق الرسالة اللي العميل بعتها (فيها كود بيبدأ بـ AP1). الموافَق عليه هيتنشر في ميعاده، واللي فيه تعديل هيقف ويظهرلك في «محتاجك دلوقتي».</div>
   <textarea id="rp-t" rows="6"></textarea><div class="nav"><button class="btn pri" id="rp-ok">تطبيق</button><button class="btn" onclick="closeSheet()">إلغاء</button></div></div>`);
  $("#rp-ok").onclick = async () => { const m = $("#rp-t").value.match(/AP1:([0-9a-f]{18}):([\w-]+)/); if (!m) return toast("مالقيتش الكود في الرسالة");
    let dec; try { dec = JSON.parse(new TextDecoder().decode(ub64(m[2]))); } catch (e) { return toast("الكود ناقص — اطلب من العميل يبعته تاني"); }
    if (!items.length) await loadList();
    const ch = []; let ok = 0, fix = 0;
    for (const [id, d] of Object.entries(dec)) { const x = items.find(i => i.id === id && i.p.review === m[1]); if (!x) continue;
      if (d.a === 1) { x.p.needs_approval = false; x.p.approved_hash = await approvalHash(x.p); x.p.approved_at = new Date().toISOString(); delete x.p.review_note; ok++; }
      else { x.p.needs_approval = true; x.p.review_note = d.c || "العميل طلب تعديل"; fix++; }
      ch.push({ path: `posts/${id}/post.json`, b64: utf8b64(JSON.stringify(x.p, null, 2)) }); }
    if (!ch.length) return toast("البوستات دي مش لاقيها (ممكن اتمسحت أو الرابط قديم)");
    try { await commit(ch, `client reply ${m[1]}`); closeSheet(); renderList(); toast(`✓ ${ok} اتوافق عليه · ${fix} محتاج تعديل`, 6000); if (window.bumpNext) for (const x of items) if (x.p.review === m[1] && !x.p.needs_approval) bumpNext(x.p.time); }
    catch (e) { toast(e.message, 8000); } };
}

// a real change after approval sends the post back to review (caption edit hook)
const _up = window.updatePost;
window.updatePost = updatePost = async function (id, fn, msg) {
  const x = items.find(i => i.id === id);
  if (x?.p.approved_hash) { const before = x.p.approved_hash; const wrapped = async p => { fn(p); if (await approvalHash(p) !== before) { p.needs_approval = true; p.review_note = "اتعدّل بعد موافقة العميل — محتاج موافقة تانية"; } };
    // fn is sync in the main app; run it here, then save
    await wrapped(x.p); return _up(id, () => {}, msg); }
  return _up(id, fn, msg);
};

// show approval state in the list + "needs you now"
const _ml = window.metricsLine;
window.metricsLine = x => (x.p.needs_approval ? `<div class="mt" style="color:#9a6700">⏳ ${x.p.review_note ? "تعديل مطلوب: " + esc(x.p.review_note) : "مستني موافقة العميل"}</div>` : x.p.approved_at ? `<div class="mt" style="color:var(--ok)">✓ العميل وافق</div>` : "") + (_ml ? _ml(x) : "");
const _rn = window.renderNow;
window.renderNow = () => { _rn && _rn(); const el = $("#now-panel .now"); if (!el) return;
  const waiting = items.filter(x => x.p.needs_approval && !x.p.review_note).length, fixes = items.filter(x => x.p.needs_approval && x.p.review_note);
  const add = (cls, t) => { const d = document.createElement("div"); d.className = "nrow " + cls; d.innerHTML = `<div>${t}</div>`; el.appendChild(d); };
  fixes.forEach(x => add("warn", `تعديل مطلوب على «${esc(x.p.label || (x.p.caption || "").slice(0, 30))}»: ${esc(x.p.review_note)}`));
  if (waiting) add("", `${waiting} بوست مستني موافقة العميل`); };
})();
