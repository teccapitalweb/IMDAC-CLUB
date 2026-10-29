/* IMDAC · Club — Service Worker v77 */
const CACHE='imdac-club-v77';
const ASSETS=['./','./index.html','./app.js','./cert-font.js','./manifest.json',
  './assets/logo-imdac.png','./assets/pwa-192.png','./assets/pwa-512.png','./assets/apple-touch-icon.png'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}));
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    // Sin esto, la primera navegacion tras instalar puede ir a la red igualmente.
    if(self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;

  let url;
  try{ url=new URL(req.url); }catch(err){ return; }

  // Solo se cachea lo propio. Antes, cualquier peticion que no fuera a firebase
  // caia en la rama cache-first: eso incluia /catalogo y /mi-acceso del webhook,
  // que se servian rancios y anulaban el no-store del servidor. Un socio podia
  // ver el catalogo o su estado de membresia desactualizados.
  if(url.origin!==self.location.origin)return;

  const esCodigo = req.mode==='navigate' || /\.(html|js)(\?|$)/.test(url.pathname);
  if(esCodigo){
    // network-first: siempre lo mas reciente, con la copia local como red de seguridad.
    e.respondWith((async()=>{
      try{
        const pre=await e.preloadResponse;
        // cache:'no-store' es la parte que importa: sin esto, "network-first" seguia
        // pidiendole al navegador su copia en cache HTTP de app.js/index.html, que
        // puede ser mas vieja que el ultimo deploy aunque la red responda al toque.
        const res=pre||await fetch(req,{cache:'no-store'});
        if(res&&res.ok)caches.open(CACHE).then(c=>c.put(req,res.clone()));
        return res;
      }catch(err){
        return (await caches.match(req))||(await caches.match('./index.html'));
      }
    })());
  } else {
    // cache-first para estaticos: logo, iconos, fuentes locales.
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{
      if(res&&res.ok)caches.open(CACHE).then(c=>c.put(req,res.clone()));
      return res;
    })));
  }
});
