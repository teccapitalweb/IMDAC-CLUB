/* ============================================================
   IMDAC · CLUB DE MIEMBROS — app.js
   Instituto Mexicano de Arquitectura y Construcción
   Stack: Firebase Auth + Firestore · GitHub Pages
   ============================================================ */

/* ====== 1. CONFIG FIREBASE — REEMPLAZAR CON LA CUENTA DE IMDAC ====== */
const firebaseConfig = {
  apiKey: "AIzaSyA2b3n294FxG3GmPNEUX_Odc1NZVw2G77U",
  authDomain: "imdac-club.firebaseapp.com",
  projectId: "imdac-club",
  storageBucket: "imdac-club.firebasestorage.app",
  messagingSenderId: "619551799543",
  appId: "1:619551799543:web:594105a2e0e6dd11047bf2"
};
// Cupón y contacto IMDAC (placeholders — cambiar por los reales)
const IMDAC = {
  precio: 499,
  cupon: "CLUB20IMDAC",
  whatsapp: "522382196286",          // WhatsApp soporte/descuento (se sobreescribe desde config)
  canalWA: "https://whatsapp.com/channel/0029Vb8ABt0DOQIgG2gxJc0i",
  sitioOficial: "https://imdac.mx",
  soporte: {
    l1:"522382196286", l1Label:"+52 1 238 219 6286",   // Línea 1
    l2:"522361112213", l2Label:"+52 1 236 111 2213"    // Línea 2
  }
};
const waDigits=s=>'52'+String(s||'').replace(/\D/g,'').slice(-10);

let db=null, auth=null, FB_OK=false;
try{
  firebase.initializeApp(firebaseConfig);
  auth=firebase.auth(); db=firebase.firestore();
  FB_OK = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("REEMPLAZAR");
}catch(e){ console.warn("Firebase sin configurar — modo demo.",e); }

/* ====== 2. ESTADO ====== */
let CURRENT_USER=null;
let LOADING=true;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let DATA={cursos:[],webinars:[],noticias:[],material:[],foro:[],progresos:{},clasesHechas:{}};
let activeFilter="Todos";

