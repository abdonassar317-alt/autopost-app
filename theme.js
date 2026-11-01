// AutoPost — light / dark / automatic theme (dark: white text on dark background). Choice saved on this device.
(() => {
"use strict";
const get = () => { try { return localStorage.getItem("ap_theme") || "auto"; } catch (e) { return "auto"; } };
const mq = matchMedia("(prefers-color-scheme: dark)");
function apply() {
  const m = get(), dark = m === "dark" || (m === "auto" && mq.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#111113" : "#ffffff");
  const b = document.getElementById("theme-mini"); if (b) b.textContent = dark ? "☀" : "☾";
  document.querySelectorAll("#theme-box [data-t]").forEach(x => x.classList.toggle("on", x.dataset.t === m));
}
const setTheme = m => { try { localStorage.setItem("ap_theme", m); } catch (e) {} apply(); };
mq.addEventListener?.("change", apply);
function ui() {
  const set = document.getElementById("settings");
  if (set && !document.getElementById("theme-box")) {
    const b = document.createElement("div"); b.className = "box"; b.id = "theme-box";
    b.innerHTML = `<div class="lbl">المظهر</div><div class="seg"><button data-t="light">فاتح</button><button data-t="dark">غامق</button><button data-t="auto">تلقائي</button></div>`;
    set.prepend(b); b.querySelectorAll("[data-t]").forEach(x => x.onclick = () => setTheme(x.dataset.t));
  }
  const hdr = document.getElementById("who")?.parentElement;
  if (hdr && !document.getElementById("theme-mini")) { const m = document.createElement("button"); m.id = "theme-mini"; m.title = "المظهر"; m.setAttribute("aria-label", "المظهر");
    m.style.cssText = "border:1px solid var(--line);background:var(--s);color:var(--ink);border-radius:8px;padding:2px 8px;font:inherit;font-size:13px;cursor:pointer;margin-inline-start:8px";
    m.onclick = () => { const dark = document.documentElement.dataset.theme === "dark"; setTheme(dark ? "light" : "dark"); }; hdr.appendChild(m); }
  apply();
}
ui(); document.addEventListener("DOMContentLoaded", ui); setTimeout(ui, 500);
})();
