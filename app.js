/* ============================================================
   IMDAC · CLUB DE MIEMBROS — app.js
   Instituto Mexicano de Arquitectura y Construcción
   Stack: Firebase Auth + Firestore · GitHub Pages
   ============================================================ */

/* ====== 1. CONFIG FIREBASE — REEMPLAZAR CON LA CUENTA DE IMDAC ====== */
const firebaseConfig = {
  apiKey: "REEMPLAZAR_API_KEY",
  authDomain: "imdac-club.firebaseapp.com",
  projectId: "imdac-club",
  storageBucket: "imdac-club.appspot.com",
  messagingSenderId: "REEMPLAZAR_SENDER_ID",
  appId: "REEMPLAZAR_APP_ID"
};
// Cupón y contacto IMDAC (placeholders — cambiar por los reales)
const IMDAC = {
  cupon: "CLUB20IMDAC",
  whatsapp: "52XXXXXXXXXX",          // WhatsApp del canal/soporte
  canalWA: "https://chat.whatsapp.com/REEMPLAZAR",
  sitioOficial: "https://imdac.mx",
  soporte: {
    l1:"522382196286", l1Label:"+52 1 238 219 6286",   // Línea 1
    l2:"522361112213", l2Label:"+52 1 236 111 2213"    // Línea 2
  }
};

let db=null, auth=null, FB_OK=false;
try{
  firebase.initializeApp(firebaseConfig);
  auth=firebase.auth(); db=firebase.firestore();
  FB_OK = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("REEMPLAZAR");
}catch(e){ console.warn("Firebase sin configurar — modo demo.",e); }

/* ====== 2. ESTADO ====== */
let CURRENT_USER=null;
let DATA={cursos:[],webinars:[],noticias:[],material:[],foro:[],progresos:{}};
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
  currentSection=sec;
  document.querySelectorAll('.sb-item').forEach(e=>e.classList.toggle('active',e.dataset.sec===sec));
  if(window.innerWidth<=900) toggleSidebar(false);
  renderSection(sec);
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
  c.innerHTML = `<div class="section active">${(R[sec]||renderInicio)()}</div>`;
  if(sec==='inicio') startCountdown();
}