/* ====== 3. NAV (sidebar) ====== */
const NAV=[
  {group:"Principal",items:[
    {id:"inicio",label:"Inicio",icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'},
    {id:"biblioteca",label:"Biblioteca",icon:'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'},
    {id:"webinar",label:"Webinars",icon:'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'},
    {id:"material",label:"Material PDF",icon:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'},
    {id:"noticias",label:"Noticias",icon:'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z'},
    {id:"foro",label:"Foro",icon:'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z'},
  ]},
  {group:"Herramientas",items:[
    {id:"ficha-obra",label:"Ficha de Obra",icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'},
    {id:"calculadora",label:"Calc. Materiales",icon:'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'},
    {id:"precios",label:"Precios Unitarios",icon:'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'},
    {id:"normativas",label:"Guía Normativas",icon:'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'},
  ]},
  {group:"Beneficios",items:[
    {id:"descuento",label:"Descuento 20%",icon:'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z'},
    {id:"canal",label:"Canal Privado",icon:'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z'},
    {id:"notificaciones",label:"Notificaciones",icon:'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'},
  ]},
  {group:"Mi cuenta",items:[
    {id:"perfil",label:"Mi Perfil",icon:'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'},
    {id:"suscripcion",label:"Suscripción",icon:'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'},
    {id:"logros",label:"Logros",icon:'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z'},
    {id:"configuracion",label:"Configuración",icon:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z'},
  ]},
];

function renderSidebar(){
  const nav=document.getElementById('sb-nav');
  nav.innerHTML=NAV.map(g=>`
    <div class="sb-group">
      <div class="sb-group-t">${g.group}</div>
      ${g.items.map(it=>`
        <div class="sb-item" data-sec="${it.id}" onclick="go('${it.id}')">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${it.icon}"/></svg>
          ${it.label}
        </div>`).join('')}
    </div>`).join('');
}

/* ====== 4. ROUTER ====== */
let currentSection="inicio";
function go(sec){
  // Candado de membresía: sin acceso, cualquier navegación regresa a los planes
  if(CANDADO_ON()&&!LOADING&&FB_OK&&CURRENT_USER&&CURRENT_USER.uid!=='demo'&&!_tieneAcceso()){renderPaywall();return;}
  currentSection=sec;
  document.querySelectorAll('.sb-item').forEach(e=>e.classList.toggle('active',e.dataset.sec===sec));
  if(window.innerWidth<=900) toggleSidebar(false);
  renderSection(sec);
  if(sec==='notificaciones')marcarNotisLeidas();
  document.getElementById('content').scrollTop=0;
  window.scrollTo(0,0);
}

function renderSection(sec){
  const c=document.getElementById('content');
  const R={
    inicio:renderInicio, biblioteca:renderBiblioteca, webinar:renderWebinar,
    material:renderMaterial, noticias:renderNoticias, foro:renderForo,
    'ficha-obra':renderFichaObra, calculadora:renderCalculadora, precios:renderPrecios,
    normativas:renderNormativas, descuento:renderDescuento, canal:renderCanal,
    notificaciones:renderNotificaciones, perfil:renderPerfil, suscripcion:renderSuscripcion,
    logros:renderLogros, configuracion:renderConfig, terminos:renderTerminos, privacidad:renderPrivacidad
  };
  const cr = sec==='inicio'?'':crumbs(navLabel(sec));
  c.innerHTML = `<div class="section active">${cr}${(R[sec]||renderInicio)()}</div>`;
  if(sec==='inicio'){ startCountdown(); initNewsCarousel(); }
  if(sec==='perfil') cargarPerfilDatos();
}
let _newsRAF=null;
function initNewsCarousel(){
  if(_newsRAF){cancelAnimationFrame(_newsRAF);_newsRAF=null;}
  const el=document.querySelector('.news-carousel');
  if(!el)return;
  let pausa=false;
  el.addEventListener('mouseenter',()=>pausa=true);
  el.addEventListener('mouseleave',()=>pausa=false);
  el.addEventListener('touchstart',()=>pausa=true,{passive:true});
  el.addEventListener('touchend',()=>setTimeout(()=>pausa=false,2500),{passive:true});
  const VEL=0.35; // px por frame a 60fps — lento y fluido
  let last=performance.now();
  let pos=el.scrollLeft||0;
  function step(now){
    const c=document.querySelector('.news-carousel');
    if(!c){_newsRAF=null;return;}
    const dt=Math.min(now-last,50); last=now;
    const half=c.scrollWidth/2;
    if(!pausa&&half>1){
      pos+=VEL*(dt/16.67);
      if(pos>=half)pos-=half;   // reinicio invisible (la 2ª mitad es idéntica)
      c.scrollLeft=pos;
    }else{ pos=c.scrollLeft; }   // si pausado/arrastrando, continúa desde ahí
    _newsRAF=requestAnimationFrame(step);
  }
  _newsRAF=requestAnimationFrame(step);
}
function navLabel(sec){for(const g of NAV)for(const it of g.items)if(it.id===sec)return it.label;return '';}
function crumbs(cur){return `<div class="crumbs"><a onclick="go('inicio')">Inicio</a><span class="sep">›</span><span class="cur">${cur}</span></div>`;}

/* ====== 5. SECCIONES ====== */
function firstName(){const n=CURRENT_USER?.displayName||CURRENT_USER?.email||'Miembro';return n.split(' ')[0].split('@')[0];}
function saludo(){const h=new Date().getHours();return h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches';}

function renderInicio(){
  if(LOADING)return skelInicio();
  const cursos=DATA.cursos.slice(0,2);
  const noticias=DATA.noticias.filter(n=>n.img).slice(0,8);
  const enProg=Object.values(DATA.progresos).filter(p=>p>0&&p<100).length;
  const comp=Object.values(DATA.progresos).filter(p=>p>=100).length;
  return `
  <div class="welcome">
    <div><h2>${saludo()}, ${firstName()}.</h2><p>Tienes acceso completo al catálogo. Retoma donde te quedaste.</p></div>
    <div class="streak"><span class="fl">🔥</span> <b>1</b> día de racha</div>
  </div>
  <div class="webinar-card">
    <div class="wc-tag">Próximo webinar</div>
    <div class="wc-title">${DATA.webinars[0]?.titulo||'Próximamente'}</div>
    <div class="countdown" id="countdown">
      <div class="cd-unit"><b data-cd="d">00</b><span>Días</span></div>
      <div class="cd-unit"><b data-cd="h">00</b><span>Hrs</span></div>
      <div class="cd-unit"><b data-cd="m">00</b><span>Min</span></div>
      <div class="cd-unit"><b data-cd="s">00</b><span>Seg</span></div>
    </div>
    <div class="wc-meta">📅 ${DATA.webinars[0]?DATA.webinars[0].fecha:'Sin webinars programados'}</div>
  </div>
  <div class="stats-row">
    ${stat('En progreso',enProg,'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z')}
    ${stat('Completados',comp,'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z')}
    ${stat('Certificados',comp,'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z')}
  </div>
  <div class="sec-head"><h3>Continuar aprendiendo</h3><a onclick="go('biblioteca')">Ver todos →</a></div>
  <div class="course-grid">${cursos.length?cursos.map(courseCard).join(''):emptyMini('Aún no hay cursos. ¡Pronto se liberan!')}</div>
  ${noticias.length?`
  <div class="sec-head" style="margin-top:26px"><h3>Noticias</h3><a onclick="go('noticias')">Ver todas →</a></div>
  <div class="news-carousel"><div class="news-track">${[...noticias,...noticias].map(n=>`<div class="news-card" onclick="window.open('${n.url||'#'}','_blank')"><img class="nc-img" src="${n.img}" alt="" loading="lazy" onerror="var p=this.closest('.news-card');if(p)p.remove();"><div class="nc-body"><div class="nc-src">${n.fuente||'IMDAC'}</div><h5>${n.titulo}</h5><div class="nc-date">${n.fecha||''}</div></div></div>`).join('')}</div></div>`:''}`;
}
function stat(label,val,icon){return `<div class="stat"><div class="si"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${icon}"/></svg></div><div><b>${val}</b><span>${label}</span></div></div>`;}
function emptyMini(t){return `<div class="empty" style="grid-column:1/-1"><b>${t}</b></div>`;}

function courseCard(c){
  const drip=dripStatus(c);
  const prog=DATA.progresos[c.id]||0;
  const locked=drip.locked;
  return `<div class="course" onclick="${locked?`toast('Disponible en ${drip.dias} días')`:`openCurso('${c.id}')`}">
    <div class="course-img" style="background-image:url('${c.img||''}')">
      <span class="course-cat">${c.categoria||'General'}</span>
      ${locked?`<div class="course-lock"><div class="lk"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg></div></div>`:''}
    </div>
    <div class="course-body">
      <h4>${c.titulo}</h4>
      <div class="course-meta">
        <span>${c.clases||0} clases · ${c.nivel||'Intermedio'}</span>
        ${locked?`<span class="drip"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>En ${drip.dias} días</span>`:''}
      </div>
      ${!locked?`<div class="progress"><i style="width:${prog}%"></i></div><div class="course-prog-t"><span>${prog}%</span><span>${c.clases?`Mód. ${Math.max(1,Math.ceil(prog/100*c.clases))}/${c.clases}`:''}</span></div>`:''}
    </div>
  </div>`;
}

/* Drip helper: compara fecha de alta del usuario vs dripDias del curso */
function dripStatus(c){
  if(window._imdacAdmin) return {locked:false,dias:0};
  const dd=c.dripDias||0;
  if(!dd) return {locked:false,dias:0};
  const created=CURRENT_USER?.metadata?.creationTime?new Date(CURRENT_USER.metadata.creationTime):new Date();
  const diasMember=Math.floor((Date.now()-created.getTime())/86400000);
  const restan=dd-diasMember;
  return restan>0?{locked:true,dias:restan}:{locked:false,dias:0};
}

let CATS=["Todos","Estructuras","Instalaciones","Costos y Presupuestos","Topografía","Diseño CAD","Normatividad","Sustentabilidad","Gestión de Obra"];
function renderBiblioteca(){
  if(LOADING)return `<h1 class="page-h">Biblioteca de cursos</h1><p class="page-sub">Cargando catálogo...</p>${skelGrid(8)}`;
  const list=activeFilter==="Todos"?DATA.cursos:DATA.cursos.filter(c=>c.categoria===activeFilter);
  return `
  <h1 class="page-h">Biblioteca de cursos</h1>
  <p class="page-sub">Todo nuestro catálogo de cursos grabados, disponibles 24/7.</p>
  <div class="filters">${CATS.map(c=>`<button class="filter ${c===activeFilter?'active':''}" onclick="setFilter('${c.replace(/'/g,"\\'")}')">${c}</button>`).join('')}</div>
  ${list.length?`<div class="course-grid">${list.map(courseCard).join('')}</div>`:emptyIllus('No hay cursos aquí','Aún no hay cursos en esta categoría. Prueba con otra o vuelve pronto.','Ver todos los cursos',"setFilter('Todos')")}`;
}
function setFilter(c){activeFilter=c;renderSection('biblioteca');}

function renderWebinar(){
  if(LOADING)return `<h1 class="page-h">Webinars</h1><p class="page-sub">Sesiones en vivo y grabaciones para miembros.</p>`+skelGrid(4);
  if(!DATA.webinars.length) return emptyState('webinar','Sin webinars programados','En cuanto haya un webinar agendado, aparecerá aquí con su fecha y enlace.');
  return `<h1 class="page-h">Webinars</h1><p class="page-sub">Sesiones en vivo y grabaciones para miembros.</p>
  <div class="course-grid">${DATA.webinars.map(w=>`
    <div class="course" onclick="${w.grabacion?`window.open('${w.grabacion}','_blank')`:`toast('Próximamente disponible')`}">
      <div class="course-img" style="background-image:url('${w.img||''}')"><span class="course-cat">${w.grabacion?'Grabación':'En vivo'}</span></div>
      <div class="course-body"><h4>${w.titulo}</h4><div class="course-meta"><span>📅 ${w.fecha||'Por definir'}</span></div></div>
    </div>`).join('')}</div>`;
}

function renderMaterial(){
  if(LOADING)return `<h1 class="page-h">Material PDF</h1><p class="page-sub">Guías, planos tipo y documentos descargables.</p>`+skelGrid(4);
  if(!DATA.material.length) return `<h1 class="page-h">Material PDF</h1><p class="page-sub">Guías, planos tipo y documentos descargables.</p>`+emptyState('material','Próximamente','Estamos preparando material descargable para ti. Pronto encontrarás guías, normas y plantillas aquí.');
  return `<h1 class="page-h">Material PDF</h1><p class="page-sub">Guías, planos tipo y documentos descargables.</p>
  <div class="course-grid">${DATA.material.map(m=>`
    <div class="course" onclick="window.open('${m.url}','_blank')">
      <div class="course-body" style="padding:24px"><h4>📄 ${m.titulo}</h4><p style="color:var(--muted);font-size:.86rem;margin-top:6px">${m.desc||''}</p><div class="course-meta" style="margin-top:14px"><span class="badge-norm">Descargar PDF</span></div></div>
    </div>`).join('')}</div>`;
}

function renderNoticias(){
  if(LOADING)return `<h1 class="page-h">Noticias &amp; actualizaciones</h1><p class="page-sub">Lo último del sector de la arquitectura y la construcción.</p>`+skelNews(5);
  return `<h1 class="page-h">Noticias & actualizaciones</h1><p class="page-sub">Lo último del sector de la arquitectura y la construcción.</p>
  ${DATA.noticias.length?DATA.noticias.map(n=>`
    <div class="news-item" onclick="window.open('${n.url||'#'}','_blank')">
      <img class="news-thumb" src="${n.img||''}" alt="" loading="lazy" onerror="var p=this.closest('.news-item');if(p)p.remove();">
      <div><div class="news-src">${n.fuente||'IMDAC'}</div><h4>${n.titulo}</h4><p>${n.resumen||''}</p><div class="news-date">${n.fecha||''}</div></div>
    </div>`).join(''):emptyState('noticias','Sin noticias por ahora','Pronto publicaremos novedades del sector.')}`;
}

function renderForo(){
  if(LOADING)return `<h1 class="page-h">Foro</h1><p class="page-sub">Pregunta, comparte y aprende con la comunidad IMDAC.</p>`+skelNews(4);
  return `<h1 class="page-h">Foro</h1><p class="page-sub">Pregunta, comparte y aprende con la comunidad IMDAC.</p>
  <div class="search-bar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg><input placeholder="Buscar temas..." oninput="filterForo(this.value)"></div>
  <div id="foro-list">${renderForoList(DATA.foro)}</div>
  <div class="new-topic" id="nt-card" onclick="abrirNuevoTema()"><b>+ Crear un nuevo tema</b><span>Comparte tu pregunta o experiencia con la comunidad</span></div>
  <div id="nt-form" style="display:none"></div>`;
}
function abrirNuevoTema(){
  if(!FB_OK||!CURRENT_USER||CURRENT_USER.uid==='demo'){toast('Inicia sesión para publicar');return;}
  const card=document.getElementById('nt-card'); if(card)card.style.display='none';
  const cats=['General','Estructuras','Instalaciones','Costos y Presupuestos','Topografía','Diseño CAD','Normatividad','Sustentabilidad','Gestión de Obra'];
  const f=document.getElementById('nt-form'); if(!f)return;
  f.style.display='block';
  const inp='width:100%;padding:12px 14px;border:1.5px solid var(--line);border-radius:11px;background:var(--base);color:var(--text);margin-bottom:10px';
  f.innerHTML=`<div class="card" style="padding:18px;margin-top:8px">
    <input id="nt-titulo" placeholder="Título de tu tema" style="${inp}">
    <textarea id="nt-texto" rows="3" placeholder="Escribe tu pregunta o experiencia..." style="${inp};font-family:inherit;resize:none"></textarea>
    <select id="nt-tag" style="${inp}">${cats.map(c=>`<option>${c}</option>`).join('')}</select>
    <div style="display:flex;gap:8px">
      <button onclick="publicarTema()" style="flex:1;padding:12px;border:none;border-radius:11px;background:var(--rojo);color:#fff;font-weight:700;cursor:pointer">Publicar</button>
      <button onclick="cerrarNuevoTema()" style="padding:12px 18px;border:1.5px solid var(--line);border-radius:11px;background:var(--surface);color:var(--text);font-weight:600;cursor:pointer">Cancelar</button>
    </div>
  </div>`;
}
function cerrarNuevoTema(){const f=document.getElementById('nt-form');if(f){f.style.display='none';f.innerHTML='';}const c=document.getElementById('nt-card');if(c)c.style.display='';}
function publicarTema(){
  const titulo=(document.getElementById('nt-titulo').value||'').trim();
  const texto=(document.getElementById('nt-texto').value||'').trim();
  const tag=document.getElementById('nt-tag').value||'General';
  if(!titulo){toast('Ponle un título a tu tema');return;}
  const tema={titulo,texto,tag,autor:CURRENT_USER.displayName||'Miembro',autorUid:CURRENT_USER.uid,fecha:new Date().toLocaleDateString('es-MX'),vistas:0,likes:0,creado:firebase.firestore.FieldValue.serverTimestamp()};
  db.collection('foro_temas').add(tema).then(ref=>{
    DATA.foro.unshift({id:ref.id,...tema});
    cerrarNuevoTema();
    const list=document.getElementById('foro-list'); if(list)list.innerHTML=renderForoList(DATA.foro);
    toast('¡Tema publicado!');
  }).catch(()=>toast('No se pudo publicar el tema'));
}
function renderForoList(list){
  if(!list.length) return '<div class="empty"><b>Aún no hay temas</b><span>Sé el primero en abrir una conversación.</span></div>';
  const uid=CURRENT_USER&&CURRENT_USER.uid;
  return list.map(t=>{
    const liked=(t.likedBy||[]).includes(uid);
    return `<div class="topic" onclick="toggleTema('${t.id}')"><h4>${(t.titulo||'').replace(/</g,'&lt;')}</h4><p>${(t.texto||'').replace(/</g,'&lt;')}</p><div class="topic-meta"><span class="au">${(t.autor||'Miembro').replace(/</g,'&lt;')}</span><span class="pill" style="background:var(--rojo-50);color:var(--rojo)">${t.tag||'General'}</span><span>${t.fecha||''}</span><span id="cardlk-${t.id}">${liked?'❤️':'🤍'} ${t.likes||0}</span></div></div><div class="tema-panel" id="tp-${t.id}" style="display:none"></div>`;
  }).join('');
}
let _temaAbierto=null;
let _comentarios={};
function toggleTema(id){
  const panel=document.getElementById('tp-'+id); if(!panel)return;
  if(_temaAbierto&&_temaAbierto!==id){const prev=document.getElementById('tp-'+_temaAbierto);if(prev){prev.style.display='none';prev.innerHTML='';}}
  if(_temaAbierto===id){panel.style.display='none';panel.innerHTML='';_temaAbierto=null;return;}
  _temaAbierto=id;
  panel.style.display='block';
  panel.innerHTML=renderTemaPanel(id);
  cargarComentarios(id);
}
function renderTemaPanel(id){
  const t=DATA.foro.find(x=>x.id===id); if(!t)return '';
  const uid=CURRENT_USER&&CURRENT_USER.uid;
  const liked=(t.likedBy||[]).includes(uid);
  const esMio=uid&&(t.autorUid===uid||window._imdacAdmin);
  return `<div class="ft-full">${(t.texto||'').replace(/</g,'&lt;')||'<i style="color:var(--muted)">Sin contenido</i>'}</div>
    <div class="fa-row">
      <button class="fa-btn ${liked?'liked':''}" id="lkbtn-${id}" onclick="toggleLike('${id}')">${liked?'❤️':'🤍'} <span id="lk-${id}">${t.likes||0}</span></button>
      ${esMio?`<button class="fa-btn" onclick="editarTema('${id}')">✏️ Editar</button><button class="fa-btn" onclick="borrarTema('${id}')">🗑️ Borrar</button>`:''}
    </div>
    <div id="cm-${id}"><div style="color:var(--muted);font-size:.85rem;padding:6px 0">Cargando comentarios…</div></div>
    <div class="coment-input"><input id="ci-${id}" placeholder="Escribe un comentario..." onkeydown="if(event.key==='Enter')comentar('${id}')"><button class="fa-btn" style="background:var(--rojo);color:#fff;border-color:var(--rojo)" onclick="comentar('${id}')">Comentar</button></div>`;
}
function toggleLike(id){
  if(!FB_OK||!CURRENT_USER||CURRENT_USER.uid==='demo')return toast('Inicia sesión para reaccionar');
  const t=DATA.foro.find(x=>x.id===id); if(!t)return;
  const uid=CURRENT_USER.uid; t.likedBy=t.likedBy||[];
  const i=t.likedBy.indexOf(uid);
  if(i>=0){t.likedBy.splice(i,1);t.likes=Math.max(0,(t.likes||0)-1);}
  else{t.likedBy.push(uid);t.likes=(t.likes||0)+1;}
  const liked=t.likedBy.includes(uid);
  const btn=document.getElementById('lkbtn-'+id); if(btn){btn.classList.toggle('liked',liked);btn.innerHTML=`${liked?'❤️':'🤍'} <span id="lk-${id}">${t.likes}</span>`;}
  const card=document.getElementById('cardlk-'+id); if(card)card.textContent=(liked?'❤️':'🤍')+' '+t.likes;
  db.collection('foro_temas').doc(id).update({likes:t.likes,likedBy:t.likedBy}).catch(()=>toast('No se pudo guardar tu reacción'));
}
function cargarComentarios(id){
  const cont=document.getElementById('cm-'+id); if(!cont)return;
  if(!FB_OK||!CURRENT_USER||CURRENT_USER.uid==='demo'){cont.innerHTML='<div style="color:var(--muted);font-size:.85rem;padding:6px 0">Los comentarios se activan al iniciar sesión.</div>';return;}
  db.collection('foro_temas').doc(id).collection('comentarios').orderBy('creado','asc').get().then(snap=>{
    const arr=snap.docs.map(d=>({id:d.id,...d.data()}));
    _comentarios[id]=arr;
    cont.innerHTML=arr.length?arr.map(c=>renderComent(id,c)).join(''):'<div style="color:var(--muted);font-size:.85rem;padding:6px 0">Sé el primero en comentar.</div>';
  }).catch(()=>{cont.innerHTML='<div style="color:var(--muted);font-size:.85rem;padding:6px 0">No se pudieron cargar los comentarios.</div>';});
}
function renderComent(temaId,c){
  const uid=CURRENT_USER&&CURRENT_USER.uid;
  const mio=uid&&(c.autorUid===uid||window._imdacAdmin);
  const liked=(c.likedBy||[]).includes(uid);
  return `<div class="coment" id="cmt-${c.id}"><div class="ch"><div><span class="ca">${(c.autor||'Miembro').replace(/</g,'&lt;')}</span><span class="cd">${c.fecha||''}</span></div>${mio?`<div class="coment-acts"><button onclick="editarComentario('${temaId}','${c.id}')">Editar</button><button onclick="borrarComentario('${temaId}','${c.id}')">Borrar</button></div>`:''}</div><p id="cmt-txt-${c.id}">${(c.texto||'').replace(/</g,'&lt;')}</p><button class="clike ${liked?'on':''}" id="clk-${c.id}" onclick="toggleLikeComent('${temaId}','${c.id}')">${liked?'❤️':'🤍'} <span>${c.likes||0}</span></button></div>`;
}
function toggleLikeComent(temaId,cId){
  if(!FB_OK||!CURRENT_USER||CURRENT_USER.uid==='demo')return toast('Inicia sesión para reaccionar');
  const arr=_comentarios[temaId]||[]; const c=arr.find(x=>x.id===cId); if(!c)return;
  const uid=CURRENT_USER.uid; c.likedBy=c.likedBy||[];
  const i=c.likedBy.indexOf(uid);
  if(i>=0){c.likedBy.splice(i,1);c.likes=Math.max(0,(c.likes||0)-1);}
  else{c.likedBy.push(uid);c.likes=(c.likes||0)+1;}
  const liked=c.likedBy.includes(uid);
  const btn=document.getElementById('clk-'+cId); if(btn){btn.classList.toggle('on',liked);btn.innerHTML=`${liked?'❤️':'🤍'} <span>${c.likes}</span>`;}
  db.collection('foro_temas').doc(temaId).collection('comentarios').doc(cId).update({likes:c.likes,likedBy:c.likedBy}).catch(()=>toast('No se pudo guardar tu reacción'));
}
function comentar(id){
  if(!FB_OK||!CURRENT_USER||CURRENT_USER.uid==='demo')return toast('Inicia sesión para comentar');
  const inp=document.getElementById('ci-'+id); const texto=(inp.value||'').trim(); if(!texto)return;
  const c={texto,autor:CURRENT_USER.displayName||'Miembro',autorUid:CURRENT_USER.uid,fecha:new Date().toLocaleDateString('es-MX'),creado:firebase.firestore.FieldValue.serverTimestamp()};
  db.collection('foro_temas').doc(id).collection('comentarios').add(c).then(()=>{inp.value='';cargarComentarios(id);}).catch(()=>toast('No se pudo comentar'));
}
function editarComentario(temaId,cId){
  const p=document.getElementById('cmt-txt-'+cId); if(!p)return;
  const actual=p.textContent;
  p.innerHTML=`<input id="ce-${cId}" value="${actual.replace(/"/g,'&quot;')}" style="width:100%;padding:8px 10px;border:1.5px solid var(--line);border-radius:8px;background:var(--surface);color:var(--text)"><div style="margin-top:6px;display:flex;gap:6px"><button class="fa-btn" style="background:var(--rojo);color:#fff;border-color:var(--rojo);padding:6px 12px" onclick="guardarComentario('${temaId}','${cId}')">Guardar</button><button class="fa-btn" style="padding:6px 12px" onclick="cargarComentarios('${temaId}')">Cancelar</button></div>`;
}
function guardarComentario(temaId,cId){
  const inp=document.getElementById('ce-'+cId); const texto=(inp.value||'').trim(); if(!texto)return;
  db.collection('foro_temas').doc(temaId).collection('comentarios').doc(cId).update({texto}).then(()=>cargarComentarios(temaId)).catch(()=>toast('No se pudo editar'));
}
function borrarComentario(temaId,cId){
  if(!confirm('¿Borrar este comentario?'))return;
  db.collection('foro_temas').doc(temaId).collection('comentarios').doc(cId).delete().then(()=>cargarComentarios(temaId)).catch(()=>toast('No se pudo borrar'));
}
function editarTema(id){
  const t=DATA.foro.find(x=>x.id===id); if(!t)return;
  const panel=document.getElementById('tp-'+id); if(!panel)return;
  const inp='width:100%;padding:10px 12px;border:1.5px solid var(--line);border-radius:10px;background:var(--surface);color:var(--text);margin-bottom:8px';
  panel.innerHTML=`<input id="et-tit-${id}" value="${(t.titulo||'').replace(/"/g,'&quot;')}" style="${inp}"><textarea id="et-txt-${id}" rows="3" style="${inp};font-family:inherit;resize:none">${(t.texto||'').replace(/</g,'&lt;')}</textarea><div style="display:flex;gap:8px"><button class="fa-btn" style="background:var(--rojo);color:#fff;border-color:var(--rojo)" onclick="guardarTema('${id}')">Guardar</button><button class="fa-btn" onclick="document.getElementById('tp-${id}').innerHTML=renderTemaPanel('${id}');cargarComentarios('${id}')">Cancelar</button></div>`;
}
function guardarTema(id){
  const t=DATA.foro.find(x=>x.id===id); if(!t)return;
  const titulo=(document.getElementById('et-tit-'+id).value||'').trim();
  const texto=(document.getElementById('et-txt-'+id).value||'').trim();
  if(!titulo)return toast('El título no puede ir vacío');
  db.collection('foro_temas').doc(id).update({titulo,texto}).then(()=>{
    t.titulo=titulo;t.texto=texto;
    document.getElementById('foro-list').innerHTML=renderForoList(DATA.foro);
    _temaAbierto=null; toggleTema(id);
    toast('Tema actualizado');
  }).catch(()=>toast('No se pudo editar'));
}
function borrarTema(id){
  if(!confirm('¿Borrar este tema?'))return;
  db.collection('foro_temas').doc(id).delete().then(()=>{
    DATA.foro=DATA.foro.filter(x=>x.id!==id); _temaAbierto=null;
    const list=document.getElementById('foro-list'); if(list)list.innerHTML=renderForoList(DATA.foro);
    toast('Tema borrado');
  }).catch(()=>toast('No se pudo borrar'));
}
function filterForo(q){q=q.toLowerCase();document.getElementById('foro-list').innerHTML=renderForoList(DATA.foro.filter(t=>(t.titulo+t.texto).toLowerCase().includes(q)));}

function renderDescuento(){
  return `<h1 class="page-h">Beneficio de miembro</h1><p class="page-sub">Tu cupón personal activo como miembro del club.</p>
  <div class="benefit-card">
    <div class="benefit-tag">Tu descuento exclusivo</div>
    <div class="benefit-pct">20%</div>
    <p style="color:var(--muted)">de descuento en todos los cursos, talleres y certificaciones IMDAC.</p>
    <div class="coupon" onclick="copyCoupon()">${IMDAC.cupon}<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></div>
    <p style="color:var(--muted);font-size:.84rem">Válido en la página oficial y cursos presenciales.<br>Uso ilimitado durante tu suscripción activa.</p>
    <hr style="border:none;border-top:1px solid var(--line);margin:22px 0">
    <p style="color:var(--muted);font-size:.9rem;margin-bottom:14px">¿Necesitas ayuda para aplicar tu descuento?</p>
    <a class="btn-wa" href="https://wa.me/${IMDAC.whatsapp}?text=Hola%2C%20quiero%20aplicar%20mi%20cup%C3%B3n%20${IMDAC.cupon}%2C%20quiero%20conocer%20todos%20sus%20cursos" target="_blank">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.138.563 4.14 1.535 5.874L0 24l6.29-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.814 9.814 0 01-5.058-1.4l-.361-.214-3.735.896.944-3.653-.235-.374A9.817 9.817 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>
      Aplicar descuento
    </a>
  </div>`;
}
function copyCoupon(){navigator.clipboard?.writeText(IMDAC.cupon);toast('Cupón copiado: '+IMDAC.cupon);}

function renderCanal(){
  return `<h1 class="page-h">Canal privado de miembros</h1><p class="page-sub">Comunidad exclusiva para miembros del club.</p>
  <div class="benefit-card">
    <div style="width:64px;height:64px;border-radius:50%;background:#e8f9ee;display:grid;place-items:center;margin:0 auto 14px"><svg width="28" height="28" viewBox="0 0 24 24" fill="#25D366"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg></div>
    <h3 style="font-family:var(--font-display);font-size:1.25rem;font-weight:700">WhatsApp · Canal IMDAC</h3>
    <p style="color:var(--muted);margin:8px 0 18px;font-size:.92rem">Recibe actualizaciones, tips de obra y promociones directamente en tu WhatsApp.</p>
    <a class="btn-wa" href="${IMDAC.canalWA}" target="_blank"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.138.563 4.14 1.535 5.874L0 24l6.29-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.814 9.814 0 01-5.058-1.4l-.361-.214-3.735.896.944-3.653-.235-.374A9.817 9.817 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>Unirme al canal</a>
  </div>
  <div class="card" style="padding:30px;margin:8px auto 0;max-width:480px">
    <h3 style="text-align:center;font-family:var(--font-display);font-size:1.2rem;margin-bottom:18px">¿Qué recibirás en el canal?</h3>
    <div class="feature-list">
      ${feat('M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z','Contenido exclusivo','Tips, detalles constructivos y técnicas que solo compartimos con miembros del canal.')}
      ${feat('M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5','Avisos en tiempo real','Entérate primero de nuevos cursos, webinars y material antes que nadie.')}
      ${feat('M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z','Ofertas y descuentos','Promociones especiales y descuentos exclusivos para miembros del canal.')}
      ${feat('M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z','Comunidad profesional','Conecta con otros arquitectos, ingenieros y constructores del club.')}
      ${feat('M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z','Recordatorios de eventos','No te pierdas ningún webinar en vivo ni fecha importante del club.')}
    </div>
  </div>`;
}
function feat(ic,t,d){return `<div class="feature"><div class="fi"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${ic}"/></svg></div><div><b>${t}</b><span>${d}</span></div></div>`;}

/* ===== Notificaciones (broadcast desde Admin vía Firestore, estado por usuario en localStorage) ===== */
const NOTIS_READ_KEY='imdac_notis_read';
const NOTIS_DEL_KEY='imdac_notis_del';
function _notisArr(k){try{return JSON.parse(localStorage.getItem(k)||'[]');}catch(e){return [];}}
function _notisSet(k,a){try{localStorage.setItem(k,JSON.stringify(a));}catch(e){}}
function notisDismissed(){return _notisArr(NOTIS_DEL_KEY);}
function notiVigente(n){
  const t=(n.creado&&n.creado.toMillis)?n.creado.toMillis():null;
  if(t===null)return true; // recién creada (timestamp aún resolviéndose) → mostrar
  return (Date.now()-t) < 24*60*60*1000; // 24 horas
}
function notisVisibles(){const del=notisDismissed();return (DATA.notificaciones||[]).filter(n=>!del.includes(n.id)&&notiVigente(n)&&notiPermitida(n));}
const NOTIS_PREF_KEY='imdac_notis_prefs';
const NOTI_EMOJI_CAT={'📚':'curso','🎥':'webinar','📄':'material','🏷️':'promo','📢':'anuncio'};
function notisPrefs(){const def={curso:true,webinar:true,material:true,promo:true,anuncio:true};try{return Object.assign(def,JSON.parse(localStorage.getItem(NOTIS_PREF_KEY)||'{}'));}catch(e){return def;}}
function setNotiPref(cat,on){const p=notisPrefs();p[cat]=on;try{localStorage.setItem(NOTIS_PREF_KEY,JSON.stringify(p));}catch(e){}updateNotisBadge();if(currentSection==='notificaciones')renderSection('notificaciones');toast(on?'Recibirás estos avisos':'No recibirás estos avisos');}
function notiCategoria(n){return NOTI_EMOJI_CAT[n.emoji]||'anuncio';}
function notiPermitida(n){return notisPrefs()[notiCategoria(n)]!==false;}
function notisNoLeidas(){const rd=_notisArr(NOTIS_READ_KEY);return notisVisibles().filter(n=>!rd.includes(n.id)).length;}
function updateNotisBadge(){
  const n=notisNoLeidas();
  const item=document.querySelector('.sb-item[data-sec="notificaciones"]');
  if(item){let dot=item.querySelector('.nav-dot');
    if(n>0){if(!dot){dot=document.createElement('span');dot.className='nav-dot';item.appendChild(dot);}dot.textContent=n>9?'9+':n;}
    else if(dot){dot.remove();}}
  const bd=document.getElementById('bell-dot');
  if(bd){if(n>0){bd.style.display='flex';bd.textContent=n>9?'9+':n;}else{bd.style.display='none';}}
}
function escucharNotis(){
  if(!FB_OK||!CURRENT_USER||CURRENT_USER.uid==='demo')return;
  db.collection('notificaciones').onSnapshot(snap=>{
    DATA.notificaciones=snap.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>((b.creado&&b.creado.toMillis?b.creado.toMillis():0)-(a.creado&&a.creado.toMillis?a.creado.toMillis():0)));
    updateNotisBadge();
    if(currentSection==='notificaciones')renderSection('notificaciones');
  },()=>{});
}
function eliminarNoti(id){
  const del=notisDismissed(); if(!del.includes(id)){del.push(id);_notisSet(NOTIS_DEL_KEY,del);}
  renderSection('notificaciones'); updateNotisBadge();
}
function eliminarTodasNotis(){
  const del=notisDismissed(); notisVisibles().forEach(n=>{if(!del.includes(n.id))del.push(n.id);});
  _notisSet(NOTIS_DEL_KEY,del); renderSection('notificaciones'); updateNotisBadge();
}
function marcarNotisLeidas(){
  const rd=_notisArr(NOTIS_READ_KEY); let ch=false;
  notisVisibles().forEach(n=>{if(!rd.includes(n.id)){rd.push(n.id);ch=true;}});
  if(ch)_notisSet(NOTIS_READ_KEY,rd);
  updateNotisBadge();
}
function renderNotificaciones(){
  const vis=notisVisibles();
  setTimeout(updateNotisBadge,0);
  const lista=vis.length?vis.map(n=>`<div class="noti-item"><div class="noti-ic">${n.emoji||'📢'}</div><div class="noti-body"><h4>${(n.titulo||'').replace(/</g,'&lt;')}</h4><p>${(n.mensaje||'').replace(/</g,'&lt;')}</p><span class="noti-date">${n.fecha||''}</span></div><button class="noti-del" onclick="eliminarNoti('${n.id}')" title="Eliminar">🗑️</button></div>`).join(''):emptyState('notificaciones','Todo al día','No tienes notificaciones nuevas. Te avisaremos cuando haya novedades.');
  return `<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px"><div><h1 class="page-h">Notificaciones</h1><p class="page-sub">Mantente al día con novedades y recordatorios.</p></div>${vis.length?`<button class="filter" onclick="eliminarTodasNotis()">Eliminar todas</button>`:''}</div>
  <div class="noti-list">${lista}</div>`;
}

function renderPerfil(){
  const n=CURRENT_USER?.displayName||'Miembro';
  return `<h1 class="page-h">Mi Perfil</h1><p class="page-sub">Administra tu información personal y datos de contacto.</p>
  <div class="profile-hero">
    <div class="av">${initials()}</div>
    <div><h3>${n}</h3><div style="color:var(--muted);font-size:.9rem">${CURRENT_USER?.email||''}</div><span class="badge">✦ Miembro Premium</span></div>
  </div>
  <div class="card" style="padding:30px">
    <h3 style="font-family:var(--font-display);font-size:1.2rem;margin-bottom:4px">Información personal</h3>
    <p style="color:var(--muted);font-size:.88rem;margin-bottom:22px">Los cambios se guardan al presionar "Guardar cambios".</p>
    <div class="form-grid">
      <div class="field"><label>Nombre</label><input id="pf-name" value="${n}"></div>
      <div class="field"><label>Apellido</label><input id="pf-last" placeholder="Tu apellido"></div>
      <div class="field form-full"><label>Correo electrónico</label><input value="${CURRENT_USER?.email||''}" disabled></div>
      <div class="field"><label>Teléfono</label><input id="pf-phone" placeholder="+52 ..."></div>
      <div class="field"><label>Ciudad</label><input id="pf-city" placeholder="Tu ciudad, MX"></div>
      <div class="field form-full"><label>Profesión / Cédula</label><input id="pf-prof" placeholder="Arquitecto / Ing. Civil — Cédula..."></div>
      <div class="field form-full"><label>Biografía</label><textarea id="pf-bio" rows="3" placeholder="Cuéntanos un poco sobre ti..." style="width:100%;padding:13px 15px;border:1.5px solid var(--line);border-radius:11px;background:var(--base);color:var(--text);font-family:inherit;resize:none"></textarea></div>
    </div>
    <button class="btn-primary" style="width:auto;padding:13px 30px;margin-top:16px" onclick="saveProfile()">Guardar cambios</button>
  </div>`;
}
function cargarPerfilDatos(){
  if(!FB_OK||!CURRENT_USER||CURRENT_USER.uid==='demo')return;
  db.collection('miembros').doc(CURRENT_USER.uid).get().then(s=>{
    if(!s.exists)return; const m=s.data();
    const set=(id,v)=>{const e=document.getElementById(id);if(e&&v!=null&&v!=='')e.value=v;};
    set('pf-name',m.nombre); set('pf-last',m.apellido); set('pf-phone',m.telefono);
    set('pf-city',m.ciudad); set('pf-prof',m.profesion); set('pf-bio',m.bio);
  }).catch(()=>{});
}
function saveProfile(){
  const nombre=val('pf-name').trim(), apellido=val('pf-last').trim();
  const display=(nombre+' '+apellido).trim();
  if(FB_OK&&CURRENT_USER){
    CURRENT_USER.updateProfile({displayName:display||nombre}).then(()=>{
      db.collection('miembros').doc(CURRENT_USER.uid).set({nombre,apellido,telefono:val('pf-phone'),ciudad:val('pf-city'),profesion:val('pf-prof'),bio:val('pf-bio')},{merge:true});
      toast('Perfil actualizado');refreshUserUI();
    }).catch(()=>toast('Error al guardar'));
  } else toast('Perfil actualizado (demo)');
}
const val=id=>document.getElementById(id)?.value||'';

function renderSuscripcion(){
  const incluye=[
    ['Acceso ilimitado','A todos los cursos grabados, 24/7','M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'],
    ['Webinars en vivo','Sesiones mensuales con expertos','M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'],
    ['Material PDF','Planos tipo y guías descargables','M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'],
    ['20% de descuento','En cursos y certificaciones','M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z'],
    ['Canal exclusivo','Comunidad de miembros','M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'],
  ];
  let alta='—', renueva='—';
  if(CURRENT_USER?.metadata?.creationTime){
    const d=new Date(CURRENT_USER.metadata.creationTime);alta=d.toLocaleDateString('es-MX');
    const r=new Date(d);r.setMonth(r.getMonth()+1);renueva=r.toLocaleDateString('es-MX');
  }
  const m=window._miMiembro||{};
  const estado=m.estado||'Activo';
  const esRegalo=!m.stripeSubscriptionId&&m.vigenciaHasta;
  const plan=esRegalo?'Acceso de cortesía':(m.plan?('IMDAC '+m.plan):'IMDAC Mensual');
  const renuevaReal=esRegalo?(m.vigenciaHasta||'—'):(m.renovacion||renueva);
  const precioTxt=m.plan==='Anual'?'':(`$${IMDAC.precio||499} <span>MXN / mes</span>`);
  return `<h1 class="page-h">Mi Suscripción</h1><p class="page-sub">Detalles de tu plan y beneficios activos.</p>
  <div class="sub-card">
    <div class="sub-top"><span class="sub-badge">✦ Premium</span><span class="sub-status" style="${estado!=='Activo'?'background:#fde8e8;color:#c0392b':''}">${estado==='Activo'?'Activa':estado}</span></div>
    <div class="sub-plan">${plan}</div>
    ${precioTxt?`<div class="sub-price">${precioTxt}</div>`:''}
    <div class="sub-divider"></div>
    <div class="sub-meta2">
      <div><div class="ml">Miembro desde</div><div class="mv">${alta}</div></div>
      <div><div class="ml">${esRegalo?'Acceso hasta':'Próxima renovación'}</div><div class="mv">${renuevaReal}</div></div>
      <div><div class="ml">Método de pago</div><div class="mv">${esRegalo?'Cortesía IMDAC':'Stripe'}</div></div>
    </div>
    <div class="sub-actions">
      <button class="btn-manage" onclick="abrirPortal()">Gestionar suscripción</button>
      <button class="btn-cancel" onclick="if(confirm('Para cancelar tu suscripción te llevaremos al portal seguro de pagos. ¿Continuar?'))abrirPortal()">Cancelar</button>
    </div>
  </div>
  <h3 class="plan-section-title">Lo que incluye tu plan</h3>
  <p class="plan-section-sub">Todo esto viene con tu membresía activa.</p>
  <div class="plan-grid">
    ${incluye.map(i=>`<div class="plan-item"><div class="pic"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${i[2]}"/></svg></div><b>${i[0]}</b><span>${i[1]}</span></div>`).join('')}
  </div>
  <div class="legal-links">
    <button onclick="go('terminos')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Términos y Condiciones</button>
    <button onclick="go('privacidad')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>Política de Privacidad</button>
  </div>`;
}

/* tracking ligero para logros (por dispositivo) */
function _statArr(k){try{return JSON.parse(localStorage.getItem(k)||'[]');}catch(e){return [];}}
function registrarVisita(){
  const hoy=new Date().toISOString().slice(0,10);
  const dias=_statArr('imdac_dias');
  if(!dias.includes(hoy)){dias.push(hoy);try{localStorage.setItem('imdac_dias',JSON.stringify(dias.slice(-400)));}catch(e){}}
}
function registrarCertDescargado(cursoId){
  const arr=_statArr('imdac_certs');
  if(!arr.includes(cursoId)){arr.push(cursoId);try{localStorage.setItem('imdac_certs',JSON.stringify(arr));}catch(e){}}
}
function calcLogros(){
  const uid=CURRENT_USER&&CURRENT_USER.uid;
  const progs=Object.values(DATA.progresos||{});
  const iniciados=progs.filter(p=>p>0).length;
  const completos=progs.filter(p=>p>=100).length;
  const clasesTot=Object.values(DATA.clasesHechas||{}).reduce((a,arr)=>a+(arr?arr.length:0),0);
  const misTemas=(DATA.foro||[]).filter(t=>t.autorUid===uid);
  const likesRecibidos=misTemas.reduce((a,t)=>a+(t.likes||0),0);
  const likesDados=(DATA.foro||[]).filter(t=>(t.likedBy||[]).includes(uid)).length;
  const diLike=likesDados>0;
  const catsCompletas=new Set(DATA.cursos.filter(c=>(DATA.progresos[c.id]||0)>=100).map(c=>c.categoria||'General')).size;
  const certsDesc=_statArr('imdac_certs').length;
  const diasVisita=_statArr('imdac_dias').length;
  return [
    {n:'Primer paso',d:'Inicia tu primer curso',ic:'🎯',v:iniciados,m:1},
    {n:'Manos a la obra',d:'Completa tu primera clase',ic:'🧱',v:clasesTot,m:1},
    {n:'Pico y pala',d:'Completa 10 clases',ic:'🔨',v:clasesTot,m:10},
    {n:'Media jornada',d:'Completa 25 clases',ic:'⏱️',v:clasesTot,m:25},
    {n:'Jornada completa',d:'Completa 50 clases',ic:'🚧',v:clasesTot,m:50},
    {n:'Cimientos firmes',d:'Completa tu primer curso',ic:'🏠',v:completos,m:1},
    {n:'Constructor',d:'Completa 3 cursos',ic:'🏗️',v:completos,m:3},
    {n:'Supervisor',d:'Completa 5 cursos · mitad del catálogo',ic:'📐',v:completos,m:5},
    {n:'Residente de obra',d:'Completa 7 cursos',ic:'🦺',v:completos,m:7},
    {n:'Maestro de obra',d:'Completa los 10 cursos del catálogo',ic:'👷',v:completos,m:10},
    {n:'Multidisciplinario',d:'Completa cursos de 3 categorías distintas',ic:'🗂️',v:catsCompletas,m:3},
    {n:'Coleccionista',d:'Descarga tu primer certificado',ic:'📜',v:certsDesc,m:1},
    {n:'Galería de títulos',d:'Descarga 5 certificados',ic:'🖼️',v:certsDesc,m:5},
    {n:'Voz del gremio',d:'Publica tu primer tema en el foro',ic:'💬',v:misTemas.length,m:1},
    {n:'Cronista',d:'Publica 3 temas en el foro',ic:'✍️',v:misTemas.length,m:3},
    {n:'Líder de opinión',d:'Publica 5 temas en el foro',ic:'📣',v:misTemas.length,m:5},
    {n:'Buen colega',d:'Reacciona a un tema del foro',ic:'❤️',v:diLike?1:0,m:1},
    {n:'Mano amiga',d:'Reacciona a 5 temas del foro',ic:'🤝',v:likesDados,m:5},
    {n:'Corazón de oro',d:'Reacciona a 15 temas del foro',ic:'💞',v:likesDados,m:15},
    {n:'Influencer',d:'Recibe 10 reacciones en tus temas',ic:'⭐',v:likesRecibidos,m:10},
    {n:'Voz respetada',d:'Recibe 25 reacciones en tus temas',ic:'🌟',v:likesRecibidos,m:25},
    {n:'Constante',d:'Visita el club 7 días distintos',ic:'📅',v:diasVisita,m:7},
    {n:'Racha de fuego',d:'Visita el club 30 días distintos',ic:'🔥',v:diasVisita,m:30},
    {n:'Leyenda IMDAC',d:'Catálogo completo + 25 reacciones recibidas',ic:'🏆',v:(completos>=10&&likesRecibidos>=25)?1:0,m:1},
  ].map(l=>({...l,ok:l.v>=l.m}));
}
function renderLogros(){
  const logros=calcLogros();
  const des=logros.filter(l=>l.ok).length;
  const completados=DATA.cursos.filter(c=>(DATA.progresos[c.id]||0)>=100);
  return `<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px"><div><h1 class="page-h">Logros</h1><p class="page-sub">Tu progreso y reconocimientos en el club.</p></div><span class="pill" style="background:var(--rojo-50);color:var(--rojo);font-weight:700">${des}/${logros.length} desbloqueados</span></div>
  <div class="course-grid">${logros.map(l=>{
    const pct=Math.min(100,Math.round((l.v/l.m)*100));
    return `<div class="card logro-card ${l.ok?'ok':''}" style="padding:24px;text-align:center">
      <div class="logro-ic">${l.ic}</div>
      <h4 style="font-family:var(--font-display);margin:10px 0 4px">${l.n}</h4>
      <p style="color:var(--muted);font-size:.86rem">${l.d}</p>
      ${l.ok?'<span class="pill" style="background:var(--rojo-50);color:var(--rojo);margin-top:10px">✓ Desbloqueado</span>'
        :`<div class="logro-bar"><i style="width:${pct}%"></i></div><span class="logro-cnt">${Math.min(l.v,l.m)}/${l.m}</span>`}
    </div>`;}).join('')}</div>
  ${completados.length?`<h3 style="font-family:var(--font-display);font-size:1.25rem;font-weight:700;margin:34px 0 14px">Tus certificados</h3>
    <div class="card" style="padding:6px 22px">${completados.map(c=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 0;border-bottom:1px solid var(--line)"><div><b style="font-family:var(--font-display)">${c.titulo}</b><div style="color:var(--muted);font-size:.84rem">${c.categoria||''}</div></div><button class="filter" onclick="generarCertificado('${c.id}')">📄 Descargar PDF</button></div>`).join('')}</div>`:''}`;
}

