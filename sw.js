/* IMDAC · Club — Service Worker v1 */
const CACHE='imdac-club-v1';
const ASSETS=['./','./index.html','./app.js','./manifest.json','./assets/logo-imdac.png'];

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
  e.respondWith(
    caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{
      if(res.ok&&e.request.method==='GET'){const cp=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));}
      return res;
    }).catch(()=>caches.match('./index.html')))
  );
});
