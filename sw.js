/* IMDAC · Club — Service Worker v42 */
const CACHE='imdac-club-v42';
const ASSETS=['./','./index.html','./app.js','./cert-font.js','./manifest.json','./assets/logo-imdac.png'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch',e=>{
  const url=e.request.url;
  // No cachear Firebase ni APIs externas
  if(url.includes('firebase')||url.includes('googleapis')||url.includes('gstatic'))return;
  const esCodigo = e.request.mode==='navigate' || /\.(html|js)(\?|$)/.test(url);
  if(esCodigo){
    // network-first: siempre intenta lo más reciente, cae a caché solo sin red
    e.respondWith(
      fetch(e.request).then(res=>{
        if(res.ok&&e.request.method==='GET'){const cp=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));}
        return res;
      }).catch(()=>caches.match(e.request).then(h=>h||caches.match('./index.html')))
    );
  } else {
    // cache-first para assets estáticos (logo, etc.)
    e.respondWith(
      caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{
        if(res.ok&&e.request.method==='GET'){const cp=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));}
        return res;
      }))
    );
  }
});