function renderConfig(){
  const dark=document.documentElement.dataset.theme==='dark';
  const prefs=notisPrefs();
  const notifs=[
    ['Nuevos cursos','Recibe aviso cuando se suba un nuevo curso','curso'],
    ['Webinars en vivo','Recordatorio antes de cada sesión','webinar'],
    ['Nuevos PDFs','Aviso cuando se publique nuevo material','material'],
    ['Promociones','Ofertas especiales y descuentos del Club','promo'],
    ['Anuncios generales','Avisos importantes del Club','anuncio'],
  ];
  const motivos=['Problema con un curso','Problema de pago o suscripción','Problema técnico','Sugerencia o comentario','Otro'];
  return `<h1 class="page-h">Configuración</h1><p class="page-sub">Preferencias de la aplicación y la cuenta.</p>

  <div class="card cfg-card">
    <h3>Apariencia</h3>
    <div class="cfg-item"><div class="ci-t"><b>Modo oscuro</b><span>Cambia entre tema claro y oscuro</span></div>
      <label class="toggle"><input type="checkbox" ${dark?'checked':''} onchange="toggleTheme()"><span class="tk"></span></label></div>
  </div>

  <div class="card cfg-card">
    <h3>Notificaciones</h3>
    ${notifs.map(n=>`<div class="cfg-item"><div class="ci-t"><b>${n[0]}</b><span>${n[1]}</span></div>
      <label class="toggle"><input type="checkbox" ${prefs[n[2]]!==false?'checked':''} onchange="setNotiPref('${n[2]}',this.checked)"><span class="tk"></span></label></div>`).join('')}
  </div>

  <div class="card cfg-card">
    <h3>Instalar aplicación</h3>
    <p class="cfg-note" style="margin:-8px 0 16px">Instala IMDAC en tu dispositivo para acceso rápido y uso offline. Aparece como app nativa en tu pantalla de inicio.</p>
    <div class="install-banner">
      <div class="ib-ic">📲</div>
      <div style="flex:1"><b>Instala IMDAC</b><span>Acceso rápido desde tu home screen, funciona offline y se ve como una app nativa.</span></div>
      <button class="btn-outline" onclick="installPWA()">Instalar ahora</button>
    </div>
  </div>

  <div class="card cfg-card">
    <h3>Idioma y Región</h3>
    <div class="field"><label>Idioma de la plataforma</label><input class="cfg-select cfg-fixed" value="Español (México)" readonly tabindex="-1"><p class="cfg-note">Próximamente más idiomas.</p></div>
    <div class="field" style="margin-top:16px"><label>Zona horaria</label><input class="cfg-select cfg-fixed" value="América/Ciudad de México (GMT-6)" readonly tabindex="-1">
      <p class="cfg-note">Si te encuentras en otra zona horaria, los horarios de clases en vivo se muestran en hora centro de México.</p></div>
  </div>

  <div class="card cfg-card">
    <h3>Seguridad</h3>
    <div class="cfg-item"><div class="ci-t"><b>Cambiar contraseña</b><span>Te enviaremos un correo para restablecer tu contraseña</span></div>
      <button class="btn-outline" onclick="changePass()">Cambiar</button></div>
  </div>

  <div class="card cfg-card">
    <h3>Soporte</h3>
    <p class="cfg-note" style="margin:-8px 0 16px">¿Tienes algún problema o sugerencia? Completa el formulario y te atenderemos por WhatsApp.</p>
    <div class="field"><label>¿Cuál es el motivo de tu contacto?</label>
      <select class="cfg-select" id="sp-motivo"><option value="">— Selecciona una opción —</option>${motivos.map(m=>`<option>${m}</option>`).join('')}</select></div>
    <div class="field" style="margin-top:16px"><label>Descríbenos brevemente tu situación</label>
      <textarea id="sp-desc" rows="3" placeholder="Cuéntanos qué pasó o qué necesitas para ayudarte mejor..." style="width:100%;padding:13px 15px;border:1.5px solid var(--line);border-radius:11px;background:var(--base);color:var(--text);font-family:inherit;resize:none"></textarea></div>
    <div class="field" style="margin-top:16px"><label>¿Qué tan urgente es?</label>
      <div class="urg-pills" id="sp-urg">
        <button class="filter" data-urg="Baja" onclick="setUrg('Baja')">Baja</button>
        <button class="filter active" data-urg="Media" onclick="setUrg('Media')">Media</button>
        <button class="filter" data-urg="Urgente" onclick="setUrg('Urgente')">Urgente</button>
      </div></div>
    <div class="field" style="margin-top:16px"><label>Elige a qué línea deseas contactar:</label>
      <div class="wa-lines">
        <a class="btn-wa" onclick="sendSoporte('${IMDAC.soporte.l1}')"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.138.563 4.14 1.535 5.874L0 24l6.29-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.814 9.814 0 01-5.058-1.4l-.361-.214-3.735.896.944-3.653-.235-.374A9.817 9.817 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>Línea 1 — ${IMDAC.soporte.l1Label}</a>
        <a class="btn-wa" onclick="sendSoporte('${IMDAC.soporte.l2}')"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.138.563 4.14 1.535 5.874L0 24l6.29-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.814 9.814 0 01-5.058-1.4l-.361-.214-3.735.896.944-3.653-.235-.374A9.817 9.817 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>Línea 2 — ${IMDAC.soporte.l2Label}</a>
      </div></div>
  </div>`;
}
let _spUrg='Media';
function setUrg(u){_spUrg=u;document.querySelectorAll('#sp-urg .filter').forEach(b=>b.classList.toggle('active',b.dataset.urg===u));}
function sendSoporte(num){
  const motivo=val('sp-motivo')||'Consulta general';
  const desc=val('sp-desc')||'(sin descripción)';
  const txt=`Hola IMDAC, necesito soporte.%0A%0A*Motivo:* ${encodeURIComponent(motivo)}%0A*Urgencia:* ${_spUrg}%0A*Situación:* ${encodeURIComponent(desc)}`;
  window.open(`https://wa.me/${num}?text=${txt}`,'_blank');
}
function changePass(){
  const email=CURRENT_USER?.email;
  if(FB_OK&&email){auth.sendPasswordResetEmail(email).then(()=>toast('Correo de recuperación enviado a '+email)).catch(()=>toast('No se pudo enviar el correo'));}
  else toast('(Demo) Te enviaríamos un correo de recuperación');
}
let _deferredPrompt=null;
function installPWA(){
  if(_deferredPrompt){_deferredPrompt.prompt();_deferredPrompt.userChoice.then(()=>{_deferredPrompt=null;});}
  else toast('Para instalar: usa el menú del navegador → "Agregar a pantalla de inicio".');
}

