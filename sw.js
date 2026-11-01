const C="autopost-v31",SHELL=["./","index.html","manifest.json","icon-192.png","icon-512.png","vendor-nacl.js","vendor-blake.js","phase2.js","library.js","plan.js","approval.js","ai.js","i18n.js","theme.js","insights.js","export.js","license.js","demo.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).catch(()=>{}));self.skipWaiting()});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))));
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin)return;
 e.respondWith(fetch(e.request.url,{cache:"no-cache",credentials:"same-origin"}).then(r=>{if(r.ok){const c=r.clone();caches.open(C).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request,{ignoreSearch:true})))});
