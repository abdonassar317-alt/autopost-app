// AutoPost — keyboard shortcuts + quick buttons (faster everyday use).
//   N new post · S or Ctrl/⌘+Enter schedule · Ctrl/⌘+S draft · / search · 1-4 tabs · C calendar · ? this list · Esc close
(() => {
"use strict";
const L = (ar, en) => (window.apLang === "ar" ? ar : en);
const q = (s) => document.querySelector(s);
const typing = (e) => { const t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); };
const visible = (id) => !q("#" + id)?.classList.contains("hide");
const sheetOpen = () => q("#sheet")?.classList.contains("show");
const KEYS = () => [
  ["N", L("بوست جديد", "New post")], ["S · Ctrl/⌘ + Enter", L("جدولة البوست", "Schedule the post")], ["Ctrl/⌘ + S", L("حفظ مسودة", "Save as draft")],
  ["/", L("بحث في البوستات", "Search posts")], ["C", L("التقويم", "Calendar")], ["1 · 2 · 3 · 4", L("جديد · المجدول · الحسابات · الإعدادات", "New · Scheduled · Accounts · Settings")],
  ["?", L("الاختصارات دي", "These shortcuts")], ["Esc", L("قفل النافذة", "Close a window")],
];
function help() {
  window.sheet && sheet(`<div class="wz" data-i18n-skip><h3>${L("اختصارات الكيبورد", "Keyboard shortcuts")}</h3>
    ${KEYS().map(([k, t]) => `<div class="nrow"><span>${t}</span><code>${k}</code></div>`).join("")}
    <div class="nav"><button class="btn" onclick="closeSheet()">${L("تمام", "OK")}</button></div></div>`);
}
window.shortcutsHelp = help;
document.addEventListener("keydown", (e) => {
  if (document.getElementById("auth")) return;
  const mod = e.ctrlKey || e.metaKey;
  if (e.key === "Escape" && sheetOpen()) { q("#sheet").classList.remove("show"); return; }
  if (mod && e.key === "Enter" && visible("compose")) { e.preventDefault(); q("#c-save")?.click(); return; }
  if (mod && (e.key === "s" || e.key === "S") && visible("compose")) { e.preventDefault(); q("#c-draft")?.click(); return; }
  if (mod || e.altKey || typing(e) || sheetOpen()) return;
  const tab = (n) => document.querySelector(`.tabs button[data-tab="${n}"]`)?.click();
  if (e.key === "n" || e.key === "N") { e.preventDefault(); tab("compose"); setTimeout(() => q("#c-caption")?.focus(), 50); }
  else if ((e.key === "s" || e.key === "S") && visible("compose")) { e.preventDefault(); q("#c-save")?.click(); }
  else if (e.key === "/") { e.preventDefault(); tab("list"); setTimeout(() => q("#l-search")?.focus(), 50); }
  else if (e.key === "c" || e.key === "C") { tab("list"); setTimeout(() => q('#l-seg [data-v="cal"]')?.click(), 50); }
  else if (["1", "2", "3", "4"].includes(e.key)) tab(["compose", "list", "brands", "settings"][+e.key - 1]);
  else if (e.key === "?") help();
});

// quick times under the date: one tap instead of two pickers
function quick() {
  const box = q("#c-date")?.closest(".box"); if (!box || q("#c-quick")) return;
  const pad = (n) => String(n).padStart(2, "0");
  const set = (d) => { q("#c-date").value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; q("#c-hour").value = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    box.querySelectorAll("#c-quick .chip").forEach((c) => c.classList.remove("on")); };
  const at = (days, h) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, 0, 0, 0); return d; };
  const opts = [
    [L("بعد ساعة", "In 1 hour"), () => { const d = new Date(Date.now() + 3600e3); d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0); return d; }],
    [L("النهارده 8 م", "Today 8 pm"), () => at(new Date().getHours() >= 20 ? 1 : 0, 20)],
    [L("بكرة 12 ظ", "Tomorrow 12 pm"), () => at(1, 12)],
    [L("بكرة 8 م", "Tomorrow 8 pm"), () => at(1, 20)],
    [L("الجمعة 8 م", "Friday 8 pm"), () => { const d = new Date(); const add = (5 - d.getDay() + 7) % 7 || 7; return at(add, 20); }],
  ];
  // the best slot picked in «تحليل محتوايا» (saved on this device)
  try { const b = JSON.parse(localStorage.getItem("ap_best") || "null");
    if (b && b.day >= 0) opts.unshift([L("أحسن وقت ⭐", "Best time ⭐"), () => { const d = new Date(); let add = (b.day - d.getDay() + 7) % 7; if (!add && d.getHours() >= b.slot + 1) add = 7; return at(add, b.slot + 1); }]); } catch (e) {}
  const row = document.createElement("div"); row.id = "c-quick"; row.className = "chips"; row.style.marginTop = "10px"; row.setAttribute("data-i18n-skip", "");
  row.innerHTML = opts.map(([t], i) => `<div class="chip" data-q="${i}">${t}</div>`).join("");
  box.appendChild(row);
  row.querySelectorAll("[data-q]").forEach((c) => (c.onclick = () => { set(opts[+c.dataset.q][1]()); c.classList.add("on"); }));
  // a small hint on computers only
  if (matchMedia("(hover: hover) and (pointer: fine)").matches && !q("#keys-hint")) {
    const h = document.createElement("p"); h.id = "keys-hint"; h.className = "hint"; h.setAttribute("data-i18n-skip", "");
    h.innerHTML = `${L("اختصارات", "Shortcuts")}: <code>Ctrl/⌘ + Enter</code> ${L("جدولة", "schedule")} · <code>Ctrl/⌘ + S</code> ${L("مسودة", "draft")} · <a href="#" id="keys-all">${L("الكل", "all")} (?)</a>`;
    h.style.padding = "8px 2px 0"; q("#compose")?.appendChild(h);
    h.querySelector("#keys-all").onclick = (ev) => { ev.preventDefault(); help(); };
  }
}
document.addEventListener("DOMContentLoaded", quick); setTimeout(quick, 600); window.apQuick = () => { document.getElementById("c-quick")?.remove(); quick(); };
})();