const LEGAL={
  terminos:{t:'Términos y Condiciones',b:`
    <h4>1. Aceptación</h4><p>Al registrarte y usar el Club de Miembros IMDAC (Instituto Mexicano de Arquitectura y Construcción) aceptas estos Términos y Condiciones en su totalidad. Si no estás de acuerdo, no utilices la plataforma.</p>
    <h4>2. Objeto del servicio</h4><p>El Club ofrece contenido educativo y profesional en arquitectura y construcción: cursos grabados, webinars, material descargable, herramientas de obra, foro de comunidad y certificados de finalización. El contenido tiene fines formativos y de actualización profesional; no sustituye la responsiva de un perito o profesional certificado.</p>
    <h4>3. Membresía y pagos</h4><p>La membresía es personal e intransferible. El acceso se mantiene mientras la suscripción esté activa y al corriente de pago. Los precios pueden actualizarse; cualquier cambio se notificará dentro de la plataforma antes de aplicarse a tu siguiente periodo.</p>
    <h4>4. Liberación de contenido</h4><p>Algunos cursos se liberan de forma programada conforme a tu antigüedad como miembro. IMDAC puede agregar, actualizar o retirar cursos, webinars y materiales para mantener el catálogo vigente.</p>
    <h4>5. Propiedad intelectual</h4><p>Todo el contenido (videos, documentos, plantillas, marca y diseño) es propiedad de IMDAC o de sus licenciantes. Queda prohibida su reproducción, descarga no autorizada, redistribución o reventa. El uso indebido puede resultar en la cancelación de la cuenta sin reembolso, además de las acciones legales que correspondan.</p>
    <h4>6. Conducta en la comunidad</h4><p>En el foro y espacios de comunidad debes mantener un trato respetuoso y profesional. No se permite spam, contenido ofensivo, publicidad no autorizada ni suplantación de identidad. IMDAC puede moderar, editar o eliminar contenido y suspender cuentas que incumplan estas normas.</p>
    <h4>7. Certificados</h4><p>Los certificados emitidos acreditan la finalización del curso correspondiente dentro del Club. No constituyen título profesional, cédula ni certificación oficial ante autoridades, salvo que se indique expresamente lo contrario.</p>
    <h4>8. Disponibilidad</h4><p>IMDAC procura mantener la plataforma disponible de forma continua, pero no garantiza la ausencia de interrupciones por mantenimiento, fallas técnicas o causas de fuerza mayor.</p>
    <h4>9. Modificaciones</h4><p>IMDAC puede actualizar estos términos en cualquier momento. La versión vigente estará siempre disponible en la plataforma; el uso continuado implica su aceptación.</p>
    <h4>10. Contacto</h4><p>Para dudas sobre estos términos, contáctanos por los canales de soporte disponibles dentro de la plataforma.</p>`},
  privacidad:{t:'Política de Privacidad',b:`
    <h4>1. Responsable</h4><p>IMDAC (Instituto Mexicano de Arquitectura y Construcción) es responsable del tratamiento de tus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.</p>
    <h4>2. Datos que recopilamos</h4><p>Únicamente la información necesaria para operar tu membresía: nombre, correo electrónico, datos de contacto y, en su caso, información profesional que decidas proporcionar. Los pagos se procesan a través de proveedores especializados; IMDAC no almacena los datos completos de tu tarjeta.</p>
    <h4>3. Finalidades</h4><p>Usamos tus datos para: crear y administrar tu cuenta, darte acceso al contenido, emitir certificados a tu nombre, enviarte avisos del Club, brindarte soporte y mejorar la plataforma.</p>
    <h4>4. Servicios de terceros</h4><p>La plataforma utiliza servicios tecnológicos de terceros para autenticación, base de datos y procesamiento de pagos (como Google Firebase y Stripe), que tratan datos conforme a sus propias políticas y estándares de seguridad. No vendemos ni compartimos tus datos con terceros para fines distintos a la operación del Club sin tu consentimiento.</p>
    <h4>5. Almacenamiento local</h4><p>La aplicación guarda en tu dispositivo preferencias y estados de uso (por ejemplo, tema oscuro, notificaciones leídas y avance local) para mejorar tu experiencia. Puedes borrarlos limpiando los datos del navegador.</p>
    <h4>6. Derechos ARCO</h4><p>Puedes solicitar el acceso, rectificación, cancelación u oposición del tratamiento de tus datos en cualquier momento, contactando a soporte desde la plataforma. Atenderemos tu solicitud en los plazos que marca la ley.</p>
    <h4>7. Conservación</h4><p>Conservamos tus datos mientras tu cuenta esté activa y por el tiempo necesario para cumplir obligaciones legales. Al eliminarse tu cuenta, los datos se suprimen o anonimizan conforme a la normativa aplicable.</p>
    <h4>8. Cambios a esta política</h4><p>Cualquier actualización se publicará en la plataforma. El uso continuado del Club implica la aceptación de la versión vigente.</p>`}
};
function mostrarLegal(tipo){
  const L=LEGAL[tipo]; if(!L)return;
  let ovl=document.getElementById('legal-ovl');
  if(!ovl){ovl=document.createElement('div');ovl.id='legal-ovl';ovl.className='legal-ovl';document.body.appendChild(ovl);}
  ovl.innerHTML=`<div class="legal-wrap">
    <button class="legal-back" onclick="cerrarLegal()">← Volver al registro</button>
    <h1 class="page-h">${L.t}</h1>
    <div class="card legal-body">${L.b}<p style="margin-top:20px;font-size:.84rem;color:var(--muted)">Última actualización: mayo 2026 · Instituto Mexicano de Arquitectura y Construcción.</p></div>
    <button class="btn-primary legal-ok" onclick="cerrarLegal()">Entendido, volver</button>
  </div>`;
  ovl.style.display='block'; ovl.scrollTop=0;
}
function cerrarLegal(){const o=document.getElementById('legal-ovl');if(o)o.style.display='none';}
function renderTerminos(){return `<h1 class="page-h">${LEGAL.terminos.t}</h1><div class="card legal-body" style="max-width:760px">${LEGAL.terminos.b}<p style="margin-top:20px;font-size:.84rem;color:var(--muted)">Última actualización: mayo 2026 · Instituto Mexicano de Arquitectura y Construcción.</p></div>`;}
function renderPrivacidad(){return `<h1 class="page-h">${LEGAL.privacidad.t}</h1><div class="card legal-body" style="max-width:760px">${LEGAL.privacidad.b}<p style="margin-top:20px;font-size:.84rem;color:var(--muted)">Última actualización: mayo 2026 · Instituto Mexicano de Arquitectura y Construcción.</p></div>`;}

