// AutoPost — export a campaign as a ready-to-sell / ready-to-hand-over content pack (.zip):
// images/videos in order, every caption (per platform), a posting plan (CSV + README). Pure browser, no server, no cost.
(() => {
"use strict";
const EN = () => window.apLang === "en", L = (ar, en) => EN() ? en : ar;
// ---- minimal ZIP writer (store, no compression — images are already compressed)
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zip(entries) { // entries: [{name, data:Uint8Array}]
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  for (const e of entries) { const nm = enc.encode(e.name), c = crc32(e.data), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, c, true); h.setUint32(18, e.data.length, true); h.setUint32(22, e.data.length, true); h.setUint16(26, nm.length, true);
    parts.push(new Uint8Array(h.buffer), nm, e.data);
    const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint32(16, c, true); ch.setUint32(20, e.data.length, true); ch.setUint32(24, e.data.length, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true);
    central.push(new Uint8Array(ch.buffer), nm); off += 30 + nm.length + e.data.length; }
  const csz = central.reduce((a, b) => a + b.length, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true); end.setUint32(12, csz, true); end.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/zip" });
}
window.apZip = zip; // used by tests

const slug = s => String(s || "pack").normalize("NFKD").replace(/[^\w؀-ۿ]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "pack";
const csvq = v => `"${String(v ?? "").replace(/"/g, '""')}"`;

async function exportPack(camp) {
  if (!items.length) await loadList();
  const list = items.filter(x => (camp === "*" ? true : (x.p.campaign || "") === camp)).sort((a, b) => new Date(a.p.time) - new Date(b.p.time));
  if (!list.length) return toast(L("مفيش بوستات في الحملة دي", "No posts in this campaign"));
  const enc = new TextEncoder(), out = [], rows = [["#", "folder", "date", "platforms", "files", "caption"]];
  toast(L("بيجهّز الحزمة…", "Building the pack…"), 6000);
  let n = 0;
  for (const x of list) { n++; const dir = `${String(n).padStart(2, "0")}-${slug(x.p.label || (x.p.caption || "").split("\n")[0])}`;
    for (const [i, f] of (x.p.media || []).entries()) { try { const u = await thumbSrc(x.id, f); const b = new Uint8Array(await (await fetch(u)).arrayBuffer()); out.push({ name: `${dir}/${String(i + 1).padStart(2, "0")}-${f}`, data: b }); } catch (e) {} }
    let cap = x.p.caption || ""; for (const [k, v] of Object.entries(x.p.captions || {})) if (v && v !== x.p.caption) cap += `\n\n--- ${k} ---\n${v}`;
    out.push({ name: `${dir}/caption.txt`, data: enc.encode(cap) });
    rows.push([n, dir, x.p.time, (x.p.platforms || []).join(" "), (x.p.media || []).length, x.p.caption || ""]); }
  const name = camp === "*" ? L("كل-البوستات", "all-posts") : camp;
  out.push({ name: "plan.csv", data: enc.encode("﻿" + rows.map(r => r.map(csvq).join(",")).join("\r\n")) });
  out.push({ name: "README.txt", data: enc.encode(
`${name} — content pack (${list.length} posts)

Each folder = one post: the images/video in order + caption.txt.
plan.csv = the suggested schedule (open in Excel / Google Sheets).

How to use:
1. Post one folder per day (or follow the dates in plan.csv).
2. Edit the caption to your own voice, brand name and contact details.
3. Using AutoPost? Open the app → New post → add the files → paste the caption → Schedule.

Made with AutoPost.
`) });
  const blob = zip(out), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${slug(name)}-pack.zip`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  toast(L(`الحزمة جاهزة: ${list.length} بوست`, `Pack ready: ${list.length} posts`));
}

window.openExport = async () => {
  if (!items.length) { try { await loadList(); } catch (e) { return toast(e.message); } }
  const camps = [...new Set(items.map(x => x.p.campaign).filter(Boolean))];
  sheet(`<div class="wz"><h3>${L("تصدير حزمة محتوى", "Export content pack")}</h3>
   <div class="sub">${L("ملف zip فيه الصور بالترتيب + الكابشنز + خطة النشر. ينفع تبيعه (مثلاً على Gumroad مجانًا لحد ما تبيع) أو تسلّمه لعميل.", "A zip with the images in order + captions + a posting plan. Sell it (e.g. on Gumroad, free until you sell) or hand it to a client.")}</div>
   ${camps.map(c => `<button class="btn f" style="width:100%" data-c="${esc(c)}">${esc(c)} (${items.filter(x => x.p.campaign === c).length})</button>`).join("")}
   <button class="btn f" style="width:100%" data-c="*">${L("كل البوستات", "All posts")} (${items.length})</button>
   <p class="hint">${L("قبل البيع: شيل أي اسم عميل أو رقم تليفون من الكابشنز، واتأكد إن الصور بتاعتك أو مسموح تبيعها.", "Before selling: remove client names/phone numbers from captions and make sure you own the images or may resell them.")}</p>
   <div class="nav"><button class="btn" onclick="closeSheet()">${L("قفل", "Close")}</button></div></div>`);
  document.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { closeSheet(); exportPack(b.dataset.c).catch(e => toast(e.message)); });
};
setInterval(() => { const t = $("#l-tools div"); if (!t || t.querySelector("#ex-btn")) return;
  const b = document.createElement("button"); b.className = "btn sm"; b.id = "ex-btn"; b.textContent = L("تصدير حزمة", "Export pack"); b.onclick = openExport; t.appendChild(b); }, 1500);
})();