/* ====== 5. SECCIONES ====== */
function firstName(){const n=CURRENT_USER?.displayName||CURRENT_USER?.email||'Miembro';return n.split(' ')[0].split('@')[0];}
function saludo(){const h=new Date().getHours();return h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches';}

function renderInicio(){
  const cursos=DATA.cursos.slice(0,2);
  const noticias=DATA.noticias.slice(0,3);
  const enProg=Object.values(DATA.progresos).filter(p=>p>0&&p<100).length;
  const comp=Object.values(DATA.progresos).filter(p=>p>=100).length;
  return `
  <div class="welcome">
    <div><h2>${saludo()}, ${firstName()}.</h2><p>Tienes acceso completo al catálogo. Retoma donde te quedaste.</p></div>
    <div class="streak"><span class="fl">🔥</span> <b>1</b> día de racha</div>
  </div>
  <div class="inicio-grid">
    <div>
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
    </div>
    <aside class="news-side">
      <div class="sec-head"><h3>Noticias</h3><a onclick="go('noticias')">Ver todas →</a></div>
      <div class="card" style="padding:6px 18px">
        ${noticias.length?noticias.map(n=>`<div class="news-mini" onclick="window.open('${n.url||'#'}','_blank')">${n.img?`<div class="nt" style="background-image:url('${n.img}')"></div>`:''}<div class="news-src">${n.fuente||'IMDAC'}</div><h5>${n.titulo}</h5><div class="news-date">${n.fecha||''}</div></div>`).join(''):'<div class="empty" style="padding:30px 10px"><b>Sin noticias</b></div>'}
      </div>
    </aside>
  </div>`;
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

const CATS=["Todos","Estructuras","Instalaciones","Costos y Presupuestos","Topografía","Diseño CAD","Normatividad","Sustentabilidad","Gestión de Obra"];
function renderBiblioteca(){
  const list=activeFilter==="Todos"?DATA.cursos:DATA.cursos.filter(c=>c.categoria===activeFilter);
  return `
  <h1 class="page-h">Biblioteca de cursos</h1>
  <p class="page-sub">Todo nuestro catálogo de cursos grabados, disponibles 24/7.</p>
  <div class="filters">${CATS.map(c=>`<button class="filter ${c===activeFilter?'active':''}" onclick="setFilter('${c}')">${c}</button>`).join('')}</div>
  <div class="course-grid">${list.length?list.map(courseCard).join(''):emptyMini('No hay cursos en esta categoría todavía.')}</div>`;
}
function setFilter(c){activeFilter=c;renderSection('biblioteca');}

function renderWebinar(){
  if(!DATA.webinars.length) return emptyState('webinar','Sin webinars programados','En cuanto haya un webinar agendado, aparecerá aquí con su fecha y enlace.');
  return `<h1 class="page-h">Webinars</h1><p class="page-sub">Sesiones en vivo y grabaciones para miembros.</p>
  <div class="course-grid">${DATA.webinars.map(w=>`
    <div class="course" onclick="${w.grabacion?`window.open('${w.grabacion}','_blank')`:`toast('Próximamente disponible')`}">
      <div class="course-img" style="background-image:url('${w.img||''}')"><span class="course-cat">${w.grabacion?'Grabación':'En vivo'}</span></div>
      <div class="course-body"><h4>${w.titulo}</h4><div class="course-meta"><span>📅 ${w.fecha||'Por definir'}</span></div></div>
    </div>`).join('')}</div>`;
}

function renderMaterial(){
  if(!DATA.material.length) return `<h1 class="page-h">Material PDF</h1><p class="page-sub">Guías, planos tipo y documentos descargables.</p>`+emptyState('material','Próximamente','Estamos preparando material descargable para ti. Pronto encontrarás guías, normas y plantillas aquí.');
  return `<h1 class="page-h">Material PDF</h1><p class="page-sub">Guías, planos tipo y documentos descargables.</p>
  <div class="course-grid">${DATA.material.map(m=>`
    <div class="course" onclick="window.open('${m.url}','_blank')">
      <div class="course-body" style="padding:24px"><h4>📄 ${m.titulo}</h4><p style="color:var(--muted);font-size:.86rem;margin-top:6px">${m.desc||''}</p><div class="course-meta" style="margin-top:14px"><span class="badge-norm">Descargar PDF</span></div></div>
    </div>`).join('')}</div>`;
}

function renderNoticias(){
  return `<h1 class="page-h">Noticias & actualizaciones</h1><p class="page-sub">Lo último del sector de la arquitectura y la construcción.</p>
  ${DATA.noticias.length?DATA.noticias.map(n=>`
    <div class="news-item" onclick="window.open('${n.url||'#'}','_blank')">
      ${n.img?`<div class="news-thumb" style="background-image:url('${n.img}')"></div>`:'<div class="news-thumb"></div>'}
      <div><div class="news-src">${n.fuente||'IMDAC'}</div><h4>${n.titulo}</h4><p>${n.resumen||''}</p><div class="news-date">${n.fecha||''}</div></div>
    </div>`).join(''):emptyState('noticias','Sin noticias por ahora','Pronto publicaremos novedades del sector.')}`;
}

function renderForo(){
  return `<h1 class="page-h">Foro</h1><p class="page-sub">Pregunta, comparte y aprende con la comunidad IMDAC.</p>
  <div class="search-bar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg><input placeholder="Buscar temas..." oninput="filterForo(this.value)"></div>
  <div id="foro-list">${renderForoList(DATA.foro)}</div>
  <div class="new-topic" onclick="toast('Función de publicación conectada a Firestore')"><b>+ Crear un nuevo tema</b><span>Comparte tu pregunta o experiencia con la comunidad</span></div>`;
}
function renderForoList(list){
  if(!list.length) return '<div class="empty"><b>Aún no hay temas</b><span>Sé el primero en abrir una conversación.</span></div>';
  return list.map(t=>`<div class="topic"><h4>${t.titulo}</h4><p>${t.texto||''}</p><div class="topic-meta"><span class="au">${t.autor||'Miembro'}</span><span class="pill" style="background:var(--rojo-50);color:var(--rojo)">${t.tag||'General'}</span><span>${t.fecha||''}</span><span>👁 ${t.vistas||0}</span><span>❤️ ${t.likes||0}</span></div></div>`).join('');
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
    <a class="btn-wa" href="https://wa.me/${IMDAC.whatsapp}?text=Hola%2C%20quiero%20aplicar%20mi%20cup%C3%B3n%20${IMDAC.cupon}" target="_blank">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.138.563 4.14 1.535 5.874L0 24l6.29-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.814 9.814 0 01-5.058-1.4l-.361-.214-3.735.896.944-3.653-.235-.374A9.817 9.817 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>
      Aplicar descuento
    </a>
  </div>`;
}
function copyCoupon(){navigator.clipboard?.writeText(IMDAC.cupon);toast('Cupón copiado: '+IMDAC.cupon);}

function renderCanal(){
  return `<h1 class="page-h">Canal privado de miembros</h1><p class="page-sub">Comunidad exclusiva para miembros del club.</p>
  <div class="benefit-card">
    <div style="width:70px;height:70px;border-radius:50%;background:#e8f9ee;display:grid;place-items:center;margin:0 auto 16px"><svg width="32" height="32" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.138.563 4.14 1.535 5.874L0 24l6.29-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.814 9.814 0 01-5.058-1.4l-.361-.214-3.735.896.944-3.653-.235-.374A9.817 9.817 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg></div>
    <h3 style="font-family:var(--font-display);font-size:1.3rem;font-weight:700">WhatsApp · Canal IMDAC</h3>
    <p style="color:var(--muted);margin:8px 0 20px">Recibe actualizaciones, tips de obra y promociones directamente en tu WhatsApp.</p>
    <a class="btn-wa" href="${IMDAC.canalWA}" target="_blank"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.138.563 4.14 1.535 5.874L0 24l6.29-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.814 9.814 0 01-5.058-1.4l-.361-.214-3.735.896.944-3.653-.235-.374A9.817 9.817 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>Unirme al canal</a>
  </div>
  <div class="card" style="padding:30px;margin-top:8px">
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

function renderNotificaciones(){
  return `<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px"><div><h1 class="page-h">Notificaciones</h1><p class="page-sub">Mantente al día con novedades y recordatorios.</p></div><button class="filter" onclick="toast('Todas marcadas como leídas')">Marcar todas leídas</button></div>
  ${emptyState('notificaciones','Todo al día','No tienes notificaciones nuevas. Te avisaremos cuando haya novedades.')}`;
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
function saveProfile(){
  const name=document.getElementById('pf-name').value;
  if(FB_OK&&CURRENT_USER){
    CURRENT_USER.updateProfile({displayName:name}).then(()=>{
      db.collection('miembros').doc(CURRENT_USER.uid).set({nombre:name,telefono:val('pf-phone'),ciudad:val('pf-city'),profesion:val('pf-prof'),bio:val('pf-bio')},{merge:true});
      toast('Perfil actualizado');refreshUserUI();
    }).catch(()=>toast('Error al guardar'));
  } else toast('Perfil actualizado (demo)');
}
const val=id=>document.getElementById(id)?.value||'';

function renderSuscripcion(){
  const incluye=[
    ['Acceso ilimitado','A todos los cursos grabados, 24/7'],
    ['Webinars en vivo','Sesiones mensuales con expertos'],
    ['Material PDF','Planos tipo y guías descargables'],
    ['20% de descuento','En cursos y certificaciones'],
    ['Canal exclusivo','Comunidad de miembros'],
  ];
  const check='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
  const alta=CURRENT_USER?.metadata?.creationTime?new Date(CURRENT_USER.metadata.creationTime).toLocaleDateString('es-MX'):'—';
  return `<h1 class="page-h">Mi Suscripción</h1><p class="page-sub">Detalles de tu plan y beneficios activos.</p>

  <div class="sub-hero">
    <div class="pa">Plan actual</div>
    <div class="pn">IMDAC Mensual</div>
    <div class="pp">$499 MXN / mes</div>
    <hr>
    <div class="sub-meta">
      <div><div class="ml">Estado</div><div class="mv activa">Activa</div></div>
      <div><div class="ml">Activada desde</div><div class="mv">${alta}</div></div>
    </div>
    <button class="btn-outline danger" onclick="if(confirm('¿Seguro que deseas cancelar tu suscripción? Perderás el acceso al catálogo al terminar el periodo.'))toast('Cancelación enviada (pendiente integrar Stripe)')">Cancelar suscripción</button>
  </div>

  <div>
    <h3 style="font-family:var(--font-display);font-size:1.2rem;font-weight:700">Lo que incluye tu plan</h3>
    <div class="plan-grid">
      ${incluye.map(i=>`<div class="plan-item"><div class="ck">${check}</div><div><b>${i[0]}</b><span>${i[1]}</span></div></div>`).join('')}
    </div>
    <div class="legal-links">
      <button onclick="go('terminos')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Términos y Condiciones</button>
      <button onclick="go('privacidad')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>Política de Privacidad</button>
    </div>
  </div>`;
}

function renderLogros(){
  const logros=[
    {n:'Primer paso',d:'Inicia tu primer curso',ic:'🎯',ok:Object.keys(DATA.progresos).length>0},
    {n:'Constructor',d:'Completa 3 cursos',ic:'🏗️',ok:false},
    {n:'Maestro de obra',d:'Completa 10 cursos',ic:'👷',ok:false},
    {n:'Influencer',d:'Recibe 10 likes en el foro',ic:'⭐',ok:false},
  ];
  return `<h1 class="page-h">Logros</h1><p class="page-sub">Tu progreso y reconocimientos en el club.</p>
  <div class="course-grid">${logros.map(l=>`<div class="card" style="padding:24px;text-align:center;${l.ok?'':'opacity:.5'}"><div style="font-size:2.4rem">${l.ic}</div><h4 style="font-family:var(--font-display);margin:10px 0 4px">${l.n}</h4><p style="color:var(--muted);font-size:.86rem">${l.d}</p>${l.ok?'<span class="pill" style="background:var(--rojo-50);color:var(--rojo);margin-top:10px">Desbloqueado</span>':''}</div>`).join('')}</div>`;
}

function renderConfig(){
  const dark=document.documentElement.dataset.theme==='dark';
  const notifs=[
    ['Nuevos cursos','Recibe aviso cuando se suba un nuevo curso'],
    ['Webinars en vivo','Recordatorio antes de cada sesión'],
    ['Nuevos PDFs','Aviso cuando se publique nuevo material'],
    ['Promociones','Ofertas especiales y descuentos del Club'],
    ['Anuncios generales','Avisos importantes del Club'],
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
      <label class="toggle"><input type="checkbox" checked onchange="toast('Preferencia actualizada')"><span class="tk"></span></label></div>`).join('')}
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
    <div class="cfg-item"><div class="ci-t danger"><b>Eliminar mi cuenta</b><span>Esta acción es permanente y no se puede deshacer</span></div>
      <button class="btn-outline danger" onclick="deleteAccount()">Eliminar</button></div>
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
function deleteAccount(){
  if(!confirm('¿Seguro que deseas eliminar tu cuenta? Esta acción es permanente y no se puede deshacer.'))return;
  if(FB_OK&&CURRENT_USER&&CURRENT_USER.uid!=='demo'){
    CURRENT_USER.delete().then(()=>toast('Cuenta eliminada')).catch(()=>toast('Por seguridad, vuelve a iniciar sesión antes de eliminar la cuenta.'));
  }else toast('(Demo) La cuenta se eliminaría aquí');
}
let _deferredPrompt=null;
function installPWA(){
  if(_deferredPrompt){_deferredPrompt.prompt();_deferredPrompt.userChoice.then(()=>{_deferredPrompt=null;});}
  else toast('Para instalar: usa el menú del navegador → "Agregar a pantalla de inicio".');
}

function renderTerminos(){return legalPage('Términos y Condiciones','Al usar el Club de Miembros IMDAC aceptas las siguientes condiciones de uso. El contenido es para fines educativos y profesionales en arquitectura y construcción. La membresía es personal e intransferible. IMDAC se reserva el derecho de actualizar cursos, herramientas y precios. El uso indebido del contenido o su redistribución sin autorización puede resultar en la cancelación de la cuenta.');}
function renderPrivacidad(){return legalPage('Política de Privacidad','IMDAC protege tus datos personales conforme a la legislación mexicana aplicable. Recopilamos únicamente la información necesaria para operar tu membresía: nombre, correo, datos de contacto y profesionales. No vendemos ni compartimos tus datos con terceros sin tu consentimiento. Puedes solicitar la modificación o eliminación de tus datos en cualquier momento contactando a soporte.');}
function legalPage(t,body){return `<h1 class="page-h">${t}</h1><div class="card" style="padding:34px;max-width:760px;line-height:1.8;color:var(--muted)"><p>${body}</p><p style="margin-top:16px;font-size:.84rem">Última actualización: mayo 2026 · Instituto Mexicano de Arquitectura y Construcción.</p></div>`;}

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
      <div class="field"><label>Resistencia f'c</label><input id="cc-fc" value="200 kg/cm²" disabled></div>
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
  </div>`;
}
function calcConcreto(){
  const l=+val('cc-largo'),a=+val('cc-ancho'),e=+val('cc-esp')/100;
  const vol=l*a*e;
  document.getElementById('cc-vol').textContent=vol.toFixed(2)+' m³';
  document.getElementById('cc-sacos').textContent=Math.ceil(vol*7);     // ~7 sacos/m³ (f'c=200)
  document.getElementById('cc-arena').textContent=(vol*0.51).toFixed(2);
  document.getElementById('cc-grava').textContent=(vol*0.68).toFixed(2);
}
function calcBlock(){
  const l=+val('bk-largo'),h=+val('bk-alto');
  const piezas=Math.ceil(l*h*12.5*1.05);
  document.getElementById('bk-piezas').textContent=piezas+' piezas';
}

function renderPrecios(){
  const conceptos=[
    ['Excavación a mano en material tipo II','m³','$185.00'],
    ['Plantilla de concreto f\'c=100','m²','$95.00'],
    ['Cadena de cimentación 15×20 armada','ml','$420.00'],
    ['Muro de block 15 cm asentado','m²','$540.00'],
    ['Losa maciza 10 cm f\'c=200','m²','$980.00'],
    ['Aplanado fino en muro','m²','$165.00'],
    ['Piso de cerámica 30×30 colocado','m²','$310.00'],
  ];
  return `<h1 class="page-h">Catálogo de Precios Unitarios</h1><p class="page-sub">Referencia base de conceptos de obra (precios estimados, actualízalos a tu zona).</p>
  <div class="card" style="overflow:hidden">
    <table class="norm"><thead><tr><th>Concepto</th><th>Unidad</th><th>P.U. estimado</th></tr></thead>
    <tbody>${conceptos.map(c=>`<tr><td>${c[0]}</td><td>${c[1]}</td><td style="font-family:var(--font-display);font-weight:700;color:var(--rojo)">${c[2]}</td></tr>`).join('')}</tbody></table>
  </div>
  <p style="color:var(--muted);font-size:.82rem;margin-top:14px">* Precios de referencia general. Ajusta según región, proveedor y fecha. El catálogo completo y editable se gestiona desde el panel Admin.</p>`;
}

function renderNormativas(){
  const normas=[
    ['NTC Diseño Estructuras de Concreto','Estructuras','Reglamento de Construcciones CDMX'],
    ['NTC Diseño por Sismo','Estructuras','Diseño sísmico de edificaciones'],
    ['NOM-001-SEDE Instalaciones Eléctricas','Instalaciones','Utilización de energía eléctrica'],
    ['NOM-008-CNA Agua potable','Instalaciones','Sistemas hidráulicos'],
    ['NOM-020-ENER Eficiencia energética','Sustentabilidad','Envolvente de edificios'],
    ['Ley de Obra Pública','Gestión','Contratación de obra pública'],
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
  const total=c.clases||0;
  const prog=DATA.progresos[id]||0;
  const completadas=Math.round(prog/100*total);
  const clases=Array.isArray(c.listaClases)&&c.listaClases.length
    ? c.listaClases
    : Array.from({length:total},(_,i)=>({titulo:`Clase ${i+1}`,duracion:'2 Horas'}));
  return `
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
  <div class="cd-list-head"><h3>Lista de clases</h3><span>${total} clases</span></div>
  ${clases.map((cl,i)=>claseRow(cl,i,true,id)).join('')}`;
}
function claseRow(cl,i,disp,cursoId){
  const dispIcon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke-width="2"/></svg>';
  const lockIcon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>';
  const playIcon='<svg fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  const clock='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
  return `<div class="clase ${disp?'disp':'lock'}" ${disp?`onclick="playClase('${cursoId}',${i})"`:''}>
    <div class="cst">${disp?dispIcon:lockIcon}</div>
    <div class="cinfo"><b>${cl.titulo||('Clase '+(i+1))}</b><span class="est">${disp?'Disponible':'Bloqueada'}</span>
      <div class="dur">${clock}${cl.duracion||'2 Horas'}</div></div>
    ${disp?`<div class="play">${playIcon}</div>`:''}
  </div>`;
}
function playClase(cursoId,i){
  const c=DATA.cursos.find(x=>x.id===cursoId);
  const cl=(c.listaClases||[])[i];
  if(cl&&cl.videoUrl)window.open(cl.videoUrl,'_blank');
  else toast('Reproductor conectado a Google Drive · Clase '+(i+1));
}
function closeModal(){document.getElementById('modal').classList.remove('open');}

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
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e=>showErr(authMsg(e.code)));
}
function doReset(){
  const email=val('li-email');
  if(!email)return showErr('Escribe tu correo para enviarte el enlace de recuperación.');
  if(!FB_OK)return toast('(Demo) Enlace de recuperación enviado a '+email);
  auth.sendPasswordResetEmail(email).then(()=>toast('Enlace de recuperación enviado')).catch(e=>showErr(authMsg(e.code)));
}
function doLogout(){
  if(FB_OK)auth.signOut();
  else{CURRENT_USER=null;document.body.classList.remove('logged');document.getElementById('login').classList.remove('hidden');}
}
function demoLogin(email,name){
  CURRENT_USER={email,displayName:name||email.split('@')[0],uid:'demo',metadata:{creationTime:new Date().toISOString()}};
  onLogged();
}

/* ====== 10. CARGA DE DATOS ====== */
async function loadData(){
  // Datos demo de arranque (se reemplazan con Firestore cuando esté configurado)
  DATA.cursos=DEMO.cursos; DATA.webinars=DEMO.webinars; DATA.noticias=DEMO.noticias;
  DATA.foro=DEMO.foro; DATA.material=DEMO.material; DATA.progresos=DEMO.progresos;
  if(!FB_OK||!CURRENT_USER||CURRENT_USER.uid==='demo')return;
  try{
    const [cur,web,not,mat,foro]=await Promise.all([
      db.collection('cursos').get(), db.collection('webinars').get(),
      db.collection('noticias').orderBy('fecha','desc').limit(20).get(),
      db.collection('material').get(), db.collection('foro_temas').orderBy('fecha','desc').limit(30).get()
    ]);
    if(!cur.empty)DATA.cursos=cur.docs.map(d=>({id:d.id,...d.data()}));
    if(!web.empty)DATA.webinars=web.docs.map(d=>({id:d.id,...d.data()}));
    if(!not.empty)DATA.noticias=not.docs.map(d=>({id:d.id,...d.data()}));
    if(!mat.empty)DATA.material=mat.docs.map(d=>({id:d.id,...d.data()}));
    if(!foro.empty)DATA.foro=foro.docs.map(d=>({id:d.id,...d.data()}));
    // progreso del usuario
    const prog=await db.collection('progreso').where('uid','==',CURRENT_USER.uid).get();
    DATA.progresos={}; prog.forEach(d=>{const x=d.data();DATA.progresos[x.cursoId]=x.porcentaje||0;});
    // ¿es admin? (para saltar drip)
    const adm=await db.collection('admins').doc(CURRENT_USER.uid).get();
    window._imdacAdmin=adm.exists;
  }catch(e){console.warn('Firestore:',e.message);}
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
  await loadData();
  go('inicio');
}
function bootDone(){document.getElementById('boot').classList.add('hide');}

window.addEventListener('DOMContentLoaded',()=>{
  // tema guardado
  try{const t=localStorage.getItem('imdac-theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}
  // PWA: service worker + prompt de instalación
  if('serviceWorker' in navigator){try{navigator.serviceWorker.register('sw.js').catch(()=>{});}catch(e){}}
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();_deferredPrompt=e;});
  if(FB_OK){
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