function emptyState(sec,title,desc){
  return `<div class="card"><div class="empty"><div class="ic"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg></div><b>${title}</b><span>${desc}</span></div></div>`;
}

/* ====== 6. HERRAMIENTAS DE OBRA ====== */
function renderFichaObra(){
  return `<h1 class="page-h">Ficha de Obra</h1><p class="page-sub">Genera una ficha técnica de obra en PDF lista para imprimir.</p>
  <div class="card" style="padding:30px;max-width:760px">
    <div class="form-grid">
      <div class="field form-full"><label>Nombre de la obra</label><input id="fo-obra" placeholder="Ej. Casa habitación dos niveles"></div>
      <div class="field"><label>Cliente / Propietario</label><input id="fo-cliente" placeholder="Nombre"></div>
      <div class="field"><label>Ubicación</label><input id="fo-ubic" placeholder="Calle, colonia, ciudad"></div>
      <div class="field"><label>Superficie (m²)</label><input id="fo-sup" type="number" placeholder="0"></div>
      <div class="field"><label>Tipo de obra</label><input id="fo-tipo" placeholder="Residencial / Comercial / Industrial"></div>
      <div class="field"><label>Responsable (DRO)</label><input id="fo-dro" placeholder="Director Responsable de Obra"></div>
      <div class="field"><label>Fecha de inicio</label><input id="fo-inicio" type="date"></div>
      <div class="field form-full"><label>Descripción / Alcances</label><textarea id="fo-desc" rows="3" placeholder="Detalle de la obra..." style="width:100%;padding:13px 15px;border:1.5px solid var(--line);border-radius:11px;background:var(--base);color:var(--text);font-family:inherit;resize:none"></textarea></div>
    </div>
    <button class="btn-primary" style="width:auto;padding:13px 30px;margin-top:8px" onclick="genFichaPDF()">📄 Generar PDF</button>
  </div>`;
}
function genFichaPDF(){
  loadJsPDF(()=>{
    const {jsPDF}=window.jspdf; const doc=new jsPDF();
    doc.setFillColor(13,13,13);doc.rect(0,0,210,32,'F');
    doc.setFillColor(255,44,44);doc.rect(0,32,210,2.5,'F');
    doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(20);doc.text('IMDAC',16,16);
    doc.setFontSize(8);doc.setFont('helvetica','normal');doc.text('Instituto Mexicano de Arquitectura y Construcción',16,23);
    doc.setTextColor(255,44,44);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('FICHA TÉCNICA DE OBRA',150,18,{align:'center'});
    let y=48; doc.setTextColor(20,20,20);
    const row=(l,v)=>{doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(120,120,120);doc.text(l.toUpperCase(),16,y);doc.setFont('helvetica','normal');doc.setFontSize(11);doc.setTextColor(20,20,20);doc.text(v||'—',16,y+6);y+=16;};
    row('Nombre de la obra',val('fo-obra'));
    row('Cliente / Propietario',val('fo-cliente'));
    row('Ubicación',val('fo-ubic'));
    row('Superficie',val('fo-sup')?val('fo-sup')+' m²':'');
    row('Tipo de obra',val('fo-tipo'));
    row('Responsable (DRO)',val('fo-dro'));
    row('Fecha de inicio',val('fo-inicio'));
    doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(120,120,120);doc.text('DESCRIPCIÓN / ALCANCES',16,y);y+=6;
    doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(20,20,20);
    doc.text(doc.splitTextToSize(val('fo-desc')||'—',178),16,y);
    doc.setFontSize(8);doc.setTextColor(150,150,150);doc.text('Generado por IMDAC · Club de Miembros · '+new Date().toLocaleDateString('es-MX'),16,285);
    doc.save('ficha-obra-imdac.pdf'); toast('Ficha de obra generada');
  });
}

function renderCalculadora(){
  return `<h1 class="page-h">Calculadora de Materiales</h1><p class="page-sub">Estima volúmenes y cantidades base para tu obra.</p>
  <div class="tool-intro">
    <h3 style="font-family:var(--font-display);margin-bottom:4px">Concreto (losa / firme)</h3>
    <p style="color:var(--muted);font-size:.88rem;margin-bottom:18px">Calcula el volumen y materiales para una losa de concreto.</p>
    <div class="tool-row">
      <div class="field"><label>Largo (m)</label><input id="cc-largo" type="number" value="0" oninput="calcConcreto()"></div>
      <div class="field"><label>Ancho (m)</label><input id="cc-ancho" type="number" value="0" oninput="calcConcreto()"></div>
      <div class="field"><label>Espesor (cm)</label><input id="cc-esp" type="number" value="10" oninput="calcConcreto()"></div>
      <div class="field"><label>Resistencia f'c</label><select id="cc-fc" class="cfg-select" onchange="calcConcreto()"><option value="150">150 kg/cm²</option><option value="200" selected>200 kg/cm²</option><option value="250">250 kg/cm²</option><option value="300">300 kg/cm²</option></select></div>
    </div>
    <div class="calc-result"><b id="cc-vol">0.00 m³</b><span>Volumen de concreto · ≈ <span id="cc-sacos">0</span> sacos de cemento · <span id="cc-arena">0</span> m³ arena · <span id="cc-grava">0</span> m³ grava</span></div>
  </div>
  <div class="tool-intro">
    <h3 style="font-family:var(--font-display);margin-bottom:4px">Muro de block / tabique</h3>
    <p style="color:var(--muted);font-size:.88rem;margin-bottom:18px">Estima piezas para un muro.</p>
    <div class="tool-row">
      <div class="field"><label>Largo del muro (m)</label><input id="bk-largo" type="number" value="0" oninput="calcBlock()"></div>
      <div class="field"><label>Alto del muro (m)</label><input id="bk-alto" type="number" value="0" oninput="calcBlock()"></div>
    </div>
    <div class="calc-result"><b id="bk-piezas">0 piezas</b><span>Block 15×20×40 cm · 12.5 pzas/m² (incluye 5% desperdicio)</span></div>
  </div>
  <button class="btn-primary" style="width:auto;padding:13px 30px" onclick="exportCalcPDF()">📄 Exportar cálculo a PDF</button>`;
}
function exportCalcPDF(){
  loadJsPDF(()=>{
    const {jsPDF}=window.jspdf;const doc=new jsPDF();
    doc.setFillColor(13,13,13);doc.rect(0,0,210,32,'F');doc.setFillColor(255,44,44);doc.rect(0,32,210,2.5,'F');
    doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(20);doc.text('IMDAC',16,16);
    doc.setFontSize(8);doc.setFont('helvetica','normal');doc.text('Instituto Mexicano de Arquitectura y Construcción',16,23);
    doc.setTextColor(255,44,44);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('CÁLCULO DE MATERIALES',150,18,{align:'center'});
    let y=50;doc.setTextColor(20,20,20);
    const sec=(t)=>{doc.setFont('helvetica','bold');doc.setFontSize(13);doc.setTextColor(255,44,44);doc.text(t,16,y);y+=8;doc.setTextColor(20,20,20);};
    const row=(l,v)=>{doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(110,110,110);doc.text(l,18,y);doc.setFont('helvetica','bold');doc.setTextColor(20,20,20);doc.text(String(v),120,y);y+=7;};
    sec('Concreto (losa / firme)');
    row('Dimensiones',`${val('cc-largo')||0} x ${val('cc-ancho')||0} m, esp. ${val('cc-esp')||0} cm, f'c=${val('cc-fc')||200}`);
    row('Volumen de concreto',document.getElementById('cc-vol')?.textContent||'0 m³');
    row('Sacos de cemento (aprox.)',document.getElementById('cc-sacos')?.textContent||'0');
    row('Arena',`${document.getElementById('cc-arena')?.textContent||'0'} m³`);
    row('Grava',`${document.getElementById('cc-grava')?.textContent||'0'} m³`);
    y+=6;sec('Muro de block');
    row('Dimensiones del muro',`${val('bk-largo')||0} x ${val('bk-alto')||0} m`);
    row('Piezas de block (con 5% desperdicio)',document.getElementById('bk-piezas')?.textContent||'0');
    doc.setFontSize(8);doc.setTextColor(150,150,150);
    doc.text('Cálculo de referencia generado por IMDAC · Club de Miembros · '+new Date().toLocaleDateString('es-MX'),16,285);
    doc.text('Los valores son estimados. Ajusta según proyecto, proveedor y normativa vigente.',16,290);
    doc.save('calculo-materiales-imdac.pdf');toast('PDF generado');
  });
}
function calcConcreto(){
  const l=+val('cc-largo'),a=+val('cc-ancho'),e=+val('cc-esp')/100;
  const vol=l*a*e;
  const sacosM3={150:6,200:7,250:8,300:9}[val('cc-fc')||'200']||7;
  document.getElementById('cc-vol').textContent=vol.toFixed(2)+' m³';
  document.getElementById('cc-sacos').textContent=Math.ceil(vol*sacosM3);
  document.getElementById('cc-arena').textContent=(vol*0.51).toFixed(2);
  document.getElementById('cc-grava').textContent=(vol*0.68).toFixed(2);
}
function calcBlock(){
  const l=+val('bk-largo'),h=+val('bk-alto');
  const piezas=Math.ceil(l*h*12.5*1.05);
  document.getElementById('bk-piezas').textContent=piezas+' piezas';
}

function renderPrecios(){
  const base=[
    ['Excavación a mano en material tipo II','m³','$185.00'],
    ['Plantilla de concreto f\'c=100','m²','$95.00'],
    ['Cadena de cimentación 15×20 armada','ml','$420.00'],
    ['Muro de block 15 cm asentado','m²','$540.00'],
    ['Losa maciza 10 cm f\'c=200','m²','$980.00'],
    ['Aplanado fino en muro','m²','$165.00'],
    ['Piso de cerámica 30×30 colocado','m²','$310.00'],
  ];
  const conceptos=(DATA.precios&&DATA.precios.length)?DATA.precios.map(p=>[p.concepto,p.unidad,p.precio]):base;
  const nota=(DATA.precios&&DATA.precios.length)?'* Catálogo administrado por IMDAC. Precios de referencia: ajusta según región, proveedor y fecha.':'* Precios de referencia general. Ajusta según región, proveedor y fecha.';
  return `<h1 class="page-h">Catálogo de Precios Unitarios</h1><p class="page-sub">Referencia base de conceptos de obra (precios estimados, actualízalos a tu zona).</p>
  <div class="card" style="overflow:hidden">
    <table class="norm"><thead><tr><th>Concepto</th><th>Unidad</th><th>P.U. estimado</th></tr></thead>
    <tbody>${conceptos.map(c=>`<tr><td>${c[0]}</td><td>${c[1]}</td><td style="font-family:var(--font-display);font-weight:700;color:var(--rojo)">${c[2]}</td></tr>`).join('')}</tbody></table>
  </div>
  <p style="color:var(--muted);font-size:.82rem;margin-top:14px">${nota}</p>`;
}

function renderNormativas(){
  const normas=[
    ['NTC Diseño Estructuras de Concreto','Estructuras','Reglamento de Construcciones CDMX'],
    ['NTC Diseño por Sismo','Estructuras','Diseño sísmico de edificaciones'],
    ['NTC Diseño y Construcción de Cimentaciones','Estructuras','Estudios de mecánica de suelos y cimentación'],
    ['NTC Mampostería','Estructuras','Diseño de estructuras de mampostería'],
    ['NTC Estructuras de Acero','Estructuras','Diseño de estructuras metálicas'],
    ['NOM-001-SEDE Instalaciones Eléctricas','Instalaciones','Utilización de energía eléctrica'],
    ['NOM-008-CNA Agua potable','Instalaciones','Sistemas hidráulicos'],
    ['NOM-031-STPS-2011','Seguridad','Condiciones de seguridad en obras de construcción'],
    ['NOM-017-STPS-2008','Seguridad','Equipo de protección personal en el trabajo'],
    ['NOM-026-STPS-2008','Seguridad','Señalización de seguridad e higiene'],
    ['NOM-020-ENER Eficiencia energética','Sustentabilidad','Envolvente de edificios'],
    ['Ley de Obra Pública','Gestión','Contratación de obra pública'],
    ['Reglamento de Construcciones local','Gestión','Licencias, DRO y trámites municipales'],
  ];
  return `<h1 class="page-h">Guía de Normativas</h1><p class="page-sub">Referencia rápida de normas y reglamentos aplicables a la construcción en México.</p>
  <div class="card" style="overflow:hidden">
    <table class="norm"><thead><tr><th>Norma / Reglamento</th><th>Área</th><th>Descripción</th></tr></thead>
    <tbody>${normas.map(n=>`<tr><td style="font-weight:600">${n[0]}</td><td><span class="badge-norm">${n[1]}</span></td><td style="color:var(--muted)">${n[2]}</td></tr>`).join('')}</tbody></table>
  </div>
  <p style="color:var(--muted);font-size:.82rem;margin-top:14px">* Guía de referencia. Consulta siempre la versión vigente publicada por la autoridad correspondiente.</p>`;
}

/* ====== 7. DETALLE DE CURSO (vista completa) ====== */
let _cursoActivo=null;
function openCurso(id){
  const c=DATA.cursos.find(x=>x.id===id); if(!c)return;
  _cursoActivo=id;
  document.querySelectorAll('.sb-item').forEach(e=>e.classList.toggle('active',e.dataset.sec==='biblioteca'));
  document.getElementById('content').innerHTML=`<div class="section active">${renderCursoDetalle(id)}</div>`;
  window.scrollTo(0,0);
}
function renderCursoDetalle(id){
  const c=DATA.cursos.find(x=>x.id===id); if(!c)return renderBiblioteca();
  const clases=Array.isArray(c.listaClases)&&c.listaClases.length
    ? c.listaClases
    : Array.from({length:(c.clases||0)},(_,i)=>({titulo:`Clase ${i+1}`,duracion:'2 Horas'}));
  const total=clases.length;
  // seguimiento por clase: si aún no existe, lo sembramos desde el porcentaje guardado
  if(!Array.isArray(DATA.clasesHechas[id])){
    const seed=Math.round((DATA.progresos[id]||0)/100*total);
    DATA.clasesHechas[id]=Array.from({length:seed},(_,k)=>k);
  }
  const hechas=DATA.clasesHechas[id];
  const prog=total?Math.round(hechas.length/total*100):0;
  DATA.progresos[id]=prog;
  return `
  <div class="crumbs"><a onclick="go('inicio')">Inicio</a><span class="sep">›</span><a onclick="go('biblioteca')">Biblioteca</a><span class="sep">›</span><span class="cur">${c.titulo}</span></div>
  <button class="cd-back" onclick="go('biblioteca')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>Volver a la biblioteca</button>
  <div class="cd-hero">
    <div class="cd-hero-img" style="background-image:url('${c.img||''}')"></div>
    <div class="cd-hero-body">
      <div class="cat">${c.categoria||'General'}</div>
      <h2>${c.titulo}</h2>
      <p class="desc">${c.desc||'Capacitación profesional enfocada en arquitectura y construcción. Contenido teórico-práctico con criterios aplicables a obra real.'}</p>
      <div class="cd-hero-meta">
        <span><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:16px;height:16px;display:inline;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m0 16v1m8-9h1M3 12H2m15.364 6.364l.707.707M5.929 5.929l.707.707M18.364 5.636l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg> Nivel: <b>${c.nivel||'Intermedio'}</b></span>
      </div>
      <div class="cd-clases-badge"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>${total} clases</div>
    </div>
  </div>
  <div class="cd-progress"><span class="lbl">Tu progreso</span><div class="bar"><i style="width:${prog}%"></i></div><span class="pct">${prog}%</span></div>
  ${prog>=100?`<div class="cert-banner"><div class="cbi"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></div><div><b>¡Curso completado!</b><p>Descarga tu certificado de finalización con folio y QR verificable.</p></div><button onclick="generarCertificado('${id}')">Descargar certificado</button></div>`:''}
  <div class="cd-list-head"><h3>Lista de clases</h3><span>${hechas.length} de ${total} completadas</span></div>
  ${clases.map((cl,i)=>claseRow(cl,i,true,id,hechas.includes(i))).join('')}`;
}
function claseRow(cl,i,disp,cursoId,hecha){
  const playIcon='<svg fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  const clock='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
  const checkDone='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.6" d="M5 13l4 4L19 7"/></svg>';
  const checkEmpty='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke-width="2"/></svg>';
  const lockIcon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>';
  if(!disp){
    return `<div class="clase lock">
      <div class="cst">${lockIcon}</div>
      <div class="cinfo"><b>${cl.titulo||('Clase '+(i+1))}</b><span class="est">Bloqueada</span>
        <div class="dur">${clock}${cl.duracion||'2 Horas'}</div></div>
    </div>`;
  }
  return `<div class="clase disp ${hecha?'done':''}">
    <button class="cst chk ${hecha?'on':''}" onclick="toggleClaseHecha('${cursoId}',${i})" title="${hecha?'Marcar como pendiente':'Marcar como completada'}">${hecha?checkDone:checkEmpty}</button>
    <div class="cinfo" onclick="playClase('${cursoId}',${i})" style="cursor:pointer"><b>${cl.titulo||('Clase '+(i+1))}</b><span class="est">${hecha?'Completada':'Disponible'}</span>
      <div class="dur">${clock}${cl.duracion||'2 Horas'}</div></div>
    <div class="play" onclick="playClase('${cursoId}',${i})" style="cursor:pointer">${playIcon}</div>
  </div>`;
}
function playClase(cursoId,i){
  const c=DATA.cursos.find(x=>x.id===cursoId); if(!c)return;
  const cl=(c.listaClases||[])[i];
  if(cl&&cl.videoUrl)window.open(cl.videoUrl,'_blank');
  else toast('Reproductor conectado a Google Drive · Clase '+(i+1));
}
function toggleClaseHecha(cursoId,i){
  const c=DATA.cursos.find(x=>x.id===cursoId); if(!c)return;
  const total=(c.listaClases&&c.listaClases.length)||c.clases||0; if(!total)return;
  const set=new Set(DATA.clasesHechas[cursoId]||[]);
  const yaCompleto=set.size>=total;
  if(set.has(i))set.delete(i); else set.add(i);
  const arr=[...set].filter(x=>x<total).sort((a,b)=>a-b);
  DATA.clasesHechas[cursoId]=arr;
  const prog=Math.round(arr.length/total*100);
  DATA.progresos[cursoId]=prog;
  guardarProgreso(cursoId,prog,arr);
  if(_cursoActivo===cursoId)openCurso(cursoId);
  if(arr.length>=total&&!yaCompleto){confetti();setTimeout(()=>toast('¡Felicidades! Completaste el curso 🎉'),250);}
}
function guardarProgreso(cursoId,prog,arr){
  if(!FB_OK||!window.db||!CURRENT_USER||CURRENT_USER.uid==='demo')return;
  db.collection('progreso').doc(CURRENT_USER.uid+'_'+cursoId)
    .set({uid:CURRENT_USER.uid,cursoId,porcentaje:prog,clases:arr},{merge:true}).catch(()=>{});
}
function closeModal(){document.getElementById('modal').classList.remove('open');}

/* ====== CERTIFICADO ====== */
function genFolio(cursoId){
  const s=(CURRENT_USER?.uid||'demo')+'_'+cursoId;let h=0;
  for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;
  return 'IMDAC-'+new Date().getFullYear()+'-'+h.toString(36).toUpperCase().padStart(6,'0').slice(0,6);
}
function buildVerifyURL(data){
  const base=location.href.replace(/[?#].*$/,'').replace(/[^/]*$/,'');
  const d=btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  return base+'verify.html?d='+d;
}
function qrDataURL(text,ok,fail){
  const url='https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data='+encodeURIComponent(text);
  const xhr=new XMLHttpRequest();xhr.open('GET',url);xhr.responseType='blob';
  xhr.onload=()=>{if(xhr.status===200){const fr=new FileReader();fr.onload=()=>ok(fr.result);fr.onerror=fail;fr.readAsDataURL(xhr.response);}else fail();};
  xhr.onerror=fail;xhr.send();
}
function getLogoDataURL(cb){
  try{
    const img=document.querySelector('.sb-brand img')||document.querySelector('#login img');
    if(!img){cb(null);return;}
    const toData=el=>{try{const cv=document.createElement('canvas');cv.width=el.naturalWidth||el.width||300;cv.height=el.naturalHeight||el.height||300;cv.getContext('2d').drawImage(el,0,0);cb(cv.toDataURL('image/png'));}catch(e){cb(null);}};
    if(img.complete&&(img.naturalWidth||0)>0)toData(img);
    else{const i2=new Image();i2.onload=()=>toData(i2);i2.onerror=()=>cb(null);i2.src=img.src;}
  }catch(e){cb(null);}
}
function generarCertificado(cursoId){
  const c=DATA.cursos.find(x=>x.id===cursoId);if(!c)return;
  registrarCertDescargado(cursoId);
  const curso=c.titulo;
  const fecha=new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'});
  const totalCl=c.listaClases?c.listaClases.length:(c.clases||0);
  let horas=0;(c.listaClases||[]).forEach(cl=>{const m=String(cl.duracion||'').match(/[\d.]+/);if(m)horas+=parseFloat(m[0]);});
  const horasTxt=horas?(horas+' horas'):(totalCl?totalCl+' clases':'el programa completo');
  const folio=genFolio(cursoId);
  toast('Generando certificado...');
  const render=(nombre)=>{
    loadJsPDF(()=>{
      const verifyURL=buildVerifyURL({nombre,curso,folio,fecha,horas:horasTxt});
      const fin=(logo,qr)=>buildCertPDF({nombre,curso,fecha,folio,horasTxt,qrImg:qr,logoImg:logo});
      const withLogo=logo=>qrDataURL(verifyURL,qr=>fin(logo,qr),()=>fin(logo,null));
      if(window.IMDAC_LOGO_B64)withLogo(window.IMDAC_LOGO_B64);
      else getLogoDataURL(withLogo);
    });
  };
  // nombre real: Firestore miembros/{uid}.nombre (fuente actualizada) -> displayName -> default
  const fallback=CURRENT_USER?.displayName||'Miembro IMDAC';
  if(FB_OK && window.db && CURRENT_USER?.uid && CURRENT_USER.uid!=='demo'){
    db.collection('miembros').doc(CURRENT_USER.uid).get()
      .then(s=>{const n=(s.exists&&s.data().nombre)?String(s.data().nombre).trim():'';render(n||fallback);})
      .catch(()=>render(fallback));
  }else render(fallback);
}
function buildCertPDF({nombre,curso,fecha,folio,horasTxt,qrImg,logoImg}){
  const {jsPDF}=window.jspdf;const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const W=297,H=210;
  // centrado real con tracking (jsPDF ignora charSpace al centrar -> corre a la izq)
  const trackC=(text,y,gap,xc)=>{const cxp=(xc===undefined)?W/2:xc;const ws=Array.from(text).map(c=>doc.getTextWidth(c));const tot=ws.reduce((a,b)=>a+b,0)+gap*(text.length-1);let x=cxp-tot/2;for(let i=0;i<text.length;i++){doc.text(text[i],x,y);x+=ws[i]+gap;}};
  // paleta IMDAC
  const rojo=[255,44,44],rojoDark=[198,30,30],negro=[13,13,13],gris=[110,110,116],humo=[246,247,249];
  // fuente caligráfica para el nombre
  let nameFont='times',nameStyle='bolditalic';
  if(window.GREATVIBES_B64){try{doc.addFileToVFS('GreatVibes.ttf',window.GREATVIBES_B64);doc.addFont('GreatVibes.ttf','GreatVibes','normal');nameFont='GreatVibes';nameStyle='normal';}catch(e){}}
  // fondo blanco
  doc.setFillColor(255,255,255);doc.rect(0,0,W,H,'F');
  // ===== marca de agua: skyline IMDAC al pie =====
  const base=197, bx0=20, bx1=W-20;
  const edif=[7,12,9,16,11,20,10,14,8,13,9,17,12,9,15,11,8,14,10,16,9,12,8,15,11,9,13,10,16,12,8,14];
  doc.setFillColor(humo[0],humo[1],humo[2]);
  let bx=bx0, bw=(bx1-bx0)/edif.length;
  for(let i=0;i<edif.length;i++){doc.rect(bx, base-edif[i], bw-0.6, edif[i],'F');bx+=bw;}
  // ===== doble marco con esquinas =====
  doc.setDrawColor(negro[0],negro[1],negro[2]);doc.setLineWidth(1.6);doc.roundedRect(8,8,W-16,H-16,3,3,'S');
  doc.setDrawColor(rojo[0],rojo[1],rojo[2]);doc.setLineWidth(0.5);doc.roundedRect(11.5,11.5,W-23,H-23,2,2,'S');
  // cuadritos rojos en esquinas internas
  doc.setFillColor(rojo[0],rojo[1],rojo[2]);const cs=2.4;
  [[11.5,11.5],[W-11.5-cs,11.5],[11.5,H-11.5-cs],[W-11.5-cs,H-11.5-cs]].forEach(p=>doc.rect(p[0],p[1],cs,cs,'F'));
  // ===== logo + bajada institucional =====
  const lw=42,lh=lw/1.473;
  if(logoImg){try{doc.addImage(logoImg,'PNG',W/2-lw/2,15,lw,lh);}catch(e){logoImg=null;}}
  if(!logoImg){doc.setFont('helvetica','bold');doc.setFontSize(24);const tw=doc.getTextWidth('IMDAC');doc.setTextColor(negro[0],negro[1],negro[2]);doc.text('IM',W/2-tw/2,36);doc.setTextColor(rojo[0],rojo[1],rojo[2]);doc.text('DAC',W/2-tw/2+doc.getTextWidth('IM'),36);}
  doc.setFont('helvetica','normal');doc.setFontSize(7.2);doc.setTextColor(gris[0],gris[1],gris[2]);
  trackC('INSTITUTO MEXICANO DE ARQUITECTURA Y CONSTRUCCIÓN',50,0.9);
  // ===== título =====
  doc.setFont('helvetica','bold');doc.setFontSize(26);doc.setTextColor(negro[0],negro[1],negro[2]);
  trackC('CERTIFICADO DE FINALIZACIÓN',63,1.2);
  // subrayado rojo con remates
  doc.setDrawColor(rojo[0],rojo[1],rojo[2]);doc.setLineWidth(1.4);doc.line(W/2-30,68,W/2+30,68);
  doc.setFillColor(rojo[0],rojo[1],rojo[2]);doc.rect(W/2-31.4,67.3,1.4,1.4,'F');doc.rect(W/2+30,67.3,1.4,1.4,'F');
  // se certifica que
  doc.setFont('helvetica','bold');doc.setFontSize(8.6);doc.setTextColor(rojo[0],rojo[1],rojo[2]);
  trackC('SE CERTIFICA QUE',79,2.2);
  // nombre
  let fsz=nameFont==='GreatVibes'?50:34;
  doc.setFont(nameFont,nameStyle);doc.setFontSize(fsz);
  const maxw=W-94;let nwid=doc.getTextWidth(nombre);
  if(nwid>maxw){fsz=fsz*maxw/nwid;doc.setFontSize(fsz);}
  doc.setTextColor(negro[0],negro[1],negro[2]);
  doc.text(nombre,W/2,99,{align:'center'});
  // divisor con rombo central
  doc.setDrawColor(200,200,206);doc.setLineWidth(0.4);
  doc.line(70,107,W/2-9,107);doc.line(W/2+9,107,W-70,107);
  doc.setFillColor(rojo[0],rojo[1],rojo[2]);
  doc.triangle(W/2-4,107,W/2,104,W/2+4,107,'F');doc.triangle(W/2-4,107,W/2,110,W/2+4,107,'F');
  // párrafo
  doc.setFont('helvetica','normal');doc.setFontSize(11.5);doc.setTextColor(66,66,72);
  const para=`completó satisfactoriamente el curso "${curso}", cubriendo un total de ${horasTxt} de formación profesional en arquitectura y construcción impartida por IMDAC.`;
  doc.text(doc.splitTextToSize(para,184),W/2,117,{align:'center',lineHeightFactor:1.5});
  // ===== QR de verificación (centro) =====
  const cx=W/2, qs=24, qx=cx-qs/2, qy=138;
  const fx0=qx-2.5, fy0=qy-2.5, fx1=qx+qs+2.5, fy1=qy+qs+2.5;
  // recuadro blanco + marco negro (tapa la marca de agua)
  doc.setFillColor(255,255,255);doc.rect(fx0,fy0,qs+5,qs+5,'F');
  doc.setDrawColor(negro[0],negro[1],negro[2]);doc.setLineWidth(0.5);doc.rect(fx0,fy0,qs+5,qs+5,'S');
  // QR
  if(qrImg){try{doc.addImage(qrImg,'PNG',qx,qy,qs,qs);}catch(e){doc.setFontSize(6);doc.setTextColor(gris[0],gris[1],gris[2]);doc.text('QR',cx,qy+qs/2,{align:'center'});}}
  // ===== firmas =====
  const sy=164;
  const drawFirma=(b64,arf,cxs)=>{if(!b64||!arf)return;const boxW=56,boxH=24;let w=boxW,h=boxW/arf;if(h>boxH){h=boxH;w=boxH*arf;}try{doc.addImage(b64,'PNG',cxs-w/2,sy-2-h,w,h);}catch(e){}};
  drawFirma(window.FIRMA1_B64,window.FIRMA1_AR,71);
  drawFirma(window.FIRMA2_B64,window.FIRMA2_AR,W-71);
  doc.setDrawColor(negro[0],negro[1],negro[2]);doc.setLineWidth(0.4);
  doc.line(42,sy,100,sy);doc.line(W-100,sy,W-42,sy);
  doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(negro[0],negro[1],negro[2]);
  doc.text('Katya Arredondo Martínez',71,sy+5,{align:'center'});
  doc.text('Coordinación de Certificación',W-71,sy+5,{align:'center'});
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(gris[0],gris[1],gris[2]);
  doc.text('Dirección Académica · IMDAC',71,sy+9.5,{align:'center'});
  doc.text('IPCI Latinoamericano',W-71,sy+9.5,{align:'center'});
  // ===== folio + fecha =====
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(90,90,96);
  doc.text('ID del certificado: '+folio,W/2,182,{align:'center'});
  doc.text('Fecha de emisión: '+fecha,W/2,188,{align:'center'});
  doc.save('certificado-imdac-'+folio+'.pdf');
  toast('Certificado generado');
}

/* ====== 8. COUNTDOWN ====== */
let cdTimer=null;
function startCountdown(){
  if(cdTimer)clearInterval(cdTimer);
  const w=DATA.webinars[0];
  const target=w&&w.fechaISO?new Date(w.fechaISO).getTime():0;
  function tick(){
    const el=document.getElementById('countdown'); if(!el)return clearInterval(cdTimer);
    let diff=target-Date.now();
    if(!target||diff<0)diff=0;
    const d=Math.floor(diff/86400000),h=Math.floor(diff%86400000/3600000),m=Math.floor(diff%3600000/60000),s=Math.floor(diff%60000/1000);
    const set=(k,v)=>{const n=el.querySelector(`[data-cd="${k}"]`);if(n)n.textContent=String(v).padStart(2,'0');};
    set('d',d);set('h',h);set('m',m);set('s',s);
  }
  tick();cdTimer=setInterval(tick,1000);
}

/* ====== PRO: skeletons / empty / confetti / ⌘K ====== */
function skelGrid(n){return `<div class="course-grid">${Array.from({length:n},()=>`<div class="skel-card"><div class="skel" style="aspect-ratio:16/10"></div><div style="padding:16px"><div class="skel skel-line" style="width:80%"></div><div class="skel skel-line" style="width:50%"></div><div class="skel skel-line" style="width:100%;margin-top:14px"></div></div></div>`).join('')}</div>`;}
function skelNews(n){return Array.from({length:n},()=>`<div class="skel-card" style="display:flex;gap:14px;padding:14px;margin-bottom:12px"><div class="skel" style="width:120px;height:80px;border-radius:10px;flex-shrink:0"></div><div style="flex:1"><div class="skel skel-line" style="width:30%"></div><div class="skel skel-line" style="width:85%"></div><div class="skel skel-line" style="width:60%"></div></div></div>`).join('');}
function skelInicio(){
  return `<div class="skel" style="height:96px;border-radius:16px;margin-bottom:22px"></div>
  <div class="inicio-grid"><div>
    <div class="skel" style="height:150px;border-radius:16px;margin-bottom:22px"></div>
    <div class="stats-row">${Array.from({length:3},()=>'<div class="skel" style="height:90px;border-radius:16px"></div>').join('')}</div>
    <div class="skel skel-line" style="width:200px;height:20px;margin:8px 0 16px"></div>
    ${skelGrid(2)}
  </div><aside class="news-side"><div class="skel" style="height:300px;border-radius:16px"></div></aside></div>`;
}
function emptyIllus(title,desc,actionLabel,actionFn){
  const illus=`<svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="40" y="55" width="120" height="80" rx="10" fill="var(--gris-100)"/><path d="M40 70l60 38 60-38" stroke="var(--gris-300)" stroke-width="3" fill="none"/><rect x="64" y="30" width="72" height="48" rx="8" fill="var(--surface)" stroke="var(--rojo)" stroke-width="3"/><circle cx="100" cy="50" r="9" fill="var(--rojo)" opacity=".25"/><path d="M100 45v8m0 4h.01" stroke="var(--rojo)" stroke-width="3" stroke-linecap="round"/></svg>`;
  return `<div class="card"><div class="empty-illus">${illus}<b>${title}</b><span>${desc}</span>${actionLabel?`<br><button class="ea" onclick="${actionFn}">${actionLabel}</button>`:''}</div></div>`;
}
function confetti(){
  let cv=document.getElementById('confetti-canvas');
  if(!cv){cv=document.createElement('canvas');cv.id='confetti-canvas';document.body.appendChild(cv);}
  cv.width=innerWidth;cv.height=innerHeight;const ctx=cv.getContext('2d');
  const cols=['#FF2C2C','#0d0d0d','#ff7a7a','#ffd5d5','#888'];
  const P=Array.from({length:140},()=>({x:innerWidth/2,y:innerHeight/3,vx:(Math.random()-.5)*14,vy:Math.random()*-15-4,r:Math.random()*6+3,c:cols[Math.random()*cols.length|0],a:1,rot:Math.random()*6}));
  let t=0;
  (function run(){ctx.clearRect(0,0,cv.width,cv.height);t++;let alive=false;
    P.forEach(p=>{p.vy+=.45;p.x+=p.vx;p.y+=p.vy;p.rot+=.2;p.a-=.012;if(p.a>0){alive=true;ctx.save();ctx.globalAlpha=Math.max(0,p.a);ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.c;ctx.fillRect(-p.r,-p.r,p.r*2,p.r*1.4);ctx.restore();}});
    if(alive&&t<160)requestAnimationFrame(run);else ctx.clearRect(0,0,cv.width,cv.height);
  })();
}
let _cmdkItems=[],_cmdkSel=0;
function openCmdK(){document.getElementById('cmdk-bg').classList.add('open');const i=document.getElementById('cmdk-input');i.value='';cmdkSearch('');setTimeout(()=>i.focus(),50);}
function closeCmdK(){document.getElementById('cmdk-bg').classList.remove('open');}
function cmdkSearch(q){
  q=q.toLowerCase().trim();const res=[];
  NAV.forEach(g=>g.items.forEach(it=>{if(it.label.toLowerCase().includes(q))res.push({t:it.label,s:'Sección',ic:'M4 6h16M4 12h16M4 18h16',fn:`go('${it.id}');closeCmdK()`});}));
  DATA.cursos.filter(c=>c.titulo.toLowerCase().includes(q)).slice(0,5).forEach(c=>res.push({t:c.titulo,s:'Curso · '+(c.categoria||''),ic:'M12 6.253v13',fn:`closeCmdK();openCurso('${c.id}')`}));
  DATA.material.filter(m=>m.titulo.toLowerCase().includes(q)).slice(0,4).forEach(m=>res.push({t:m.titulo,s:'Material PDF',ic:'M9 12h6m-6 4h6',fn:`go('material');closeCmdK()`}));
  DATA.noticias.filter(n=>n.titulo.toLowerCase().includes(q)).slice(0,4).forEach(n=>res.push({t:n.titulo,s:'Noticia',ic:'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1',fn:`go('noticias');closeCmdK()`}));
  _cmdkItems=res;_cmdkSel=0;
  const box=document.getElementById('cmdk-results');
  box.innerHTML=res.length?res.map((r,i)=>`<div class="cmdk-item ${i===0?'sel':''}" onclick="${r.fn}"><div class="ci"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${r.ic}"/></svg></div><div><div class="ct">${r.t}</div><div class="cs">${r.s}</div></div></div>`).join(''):'<div class="cmdk-empty">Sin resultados</div>';
}
function cmdkKey(e){
  if(e.key==='ArrowDown'){e.preventDefault();_cmdkSel=Math.min(_cmdkSel+1,_cmdkItems.length-1);cmdkHighlight();}
  else if(e.key==='ArrowUp'){e.preventDefault();_cmdkSel=Math.max(_cmdkSel-1,0);cmdkHighlight();}
  else if(e.key==='Enter'){const it=_cmdkItems[_cmdkSel];if(it){closeCmdK();eval(it.fn);}}
}
function cmdkHighlight(){document.querySelectorAll('.cmdk-item').forEach((el,i)=>el.classList.toggle('sel',i===_cmdkSel));}

/* ====== 9. AUTH ====== */
function switchTab(t){
  document.getElementById('tab-login').classList.toggle('active',t==='login');
  document.getElementById('tab-register').classList.toggle('active',t==='register');
  document.getElementById('pane-login').style.display=t==='login'?'block':'none';
  document.getElementById('pane-register').style.display=t==='register'?'block':'none';
  hideErr();
}
function showErr(m){const e=document.getElementById('auth-err');e.textContent=m;e.style.display='block';}
function hideErr(){document.getElementById('auth-err').style.display='none';}
const authMsg=c=>({'auth/invalid-email':'Correo inválido','auth/user-not-found':'Usuario no encontrado','auth/wrong-password':'Contraseña incorrecta','auth/email-already-in-use':'Este correo ya está registrado','auth/weak-password':'La contraseña debe tener al menos 6 caracteres','auth/invalid-credential':'Credenciales inválidas'}[c]||'Ocurrió un error. Intenta de nuevo.');

function doLogin(){
  hideErr();const email=val('li-email'),pass=val('li-pass');
  if(!email||!pass)return showErr('Completa todos los campos.');
  if(!FB_OK)return demoLogin(email);
  auth.signInWithEmailAndPassword(email,pass).catch(e=>showErr(authMsg(e.code)));
}
function doRegister(){
  hideErr();const name=val('rg-name'),email=val('rg-email'),pass=val('rg-pass');
  if(!name||!email||!pass)return showErr('Completa todos los campos.');
  if(!document.getElementById('rg-terms').checked)return showErr('Debes aceptar los Términos y la Política de Privacidad.');
  if(!FB_OK)return demoLogin(email,name);
  auth.createUserWithEmailAndPassword(email,pass).then(cred=>{
    cred.user.updateProfile({displayName:name});
    db.collection('miembros').doc(cred.user.uid).set({nombre:name,email,creado:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
  }).catch(e=>showErr(authMsg(e.code)));
}
function doGoogle(){
  hideErr();
  if(!FB_OK)return demoLogin('miembro@imdac.mx','Miembro IMDAC');
  const provider=new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).then(res=>{
    if(res&&res.user&&res.additionalUserInfo&&res.additionalUserInfo.isNewUser){
      db.collection('miembros').doc(res.user.uid).set({nombre:res.user.displayName||'',email:res.user.email||'',creado:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}).catch(()=>{});
    }
  }).catch(e=>{ if(e.code!=='auth/popup-closed-by-user')showErr(authMsg(e.code)); });
}
function doReset(){
  const email=val('li-email');
  if(!email)return showErr('Escribe tu correo para enviarte el enlace de recuperación.');
  if(!FB_OK)return toast('(Demo) Enlace de recuperación enviado a '+email);
  auth.sendPasswordResetEmail(email).then(()=>toast('Enlace enviado a '+email+' — revisa tu bandeja y spam')).catch(e=>showErr(authMsg(e.code)));
}
function doLogout(){
  document.getElementById('maint-overlay')?.remove();
  if(FB_OK)auth.signOut();
  else{CURRENT_USER=null;document.body.classList.remove('logged');document.getElementById('login').classList.remove('hidden');}
}
function demoLogin(email,name){
  CURRENT_USER={email,displayName:name||email.split('@')[0],uid:'demo',metadata:{creationTime:new Date().toISOString()}};
  onLogged();
}

/* ====== 10. CARGA DE DATOS ====== */
// --- Noticias automáticas del sector (NewsData.io) ---
const NEWSDATA_API_KEY='pub_fae0d8c9c54f40f59f1b5a5f9bced05e';
const NEWSDATA_CACHE_KEY='imdac_news_cache_v1';
const NEWSDATA_CACHE_HORAS=6;
const NEWS_WHITE=['arquitect','construcc','constructor','obra civil','obra públic','obra public',' obra ','edific','ingenier','urban','concreto','cemento','acero estructural','estructur','vivienda','inmobili','infraestructura',' bim','autocad',' cad','remodelac','demolic','cimentac','albañil','albanil','plano','licitac','contratista','rascaciel','puente','carreter','sustentab','sostenib','catastro','reglamento de construc','perito','desarrollo urbano','proyecto ejecutivo','metros cuadrados','material de construc','acabados','prefabricad','cimbra','varilla','sismorresist','antisísmic','antisismic'];
const NEWS_BLACK=['futbol','fútbol','liga mx',' nba',' nfl','champions','elecciones','candidat','narco','homicid','feminicid','covid','vacuna','iglesia','vaticano','papa francisco','horóscopo','horoscopo','farándula','farandula','realeza'];
function newsRelevante(n){
  const t=((n.titulo||'')+' '+(n.resumen||'')).toLowerCase();
  if(NEWS_WHITE.some(w=>t.indexOf(w)!==-1))return true;
  if(NEWS_BLACK.some(w=>t.indexOf(w)!==-1))return false;
  return true;
}
function fetchAutoNews(){
  return new Promise(resolve=>{
    if(!NEWSDATA_API_KEY||NEWSDATA_API_KEY.indexOf('REEMPLAZAR')!==-1){resolve([]);return;}
    try{
      const raw=localStorage.getItem(NEWSDATA_CACHE_KEY);
      if(raw){const c=JSON.parse(raw);const h=(Date.now()-c.timestamp)/3600000;if(h<NEWSDATA_CACHE_HORAS&&c.noticias&&c.noticias.length){resolve(c.noticias);return;}}
    }catch(e){}
    const query=encodeURIComponent('arquitectura OR construcción OR obra civil OR ingeniería');
    const url='https://newsdata.io/api/1/news?apikey='+NEWSDATA_API_KEY+'&q='+query+'&language=es';
    fetch(url).then(r=>r.json()).then(data=>{
      if(!data||!Array.isArray(data.results)){resolve([]);return;}
      const vistos={};
      const noticias=data.results.map(n=>({
        titulo:n.title||'', resumen:n.description||n.content||'',
        fuente:n.source_id||n.source_name||'NewsData',
        img:n.image_url||'', url:n.link||'',
        fecha:n.pubDate?new Date(n.pubDate).toLocaleDateString('es-MX'):'',
        _fechaISO:n.pubDate||'', _auto:true
      })).filter(newsRelevante).filter(n=>n.img).filter(n=>{
        const k=(n.titulo||'').toLowerCase().replace(/\s+/g,' ').trim();
        if(!k||vistos[k])return false; vistos[k]=true; return true;
      }).slice(0,25);
      try{localStorage.setItem(NEWSDATA_CACHE_KEY,JSON.stringify({timestamp:Date.now(),noticias}));}catch(e){}
      resolve(noticias);
    }).catch(()=>{
      try{const raw=localStorage.getItem(NEWSDATA_CACHE_KEY);if(raw){const c=JSON.parse(raw);resolve(c.noticias||[]);}else resolve([]);}catch(e){resolve([]);}
    });
  });
}
function cargarNoticiasAuto(){
  fetchAutoNews().then(autos=>{
    if(!autos||!autos.length)return;
    const manuales=(DATA.noticias||[]).filter(n=>!n._auto);
    const vistos={}; const todas=[];
    manuales.forEach(n=>{const k=(n.titulo||'').toLowerCase().replace(/\s+/g,' ').trim();if(k)vistos[k]=true;todas.push(n);});
    autos.forEach(n=>{const k=(n.titulo||'').toLowerCase().replace(/\s+/g,' ').trim();if(!k||vistos[k])return;vistos[k]=true;todas.push(n);});
    DATA.noticias=todas;
    if(currentSection==='inicio'||currentSection==='noticias')renderSection(currentSection);
  }).catch(()=>{});
}
/* ====== STRIPE (candado de membresía) ======
   Pega aquí la URL de Railway cuando el webhook esté desplegado.
   Mientras diga REEMPLAZAR, el candado está APAGADO (acceso libre). */
const WEBHOOK_URL='https://imdac-club-webhook-production.up.railway.app'; // candado ENCENDIDO
const CANDADO_ON=()=>WEBHOOK_URL.indexOf('REEMPLAZAR')===-1;
window._miMiembro={};
function _tieneAcceso(){
  if(window._imdacAdmin)return true;
  const m=window._miMiembro||{};
  if((m.estado||'')==='Activo')return true;
  if(m.vigenciaHasta){const v=new Date(m.vigenciaHasta+'T23:59:59');if(v>=new Date())return true;}
  return false;
}
async function loadData(){
  // Modo real: arranca vacío y solo se llena con Firestore. El demo aplica únicamente sin sesión real.
  DATA.cursos=[]; DATA.webinars=[]; DATA.noticias=[];
  DATA.foro=[]; DATA.material=[]; DATA.progresos={}; DATA.clasesHechas={};
  if(!FB_OK||!CURRENT_USER||CURRENT_USER.uid==='demo'){
    DATA.cursos=DEMO.cursos; DATA.webinars=DEMO.webinars; DATA.noticias=DEMO.noticias;
    DATA.foro=DEMO.foro; DATA.material=DEMO.material; DATA.progresos=DEMO.progresos;
    await sleep(650);LOADING=false;return;
  }
  try{
    const [cur,web,not,mat,foro]=await Promise.all([
      db.collection('cursos').get(), db.collection('webinars').get(),
      db.collection('noticias').orderBy('fecha','desc').limit(20).get(),
      db.collection('material').get(), db.collection('foro_temas').orderBy('fecha','desc').limit(30).get()
    ]);
    DATA.cursos=cur.docs.map(d=>({id:d.id,...d.data()}));
    DATA.webinars=web.docs.map(d=>({id:d.id,...d.data()}));
    DATA.noticias=not.docs.map(d=>({id:d.id,...d.data()})).filter(n=>n.img);
    DATA.material=mat.docs.map(d=>({id:d.id,...d.data()}));
    DATA.foro=foro.docs.map(d=>({id:d.id,...d.data()}));
    try{const pre=await db.collection('precios').get();DATA.precios=pre.docs.map(d=>({id:d.id,...d.data()}));}catch(e){DATA.precios=[];}
    // progreso del usuario
    const prog=await db.collection('progreso').where('uid','==',CURRENT_USER.uid).get();
    DATA.progresos={}; DATA.clasesHechas={}; prog.forEach(d=>{const x=d.data();DATA.progresos[x.cursoId]=x.porcentaje||0; if(Array.isArray(x.clases))DATA.clasesHechas[x.cursoId]=x.clases;});
    // ¿es admin? (para saltar drip)
    const adm=await db.collection('admins').doc(CURRENT_USER.uid).get();
    window._imdacAdmin=adm.exists;
    // estado de membresía del socio (Stripe / regalos)
    try{const mi=await db.collection('miembros').doc(CURRENT_USER.uid).get();window._miMiembro=mi.exists?mi.data():{};}catch(e){window._miMiembro={};}
    // configuración global (sincronizada con el Admin)
    const cfg=await db.collection('config').doc('app').get();
    if(cfg.exists){const cd=cfg.data();
      if(Array.isArray(cd.categorias)&&cd.categorias.length)CATS=['Todos',...cd.categorias];
      if(cd.precio)IMDAC.precio=cd.precio;
      if(cd.cupon)IMDAC.cupon=cd.cupon;
      if(cd.canal)IMDAC.canalWA=cd.canal;
      if(cd.wa1){IMDAC.soporte.l1=waDigits(cd.wa1);IMDAC.soporte.l1Label=cd.wa1;IMDAC.whatsapp=waDigits(cd.wa1);}
      if(cd.wa2){IMDAC.soporte.l2=waDigits(cd.wa2);IMDAC.soporte.l2Label=cd.wa2;}
      window._mantenimiento=!!cd.mantenimiento;
    }
  }catch(e){console.warn('Firestore:',e.message);}
  LOADING=false;
}

/* ====== 11. UI helpers ====== */
function initials(){const n=CURRENT_USER?.displayName||CURRENT_USER?.email||'U';return n.trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();}
function refreshUserUI(){
  document.getElementById('u-name').textContent=CURRENT_USER?.displayName||'Miembro';
  document.getElementById('u-email').textContent=CURRENT_USER?.email||'';
  document.getElementById('u-av').textContent=initials();
}
function toggleSidebar(open){
  const sb=document.getElementById('sidebar'),bd=document.getElementById('sb-backdrop');
  if(open===undefined)open=!sb.classList.contains('open');
  sb.classList.toggle('open',open);bd.classList.toggle('open',open);
}
function toggleTheme(){
  const cur=document.documentElement.dataset.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=cur;
  try{localStorage.setItem('imdac-theme',cur);}catch(e){}
  updateThemeIcon();
}
function updateThemeIcon(){
  const btn=document.getElementById('theme-btn'); if(!btn)return;
  const dark=document.documentElement.dataset.theme==='dark';
  const sun='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>';
  const moon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>';
  btn.innerHTML=dark?sun:moon;
  btn.title=dark?'Modo claro':'Modo oscuro';
}
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2600);}
function loadJsPDF(cb){
  if(window.jspdf)return cb();
  const s=document.createElement('script');s.src='https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js';s.onload=cb;document.head.appendChild(s);
}

/* ====== 12. ARRANQUE ====== */
async function onLogged(){
  document.body.classList.add('logged');
  document.getElementById('login').classList.add('hidden');
  renderSidebar();refreshUserUI();updateThemeIcon();
  LOADING=true; go('inicio');
  await loadData();
  if(window._mantenimiento && !window._imdacAdmin){renderMantenimiento();return;}
  if(CANDADO_ON() && !_tieneAcceso()){
    const q=new URLSearchParams(location.search);
    if(q.get('pago')==='ok'){
      // el webhook puede tardar unos segundos en activar: reintenta
      toast('Pago recibido, activando tu membresía…');
      let intentos=0;
      const re=setInterval(async()=>{
        intentos++;
        try{const mi=await db.collection('miembros').doc(CURRENT_USER.uid).get();window._miMiembro=mi.exists?mi.data():{};}catch(e){}
        if(_tieneAcceso()){clearInterval(re);history.replaceState(null,'',location.pathname);go('inicio');cargarNoticiasAuto();escucharNotis();registrarVisita();toast('¡Membresía activa, bienvenido!');}
        else if(intentos>=10){clearInterval(re);renderPaywall();toast('Tu pago está en proceso, recarga en un momento');}
      },2000);
      return;
    }
    renderPaywall();return;
  }
  const q=new URLSearchParams(location.search);
  if(q.get('pago')==='ok'){history.replaceState(null,'',location.pathname);toast('¡Pago confirmado, gracias!');}
  go('inicio');
  cargarNoticiasAuto();
  escucharNotis();
  registrarVisita();
}
/* ====== PAYWALL (activa tu membresía) ====== */
let _planes=null;
function renderPaywall(){
  document.getElementById('content').innerHTML=`<div class="section active" style="max-width:860px;margin:0 auto">
    <div style="text-align:center;margin:30px 0 26px">
      <h1 class="page-h">Activa tu membresía</h1>
      <p class="page-sub">Elige tu plan y desbloquea todo el contenido del Club IMDAC.</p>
    </div>
    <div class="plan-grid">
      <div class="plan-card">
        <div class="plan-name">Mensual</div>
        <div class="plan-price" id="pp-mensual">$—</div>
        <div class="plan-per">MXN / mes</div>
        <ul class="plan-feats"><li>10 cursos con certificado</li><li>Webinars en vivo</li><li>Material PDF y herramientas</li><li>Foro y canal privado</li><li>20% de descuento adicional</li></ul>
        <button class="btn-primary" onclick="irAPagar('mensual')">Elegir Mensual</button>
        <div class="plan-note">Cancela cuando quieras</div>
      </div>
      <div class="plan-card destacado">
        <div class="plan-tag">Mejor precio</div>
        <div class="plan-name">Anual</div>
        <div class="plan-price" id="pp-anual">$—</div>
        <div class="plan-per">MXN / año</div>
        <ul class="plan-feats"><li>Todo lo del plan mensual</li><li>Un solo pago al año</li><li>Ahorra vs plan mensual</li></ul>
        <button class="btn-primary" onclick="irAPagar('anual')">Elegir Anual</button>
        <div class="plan-note">12 meses de acceso</div>
      </div>
    </div>
    <div style="text-align:center;margin-top:24px;color:var(--muted);font-size:.9rem">
      ¿Ya pagaste? <a href="#" style="color:var(--rojo);font-weight:700" onclick="location.reload();return false">Recarga aquí</a> ·
      ¿Dudas? <a style="color:var(--rojo);font-weight:700" href="https://wa.me/${IMDAC.whatsapp}?text=Hola%2C%20tengo%20dudas%20para%20activar%20mi%20membres%C3%ADa%20IMDAC" target="_blank">Escríbenos por WhatsApp</a><br>
      <a href="#" style="color:var(--muted);font-size:.85rem" onclick="doLogout();return false">Cerrar sesión</a>
    </div>
  </div>`;
  cargarPlanes();
}
function cargarPlanes(){
  if(_planes){pintarPlanes();return;}
  fetch(WEBHOOK_URL+'/planes').then(r=>r.json()).then(p=>{_planes=p;pintarPlanes();}).catch(()=>{});
}
function pintarPlanes(){
  if(!_planes)return;
  const f=n=>'$'+Number(n).toLocaleString('es-MX');
  const m=document.getElementById('pp-mensual'); if(m&&_planes.mensual)m.textContent=f(_planes.mensual.monto);
  const a=document.getElementById('pp-anual'); if(a&&_planes.anual)a.textContent=f(_planes.anual.monto);
}
/* Llave PUBLICABLE de Stripe (pk_test_...). Con placeholder → fallback a redirect */
const STRIPE_PK='pk_test_51TMAcSA7If2CqXs95MzeJgFKo6uOwe9VsycHRUcsVRWoy6LjdCcR3gHR8B58a3rEv3PIdH6mNUdClHOyujK6jJ5t00afIrW22P';
let _stripeJS=null,_checkoutObj=null;
function loadStripeJS(cb){
  if(window.Stripe){cb();return;}
  const s=document.createElement('script');s.src='https://js.stripe.com/v3';s.onload=cb;s.onerror=()=>cb('err');document.head.appendChild(s);
}
function irAPagar(plan){
  if(!CURRENT_USER||!FB_OK)return toast('Inicia sesión para continuar');
  if(STRIPE_PK.indexOf('REEMPLAZAR')!==-1){console.warn('[pago] sin PK → redirect');return irAPagarRedirect(plan);}
  toast('Preparando pago seguro…');
  loadStripeJS(err=>{
    if(err){console.warn('[pago] no cargó js.stripe.com (¿bloqueador de anuncios?) → redirect');return irAPagarRedirect(plan);}
    fetch(WEBHOOK_URL+'/crear-checkout',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({uid:CURRENT_USER.uid,email:CURRENT_USER.email,plan,embedded:true})})
      .then(r=>r.json()).then(async d=>{
        if(!d.clientSecret){console.warn('[pago] el webhook no regresó clientSecret → redirect',d);return irAPagarRedirect(plan);}
        if(!_stripeJS)_stripeJS=Stripe(STRIPE_PK);
        abrirModalPago();
        try{
          _checkoutObj=await _stripeJS.initEmbeddedCheckout({clientSecret:d.clientSecret,onComplete:pagoCompletado});
          _checkoutObj.mount('#stripe-box');
          console.log('[pago] modal embebido montado ✓');
        }catch(e){console.error('[pago] falló el modal → redirect:',e.message||e);cerrarModalPago();irAPagarRedirect(plan);}
      }).catch(e=>{console.error('[pago] error pidiendo checkout → redirect:',e.message||e);irAPagarRedirect(plan);});
  });
}
function irAPagarRedirect(plan){
  fetch(WEBHOOK_URL+'/crear-checkout',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({uid:CURRENT_USER.uid,email:CURRENT_USER.email,plan})})
    .then(r=>r.json()).then(d=>{if(d.url)location.href=d.url;else toast('No se pudo abrir el pago');})
    .catch(()=>toast('No se pudo abrir el pago, intenta de nuevo'));
}
function abrirModalPago(){
  let m=document.getElementById('pago-modal');
  if(!m){m=document.createElement('div');m.id='pago-modal';m.className='pago-modal';document.body.appendChild(m);}
  m.innerHTML=`<div class="pago-box"><button class="pago-x" onclick="cerrarModalPago()">✕</button><div id="stripe-box"><div style="padding:60px;text-align:center;color:var(--muted)">Cargando pago seguro…</div></div></div>`;
  m.style.display='flex';
}
function cerrarModalPago(){
  const m=document.getElementById('pago-modal'); if(m)m.style.display='none';
  if(_checkoutObj){try{_checkoutObj.destroy();}catch(e){} _checkoutObj=null;}
}
function pagoCompletado(){
  cerrarModalPago();
  toast('Pago recibido, activando tu membresía…');
  let intentos=0;
  const re=setInterval(async()=>{
    intentos++;
    try{const mi=await db.collection('miembros').doc(CURRENT_USER.uid).get();window._miMiembro=mi.exists?mi.data():{};}catch(e){}
    if(_tieneAcceso()){clearInterval(re);go('inicio');cargarNoticiasAuto();escucharNotis();registrarVisita();toast('¡Membresía activa, bienvenido!');}
    else if(intentos>=10){clearInterval(re);toast('Tu pago está en proceso, recarga en un momento');}
  },2000);
}
function abrirPortal(){
  if(!CANDADO_ON())return toast('Gestión de pago vía Stripe (pendiente activar)');
  toast('Abriendo portal de pagos…');
  fetch(WEBHOOK_URL+'/portal',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({uid:CURRENT_USER.uid})})
    .then(r=>r.json()).then(d=>{if(d.url)location.href=d.url;else toast('Aún no tienes una suscripción de pago');})
    .catch(()=>toast('No se pudo abrir el portal'));
}
function renderMantenimiento(){
  if(document.getElementById('maint-overlay'))return;
  const ov=document.createElement('div');
  ov.id='maint-overlay';
  ov.style.cssText='position:fixed;inset:0;z-index:5500;background:var(--negro);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px;gap:8px';
  ov.innerHTML=`
    <img src="assets/logo-imdac.png" style="width:80px;height:80px;border-radius:18px;background:#fff;padding:5px;margin-bottom:10px">
    <h1 style="font-family:var(--font-display);font-size:1.8rem">Estamos en mantenimiento 🛠️</h1>
    <p style="color:#b5b5bd;max-width:420px;line-height:1.6">Estamos actualizando el Club IMDAC para mejorar tu experiencia. Vuelve en un momento, ¡no tardamos!</p>
    <button onclick="doLogout()" style="margin-top:18px;background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.18);padding:12px 24px;border-radius:11px;font-weight:600;cursor:pointer">Cerrar sesión</button>`;
  document.body.appendChild(ov);
}
function bootDone(){document.getElementById('boot').classList.add('hide');}

window.addEventListener('DOMContentLoaded',()=>{
  // tema guardado
  try{const t=localStorage.getItem('imdac-theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}
  // PWA: service worker + prompt de instalación
  if('serviceWorker' in navigator){try{navigator.serviceWorker.register('sw.js').catch(()=>{});}catch(e){}}
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();_deferredPrompt=e;});
  // Command palette ⌘K / Ctrl+K
  document.addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(document.body.classList.contains('logged')){document.getElementById('cmdk-bg').classList.contains('open')?closeCmdK():openCmdK();}}
    else if(e.key==='Escape')closeCmdK();
  });
  if(FB_OK){
    // Regreso del login con Google (redirect): crear miembro si es nuevo
    auth.getRedirectResult().then(res=>{
      if(res&&res.user&&res.additionalUserInfo&&res.additionalUserInfo.isNewUser){
        db.collection('miembros').doc(res.user.uid).set({nombre:res.user.displayName||'',email:res.user.email||'',creado:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}).catch(()=>{});
      }
    }).catch(e=>showErr(authMsg(e.code)));
    auth.onAuthStateChanged(u=>{
      bootDone();
      if(u){CURRENT_USER=u;onLogged();}
      else{document.body.classList.remove('logged');document.getElementById('login').classList.remove('hidden');}
    });
  }else{
    // Modo demo (Firebase aún sin credenciales reales)
    bootDone();document.getElementById('login').classList.remove('hidden');
  }
});

/* ====== 13. DATOS DEMO (borrar cuando Firestore tenga contenido real) ====== */
const DEMO={
  cursos:[
    {id:'c1',titulo:'Diseño Estructural de Concreto Reforzado',categoria:'Estructuras',nivel:'Intermedio',clases:8,dripDias:0,desc:'Fundamentos del diseño de elementos de concreto según NTC.',img:'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=70'},
    {id:'c2',titulo:'Presupuestos y Precios Unitarios de Obra',categoria:'Costos y Presupuestos',nivel:'Básico',clases:6,dripDias:0,desc:'Aprende a integrar precios unitarios y presupuestar obra.',img:'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=70'},
    {id:'c3',titulo:'AutoCAD para Planos Arquitectónicos',categoria:'Diseño CAD',nivel:'Básico',clases:10,dripDias:8,desc:'Domina AutoCAD para dibujo arquitectónico profesional.',img:'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600&q=70'},
    {id:'c4',titulo:'Instalaciones Hidrosanitarias',categoria:'Instalaciones',nivel:'Intermedio',clases:7,dripDias:21,desc:'Diseño de redes hidráulicas y sanitarias en edificaciones.',img:'https://images.unsplash.com/photo-1607400201889-565b1ee75f8e?w=600&q=70'},
    {id:'c5',titulo:'Topografía Aplicada a la Construcción',categoria:'Topografía',nivel:'Intermedio',clases:9,dripDias:34,desc:'Levantamientos, nivelación y trazo de obra.',img:'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&q=70'},
    {id:'c6',titulo:'Construcción Sustentable y Certificación LEED',categoria:'Sustentabilidad',nivel:'Avanzado',clases:8,dripDias:47,desc:'Criterios de edificación sustentable y certificación.',img:'https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=600&q=70'},
  ],
  webinars:[],
  noticias:[
    {titulo:'Nuevas Normas Técnicas Complementarias entran en vigor',fuente:'CMIC',resumen:'Actualización de los requisitos de diseño estructural para edificaciones en zonas sísmicas.',fecha:'30/5/2026',img:'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=70',url:'#'},
    {titulo:'El sector construcción crece en el primer trimestre de 2026',fuente:'INEGI',resumen:'La industria de la construcción registró un repunte impulsado por obra pública e infraestructura.',fecha:'30/5/2026',img:'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&q=70',url:'#'},
    {titulo:'Tendencias en materiales sustentables para 2026',fuente:'Obras Web',resumen:'Concreto de bajo carbono y madera estructural ganan terreno en proyectos mexicanos.',fecha:'29/5/2026',img:'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=70',url:'#'},
  ],
  material:[],
  foro:[
    {titulo:'¿Qué software usan para presupuestar?',texto:'Estoy entre Opus y Neodata, ¿cuál recomiendan para obra residencial?',autor:'Arq. Demo',tag:'Costos',fecha:'14/5/2026',vistas:12,likes:3},
  ],
  progresos:{c1:35,c2:0}
};
