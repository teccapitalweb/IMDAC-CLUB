/* ============================================================
   IMDAC · CLUB DE MIEMBROS — app.js
   Instituto Mexicano de Arquitectura y Construcción
   Stack: Firebase Auth + Firestore · GitHub Pages
   ============================================================ */
/* Si esta página se abrió como POPUP de pago y Stripe regresó aquí, mostrar confirmación y cerrarse */
(function(){
  try{
    if(window.opener && window.name==='imdac_pago'){
      const q=location.search;
      const ok=q.indexOf('pago=ok')!==-1, cancel=q.indexOf('pago=cancelado')!==-1;
      if(ok||cancel){
        document.documentElement.innerHTML='<body style="margin:0;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:96vh;background:#fafafa;color:#333"><div style="font-size:3rem">'+(ok?'✅':'↩️')+'</div><h2 style="font-family:inherit">'+(ok?'¡Pago exitoso!':'Pago cancelado')+'</h2><p style="color:#777">Esta ventana se cerrará sola…</p></body>';
        setTimeout(function(){window.close();},1800);
        throw new Error('__popup_pago__'); // detiene el resto del script en el popup
      }
    }
  }catch(e){if(e.message==='__popup_pago__')throw e;}
})();

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
  precio: 199,
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

let db=null, auth=null, storage=null, FB_OK=false;
try{
  firebase.initializeApp(firebaseConfig);
  auth=firebase.auth(); db=firebase.firestore(); storage=firebase.storage();
  FB_OK = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("REEMPLAZAR");
}catch(e){ console.warn("Firebase sin configurar — modo demo.",e); }

/* ====== 2. ESTADO ====== */
let CURRENT_USER=null;
let LOADING=true;
let BUNNY_READY=false;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let DATA={cursos:[],webinars:[],noticias:[],material:[],foro:[],progresos:{},clasesHechas:{},xp:0,cursoPrueba:''};
let _eligiendoCursoPrueba=false;
let activeFilter="Todos";
let courseQuery="";
let courseSort="recientes";
let courseView="todos";

/* ====== 3. NAV (sidebar) ====== */
const NAV=[
  {group:"Principal",items:[
    {id:"inicio",label:"Inicio",icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'},
    {id:"biblioteca",label:"Cursos",icon:'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'},
    {id:"webinar",label:"Clases en vivo",icon:'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'},
    {id:"material",label:"Material PDF",icon:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'},
  ]},
  {group:"Comunidad",items:[
    {id:"foro",label:"Foro",icon:'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z'},
    {id:"directorio",label:"Directorio VIP",icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'},
    {id:"canal",label:"Canal Privado",icon:'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z'},
  ]},
  {group:"Tu progreso",items:[
    {id:"logros",label:"Logros",icon:'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z'},
    {id:"certificados",label:"Certificados",icon:'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z'},
  ]},
  {group:"Herramientas",items:[
    {id:"ficha-obra",label:"Ficha de Obra",icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'},
    {id:"checklist",label:"Checklist de Obra",icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'},
    {id:"calculadora",label:"Calc. Materiales",icon:'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'},
    {id:"honorarios",label:"Calc. Honorarios",icon:'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'},
    {id:"presupuesto",label:"Calc. Presupuesto",icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2'},
    {id:"conversor",label:"Conversor de Unidades",icon:'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'},
    {id:"normativas",label:"Guía Normativas",icon:'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'},
  ]},
  {group:"Mi cuenta",items:[
    {id:"perfil",label:"Mi Perfil",icon:'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'},
    {id:"suscripcion",label:"Suscripción",icon:'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'},
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
  renderMobNav();
}

/* Barra inferior (móvil). Cuatro destinos reales más "Más", que abre el drawer
   con las 17 secciones: cuatro huecos no dan para los cuatro grupos del menú.
   Los iconos salen de NAV para no tener dos copias que se desincronicen. */
const MOB_NAV=['inicio','biblioteca','webinar','material'];
const MOB_LABEL={inicio:'Inicio',biblioteca:'Cursos',webinar:'En vivo',material:'Material'};
function navItem(sec){for(const g of NAV)for(const it of g.items)if(it.id===sec)return it;return null;}
function renderMobNav(){
  const el=document.getElementById('mob-nav');
  if(!el)return;
  const item=it=>{
    const lb=MOB_LABEL[it.id]||it.label;
    return `<button class="mob-item" data-sec="${it.id}" onclick="go('${it.id}')" aria-label="${lb}">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${it.icon}"/></svg>
      <span>${lb}</span></button>`;
  };
  el.innerHTML=MOB_NAV.map(id=>{const it=navItem(id);return it?item(it):'';}).join('')+
    `<button class="mob-item" id="mob-more" onclick="toggleSidebar(true)"
       aria-label="Ver todas las secciones" aria-controls="sidebar" aria-expanded="false">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
      <span>Más</span></button>`;
}

/* ====== 4. ROUTER ====== */
let currentSection="inicio";
const MEMBER_ONLY_SECTIONS=new Set(['foro','canal','directorio','logros','certificados']);
/* Sin historial, el boton atras de Android sale de la app desde cualquier
   seccion: con la barra inferior eso es un callejon sin salida. El hash tambien
   hace que los accesos directos del manifest lleguen a su seccion. */
let _desdeHash=false;
function hashActual(){
  try{ return decodeURIComponent(String(location.hash||'').replace(/^#/,'')); }
  catch(e){ return ''; }
}
function seccionInicial(){
  const h=hashActual();
  return (h && navItem(h)) ? h : 'inicio';
}
window.addEventListener('hashchange',()=>{
  const sec=hashActual();
  if(!sec || sec===currentSection || !navItem(sec)) return;
  _desdeHash=true;
  try{ go(sec); } finally { _desdeHash=false; }
});

// Seleccionar un curso de prueba se resuelve con una ruta hash real en lugar
// de depender de un handler inline de la tarjeta. El enlace funciona como un
// enlace normal del navegador y después abre la confirmación correspondiente.
window.addEventListener('hashchange',()=>{
  const hash=hashActual();
  if(!hash.startsWith('prueba/'))return;
  const encodedId=hash.slice('prueba/'.length);
  if(!encodedId)return;
  try{
    const cursoId=decodeURIComponent(encodedId);
    history.replaceState(null,'','#biblioteca');
    confirmarCursoPrueba(cursoId);
  }catch(e){toast('No se pudo seleccionar este curso',{type:'err'});}
});

function go(sec){
  if(!LOADING&&MEMBER_ONLY_SECTIONS.has(sec)&&!_tieneAcceso()){
    renderPaywall('Esta sección es exclusiva para miembros. Puedes seguir explorando cursos, temarios y materiales.');
    return;
  }
  currentSection=sec;
  if(!_desdeHash && hashActual()!==sec){ try{location.hash=sec;}catch(e){} }
  document.querySelectorAll('.sb-item').forEach(e=>e.classList.toggle('active',e.dataset.sec===sec));
  document.querySelectorAll('.mob-item').forEach(e=>e.classList.toggle('active',e.dataset.sec===sec));
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
    'ficha-obra':renderFichaObra, checklist:renderChecklist, calculadora:renderCalculadora, honorarios:renderHonorarios, presupuesto:renderPresupuesto, conversor:renderConversor,
    normativas:renderNormativas, canal:renderCanal, directorio:renderDirectorio,
    perfil:renderPerfil, suscripcion:renderSuscripcion,
    logros:renderLogros, certificados:renderCertificados, configuracion:renderConfig, terminos:renderTerminos, privacidad:renderPrivacidad
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
function navLabel(sec){const it=navItem(sec);return it?it.label:'';}
function crumbs(cur){return `<div class="crumbs"><a onclick="go('inicio')">Inicio</a><span class="sep">›</span><span class="cur">${cur}</span></div>`;}

/* ====== 5. SECCIONES ====== */
function firstName(){const n=CURRENT_USER?.displayName||CURRENT_USER?.email||'Miembro';return n.split(' ')[0].split('@')[0];}
function saludo(){const h=new Date().getHours();return h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches';}

/* Un solo orden, el del campo `order`, igual para todo el mundo.

   Antes habia dos, y el que veia un socio dependia de la edad de su cuenta: se
   ordenaba por dias que faltaban de goteo, asi que a los 118 dias nada quedaba
   bloqueado, el comparador devolvia 0 para todos y el catalogo se quedaba en el
   orden interno de Firestore, que es arbitrario. Tres socios distintos veian
   tres catalogos distintos y ninguno era el que nadie habia decidido.

   Se quita tambien el "mas avanzado primero": ordenaba por progreso, que es otra
   forma de que cada socio vea una cosa. Si algun dia se quiere una fila de
   "continuar donde lo dejaste", va como seccion propia, no reordenando el
   catalogo entero por debajo.

   El desempate alfabetico solo entra si dos cursos comparten `order`, que con la
   numeracion de 10 en 10 no deberia pasar. */
function ordenarCursos(arr){
  return arr.slice().sort((a,b)=>
    (Number(a.order||0)-Number(b.order||0))
    || String(a.titulo||'').localeCompare(String(b.titulo||''),'es'));
}
/* Para el curso que se está retomando: en qué clase va y cuál sigue.
   Mismo cálculo que ya usaba courseCard (prog/100*clases), para no inventar
   un segundo criterio de "en qué clase vas" que pueda desincronizarse. */
function proximaLeccion(c,prog){
  const total=c.clases||(c.listaClases||[]).length||0;
  if(!total)return{idx:0,total:0,actual:null,siguiente:null};
  const idx=Math.max(1,Math.min(total,Math.ceil(prog/100*total)));
  const lista=c.listaClases||[];
  const actual=lista[idx-1]?.titulo||`Clase ${idx}`;
  const siguiente=prog>=100?'Obtén tu certificado':(lista[idx]?.titulo||(idx<total?`Clase ${idx+1}`:'Obtén tu certificado'));
  return{idx,total,actual,siguiente};
}
function dsStat(label,val){return `<div class="ds-stat"><b>${val}</b><span>${label}</span></div>`;}
function quickItem(sec,label,icon){return `<div class="quick-item" onclick="go('${sec}')"><div class="qi"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${icon}"/></svg></div><span>${label}</span></div>`;}
const IMG_POR_TIPO={
  Materiales:'photo-1517581177682-a085bb7ffb15',
  Estructuras:'photo-1541976590-713941681591',
  Cimentación:'photo-1541888946425-d81bb19240f5',
  Obra:'photo-1621905251189-08b45d6a269e',
  Instalaciones:'photo-1581092921461-eab62e97a780',
  Seguridad:'photo-1504307651254-35680f356dfd',
  Diseño:'photo-1503387762-592deb58ef4e',
  Sustentabilidad:'photo-1486406146926-c627a92ad1ab',
  Costos:'photo-1504917595217-d4dc5ebe6122',
  Normativa:'photo-1486406146926-c627a92ad1ab',
  Topografía:'photo-1448630360428-65456885c650',
  Acabados:'photo-1562259949-e8e7689d7828',
  Maquinaria:'photo-1591955506264-3f5a6834570a',
  Planeación:'photo-1503387762-592deb58ef4e',
  Albañilería:'photo-1517581177682-a085bb7ffb15',
  Impermeabilización:'photo-1455165814004-1126a7199f9b',
  Calidad:'photo-1600585152220-90363fe7e115',
  Construcción:'photo-1455165814004-1126a7199f9b',
  _default:'photo-1621905251189-08b45d6a269e',
};
const DATOS_CURIOSOS=[
  ['Materiales','Dato IMDAC','El concreto no se seca: fragua.','Su resistencia aumenta por una reacción química entre el cemento y el agua.','Respeta los tiempos de curado antes de retirar la cimbra: desencofrar antes de tiempo compromete la resistencia final.'],
  ['Estructuras','Sabías que','Acero y concreto se complementan.','El concreto responde muy bien a compresión y el acero ayuda a resistir la tracción.','Verifica que el armado especificado en planos se instale tal cual: la posición del acero define dónde trabaja mejor cada material.'],
  ['Cimentación','Buena práctica','Una cimentación se define con el terreno, no con una suposición.','El estudio de mecánica de suelos permite elegir una solución más segura y eficiente.','Solicita siempre el estudio de mecánica de suelos antes de definir el tipo de cimentación, aunque el proyecto parezca sencillo.'],
  ['Obra','Tip IMDAC','La bitácora de obra protege las decisiones importantes.','Registrar acuerdos, avances y cambios da trazabilidad al proyecto.','Anota en bitácora cualquier cambio acordado de palabra el mismo día: lo que no se registra, después es difícil de comprobar.'],
  ['Instalaciones','Dato IMDAC','Coordinar instalaciones antes de colar evita retrabajos.','Una revisión previa evita perforaciones innecesarias en elementos ya terminados.','Cruza los planos de instalaciones con el de estructura antes de colar, no durante la obra.'],
  ['Seguridad','En obra','El orden también es seguridad.','Mantener circulaciones despejadas reduce riesgos y hace más eficiente el trabajo.','Dedica unos minutos al final del día a despejar pasillos y zonas de tránsito: cuesta poco y evita accidentes.'],
  ['Diseño','Tip IMDAC','La orientación también construye confort.','Estudiar sol, viento y sombra desde el diseño mejora el desempeño de un espacio.','Antes de fijar la orientación final, revisa la trayectoria solar del sitio en las distintas estaciones del año.'],
  ['Sustentabilidad','Para tu proyecto','Diseñar con el clima reduce la demanda energética.','La envolvente, la orientación y la ventilación natural importan desde el inicio.','Define la orientación y el tipo de envolvente desde el anteproyecto, no como un ajuste de último momento.'],
  ['Estructuras','Dato IMDAC','Una viga no trabaja sola.','Su comportamiento depende de cómo se conecta con columnas, losas y apoyos.','Verifica siempre cómo llega la carga de una viga a sus apoyos antes de modificar su sección.'],
  ['Materiales','En obra','Curar el concreto es tan importante como colocarlo.','Conservar la humedad adecuada durante los primeros días favorece su resistencia.','Mantén húmedo el concreto los primeros 7 días con riego o membranas de curado, según el clima de la zona.'],
  ['Costos','Buena práctica','Medir antes de comprar ayuda a cuidar el presupuesto.','Las cuantificaciones actualizadas permiten anticipar faltantes y desperdicios.','Actualiza tus cuantificaciones cada vez que cambie el proyecto, no solo al armar el presupuesto inicial.'],
  ['Normativa','Dato IMDAC','La normativa también es una herramienta de diseño.','Revisarla desde el anteproyecto ayuda a tomar decisiones con mayor certeza.','Consulta la normativa aplicable desde el anteproyecto, no hasta que llegue el momento del trámite.'],
  ['Topografía','Tip IMDAC','Una buena nivelación evita sorpresas en la obra.','Las cotas correctas ordenan excavaciones, pendientes y el desplante del proyecto.','Verifica niveles y bancos de referencia antes de trazar ejes: un error aquí se arrastra a toda la obra.'],
  ['Acabados','Detalle constructivo','Las muestras previas evitan diferencias al final.','Validar color, textura y colocación antes de ejecutar reduce correcciones.','Pide siempre una muestra física en obra antes de aprobar un acabado elegido solo por catálogo o imagen.'],
  ['Maquinaria','En obra','Planear el acceso de maquinaria también es construir.','Las rutas de entrada y maniobra deben definirse antes de que inicien los trabajos.','Define rutas de acceso y zonas de maniobra de maquinaria en el programa de obra, no el día que llega el equipo.'],
  ['Planeación','Dato IMDAC','Un programa de obra convierte tareas en decisiones.','Secuenciar actividades permite identificar dependencias y tiempos críticos.','Arma el programa de obra identificando primero qué actividades dependen de otras, no solo las fechas que te gustaría cumplir.'],
  ['Albañilería','Buena práctica','La modulación mejora el resultado y reduce cortes.','Planear medidas desde el diseño ayuda a aprovechar mejor los materiales.','Ajusta ejes y medidas del proyecto a módulos completos de block o tabique antes de iniciar el trazo.'],
  ['Impermeabilización','Tip IMDAC','El agua siempre encuentra el detalle débil.','Revisar pendientes, bajadas y encuentros es clave antes de impermeabilizar.','Revisa primero pretiles, bajadas pluviales y encuentros de muro: ahí empiezan la mayoría de las filtraciones.'],
  ['Diseño','Para tu proyecto','La luz natural requiere control, no solo apertura.','Aleros, orientación y protecciones ayudan a aprovecharla sin sobrecalentar el espacio.','Diseña las protecciones solares junto con las aberturas, no después de notar que un espacio se sobrecalienta.'],
  ['Estructuras','Sabías que','Las juntas permiten que los materiales se muevan.','Atender dilataciones y cambios de material previene fisuras no deseadas.','Ubica las juntas constructivas donde cambian materiales o geometría, y respeta el ancho que marca el proyecto.'],
  ['Instalaciones','En obra','Las pruebas de presión deben hacerse antes de cerrar muros.','Comprobar la red a tiempo evita abrir acabados para corregir fugas.','Haz la prueba de presión de la red hidráulica antes de cerrar muros o colar firmes, con el instalador presente.'],
  ['Costos','Dato IMDAC','El desperdicio tiene costo aunque no aparezca en el plano.','Almacenamiento, cortes y logística influyen directamente en el presupuesto real.','Incluye un porcentaje de desperdicio realista en tus cuantificaciones según el material y el método de corte.'],
  ['Seguridad','Buena práctica','El equipo de protección es parte del sistema de trabajo.','Casco, calzado y señalización reducen riesgos cuando se usan correctamente.','Verifica que el equipo de protección se use bien, no solo que esté disponible en obra.'],
  ['Materiales','Sabías que','El acero necesita recubrimiento para mantenerse protegido.','La separación adecuada frente al exterior ayuda a evitar problemas de corrosión.','Respeta los recubrimientos mínimos de proyecto, en especial en elementos expuestos a la intemperie.'],
  ['Sustentabilidad','Tip IMDAC','Reutilizar materiales empieza desde la planeación.','Separar residuos en obra permite recuperar recursos y disminuir desperdicio.','Separa escombro, metal y madera desde que se generan, no hasta que la obra esté por terminar.'],
  ['Cimentación','En obra','Excavar de más no siempre es una solución.','Los niveles y taludes deben respetar el proyecto y las condiciones del terreno.','Define a detalle niveles de desplante y taludes antes de excavar, y ajusta si el terreno cambia en obra.'],
  ['Calidad','Dato IMDAC','Revisar por etapas es más eficiente que corregir al final.','Los puntos de control ayudan a detectar errores cuando aún son sencillos de resolver.','Establece puntos de control por etapa —armado, cimbra, colado— antes de avanzar a la siguiente.'],
  ['Acabados','Detalle constructivo','La preparación de la superficie define el acabado.','Limpieza, nivelación y sellado tienen impacto directo en el resultado final.','No te saltes la preparación de superficie aunque el acabado parezca sencillo: ahí está la mitad del resultado.'],
  ['Planeación','Para tu proyecto','Comprar con anticipación protege el calendario.','Identificar materiales de entrega lenta evita retrasos cuando la obra ya los necesita.','Identifica en el programa qué materiales tienen tiempos de entrega largos y ponlos primero en tu lista de compras.'],
  ['Construcción','Hoy','Cada obra combina técnica, coordinación y oficio.','Las mejores decisiones nacen de revisar el proyecto completo antes de ejecutar.','Antes de ejecutar, dedica tiempo a revisar el proyecto completo: la mejor decisión en obra suele tomarse antes de empezar.']
/* Fotos fijas de Unsplash por categoría (en vez de loremflickr, que entrega
   una imagen distinta en cada carga y además ha mostrado caídas). Se repiten
   entre categorías afines a propósito: mejor una docena de fotos reales y
   consistentes que treinta huecos grises esperando un servicio externo. */
].map((dato,i)=>({idx:i,tipo:dato[0],tag:dato[1],titulo:dato[2],texto:dato[3],consejo:dato[4],img:`https://images.unsplash.com/${IMG_POR_TIPO[dato[0]]||IMG_POR_TIPO._default}?w=1200&q=75&auto=format&fit=crop&ixlib=rb-4.0.3`}));
function datosParaDescubrir(){
  const grupoDiario=Math.floor(Date.now()/86400000)%Math.ceil(DATOS_CURIOSOS.length/6);
  return Array.from({length:6},(_,i)=>DATOS_CURIOSOS[(grupoDiario*6+i)%DATOS_CURIOSOS.length]);
}
function discoverCard(d,featured=false){
  return `<article class="discover-card ${featured?'featured':''}">
    <img src="${escHtml(d.img)}" alt="" loading="lazy">
    <div class="discover-card-body"><div class="discover-chips"><span>${escHtml(d.tipo)}</span><span>${escHtml(d.tag)}</span></div><h4>${escHtml(d.titulo)}</h4><p>${escHtml(d.texto)}</p><button class="discover-more" onclick="abrirDato(${d.idx})">Descubrir más <b>→</b></button></div>
  </article>`;
}
/* "Descubrir más" abre el dato completo en el modal genérico de la app
   (el mismo de #modal / modal-content que usa, p. ej., la guía de instalación),
   en vez de un link muerto — estos datos son propios, no apuntan a nada externo. */
function abrirDato(idx){
  const d=DATOS_CURIOSOS[idx];
  if(!d)return;
  document.getElementById('modal-content').innerHTML=`<div class="modal-body dato-modal">
    <div class="dm-head">
      <div class="dm-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg></div>
      <div class="dm-head-text"><h3>${escHtml(d.titulo)}</h3><div class="dm-meta">${escHtml(d.tipo)} · ${escHtml(d.tag)}</div></div>
      <button class="modal-x dm-x" onclick="closeModal()" aria-label="Cerrar">✕</button>
    </div>
    <p class="dm-body">${escHtml(d.texto)}</p>
    ${d.consejo?`<div class="dm-tip"><b>Consejo práctico:</b> ${escHtml(d.consejo)}</div>`:''}
    <div class="dm-foot"><button class="dm-close-btn" onclick="closeModal()">Cerrar</button></div>
  </div>`;
  document.getElementById('modal').classList.add('open');
}
function renderDescubre(){
  const items=datosParaDescubrir();
  return `<section class="discover-module"><div class="discover-head"><div><h3>Descubre algo nuevo hoy <span>HOY</span></h3><p>Datos, técnicas y curiosidades del mundo de la arquitectura y la construcción.</p></div></div>
    <div class="discover-layout">${items.map((d,i)=>discoverCard(d,i===0)).join('')}</div>
  </section>`;
}
function renderInicio(){
  if(LOADING)return skelInicio();
  const cursosOrd=ordenarCursos(DATA.cursos);
  const cursos=cursosOrd.slice(0,4);
  const enProgList=cursosOrd.filter(c=>{const p=DATA.progresos[c.id]||0;return p>0&&p<100;});
  const enProg=enProgList.length;
  const comp=cursosOrd.filter(c=>(DATA.progresos[c.id]||0)>=100).length;
  const member=_tieneAcceso();
  // La tarjeta de inicio debe abrir TU curso de prueba, no el primero del
  // catalogo por "order" (ese casi siempre es el curso de entrada legado,
  // que para un socio sin membresia esta bloqueado por completo). Si ya
  // tiene avance en algo se respeta eso; si no, se prioriza su propio
  // cursoPrueba antes de caer al primero del catalogo.
  const cursoDePrueba=!member&&DATA.cursoPrueba?cursosOrd.find(c=>c.id===DATA.cursoPrueba):null;
  const continuo=enProgList[0]||cursoDePrueba||cursosOrd[0]||null;
  const prog=continuo&&member?(DATA.progresos[continuo.id]||0):0;
  const lec=continuo?proximaLeccion(continuo,prog):null;
  const w=DATA.webinars[0];
  return `
  <div class="dash-hero">
    <div class="dash-continue">
      <div class="dc-tag">${saludo()}</div>
      <h2>Hola, <i>${firstName()}</i>.</h2>
      <p class="dc-sub">${member?'Tu ruta avanza a tu ritmo: se habilita un curso nuevo cada 7 días.':(hayClaseGratis()?'Tu curso de prueba está disponible: mira todas sus clases excepto la última.':'Elige un curso de prueba para empezar a aprender.')}</p>
      ${continuo?`
      <div class="dc-course">
        <div class="dc-course-label">${member?(prog>0?'Continúa tu curso':'Curso sugerido para empezar'):(cursoDePrueba?'Tu curso de prueba':'Curso de entrada')}</div>
        <h3>${continuo.titulo}</h3>
        ${lec.total?`
        <div class="dc-lesson">
          <div class="dc-badge">${lec.idx}</div>
          <div><span class="dc-lesson-tag">Siguiente · ${lec.idx} de ${lec.total}</span><span class="dc-lesson-title">${member?lec.siguiente:'Activa tu membresía para verla'}</span></div>
        </div>`:''}
        <div class="dc-progress-row"><div class="dc-progress-bar"><i style="width:${prog}%"></i></div><span class="dc-progress-pct">${prog}%</span></div>
        <button class="dc-cta" onclick="openCurso('${continuo.id}')">▶ ${member&&prog>0?'Continuar curso':'Ver curso'}</button>
      </div>`:`
      <div class="dc-course"><div class="dc-course-label">Catálogo</div><h3>Aún no hay cursos publicados</h3></div>`}
    </div>
    <div class="dash-side">
      <div class="ds-label">Tu siguiente meta</div>
      <div class="ds-steps">
        ${continuo&&lec&&lec.total?`
        <div class="ds-step now"><span class="dot"></span><div><small>Ahora</small><b>${lec.actual}</b></div></div>
        <div class="ds-step"><span class="dot"></span><div><small>Después</small><b>${lec.siguiente}</b></div></div>`
        :(member?`<div class="ds-step"><span class="dot"></span><div><small>Catálogo</small><b>Aún no hay cursos publicados.</b></div></div>`
        :`<div class="ds-step"><span class="dot"></span><div><small>Membresía</small><b>Activa tu membresía para desbloquear tus clases.</b></div></div>`)}
      </div>
      <div class="ds-webinar">
        <div class="wlabel">Próxima clase en vivo<b>${w?w.titulo:'Por anunciar'}</b></div>
        <div class="ds-cd" id="countdown"><span data-cd="d">00</span>d <span data-cd="h">00</span>h <span data-cd="m">00</span>m</div>
      </div>
      <div class="ds-stats">
        ${dsStat('Cursos',DATA.cursos.length)}
        ${dsStat('En progreso',enProg)}
        ${dsStat('Material PDF',DATA.material.length)}
        ${dsStat('Certificados',comp)}
      </div>
    </div>
  </div>
  <div class="quick-row">
    ${quickItem('webinar','Clases en vivo','M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z')}
    ${quickItem('material','Material PDF','M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z')}
    ${quickItem('foro','Foro','M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z')}
    ${quickItem('biblioteca','Cursos','M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253')}
  </div>
  ${renderDescubre()}
  <div class="sec-head"><h3>Continuar aprendiendo</h3><a onclick="go('biblioteca')">Ver todos →</a></div>
  <div class="course-grid">${cursos.length?cursos.map(courseCard).join(''):emptyMini('Aún no hay cursos. ¡Pronto se liberan!')}</div>
  `;
}
function emptyMini(t){return `<div class="empty" style="grid-column:1/-1"><b>${t}</b></div>`;}

/* ¿Este curso regala alguna clase? Se pregunta al catalogo, que ya trae el
   isPreview calculado por el backend (access.js:lessonIsPreview). Antes la
   etiqueta "Primera clase gratis" estaba escrita a mano en las diez tarjetas:
   era cierta cuando se regalaba la primera clase de cada curso, y dejo de serlo
   en cuanto la clase gratis pasa a ser solo la del curso de entrada. */
function cursoRegalaClase(c){
  return (c.listaClases||[]).some(l=>l.isPreview===true);
}
function cursoEsPruebaGratuita(c){return c?.esPruebaGratuita===true||String(c?.esPruebaGratuita||'').toLowerCase()==='true';}
function hayClaseGratis(){
  return (DATA.cursos||[]).some(cursoRegalaClase);
}
function courseCard(c){
  const prog=DATA.progresos[c.id]||0;
  const member=_tieneAcceso();
  const schedule=dripStatus(c);
  // La prueba es un enlace real (no un clic inline) para que toda la tarjeta,
  // incluido el texto rojo, active la selección de forma fiable.
  const isTrialChoice=_eligiendoCursoPrueba;
  const tag=isTrialChoice?'a':'div';
  const trialAttr=isTrialChoice
    ?` href="#prueba/${encodeURIComponent(String(c.id))}"`
    :` onclick='openCurso(${JSON.stringify(c.id)})'`;
  const esMiPrueba=!member&&String(DATA.cursoPrueba||'')===String(c.id||'');
  // puedeGuardarProgreso(c.id) sería lo ideal, pero courseCard se llama antes
  // de que exista DATA.clasesHechas[id]; el criterio es el mismo: miembro, o
  // tu propio curso de prueba.
  const puedeVerProgreso=member||esMiPrueba;
  const badge=schedule.locked
    ?`<span class="cc-badge cc-badge-lock">🔒 Se desbloquea en ${schedule.dias} día${schedule.dias===1?'':'s'}</span>`
    :(puedeVerProgreso&&prog>0?`<span class="cc-badge cc-badge-prog">${prog}%</span>`
    :(!member&&cursoRegalaClase(c)?`<span class="cc-badge cc-badge-free">${esMiPrueba?'Tu prueba gratuita':(cursoEsPruebaGratuita(c)?'Prueba gratuita':'Primera clase gratis')}</span>`:''));
  const showPlay=!schedule.locked&&prog>0&&puedeVerProgreso;
  const ctaTxt=isTrialChoice?'Elegir →':(schedule.locked?'Bloqueado':(prog>0?'Continuar':'Ver curso'));
  const instr=String(c.instructor||'').trim()||'Equipo IMDAC';
  const initials=instr.split(/\s+/).filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase()||'IM';
  return `<${tag} class="course course-v2${isTrialChoice?' trial-choice':''}"${trialAttr}>
    <div class="cc-cover" style="background-image:url('${driveImg(c.img)}')">
      ${badge}
      ${showPlay?`<span class="cc-play"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>`:''}
      <div class="cc-shade"></div>
      <div class="cc-info">
        <h4>${c.titulo}</h4>
        <div class="cc-meta">${c.clases||0} clases · ${c.nivel||'Intermedio'}</div>
        ${puedeVerProgreso&&prog>0?`<div class="cc-bar"><i style="width:${prog}%"></i></div>`:''}
        <div class="cc-foot">
          <span class="cc-instr"><span class="cc-avatar">${initials}</span>${instr}</span>
          <span class="cc-cta${schedule.locked?' cc-cta-lock':''}">${ctaTxt}</span>
        </div>
      </div>
    </div>
  </${tag}>`;
}

/* El servidor calcula la ruta real. Aquí solo la presentamos y simulamos el
   modo de vista previa del administrador (membresía iniciada hoy). */
/* Convierte un link de Google Drive a imagen directa visible.
   Acepta: .../file/d/ID/view , open?id=ID , uc?id=ID , o un ID suelto.
   Si no es de Drive, devuelve la URL tal cual. */
function driveImg(url){
  if(!url) return '';
  url=String(url).trim();
  if(url.indexOf('drive.google.com')===-1 && url.indexOf('docs.google.com')===-1){
    // ¿es solo un ID de Drive? (33+ caracteres alfanuméricos sin / ni .)
    if(/^[A-Za-z0-9_-]{20,}$/.test(url)) return 'https://drive.google.com/thumbnail?id='+url+'&sz=w1000';
    return url;
  }
  let id='';
  let m=url.match(/\/file\/d\/([A-Za-z0-9_-]+)/) || url.match(/[?&]id=([A-Za-z0-9_-]+)/) || url.match(/\/d\/([A-Za-z0-9_-]+)/);
  if(m) id=m[1];
  if(!id) return url;
  return 'https://drive.google.com/thumbnail?id='+id+'&sz=w1000';
}
function dripStatus(c){
  if(window._imdacAdmin) return {locked:false,dias:0};
  if(window._previewEnrollDate){
    const ordered=ordenarCursos(DATA.cursos||[]);
    const index=Math.max(0,ordered.findIndex(x=>x.id===c.id));
    const elapsed=Math.max(0,Math.floor((Date.now()-window._previewEnrollDate.getTime())/86400000));
    const restan=index*7-elapsed;
    return restan>0?{locked:true,dias:restan}:{locked:false,dias:0};
  }
  return c.membershipUnlocked===false?{locked:true,dias:Number(c.membershipWaitDays||7)}:{locked:false,dias:0};
}

let CATS=["Todos","Estructuras","Instalaciones","Costos y Presupuestos","Topografía","Diseño CAD","Normatividad","Sustentabilidad","Gestión de Obra"];
function renderBiblioteca(){
  if(LOADING)return `<div class="member-catalog-hero"><div class="skel" style="height:180px;border-radius:18px"></div></div>${skelGrid(8)}`;
  const total=DATA.cursos.length;
  const enCurso=DATA.cursos.filter(c=>{const p=DATA.progresos[c.id]||0;return p>0&&p<100;}).length;
  const completados=DATA.cursos.filter(c=>(DATA.progresos[c.id]||0)>=100).length;
  const totalClases=DATA.cursos.reduce((n,c)=>n+Number(c.clases||(c.listaClases||[]).length||0),0);
  const base=(activeFilter==="Todos"?DATA.cursos:DATA.cursos.filter(c=>c.categoria===activeFilter));
  const byView=courseView==='progreso'?base.filter(c=>{const p=DATA.progresos[c.id]||0;return p>0&&p<100})
    :courseView==='completados'?base.filter(c=>(DATA.progresos[c.id]||0)>=100):base;
  const list=ordenarCursos(byView);
  return `
  <section class="member-catalog-hero">
    <div class="member-catalog-copy">
      <div class="member-catalog-tag">Catálogo IMDAC</div>
      <h1>Cursos grabados,<em>a tu ritmo.</em></h1>
      <div class="member-catalog-stats"><div><b>${total}</b><span>cursos</span></div><div><b>${totalClases}</b><span>clases</span></div><div><b>${enCurso}</b><span>en progreso</span></div><div><b>${completados}</b><span>completados</span></div></div>
    </div>
    <div class="member-catalog-tabs" role="tablist" aria-label="Estado del curso">
      <button class="${courseView==='todos'?'active':''}" onclick="setCourseView('todos')">Todos</button>
      <button class="${courseView==='progreso'?'active':''}" onclick="setCourseView('progreso')">En progreso</button>
      <button class="${courseView==='completados'?'active':''}" onclick="setCourseView('completados')">Completados</button>
    </div>
  </section>
  ${_eligiendoCursoPrueba?`<div class="card" style="margin:20px 0 14px;padding:18px 20px;border-color:#9ab58f;background:#f4f8f1"><b style="font-size:1.02rem">▷ Selecciona el curso de tu preferencia para obtener tu prueba gratuita</b><span style="display:block;color:var(--muted);margin-top:5px;font-size:.86rem">Solo puedes elegir uno. Después confirmaremos tu elección.</span></div>`:''}
  <div class="catalog-area-label">Explora por área</div>
  <div class="filters member-catalog-filters">${CATS.map(c=>`<button class="filter ${c===activeFilter?'active':''}" onclick="setFilter('${c.replace(/'/g,"\\'")}')">${c}${c==='Todos'?` <span>${total}</span>`:''}</button>`).join('')}</div>
  <div class="catalog-result"><b>${list.length}</b> curso${list.length===1?'':'s'} ${courseView==='todos'?'disponible'+(list.length===1?'':'s'):courseView==='progreso'?'en progreso':'completado'+(list.length===1?'':'s')}</div>
  ${list.length?`<div class="course-grid member-catalog-grid">${list.map(courseCard).join('')}</div>`:emptyIllus(courseView==='progreso'?'Aún no tienes cursos en progreso':courseView==='completados'?'Aún no tienes cursos completados':'No hay cursos aquí',courseView==='progreso'?'Cuando comiences un curso aparecerá aquí.':'Prueba con otra categoría para ver más cursos.','Ver todos los cursos',"resetCourseFilters()")}`;
}
function escHtml(v){return String(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function setFilter(c){activeFilter=c;renderSection('biblioteca');}
function setCourseQuery(q){courseQuery=q;renderSection('biblioteca');}
function setCourseSort(sort){courseSort=sort;renderSection('biblioteca');}
function setCourseView(view){courseView=view;renderSection('biblioteca');}
function resetCourseFilters(){activeFilter='Todos';courseQuery='';courseSort='recientes';courseView='todos';renderSection('biblioteca');}

function webinarEstado(w){
  // devuelve {estado, etiqueta, claseEtiqueta}
  const ahora=Date.now();
  const ini=w.fechaISO?new Date(w.fechaISO).getTime():0;
  const finVivo=ini+2*60*60*1000; // ventana "en vivo": 2h desde el inicio
  if(!ini){ // sin fecha definida
    if(w.hasRecording)return {estado:'grabacion',etiqueta:'Grabación',cls:'wb-gray'};
    return {estado:'prox',etiqueta:'Próximamente',cls:'wb-amber'};
  }
  if(ahora<ini) return {estado:'prox',etiqueta:'Próximamente',cls:'wb-amber'};
  if(ahora>=ini && ahora<=finVivo) return {estado:'vivo',etiqueta:'EN VIVO',cls:'wb-live'};
  // ya pasó
  if(w.hasRecording) return {estado:'grabacion',etiqueta:'Grabación',cls:'wb-gray'};
  return {estado:'fin',etiqueta:'Finalizado',cls:'wb-gray'};
}
function calLink(w){
  // genera link de Google Calendar
  const ini=w.fechaISO?new Date(w.fechaISO):null;
  if(!ini)return '';
  const fin=new Date(ini.getTime()+60*60*1000);
  const fmt=d=>d.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const txt=encodeURIComponent('IMDAC · '+(w.titulo||'Webinar'));
  const det=encodeURIComponent('Webinar del Club IMDAC. El enlace de acceso está disponible para miembros dentro del Club.');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${txt}&dates=${fmt(ini)}/${fmt(fin)}&details=${det}`;
}
async function abrirWebinar(id){
  const w=DATA.webinars.find(x=>x.id===id); if(!w)return;
  const e=webinarEstado(w);
  if(!_tieneAcceso())return renderPaywall('Las clases en vivo y sus grabaciones son exclusivas para miembros.');
  if(e.estado==='prox'){ const l=calLink(w); if(l)window.open(l,'_blank'); else toast('Pronto se habilitará el recordatorio'); return; }
  if(e.estado==='vivo'||e.estado==='grabacion'){
    try{
      const data=await apiFetch('/webinar-acceso',{method:'POST',body:{webinarId:id,type:e.estado==='grabacion'?'recording':'live'}});
      if(data.url)window.open(data.url,'_blank','noopener');
    }catch(err){toast(err.message||'Enlace no disponible');}
  }
  else toast('Esta clase ya finalizó');
}
function renderWebinar(){
  if(LOADING)return `<section class="live-hero"><div class="skel" style="height:165px;border-radius:18px"></div></section>`+skelGrid(4);
  const liveHero=`<section class="live-hero"><div class="live-tag">Aprende en directo</div><h1>Clases en vivo</h1><p>Sesiones en directo con especialistas de arquitectura y construcción. Participa, pregunta y consulta las grabaciones disponibles.</p></section>`;
  // Las ya finalizadas sin grabación no aportan nada al socio (no se pueden
  // ver ni agendar) — se ocultan en vez de quedarse como tarjeta muerta con
  // opacidad reducida. Las grabaciones sí se conservan, porque esas sí sirven.
  const visibles=DATA.webinars.filter(w=>webinarEstado(w).estado!=='fin');
  if(!visibles.length) return `${liveHero}<section class="live-empty"><div class="live-empty-icon">◉</div><h2>Aún no hay clases programadas</h2><p>Estamos preparando las próximas transmisiones. Te avisaremos en cuanto haya nuevas clases en vivo.</p></section>`;
  // ordenar: en vivo primero, luego próximos por fecha, luego pasados/grabaciones
  const orden={vivo:0,prox:1,grabacion:2,fin:3};
  const list=visibles.slice().sort((a,b)=>{
    const ea=webinarEstado(a),eb=webinarEstado(b);
    if(orden[ea.estado]!==orden[eb.estado])return orden[ea.estado]-orden[eb.estado];
    const ta=a.fechaISO?new Date(a.fechaISO).getTime():0, tb=b.fechaISO?new Date(b.fechaISO).getTime():0;
    return (ea.estado==='prox')?(ta-tb):(tb-ta);
  });
  return `${liveHero}<div class="course-grid live-grid">${list.map(w=>{
    const e=webinarEstado(w);
    const grisOpacidad=(e.estado==='fin')?'opacity:.72;':'';
    let btn='';
    if(e.estado==='vivo')btn=`<span class="wb-btn wb-btn-live">Entrar a la sesión</span>`;
    else if(e.estado==='grabacion')btn=`<span class="wb-btn">Ver grabación</span>`;
    else if(e.estado==='prox')btn=`<span class="wb-btn">📅 Agregar a mi calendario</span>`;
    else btn=`<span class="wb-btn wb-btn-off">Finalizado</span>`;
    return `<div class="course" style="${grisOpacidad}" onclick="abrirWebinar('${w.id}')">
      <div class="course-img" style="background-image:url('${driveImg(w.img)}')"><span class="course-cat ${e.cls}">${e.etiqueta}</span></div>
      <div class="course-body"><h4>${w.titulo}</h4><div class="course-meta"><span>📅 ${w.fecha||'Por definir'}</span></div><div style="margin-top:12px">${btn}</div></div>
    </div>`;
  }).join('')}</div>`;
}

function ordenarMaterial(arr){
  const diasBloqueo=m=>{
    if(!m.cursoId)return -1; // disponible desde el inicio
    const c=DATA.cursos.find(x=>x.id===m.cursoId);
    if(!c)return -1;
    const ds=dripStatus(c);
    return ds.locked?(ds.dias||0):-1; // -1 = disponible
  };
  return arr.slice().sort((a,b)=>{
    const da=diasBloqueo(a), db=diasBloqueo(b);
    const la=da>=0, lb=db>=0;            // bloqueado?
    if(la!==lb)return la?1:-1;           // disponibles primero
    if(la)return da-db;                  // bloqueados: menos días primero
    return 0;
  });
}
/* Estado del material respecto a su curso: solo informativo. El propio panel
   admin lo deja explícito ("no restringe el acceso: el archivo se abre
   igual") — el curso asociado es para AGRUPAR y mostrar un aviso, nunca para
   bloquear la descarga. (Antes esta función sí bloqueaba abrirMaterial; se
   corrigió para que coincida con lo que dice el formulario del admin.) */
function materialEstado(m){
  if(!m.cursoId)return{locked:false,dias:0,curso:null};
  const c=DATA.cursos.find(x=>x.id===m.cursoId);
  if(!c)return{locked:false,dias:0,curso:null};
  const ds=dripStatus(c);
  return{locked:ds.locked,dias:ds.dias||0,curso:c};
}
function materialClase(m){
  if(!m.cursoId||!m.claseId)return null;
  const c=DATA.cursos.find(x=>x.id===m.cursoId); if(!c)return null;
  const lista=c.listaClases||[];
  const i=lista.findIndex(l=>l.lessonId===m.claseId);
  return i>=0?{idx:i,titulo:lista[i].titulo||`Clase ${i+1}`}:null;
}
const MAT_FAV_KEY='imdac_mat_fav';
function materialEsFavorito(id){return _statArr(MAT_FAV_KEY).includes(id);}
function toggleFavoritoMaterial(id){
  const arr=_statArr(MAT_FAV_KEY);
  const i=arr.indexOf(id);
  if(i>=0)arr.splice(i,1); else arr.push(id);
  try{localStorage.setItem(MAT_FAV_KEY,JSON.stringify(arr));}catch(e){}
  const btn=document.getElementById('mat-fav-btn');
  if(btn)btn.classList.toggle('on',i<0);
}
const docIcon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>';
const lockIcon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>';
/* Un ícono por tipo de archivo, para que la tarjeta se distinga aunque no
   tenga portada. "PDF"/"Word"/"Otro" comparten el ícono de documento porque
   visualmente son lo mismo (hoja con líneas); lo que cambia es el texto del
   badge, que sí sale del campo real. */
const FORMATO_ICONS={
  'Presentación':'<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.6"><rect x="3" y="4" width="18" height="13" rx="2"/><path stroke-linecap="round" d="M8 21h8M12 17v4"/></svg>',
  'Excel':'<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
  'Imagen':'<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 15l-5-5L5 21"/></svg>',
};
function materialIcon(formato){return FORMATO_ICONS[formato]||docIcon;}
function materialCard(m){
  const est=materialEstado(m);
  const clase=materialClase(m);
  const formato=m.formato||'PDF';
  const hasImg=!!(m.img&&String(m.img).trim());
  const cover=hasImg?driveImg(m.img):'';
  return `<div class="material-card" onclick="abrirMaterial('${m.id}')">
    <div class="mc-thumb ${est.locked?'locked':''}" ${hasImg?`style="background-image:url('${escHtml(cover)}')"`:''}>
      ${hasImg?'':materialIcon(formato)}
      <span class="mc-badge">${escHtml(formato)}</span>
      ${est.curso?`<span class="mc-cat">${escHtml(est.curso.categoria||'Curso')}</span>`:''}
      ${est.locked?`<span class="mc-lock">${lockIcon}</span>`:''}
    </div>
    <div class="mc-body">
      <h4>${escHtml(m.titulo)}</h4>
      <p>${escHtml(m.desc||'Documento descargable del Club IMDAC.')}</p>
      <div class="mc-foot"><span>${clase?`Clase ${clase.idx+1}: ${escHtml(clase.titulo)}`:(est.curso?escHtml(est.curso.titulo):'Para todos los socios')}</span>${est.locked?`<b>${est.dias}d</b>`:''}</div>
    </div>
  </div>`;
}
/* Agrupado como pide el socio: primero por curso, y dentro de cada curso por
   clase (en el mismo orden que listaClases) — así ya no se ve "todo
   revuelto". Lo que no tiene curso queda en "Material general" al final. */
function renderMaterial(){
  if(LOADING)return `<h1 class="page-h">Material PDF</h1><p class="page-sub">Guías, planos tipo y documentos descargables.</p>`+skelGrid(4);
  if(!DATA.material.length)return `
  <div class="material-hero"><div class="material-pill">Biblioteca descargable</div><h1>Material PDF</h1><p>Guías, planos tipo y documentos descargables del Club IMDAC.</p></div>
  ${emptyState('material','Próximamente','Estamos preparando material descargable para ti. Pronto encontrarás guías, normas y plantillas aquí.')}`;

  const sinCurso=DATA.material.filter(m=>!m.cursoId);
  const porCurso={};
  DATA.material.filter(m=>m.cursoId).forEach(m=>{(porCurso[m.cursoId]=porCurso[m.cursoId]||[]).push(m);});
  const cursosConMaterial=ordenarCursos(DATA.cursos.filter(c=>porCurso[c.id]&&porCurso[c.id].length));

  let secciones='';
  cursosConMaterial.forEach(c=>{
    const mats=porCurso[c.id];
    const lista=c.listaClases||[];
    const porClase={}; const generales=[];
    mats.forEach(m=>{
      const i=m.claseId?lista.findIndex(l=>l.lessonId===m.claseId):-1;
      if(i>=0)(porClase[i]=porClase[i]||[]).push(m); else generales.push(m);
    });
    let bloques='';
    lista.forEach((l,i)=>{
      const items=porClase[i]; if(!items||!items.length)return;
      bloques+=`<div class="sec-head" style="margin:18px 0 12px"><h4 style="font-family:var(--font-display);font-size:1rem;font-weight:700;color:var(--muted)">Clase ${i+1}: ${escHtml(l.titulo||'')}</h4></div><div class="course-grid">${items.map(materialCard).join('')}</div>`;
    });
    if(generales.length)bloques+=`<div class="sec-head" style="margin:18px 0 12px"><h4 style="font-family:var(--font-display);font-size:1rem;font-weight:700;color:var(--muted)">General del curso</h4></div><div class="course-grid">${generales.map(materialCard).join('')}</div>`;
    secciones+=`<div class="sec-head" style="margin-top:30px"><h3>📁 ${escHtml(c.titulo)}</h3></div>${bloques}`;
  });
  if(sinCurso.length)secciones+=`<div class="sec-head" style="margin-top:30px"><h3>📄 Material general</h3></div><div class="course-grid">${ordenarMaterial(sinCurso).map(materialCard).join('')}</div>`;

  return `
  <div class="material-hero">
    <div class="material-pill">Biblioteca descargable</div>
    <h1>Material PDF</h1>
    <p>Guías, planos tipo y documentos descargables del Club IMDAC, agrupados por curso y por clase.</p>
  </div>
  ${secciones}`;
}
/* Ficha de un material — mismo patrón que la vista de detalle de curso
   (openCurso/renderCursoDetalle): se inyecta directo en #content, fuera del
   router de go(), y marca "material" como activa en el menú. */
function abrirMaterial(id){
  const m=DATA.material.find(x=>x.id===id); if(!m)return;
  document.querySelectorAll('.sb-item').forEach(e=>e.classList.toggle('active',e.dataset.sec==='material'));
  document.getElementById('content').innerHTML=`<div class="section active">${renderMaterialDetalle(id)}</div>`;
  window.scrollTo(0,0);
}
function renderMaterialDetalle(id){
  const m=DATA.material.find(x=>x.id===id); if(!m)return renderMaterial();
  const est=materialEstado(m);
  const clase=materialClase(m);
  const formato=m.formato||'PDF';
  const hermanos=m.cursoId?DATA.material.filter(x=>x.cursoId===m.cursoId&&x.id!==m.id):[];
  const fav=materialEsFavorito(id);
  const hasImg=!!(m.img&&String(m.img).trim());
  const cover=hasImg?driveImg(m.img):'';
  return `<a class="cd-back" onclick="go('material')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:18px;height:18px;stroke-width:2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>Volver a Material PDF</a>
  <div class="cd-hero">
    <div class="cd-hero-img" style="${hasImg?`background-image:url('${escHtml(cover)}')`:'background:linear-gradient(135deg,var(--negro),var(--gris-900))'};display:flex;align-items:center;justify-content:center">
      ${hasImg?'':`<div style="width:84px;height:84px;color:#fff;opacity:.9">${materialIcon(formato)}</div>`}
    </div>
    <div class="cd-hero-body">
      <div class="cat">${est.curso?escHtml(est.curso.categoria||'Curso'):'Material'}</div>
      <h2>${escHtml(m.titulo)}</h2>
      <p class="desc">${escHtml(m.desc||'Documento descargable del Club IMDAC.')}</p>
      <div class="material-info-grid">
        <div class="mi"><b>Formato</b><span>${escHtml(formato)}</span></div>
        <div class="mi"><b>${est.curso?'Del curso':'Disponibilidad'}</b><span>${est.curso?escHtml(est.curso.titulo):'Para todos los socios'}</span></div>
        ${clase?`<div class="mi"><b>Clase</b><span>Clase ${clase.idx+1}: ${escHtml(clase.titulo)}</span></div>`:''}
      </div>
      <div class="mat-cta-row">
        <button class="btn-block" style="width:auto;padding:14px 28px" onclick="abrirMaterialDescarga('${m.id}')">⬇ Abrir material</button>
        <button class="mat-bookmark ${fav?'on':''}" id="mat-fav-btn" onclick="toggleFavoritoMaterial('${m.id}')" title="Guardar"><svg fill="${fav?'currentColor':'none'}" stroke="currentColor" viewBox="0 0 24 24" style="width:19px;height:19px;stroke-width:1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-5-7 5V5z"/></svg></button>
      </div>
    </div>
  </div>
  ${hermanos.length?`<div class="sec-head" style="margin-top:30px"><h3>Más materiales de este curso</h3></div>
  <div class="course-grid">${hermanos.map(materialCard).join('')}</div>`:''}`;
}
async function abrirMaterialDescarga(id){
  if(!_tieneAcceso())return renderPaywall('Puedes consultar la ficha del material gratis; abrirlo o descargarlo requiere membresía.');
  const material=DATA.material.find(m=>m.id===id);
  const course=material&&DATA.cursos.find(c=>c.id===material.cursoId);
  if(course&&dripStatus(course).locked)return mostrarCursoProgramado(course);
  try{
    const data=await apiFetch('/material-acceso',{method:'POST',body:{materialId:id}});
    if(data.url)window.open(data.url,'_blank','noopener');
  }catch(err){toast(err.message||'Material no disponible');}
}

function renderNoticias(){
  if(LOADING)return `<h1 class="page-h">Descubre algo nuevo hoy</h1><p class="page-sub">Ideas, técnicas y curiosidades del sector.</p>`+skelNews(5);
  return `<h1 class="page-h">Descubre algo nuevo hoy</h1><p class="page-sub">Ideas, técnicas y curiosidades del mundo de la arquitectura y la construcción.</p>
  ${DATA.noticias.length?DATA.noticias.map(n=>`
    <div class="news-item" onclick="window.open('${n.url||'#'}','_blank')">
      <img class="news-thumb" src="${driveImg(n.img)}" alt="" loading="lazy" onerror="var p=this.closest('.news-item');if(p)p.remove();">
      <div><div class="news-src">${n.fuente||'IMDAC'}</div><h4>${n.titulo}</h4><p>${n.resumen||''}</p><div class="news-date">${n.fecha||''}</div></div>
    </div>`).join(''):emptyState('noticias','Aún no hay contenido por mostrar','Pronto encontrarás nuevas ideas y recursos del sector.')}`;
}

let _foroTab='recientes';
function renderForo(){
  if(LOADING)return `<h1 class="page-h">Foro</h1><p class="page-sub">Pregunta, comparte y aprende con la comunidad IMDAC.</p>`+skelNews(4);
  const puedePublicar=FB_OK&&CURRENT_USER&&CURRENT_USER.uid!=='demo';
  return `
  <div class="foro-hero">
    <div class="foro-pill">Comunidad activa</div>
    <h1>Foro IMDAC</h1>
    <p>Comparte dudas, casos de obra y experiencia con la comunidad de arquitectos e ingenieros del Club. Publica, comenta y reacciona.</p>
  </div>
  <div class="foro-composer">
    <div class="fc-row">
      <div class="fc-av">${puedePublicar?initials():'?'}</div>
      <div class="fc-body"><textarea id="nt-texto" rows="2" maxlength="1500" placeholder="¿Qué caso traes hoy? Comparte una pregunta o experiencia..." oninput="actualizarContadorForo()"></textarea></div>
    </div>
    <div class="fc-foot">
      <button class="fc-img-btn" onclick="toast('Las imágenes en el foro estarán disponibles pronto')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>Imagen</button>
      <span class="fc-count" id="fc-count">0 / 1500</span>
      <button class="fc-submit" onclick="publicarTema()">Publicar <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg></button>
    </div>
  </div>
  <div class="search-bar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg><input placeholder="Buscar temas..." oninput="filterForo(this.value)"></div>
  <div class="foro-tabs">
    <div class="foro-tab ${_foroTab==='recientes'?'active':''}" onclick="setForoTab('recientes')">Recientes</div>
    <div class="foro-tab ${_foroTab==='top'?'active':''}" onclick="setForoTab('top')">Más reacciones</div>
    <div class="foro-tab ${_foroTab==='mios'?'active':''}" onclick="setForoTab('mios')">Mis publicaciones</div>
  </div>
  <div id="foro-list">${renderForoList(DATA.foro)}</div>`;
}
function actualizarContadorForo(){
  const t=document.getElementById('nt-texto'),c=document.getElementById('fc-count');
  if(t&&c)c.textContent=`${t.value.length} / 1500`;
}
function setForoTab(tab){_foroTab=tab;renderSection('foro');}
function publicarTema(){
  if(!FB_OK||!CURRENT_USER||CURRENT_USER.uid==='demo'){toast('Inicia sesión para publicar');return;}
  const texto=(document.getElementById('nt-texto').value||'').trim();
  if(!texto){toast('Escribe algo para publicar');return;}
  const titulo=texto.length>70?texto.slice(0,70).trim()+'…':texto;
  const tema={titulo,texto,tag:'General',autor:CURRENT_USER.displayName||'Miembro',autorUid:CURRENT_USER.uid,fecha:new Date().toLocaleDateString('es-MX'),vistas:0,likes:0,creado:firebase.firestore.FieldValue.serverTimestamp()};
  db.collection('foro_temas').add(tema).then(ref=>{
    DATA.foro.unshift({id:ref.id,...tema});
    renderSection('foro');
    toast('¡Publicado!');
  }).catch(()=>toast('No se pudo publicar'));
}
function renderForoList(list){
  let arr=list.slice();
  const uid=CURRENT_USER&&CURRENT_USER.uid;
  if(_foroTab==='top')arr.sort((a,b)=>(b.likes||0)-(a.likes||0));
  else if(_foroTab==='mios')arr=arr.filter(t=>t.autorUid===uid);
  if(!arr.length) return `<div class="foro-empty"><div class="fe-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M8 10h8M8 14h5m-9 7V7a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4z"/></svg></div><b>La conversación empieza aquí</b><span>${_foroTab==='mios'?'Aún no has publicado nada en el foro.':'Todavía no hay publicaciones. Sé el primero en compartir una duda, caso o consejo.'}</span></div>`;
  return arr.map(t=>{
    const liked=(t.likedBy||[]).includes(uid);
    const autor=(t.autor||'Miembro').replace(/</g,'&lt;');
    const av=(t.autor||'M').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
    return `<div class="topic" onclick="toggleTema('${t.id}')">
      <div class="topic-head"><div class="topic-av">${av}</div><div class="topic-who"><span class="au">${autor}</span><span class="topic-date">${t.fecha||''}</span></div></div>
      <p>${(t.texto||'').replace(/</g,'&lt;')}</p>
      <div class="topic-meta"><span class="pill" style="background:var(--rojo-50);color:var(--rojo)">${t.tag||'General'}</span><span id="cardlk-${t.id}">${liked?'❤️':'🤍'} ${t.likes||0}</span></div>
    </div><div class="tema-panel" id="tp-${t.id}" style="display:none"></div>`;
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


function renderCanal(){
  const waIcon='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.138.563 4.14 1.535 5.874L0 24l6.29-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.814 9.814 0 01-5.058-1.4l-.361-.214-3.735.896.944-3.653-.235-.374A9.817 9.817 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>';
  const arrow='<svg class="cl-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>';
  return `
  <div class="canal-hero">
    <div class="canal-pill">Comunidad WhatsApp</div>
    <h1>Canal IMDAC</h1>
    <p>Únete a la comunidad y recibe novedades, webinars, avisos importantes y contenido para seguir creciendo como profesional de la construcción.</p>
  </div>
  <div class="canal-cta">
    <div class="cc-icon">${waIcon.replace('<svg ','<svg width="30" height="30" style="color:#25D366" ')}</div>
    <h2>Únete al canal oficial</h2>
    <p>Una comunidad para arquitectos, ingenieros y constructores. Información útil, sin ruido.</p>
    <div class="canal-stats">
      <div class="cs-item"><b>24/7</b><span>Activo</span></div>
      <div class="cs-item"><b>100%</b><span>Profesional</span></div>
      <div class="cs-item"><b>0</b><span>Spam</span></div>
    </div>
    <div class="canal-btns">
      <a class="btn-wa" href="${IMDAC.canalWA}" target="_blank" rel="noopener">${waIcon}Abrir canal</a>
      <button class="btn-wa-outline" onclick="compartirCanal()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342a3 3 0 100 4.316m0-4.316a3 3 0 110-4.684m0 4.684l6.632 4.316m0 0a3 3 0 105.368-1.658 3 3 0 00-5.368 1.658zm0-10.658a3 3 0 105.368 1.658 3 3 0 00-5.368-1.658z"/></svg>Compartir invitación</button>
    </div>
  </div>
  <div class="canal-link" onclick="window.open('https://wa.me/${IMDAC.soporte.l1}','_blank')">
    <div class="cl-icon" style="background:#25D366">${waIcon}</div>
    <div class="cl-body"><b>Soporte por WhatsApp</b><span>Ayuda con tu acceso, membresía o el contenido de la plataforma.</span></div>
    ${arrow}
  </div>
  <div class="canal-link" onclick="window.open('https://instagram.com/imd_ac','_blank')">
    <div class="cl-icon" style="background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></div>
    <div class="cl-body"><b>Síguenos en Instagram</b><span>Proyectos, avances de cursos y contenido visual.</span></div>
    ${arrow}
  </div>
  <div class="canal-link" onclick="window.open('https://www.facebook.com/IMDAC11','_blank')">
    <div class="cl-icon" style="background:#1877F2"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg></div>
    <div class="cl-body"><b>Síguenos en Facebook</b><span>Novedades, cursos y contenido del Instituto.</span></div>
    ${arrow}
  </div>
  <div class="canal-rules">
    <h3>Reglas de la comunidad</h3>
    ${rule('Respeto siempre.','Tratamos a todos los miembros con profesionalismo.')}
    ${rule('Comparte experiencia real.','Dudas, casos de obra y consejos que ayuden a otros profesionales.')}
    ${rule('Nada de spam ni venta directa.','El canal es para aprender y resolver dudas, no para ofrecer servicios externos.')}
  </div>`;
}
function rule(t,d){return `<div class="rule-item"><div class="ri-check"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></div><div><b>${t}</b><span>${d}</span></div></div>`;}
function compartirCanal(){
  if(navigator.share){navigator.share({title:'Canal IMDAC',text:'Únete al canal de WhatsApp del Club IMDAC',url:IMDAC.canalWA}).catch(()=>{});return;}
  navigator.clipboard?.writeText(IMDAC.canalWA);
  toast('Enlace del canal copiado');
}

/* ====== DIRECTORIO VIP ======
   Tarjeta profesional opcional por socio, en su propia colección
   `directorio` (nunca en `miembros`, que trae datos de facturación).
   Visible por default — cada quien puede ocultarse con el checkbox
   "Mostrar mi tarjeta en el directorio" dentro de su propia tarjeta. */
/* En false hasta que el proyecto pase al plan Blaze: Storage no funciona en
   Spark. Mientras tanto la tarjeta usa iniciales en vez de foto — nada roto,
   nada que prometa un botón que hoy fallaría. Un solo cambio aquí lo reactiva. */
const DIRECTORIO_FOTOS_ACTIVAS=false;
const SECTORES_DIRECTORIO=['Arquitectura','Ingeniería Civil','Construcción y Obra','Diseño de Interiores','Instalaciones','Topografía','Costos y Presupuestos','Normatividad','Gestión de Obra','Consultoría','Docencia','Otro'];
const COVER_COLORS=[
  'linear-gradient(135deg,#a78bfa,#818cf8)',
  'linear-gradient(135deg,#ff2c2c,#ff6a6a)',
  'linear-gradient(135deg,#f6c453,#e8a33d)',
  'linear-gradient(135deg,#60a5fa,#3b82f6)',
  'linear-gradient(135deg,#34d399,#10b981)',
  'linear-gradient(135deg,#fb923c,#f97316)',
  'linear-gradient(135deg,#be6a7a,#9d4a5c)',
  'linear-gradient(135deg,#94a3b8,#64748b)'
];
const ICONS_CONTACTO={
  whatsapp:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.138.563 4.14 1.535 5.874L0 24l6.29-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.814 9.814 0 01-5.058-1.4l-.361-.214-3.735.896.944-3.653-.235-.374A9.817 9.817 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>',
  email:'<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
  linkedin:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 11.001-4.124 2.062 2.062 0 01-.001 4.124zM7.114 20.452H3.558V9h3.556v11.452z"/></svg>',
  instagram:'<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
  web:'<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke-width="2"/><path stroke-linecap="round" stroke-width="2" d="M3 12h18M12 3a15 15 0 010 18 15 15 0 010-18z"/></svg>'
};
let _dirQuery='',_dirSector='Todos';
function miTarjeta(){return (DATA.directorio||[]).find(x=>x.uid===(CURRENT_USER&&CURRENT_USER.uid));}
function normalizarUrlContacto(v,prefix){
  v=(v||'').trim(); if(!v)return '';
  if(/^https?:\/\//i.test(v))return v;
  if(prefix)return 'https://'+prefix+v.replace(/^@/,'').replace(new RegExp('^'+prefix),'');
  return 'https://'+v;
}
function cardContactIcons(c){
  const t=c.contacto||{}, out=[];
  if(t.whatsapp)out.push(['https://wa.me/'+waDigits(t.whatsapp),ICONS_CONTACTO.whatsapp,'WhatsApp']);
  if(t.email)out.push(['mailto:'+t.email,ICONS_CONTACTO.email,'Correo']);
  if(t.linkedin)out.push([normalizarUrlContacto(t.linkedin,'linkedin.com/'),ICONS_CONTACTO.linkedin,'LinkedIn']);
  if(t.instagram)out.push([normalizarUrlContacto(t.instagram,'instagram.com/'),ICONS_CONTACTO.instagram,'Instagram']);
  if(t.web)out.push([normalizarUrlContacto(t.web),ICONS_CONTACTO.web,'Sitio web']);
  return out;
}
function directorioFiltrado(){
  const q=_dirQuery.toLowerCase().trim();
  return (DATA.directorio||[]).filter(c=>{
    if(_dirSector!=='Todos'&&c.sector!==_dirSector)return false;
    if(!q)return true;
    return [c.nombre,c.puesto,c.empresa].filter(Boolean).join(' ').toLowerCase().includes(q);
  });
}
function dirCard(c){
  const uid=CURRENT_USER&&CURRENT_USER.uid;
  const esMio=c.uid===uid;
  const av=(c.nombre||'Miembro').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const cover=COVER_COLORS[Number(c.colorPortada)||0];
  const links=cardContactIcons(c);
  return `<div class="dir-card" ${esMio?'onclick="abrirMiTarjeta()" style="cursor:pointer"':''}>
    ${esMio?'<span class="dcard-me">● TÚ</span>':''}
    <div class="dcard-cover" style="background:${cover}"></div>
    <div class="dcard-av">${c.foto?`<img src="${escHtml(c.foto)}" alt="">`:`<b>${escHtml(av)}</b>`}</div>
    <div class="dcard-body">
      <h4>${escHtml(c.nombre||'Miembro IMDAC')}</h4>
      <div class="dcard-role">${escHtml(c.puesto||'Miembro IMDAC')}${c.empresa?' · '+escHtml(c.empresa):''}</div>
      ${c.sector?`<span class="dcard-sector">${escHtml(c.sector)}</span>`:''}
      ${c.bio?`<p class="dcard-bio">${escHtml(c.bio)}</p>`:''}
      ${links.length?`<div class="dcard-contact">${links.map(([href,svg,label])=>`<a href="${href}" target="_blank" rel="noopener" title="${label}" onclick="event.stopPropagation()">${svg}</a>`).join('')}</div>`:'<div class="dcard-empty">Sin datos de contacto</div>'}
    </div>
  </div>`;
}
function renderDirectorio(){
  if(LOADING)return `<h1 class="page-h">Directorio VIP</h1><p class="page-sub">Conecta con la comunidad del Club.</p>`+skelGrid(4);
  const uid=CURRENT_USER&&CURRENT_USER.uid;
  const mia=miTarjeta();
  const otros=directorioFiltrado().filter(c=>c.uid!==uid);
  const sectorChips=['Todos',...SECTORES_DIRECTORIO].map(s=>`<button class="filter ${_dirSector===s?'active':''}" onclick="setDirSector('${s.replace(/'/g,"\\'")}')">${s}</button>`).join('');
  return `
  <div class="dir-hero">
    <div class="dir-pill">Networking profesional</div>
    <h1>Directorio IMDAC</h1>
    <p>Conecta con la comunidad del Club. Crea tu tarjeta profesional y descubre a otros arquitectos, ingenieros y constructores.</p>
  </div>
  <div class="dir-cta">
    <div class="dc-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg></div>
    <div class="dc-body"><b>Destaca con tu tarjeta profesional</b><span>Comparte tu experiencia y permite que otros socios conozcan tu trabajo.</span></div>
    <button onclick="abrirMiTarjeta()">${mia?'✏️ Editar mi tarjeta':'+ Crear mi tarjeta'}</button>
  </div>
  <div class="search-bar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg><input placeholder="Buscar por nombre, empresa o puesto..." value="${escHtml(_dirQuery)}" oninput="setDirQuery(this.value)"></div>
  <div class="filters">${sectorChips}</div>
  <div class="dir-section-label">Tu tarjeta profesional</div>
  <div class="dir-grid">${mia?dirCard(mia):`<div class="dir-card dcard-invite" onclick="abrirMiTarjeta()"><div class="dcard-invite-in"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg><b>Crea tu tarjeta</b><span>Aún no tienes una tarjeta en el directorio.</span></div></div>`}</div>
  <div class="dir-section-label">Miembros de la comunidad</div>
  <div class="dir-grid" id="dir-grid">${otros.length?otros.map(dirCard).join(''):`<div class="card" style="grid-column:1/-1"><div class="empty"><b>Aún no hay tarjetas aquí</b><span>Sé de los primeros en aparecer en el directorio.</span></div></div>`}</div>`;
}
function setDirQuery(v){
  _dirQuery=v;
  const g=document.getElementById('dir-grid'); if(!g)return;
  const uid=CURRENT_USER&&CURRENT_USER.uid;
  const otros=directorioFiltrado().filter(c=>c.uid!==uid);
  g.innerHTML=otros.length?otros.map(dirCard).join(''):`<div class="card" style="grid-column:1/-1"><div class="empty"><b>Sin resultados</b><span>Prueba con otra búsqueda o filtro.</span></div></div>`;
}
function setDirSector(s){_dirSector=s;renderSection('directorio');}
let _tarjetaFotoURL='';
function abrirMiTarjeta(onboarding=false){
  if(!FB_OK||!CURRENT_USER||CURRENT_USER.uid==='demo'){toast('Inicia sesión para crear tu tarjeta');return;}
  const c=miTarjeta()||{};
  const t=c.contacto||{};
  const colorActual=Number(c.colorPortada)||0;
  _tarjetaFotoURL=c.foto||'';
  document.getElementById('modal-content').innerHTML=`<div class="modal-body dcard-modal">
    <div class="dm-banner">
      <div class="dm-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg></div>
      <div style="flex:1"><h3>${onboarding?'Tu perfil profesional':'Mi tarjeta profesional'}</h3><div class="dm-sub">${onboarding?'Guardaremos estos datos para preparar tu tarjeta del Directorio VIP. Permanecerá privada hasta activar tu membresía.':'Aparecerá en el Directorio VIP'}</div></div>
      <button class="modal-x" onclick="closeModal()" aria-label="Cerrar">✕</button>
    </div>
    <div class="dm-body">
      ${!onboarding&&DIRECTORIO_FOTOS_ACTIVAS?`
      <div class="dcard-photo-row">
        <div class="dcard-photo" id="dc-foto-preview">${_tarjetaFotoURL?`<img src="${escHtml(_tarjetaFotoURL)}" alt="">`:`<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`}</div>
        <input type="file" id="dc-foto-input" accept="image/*" style="display:none" onchange="subirFotoTarjeta(event)">
        <button type="button" class="dcard-photo-btn" id="dc-foto-btn" onclick="document.getElementById('dc-foto-input').click()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>Subir foto</button>
      </div>`:''}
      ${!onboarding?`<label style="display:block;font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:9px">Portada de tu tarjeta</label>
      <div class="dcard-preview-cover" id="dc-preview" style="background:${COVER_COLORS[colorActual]}"></div>
      <div class="color-pick">${COVER_COLORS.map((g,i)=>`<button type="button" style="background:${g}" class="${colorActual===i?'active':''}" data-color-i="${i}" onclick="elegirColorTarjeta(${i})" title="Color ${i+1}"></button>`).join('')}</div>`:''}
      ${onboarding?`<input type="hidden" id="dc-nombre" value="${escHtml(c.nombre||CURRENT_USER.displayName||'')}">`:`<div class="field"><label>Nombre completo</label><input id="dc-nombre" value="${escHtml(c.nombre||CURRENT_USER.displayName||'')}" placeholder="Tu nombre completo"></div>`}
      <div class="field"><label>Puesto o profesión${onboarding?' *':''}</label><input id="dc-puesto" value="${escHtml(c.puesto)}" placeholder="Ej. Arquitecto, ingeniero, residente de obra"></div>
      <div class="field"><label>Empresa o negocio (opcional)</label><input id="dc-empresa" value="${escHtml(c.empresa)}" placeholder="Ej. Despacho Arquitectura MX"></div>
      <div class="field"><label>Área principal${onboarding?' *':''}</label><select id="dc-sector"><option value="">Selecciona un área</option>${SECTORES_DIRECTORIO.map(s=>`<option ${c.sector===s?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="field"><label>Cuéntanos brevemente sobre tu experiencia (opcional)</label><textarea id="dc-bio" rows="3" placeholder="Ej. Especialista en supervisión y ejecución de obra.">${escHtml(c.bio)}</textarea></div>
      <div class="dcard-contact-head">Contacto (todos opcionales)</div>
      <div class="field"><label>WhatsApp</label><input id="dc-whatsapp" value="${escHtml(t.whatsapp)}" placeholder="Ej. 52 55 1234 5678"></div>
      <div class="field"><label>Correo</label><input id="dc-email" value="${escHtml(t.email)}" placeholder="correo@ejemplo.com"></div>
      <div class="field"><label>Instagram</label><input id="dc-instagram" value="${escHtml(t.instagram)}" placeholder="instagram.com/tu-perfil o @tu-perfil"></div>
      ${!onboarding?`<div class="field"><label>LinkedIn</label><input id="dc-linkedin" value="${escHtml(t.linkedin)}" placeholder="linkedin.com/in/tu-perfil"></div>
      <div class="field"><label>Sitio web</label><input id="dc-web" value="${escHtml(t.web)}" placeholder="tusitio.com"></div>
      <div class="dcard-visible-row"><label><input type="checkbox" id="dc-visible" ${c.visible===false?'':'checked'}> Mostrar mi tarjeta en el directorio</label></div>`:''}
    </div>
    <div class="modal-foot" style="padding:0 22px 22px">
      <button class="btn-ghost" onclick="${onboarding?'closeModal();siguientePasoOnboarding()':'closeModal()'}">${onboarding?'Completar después':'Cancelar'}</button>
      <button class="btn-save" id="modal-save" onclick="guardarTarjeta(${onboarding})">${onboarding?'Guardar mi perfil profesional':'Guardar tarjeta'}</button>
    </div>
  </div>`;
  document.getElementById('modal').classList.add('open');
}
function elegirColorTarjeta(i){
  document.querySelectorAll('.color-pick button').forEach((b,bi)=>b.classList.toggle('active',bi===i));
  const prev=document.getElementById('dc-preview'); if(prev)prev.style.background=COVER_COLORS[i];
}
/* Redimensiona en el navegador antes de subir: un avatar no necesita la foto
   de 8MB que entrega un celular moderno, y así el límite de 3MB de Storage
   casi nunca se topa por culpa del tamaño del archivo original. */
function redimensionarImagen(file,max=480){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      URL.revokeObjectURL(url);
      const esc_=Math.min(1,max/Math.max(img.width,img.height));
      const w=Math.round(img.width*esc_), h=Math.round(img.height*esc_);
      const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
      cv.getContext('2d').drawImage(img,0,0,w,h);
      cv.toBlob(blob=>blob?resolve(blob):reject(new Error('No se pudo procesar la imagen')),'image/jpeg',.86);
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Archivo de imagen inválido'));};
    img.src=url;
  });
}
function subirFotoTarjeta(ev){
  const file=ev.target.files&&ev.target.files[0]; if(!file)return;
  if(!/^image\//.test(file.type)){toast('Solo se aceptan imágenes');ev.target.value='';return;}
  if(file.size>8*1024*1024){toast('La imagen pesa demasiado (máx. 8MB)');ev.target.value='';return;}
  const btn=document.getElementById('dc-foto-btn'); const prev=document.getElementById('dc-foto-preview');
  if(btn){btn.classList.add('loading');btn.lastChild.textContent='Subiendo…';}
  redimensionarImagen(file).then(blob=>{
    const ref=storage.ref().child('directorio/'+CURRENT_USER.uid+'/foto.jpg');
    return ref.put(blob,{contentType:'image/jpeg'}).then(()=>ref.getDownloadURL());
  }).then(url=>{
    _tarjetaFotoURL=url;
    if(prev)prev.innerHTML=`<img src="${escHtml(url)}" alt="">`;
    toast('Foto lista — recuerda guardar la tarjeta');
  }).catch(()=>toast('No se pudo subir la foto')).finally(()=>{
    if(btn){btn.classList.remove('loading');btn.lastChild.textContent='Subir foto';}
    ev.target.value='';
  });
}
function guardarTarjeta(onboarding=false){
  if(!CURRENT_USER||CURRENT_USER.uid==='demo')return;
  const nombre=(document.getElementById('dc-nombre').value||'').trim();
  if(!nombre){toast('Ponle tu nombre a la tarjeta');return;}
  if(onboarding&&!(document.getElementById('dc-puesto').value||'').trim())return toast('Indica tu puesto o profesión');
  if(onboarding&&!document.getElementById('dc-sector').value)return toast('Selecciona tu área principal');
  const activeBtn=document.querySelector('.color-pick button.active');
  const colorPortada=activeBtn?Number(activeBtn.dataset.colorI):0;
  const data={
    nombre,
    foto:_tarjetaFotoURL||'',
    puesto:(document.getElementById('dc-puesto').value||'').trim(),
    empresa:(document.getElementById('dc-empresa').value||'').trim(),
    sector:document.getElementById('dc-sector').value||'',
    bio:(document.getElementById('dc-bio').value||'').trim(),
    colorPortada,
    contacto:{
      whatsapp:(document.getElementById('dc-whatsapp')?.value||'').trim(),
      email:(document.getElementById('dc-email')?.value||'').trim(),
      linkedin:(document.getElementById('dc-linkedin')?.value||'').trim(),
      instagram:(document.getElementById('dc-instagram')?.value||'').trim(),
      web:(document.getElementById('dc-web')?.value||'').trim()
    },
    visible:onboarding?false:!!document.getElementById('dc-visible')?.checked,
    actualizado:firebase.firestore.FieldValue.serverTimestamp()
  };
  const btn=document.getElementById('modal-save'); if(btn){btn.disabled=true;btn.textContent='Guardando…';}
  db.collection('directorio').doc(CURRENT_USER.uid).set(data,{merge:true}).then(()=>{
    const idx=(DATA.directorio||[]).findIndex(x=>x.uid===CURRENT_USER.uid);
    const withUid={uid:CURRENT_USER.uid,...data};
    if(idx>=0)DATA.directorio[idx]=withUid; else (DATA.directorio=DATA.directorio||[]).push(withUid);
    closeModal();
    if(onboarding)siguientePasoOnboarding();
    if(currentSection==='directorio')renderSection('directorio');
    toast('Tarjeta guardada');
  }).catch(()=>{if(btn){btn.disabled=false;btn.textContent='Guardar tarjeta';}toast('No se pudo guardar tu tarjeta');});
}

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
function setNotiPref(cat,on){const p=notisPrefs();p[cat]=on;try{localStorage.setItem(NOTIS_PREF_KEY,JSON.stringify(p));}catch(e){}updateNotisBadge();refreshNotisPanel();toast(on?'Recibirás estos avisos':'No recibirás estos avisos');}
function notiCategoria(n){return NOTI_EMOJI_CAT[n.emoji]||'anuncio';}
function notiPermitida(n){if(n.paraUid)return true;return notisPrefs()[notiCategoria(n)]!==false;}
function notisNoLeidas(){const rd=_notisArr(NOTIS_READ_KEY);return notisVisibles().filter(n=>!rd.includes(n.id)).length;}
function updateNotisBadge(){
  const n=notisNoLeidas();
  const bd=document.getElementById('bell-dot');
  if(bd){if(n>0){bd.style.display='flex';bd.textContent=n>9?'9+':n;}else{bd.style.display='none';}}
}
function escucharNotis(){
  if(!FB_OK||!CURRENT_USER||CURRENT_USER.uid==='demo')return;
  db.collection('notificaciones').onSnapshot(snap=>{
    const uid=CURRENT_USER&&CURRENT_USER.uid;
    DATA.notificaciones=snap.docs.map(d=>({id:d.id,...d.data()}))
      .filter(n=>!n.paraUid||n.paraUid===uid)
      .sort((a,b)=>((b.creado&&b.creado.toMillis?b.creado.toMillis():0)-(a.creado&&a.creado.toMillis?a.creado.toMillis():0)));
    updateNotisBadge();
    refreshNotisPanel();
  },()=>{});
}
function eliminarNoti(id){
  const del=notisDismissed(); if(!del.includes(id)){del.push(id);_notisSet(NOTIS_DEL_KEY,del);}
  refreshNotisPanel(); updateNotisBadge();
}
function eliminarTodasNotis(){
  const del=notisDismissed(); notisVisibles().forEach(n=>{if(!del.includes(n.id))del.push(n.id);});
  _notisSet(NOTIS_DEL_KEY,del); refreshNotisPanel(); updateNotisBadge();
}
function marcarNotisLeidas(){
  const rd=_notisArr(NOTIS_READ_KEY); let ch=false;
  notisVisibles().forEach(n=>{if(!rd.includes(n.id)){rd.push(n.id);ch=true;}});
  if(ch)_notisSet(NOTIS_READ_KEY,rd);
  updateNotisBadge();
}
/* Campanita del topbar: dropdown en vez de página aparte, igual que el patrón
   de DulceLab. El panel vive siempre en el DOM (#notis-pop) y solo se llena
   y se marca como leído cuando realmente se abre. */
function notisPanelHTML(){
  const vis=notisVisibles();
  const lista=vis.length
    ?vis.map(n=>`<div class="noti-item"><div class="noti-ic">${n.emoji||'📢'}</div><div class="noti-body"><h4>${(n.titulo||'').replace(/</g,'&lt;')}</h4><p>${(n.mensaje||'').replace(/</g,'&lt;')}</p><span class="noti-date">${n.fecha||''}</span></div><button class="noti-del" onclick="event.stopPropagation();eliminarNoti('${n.id}')" title="Eliminar">🗑️</button></div>`).join('')
    :'<div class="notis-pop-empty">Todo al día. Te avisaremos cuando haya novedades.</div>';
  return `<div class="notis-pop-head"><h4>Notificaciones</h4>${vis.length?`<button onclick="event.stopPropagation();eliminarTodasNotis()">Eliminar todas</button>`:''}</div>
  <div class="notis-pop-body">${lista}</div>`;
}
function refreshNotisPanel(){
  const pop=document.getElementById('notis-pop');
  if(pop&&pop.classList.contains('open'))pop.innerHTML=notisPanelHTML();
}
function toggleNotisPanel(ev){
  if(ev)ev.stopPropagation();
  const pop=document.getElementById('notis-pop'); if(!pop)return;
  const willOpen=!pop.classList.contains('open');
  pop.classList.toggle('open',willOpen);
  if(willOpen){pop.innerHTML=notisPanelHTML();marcarNotisLeidas();}
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
    ['Clases en vivo','Sesiones mensuales con expertos','M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'],
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
  const porCancelar=!!m.cancelaAlFinal&&estado==='Activo';
  const plan=esRegalo?'Acceso de cortesía':(m.plan?('IMDAC '+m.plan):'IMDAC Mensual');
  const renuevaReal=esRegalo?(m.vigenciaHasta||'—'):(m.renovacion||renueva);
  const precioTxt=m.plan==='Anual'?'':(`$${IMDAC.precio||499} <span>MXN / mes</span>`);
  const badge=porCancelar
    ?`<span class="sub-status" style="background:#fff3e0;color:#b86b00">Finaliza el ${renuevaReal}</span>`
    :`<span class="sub-status" style="${estado!=='Activo'?'background:#fde8e8;color:#c0392b':''}">${estado==='Activo'?'Activa':estado}</span>`;
  return `<h1 class="page-h">Mi Suscripción</h1><p class="page-sub">Detalles de tu plan y beneficios activos.</p>
  <div class="sub-card">
    <div class="sub-top"><span class="sub-badge">✦ Premium</span>${badge}</div>
    <div class="sub-plan">${plan}</div>
    ${precioTxt?`<div class="sub-price">${precioTxt}</div>`:''}
    <div class="sub-divider"></div>
    <div class="sub-meta2">
      <div><div class="ml">Miembro desde</div><div class="mv">${alta}</div></div>
      <div><div class="ml">${esRegalo?'Acceso hasta':(porCancelar?'Acceso hasta':'Próxima renovación')}</div><div class="mv">${renuevaReal}</div></div>
      <div><div class="ml">Método de pago</div><div class="mv">${esRegalo?'Cortesía IMDAC':'Stripe'}</div></div>
    </div>
    ${porCancelar?`<p style="color:#b86b00;font-size:.88rem;margin-top:12px">Tu suscripción está cancelada: no se te cobrará de nuevo y conservas el acceso hasta el ${renuevaReal}.</p>`:''}
    <div class="sub-actions">
      ${esRegalo?'' : porCancelar
        ?`<button class="btn-manage" onclick="reactivarSub()">Reactivar suscripción</button>`
        :`<button class="btn-cancel" onclick="cancelarSub()">Cancelar suscripción</button>`}
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
/* Lunes 00:00 de la semana de una fecha, para agrupar días visitados por semana. */
function _inicioSemana(d){const x=new Date(d);const dia=(x.getDay()+6)%7;x.setDate(x.getDate()-dia);x.setHours(0,0,0,0);return x;}
function diasVisitaSemanaActual(){
  const inicio=_inicioSemana(new Date());
  const set=new Set();
  _statArr('imdac_dias').forEach(f=>{const d=new Date(f+'T00:00:00');if(d>=inicio)set.add((d.getDay()+6)%7);});
  return set; // índices 0=lunes … 6=domingo
}
function rachaSemanas(){
  const dias=_statArr('imdac_dias'); if(!dias.length)return 0;
  const semanas=new Set(dias.map(f=>_inicioSemana(new Date(f+'T00:00:00')).toISOString().slice(0,10)));
  let racha=0,cur=_inicioSemana(new Date());
  while(semanas.has(cur.toISOString().slice(0,10))){racha++;cur=new Date(cur);cur.setDate(cur.getDate()-7);}
  return racha;
}
/* Nivel por puntos: 10 por clase vista, 50 por curso completado — mismas
   cifras que ya mostraba calcLogros() en sus metas, solo que ahora también
   se traducen en una progresión visual. Nombres reutilizan el vocabulario
   de obra que ya usan los logros (Constructor, Residente, Maestro de obra),
   para no inventar un segundo vocabulario de niveles sin relación. */
const NIVELES_LOGROS=[{n:'Aprendiz',min:0},{n:'Oficial',min:100},{n:'Residente',min:300},{n:'Maestro de obra',min:600}];
function nivelPorPuntos(pts){
  let actual=NIVELES_LOGROS[0],siguiente=NIVELES_LOGROS[1]||null;
  for(let i=0;i<NIVELES_LOGROS.length;i++){if(pts>=NIVELES_LOGROS[i].min){actual=NIVELES_LOGROS[i];siguiente=NIVELES_LOGROS[i+1]||null;}}
  return{actual,siguiente};
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
  /* Metas relativas al catálogo que este socio ve.
     Estaban fijas en 3/5/7/10 de cuando el catálogo tenía 10 cursos siempre. Al
     ocultar cursos (estado "Borrador"), /catalogo devuelve menos y esas metas se
     volvían inalcanzables: la insignia quedaba en pantalla como una promesa que
     el club ya no puede cumplir. Ahora salen del catálogo recibido.
     Las fracciones reproducen las metas originales sobre 10 cursos —
     3/10, 5/10 (la "mitad"), 7/10 y el catálogo entero— así que con el catálogo
     completo nada cambia respecto a antes.
     Si el catálogo aún no ha llegado (recarga, modo demo), se usan las de
     siempre en vez de mostrar metas de 1. */
  const totalCursos=(DATA.cursos||[]).length;
  const metaCursos=(fraccion,porDefecto)=>totalCursos?Math.max(1,Math.ceil(totalCursos*fraccion)):porDefecto;
  const mConstructor=metaCursos(0.3,3);
  const mSupervisor=metaCursos(0.5,5);
  const mResidente=metaCursos(0.7,7);
  const mMaestro=metaCursos(1,10);
  const cursosTxt=(n)=>`${n} curso${n===1?'':'s'}`;
  // Las categorías del catálogo visible, por el mismo motivo: si sólo quedaran
  // dos a la vista, "3 categorías distintas" sería inalcanzable.
  const totalCats=new Set((DATA.cursos||[]).map(c=>c.categoria||'General')).size;
  const mCategorias=totalCats?Math.min(3,totalCats):3;
  const lista=[
    {n:'Primer paso',d:'Inicia tu primer curso',ic:'🎯',v:iniciados,m:1,g:'aprendizaje'},
    {n:'Manos a la obra',d:'Completa tu primera clase',ic:'🧱',v:clasesTot,m:1,g:'aprendizaje'},
    {n:'Pico y pala',d:'Completa 10 clases',ic:'🔨',v:clasesTot,m:10,g:'aprendizaje'},
    {n:'Media jornada',d:'Completa 25 clases',ic:'⏱️',v:clasesTot,m:25,g:'aprendizaje'},
    {n:'Jornada completa',d:'Completa 50 clases',ic:'🚧',v:clasesTot,m:50,g:'aprendizaje'},
    {n:'Cimientos firmes',d:'Completa tu primer curso',ic:'🏠',v:completos,m:1,g:'aprendizaje'},
    {n:'Constructor',d:`Completa ${cursosTxt(mConstructor)}`,ic:'🏗️',v:completos,m:mConstructor,g:'aprendizaje'},
    {n:'Supervisor',d:`Completa ${cursosTxt(mSupervisor)} · mitad del catálogo`,ic:'📐',v:completos,m:mSupervisor,g:'aprendizaje'},
    {n:'Residente de obra',d:`Completa ${cursosTxt(mResidente)}`,ic:'🦺',v:completos,m:mResidente,g:'aprendizaje'},
    {n:'Maestro de obra',d:`Completa los ${cursosTxt(mMaestro)} del catálogo`,ic:'👷',v:completos,m:mMaestro,g:'aprendizaje'},
    {n:'Multidisciplinario',d:`Completa cursos de ${mCategorias} categorías distintas`,ic:'🗂️',v:catsCompletas,m:mCategorias,g:'aprendizaje'},
    {n:'Coleccionista',d:'Descarga tu primer certificado',ic:'📜',v:certsDesc,m:1,g:'certificacion'},
    {n:'Galería de títulos',d:'Descarga 5 certificados',ic:'🖼️',v:certsDesc,m:5,g:'certificacion'},
    {n:'Voz del gremio',d:'Publica tu primer tema en el foro',ic:'💬',v:misTemas.length,m:1,g:'comunidad'},
    {n:'Cronista',d:'Publica 3 temas en el foro',ic:'✍️',v:misTemas.length,m:3,g:'comunidad'},
    {n:'Líder de opinión',d:'Publica 5 temas en el foro',ic:'📣',v:misTemas.length,m:5,g:'comunidad'},
    {n:'Buen colega',d:'Reacciona a un tema del foro',ic:'❤️',v:diLike?1:0,m:1,g:'comunidad'},
    {n:'Mano amiga',d:'Reacciona a 5 temas del foro',ic:'🤝',v:likesDados,m:5,g:'comunidad'},
    {n:'Corazón de oro',d:'Reacciona a 15 temas del foro',ic:'💞',v:likesDados,m:15,g:'comunidad'},
    {n:'Influencer',d:'Recibe 10 reacciones en tus temas',ic:'⭐',v:likesRecibidos,m:10,g:'comunidad'},
    {n:'Voz respetada',d:'Recibe 25 reacciones en tus temas',ic:'🌟',v:likesRecibidos,m:25,g:'comunidad'},
    {n:'Constante',d:'Visita el club 7 días distintos',ic:'📅',v:diasVisita,m:7,g:'constancia'},
    {n:'Racha de fuego',d:'Visita el club 30 días distintos',ic:'🔥',v:diasVisita,m:30,g:'constancia'},
    {n:'Leyenda IMDAC',d:'Catálogo completo + 25 reacciones recibidas',ic:'🏆',v:(completos>=mMaestro&&likesRecibidos>=25)?1:0,m:1,g:'especial'},
  ].map(l=>({...l,ok:l.v>=l.m}));
  const puntos=(Number(DATA.xp)||0)+clasesTot*10+completos*50;
  return{lista,clasesTot,completos,totalCursos,puntos};
}
const LOGROS_GRUPOS=[
  {g:'aprendizaje',t:'Aprendizaje'},
  {g:'certificacion',t:'Certificación'},
  {g:'comunidad',t:'Comunidad'},
  {g:'constancia',t:'Constancia'},
  {g:'especial',t:'Especial'},
];
function logroCard(l){
  const pct=Math.min(100,Math.round((l.v/l.m)*100));
  return `<div class="card logro-card ${l.ok?'ok':''}" style="padding:22px">
    <div class="logro-ic-wrap"><span class="logro-ic">${l.ic}</span></div>
    <h4 style="font-family:var(--font-display);margin:0 0 4px;text-align:center">${l.n}</h4>
    <p style="color:var(--muted);font-size:.86rem;text-align:center">${l.d}</p>
    ${l.ok?'<span class="pill" style="background:var(--rojo-50);color:var(--rojo);margin-top:10px">✓ Desbloqueado</span>'
      :`<div class="logro-bar"><i style="width:${pct}%"></i></div><span class="logro-cnt">${Math.min(l.v,l.m)}/${l.m}</span>`}
  </div>`;
}
function renderLogros(){
  const{lista,clasesTot,completos,totalCursos,puntos}=calcLogros();
  const des=lista.filter(l=>l.ok).length;
  const completados=DATA.cursos.filter(c=>(DATA.progresos[c.id]||0)>=100);
  const{actual,siguiente}=nivelPorPuntos(puntos);
  const rangoIni=actual.min, rangoFin=siguiente?siguiente.min:actual.min;
  const pctNivel=siguiente?Math.max(0,Math.min(1,(puntos-rangoIni)/(rangoFin-rangoIni))):1;
  const r=34,circ=2*Math.PI*r;
  const dias=diasVisitaSemanaActual();
  const DIAS=['L','M','M','J','V','S','D'];
  return `<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:18px"><div><h1 class="page-h">Logros</h1><p class="page-sub">Tu progreso y reconocimientos en el club.</p></div><span class="pill" style="background:var(--rojo-50);color:var(--rojo);font-weight:700">${des}/${lista.length} desbloqueados</span></div>
  <div class="logros-hero">
    <div class="lh-main">
      <div class="lh-pill">🎓 Nivel ${escHtml(actual.n)}</div>
      <div class="lh-pts">${puntos} puntos</div>
      <div class="lh-sub">${siguiente?`${rangoFin-puntos} puntos para ${escHtml(siguiente.n)} · 10 por clase, 50 por curso`:'Nivel máximo alcanzado · 10 por clase, 50 por curso'}</div>
      <div class="lh-track"><i style="width:${Math.round(pctNivel*100)}%"></i></div>
      <div class="lh-stats">
        <div><b>${rachaSemanas()}</b><span>Semanas de racha</span></div>
        <div><b>${clasesTot}</b><span>Clases vistas</span></div>
        <div><b>${completos}/${totalCursos||0}</b><span>Cursos completados</span></div>
      </div>
    </div>
    <div class="lh-ring-wrap">
      <div class="lh-ring"><svg width="96" height="96"><circle cx="48" cy="48" r="${r}" stroke="rgba(255,255,255,.15)" stroke-width="8" fill="none"/><circle cx="48" cy="48" r="${r}" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ*(1-pctNivel)}"/></svg><b>${siguiente?`${puntos}/${rangoFin}`:'MAX'}</b></div>
      <div class="lh-week">${DIAS.map((d,i)=>`<span class="${dias.has(i)?'on':''}">${d}</span>`).join('')}</div>
    </div>
  </div>
  ${LOGROS_GRUPOS.map(({g,t})=>{
    const items=lista.filter(l=>l.g===g); if(!items.length)return '';
    return `<div class="logros-grupo"><h3>${t}</h3><div class="course-grid">${items.map(logroCard).join('')}</div></div>`;
  }).join('')}`;
}
function renderCertificados(){
  const completados=DATA.cursos.filter(c=>(DATA.progresos[c.id]||0)>=100);
  const descargados=new Set(_statArr('imdac_certs'));
  const certIcon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
  const dlIcon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" style="width:15px;height:15px"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>';
  return `<div class="cert-hero">
    <div class="cert-pill">Tu progreso</div>
    <h1>Certificados</h1>
    <p>Descarga la constancia oficial de cada curso que completes en el Club IMDAC, con folio y código QR de verificación.</p>
  </div>
  ${completados.length?completados.map(c=>{
    const ya=descargados.has(c.id);
    return `<div class="cert-row">
      <div class="cr-ic">${certIcon}</div>
      <div class="cr-body"><b>${escHtml(c.titulo)}</b><span>${escHtml(c.categoria||'General')}</span></div>
      ${ya?'<span class="cr-badge">✓ Descargado</span>':''}
      <button class="cr-btn" onclick="generarCertificado('${c.id}')">${dlIcon}Descargar PDF</button>
    </div>`;
  }).join(''):`<div class="card"><div class="cert-empty">
    <div class="ce-ic">${certIcon}</div>
    <b>Aún no tienes certificados</b>
    <span>Completa un curso del catálogo para generar tu primera constancia.</span><br>
    <button class="cr-btn" onclick="go('biblioteca')">Ver catálogo de cursos</button>
  </div></div>`}`;
}

function renderConfig(){
  const dark=document.documentElement.dataset.theme==='dark';
  const installed=pwaIsInstalled();
  const ios=pwaIsIOS();
  const prefs=notisPrefs();
  const notifs=[
    ['Nuevos cursos','Recibe aviso cuando se suba un nuevo curso','curso'],
    ['Clases en vivo','Recordatorio antes de cada sesión','webinar'],
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
    <h3>Aplicación IMDAC</h3>
    <p class="cfg-note" style="margin:-8px 0 16px">Instalación opcional y ligera: abre el Club desde tu pantalla de inicio, sin buscar el enlace cada vez.</p>
    <div class="install-banner">
      <img class="ib-ic" src="assets/pwa-192.png" alt="Logo de la aplicación IMDAC">
      <div style="flex:1"><b>${installed?'Club IMDAC instalado':'Instala Club IMDAC'}</b><span data-pwa-status>${installed?'Ya puedes abrirlo como aplicación desde tu dispositivo.':(ios?'En iPhone o iPad te mostraremos los pasos para agregarlo a inicio.':'Se instala como aplicación web y conserva el acceso al sitio.')}</span></div>
      <button class="btn-outline" data-pwa-install onclick="installPWA()" ${installed?'disabled':''}>${installed?'Ya instalada':'Instalar ahora'}</button>
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
function pwaIsInstalled(){
  return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
}
function pwaIsIOS(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
}
function updatePwaInstallUI(){
  const installed=pwaIsInstalled();
  document.querySelectorAll('[data-pwa-entry]').forEach(el=>{el.hidden=installed;});
  document.querySelectorAll('[data-pwa-install]').forEach(btn=>{
    btn.disabled=installed;
    btn.textContent=installed?'Ya instalada':'Instalar ahora';
  });
  document.querySelectorAll('[data-pwa-status]').forEach(el=>{
    if(installed)el.textContent='Ya puedes abrirlo como aplicación desde tu dispositivo.';
  });
}
function showPWAInstructions(){
  const ios=pwaIsIOS();
  const modal=document.getElementById('modal');
  document.getElementById('modal-content').innerHTML=`<div class="modal-body install-guide">
    <button class="modal-x" onclick="closeModal()" aria-label="Cerrar">✕</button>
    <img class="install-guide-logo" src="assets/pwa-192.png" alt="Club IMDAC">
    <h3>Instala Club IMDAC</h3>
    <p style="color:var(--muted)">${ios?'En iPhone o iPad se agrega desde el menú Compartir.':'Tu navegador permite agregar el Club como aplicación desde su menú.'}</p>
    <ol class="install-steps">${ios
      ?'<li><span>Toca el botón <b>Compartir</b> del navegador.</span></li><li><span>Elige <b>Agregar a pantalla de inicio</b>.</span></li><li><span>Confirma tocando <b>Agregar</b>.</span></li>'
      :'<li><span>Abre el menú de tu navegador.</span></li><li><span>Elige <b>Instalar aplicación</b> o <b>Agregar a pantalla de inicio</b>.</span></li><li><span>Confirma la instalación.</span></li>'}</ol>
  </div>`;
  modal.classList.add('open');
}
async function installPWA(){
  if(pwaIsInstalled())return toast('Club IMDAC ya está instalado en este dispositivo.');
  if(!_deferredPrompt)return showPWAInstructions();
  const prompt=_deferredPrompt;
  _deferredPrompt=null;
  try{
    await prompt.prompt();
    const choice=await prompt.userChoice;
    if(choice?.outcome==='accepted')toast('Instalando Club IMDAC…');
  }catch(e){showPWAInstructions();}
  updatePwaInstallUI();
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
    <h4>8. Cambios a esta política</h4><p>Cualquier actualización se publicará en la plataforma. El uso continuado del Club implica la aceptación de la versión vigente.</p>
    <h4>9. Cookies</h4><p>Usamos cookies y almacenamiento local necesarios para mantener tu sesión iniciada y recordar preferencias (como el tema oscuro). Si activas las cookies de personalización, también nos ayudan a entender cómo usas la plataforma para mejorarla. Puedes aceptarlas o borrarlas desde la configuración de tu navegador en cualquier momento; bloquear las necesarias puede impedir que la sesión se mantenga iniciada.</p>`}
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
  <div class="card" style="padding:30px;max-width:760px"><div class="form-grid">
    <div class="field form-full"><label>Nombre de la obra</label><input id="fo-obra" placeholder="Ej. Casa habitación dos niveles"></div>
    <div class="field"><label>Cliente / Propietario</label><input id="fo-cliente" placeholder="Nombre"></div>
    <div class="field"><label>Ubicación</label><input id="fo-ubic" placeholder="Calle, colonia, ciudad"></div>
    <div class="field"><label>Superficie (m²)</label><input id="fo-sup" type="number" placeholder="0"></div>
    <div class="field"><label>Tipo de obra</label><input id="fo-tipo" placeholder="Residencial / Comercial / Industrial"></div>
    <div class="field"><label>Responsable (DRO)</label><input id="fo-dro" placeholder="Director Responsable de Obra"></div>
    <div class="field"><label>Fecha de inicio</label><input id="fo-inicio" type="date"></div>
    <div class="field form-full"><label>Descripción / Alcances</label><textarea id="fo-desc" rows="3" placeholder="Detalle de la obra..." style="width:100%;padding:13px 15px;border:1.5px solid var(--line);border-radius:11px;background:var(--base);color:var(--text);font-family:inherit;resize:none"></textarea></div>
  </div><button class="btn-primary" style="width:auto;padding:13px 30px;margin-top:8px" onclick="genFichaPDF()">📄 Generar PDF</button></div>`;
}
function genFichaPDF(){
  if(!requiereMembresiaAccion('Generar y descargar fichas de obra requiere membresía.'))return;
  loadJsPDF(()=>{
    const {jsPDF}=window.jspdf; const doc=new jsPDF();
    doc.setFillColor(13,13,13);doc.rect(0,0,210,32,'F');doc.setFillColor(255,44,44);doc.rect(0,32,210,2.5,'F');
    doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(20);doc.text('IMDAC',16,16);
    doc.setFontSize(8);doc.setFont('helvetica','normal');doc.text('Instituto Mexicano de Arquitectura y Construcción',16,23);
    doc.setTextColor(255,44,44);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('FICHA TÉCNICA DE OBRA',150,18,{align:'center'});
    let y=48; const row=(l,v)=>{doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(120,120,120);doc.text(l.toUpperCase(),16,y);doc.setFont('helvetica','normal');doc.setFontSize(11);doc.setTextColor(20,20,20);doc.text(v||'—',16,y+6);y+=16;};
    row('Nombre de la obra',val('fo-obra'));row('Cliente / Propietario',val('fo-cliente'));row('Ubicación',val('fo-ubic'));row('Superficie',val('fo-sup')?val('fo-sup')+' m²':'');row('Tipo de obra',val('fo-tipo'));row('Responsable (DRO)',val('fo-dro'));row('Fecha de inicio',val('fo-inicio'));
    doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(120,120,120);doc.text('DESCRIPCIÓN / ALCANCES',16,y);y+=6;doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(20,20,20);doc.text(doc.splitTextToSize(val('fo-desc')||'—',178),16,y);
    doc.setFontSize(8);doc.setTextColor(150,150,150);doc.text('Generado por IMDAC · Club de Miembros · '+new Date().toLocaleDateString('es-MX'),16,285);doc.save('ficha-obra-imdac.pdf');toast('Ficha de obra generada');
  });
}

/* Checklist de Supervisión de Obra. Complementa la Ficha de Obra con una
   revisión práctica por etapas. Esto es
   accionable: se marca en vivo y se exporta con lo marcado. No se guarda
   entre sesiones (es una herramienta de repaso puntual, no un registro). */
const CHECKLIST_OBRA=[
  {etapa:'Preliminares',items:[
    'Trazo y nivel verificados contra proyecto',
    'Banco de nivel (BM) protegido y accesible',
    'Licencias y permisos vigentes en obra',
    'Bodega y área de resguardo de materiales delimitada',
    'Señalización y protecciones de seguridad instaladas'
  ]},
  {etapa:'Cimentación',items:[
    'Estudio de mecánica de suelos revisado contra lo encontrado en excavación',
    'Niveles de desplante verificados',
    'Acero de refuerzo colocado según proyecto (diámetro, separación, recubrimiento)',
    'Plantilla de concreto colada antes del armado',
    'Ademe o talud seguro en excavaciones mayores a 1.2 m'
  ]},
  {etapa:'Estructura',items:[
    'Verticalidad de castillos y columnas verificada',
    'Recubrimientos mínimos de acero respetados',
    'Cimbra limpia y bien apuntalada antes de colar',
    'Muestras de concreto tomadas para prueba de resistencia (cilindros)',
    'Juntas constructivas según proyecto'
  ]},
  {etapa:'Instalaciones',items:[
    'Pendientes de drenaje verificadas antes de cubrir tuberías',
    'Pruebas de hermeticidad en instalación hidráulica realizadas',
    'Instalación eléctrica revisada contra NOM-001-SEDE',
    'Registros y pozos de visita accesibles y bien ubicados'
  ]},
  {etapa:'Acabados',items:[
    'Aplanados a plomo y nivel',
    'Juntas de dilatación respetadas en pisos',
    'Pendientes correctas en áreas húmedas (baños, azoteas)',
    'Limpieza final de obra realizada'
  ]}
];
let _chkState={}, _chkObraNombre='';
function renderChecklist(){
  const total=CHECKLIST_OBRA.reduce((s,e)=>s+e.items.length,0);
  const hechos=Object.values(_chkState).filter(Boolean).length;
  return `<h1 class="page-h">Checklist de Supervisión de Obra</h1><p class="page-sub">Marca lo que ya revisaste en cada etapa. No se guarda entre sesiones — expórtalo a PDF si necesitas conservarlo.</p>
  <div class="card" style="padding:22px 26px;max-width:760px;margin-bottom:18px">
    <div class="field form-full" style="margin:0"><label>Nombre de la obra (para el PDF)</label><input id="chk-obra" placeholder="Ej. Casa habitación dos niveles" value="${escHtml(_chkObraNombre)}" oninput="_chkObraNombre=this.value"></div>
  </div>
  <div class="calc-result" style="max-width:760px;margin-bottom:20px"><b id="chk-progreso">${hechos}/${total}</b><span>puntos revisados</span></div>
  ${CHECKLIST_OBRA.map((e,ei)=>`
  <div class="tool-intro" style="max-width:760px">
    <h3 style="font-family:var(--font-display);margin-bottom:14px">${e.etapa}</h3>
    ${e.items.map((it,ii)=>`<label class="chk-item"><input type="checkbox" ${_chkState[ei+'-'+ii]?'checked':''} onchange="toggleChk(this,${ei},${ii})"><span>${it}</span></label>`).join('')}
  </div>`).join('')}
  <button class="btn-primary" style="width:auto;padding:13px 30px" onclick="exportChecklistPDF()">📄 Exportar checklist a PDF</button>`;
}
function toggleChk(box,ei,ii){
  if(!requiereMembresiaAccion('El checklist está disponible para miembros.')){
    box.checked=!box.checked; // revertir el clic visual ya que no se le permite marcar
    return;
  }
  const k=ei+'-'+ii; _chkState[k]=!_chkState[k];
  const total=CHECKLIST_OBRA.reduce((s,e)=>s+e.items.length,0);
  const hechos=Object.values(_chkState).filter(Boolean).length;
  const el=document.getElementById('chk-progreso'); if(el)el.textContent=hechos+'/'+total;
}
function exportChecklistPDF(){
  if(!requiereMembresiaAccion('Exportar el checklist a PDF requiere membresía.'))return;
  loadJsPDF(()=>{
    const {jsPDF}=window.jspdf; const doc=new jsPDF();
    doc.setFillColor(13,13,13);doc.rect(0,0,210,32,'F');
    doc.setFillColor(255,44,44);doc.rect(0,32,210,2.5,'F');
    doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(20);doc.text('IMDAC',16,16);
    doc.setFontSize(8);doc.setFont('helvetica','normal');doc.text('Instituto Mexicano de Arquitectura y Construcción',16,23);
    doc.setTextColor(255,44,44);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('CHECKLIST DE SUPERVISIÓN DE OBRA',150,18,{align:'center'});
    let y=44;doc.setTextColor(20,20,20);
    doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('OBRA: '+(_chkObraNombre||'—'),16,y);y+=6;
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(120,120,120);doc.text('Fecha: '+new Date().toLocaleDateString('es-MX'),16,y);y+=10;
    CHECKLIST_OBRA.forEach((e,ei)=>{
      if(y>265){doc.addPage();y=20;}
      doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(255,44,44);doc.text(e.etapa,16,y);y+=7;
      e.items.forEach((it,ii)=>{
        if(y>275){doc.addPage();y=20;}
        const ok=!!_chkState[ei+'-'+ii];
        doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(20,20,20);
        doc.text(doc.splitTextToSize((ok?'[x] ':'[ ] ')+it,178),18,y);y+=6;
      });
      y+=4;
    });
    doc.setFontSize(8);doc.setTextColor(150,150,150);
    doc.text('Generado por IMDAC · Club de Miembros · '+new Date().toLocaleDateString('es-MX'),16,290);
    doc.save('checklist-obra-imdac.pdf'); toast('Checklist exportado');
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
  <div class="tool-intro">
    <h3 style="font-family:var(--font-display);margin-bottom:4px">Acero de refuerzo</h3>
    <p style="color:var(--muted);font-size:.88rem;margin-bottom:18px">Calcula el peso de varilla que necesitas, por diámetro.</p>
    <div class="tool-row">
      <div class="field"><label>Varilla</label><select id="ac-var" class="cfg-select" onchange="calcAcero()">
        <option value="3">#3 (3/8") · 0.559 kg/m</option>
        <option value="4" selected>#4 (1/2") · 0.993 kg/m</option>
        <option value="5">#5 (5/8") · 1.552 kg/m</option>
        <option value="6">#6 (3/4") · 2.235 kg/m</option>
        <option value="8">#8 (1") · 3.973 kg/m</option>
      </select></div>
      <div class="field"><label>Número de varillas</label><input id="ac-num" type="number" value="0" oninput="calcAcero()"></div>
      <div class="field form-full"><label>Longitud de cada varilla (m)</label><input id="ac-long" type="number" value="0" oninput="calcAcero()"></div>
    </div>
    <div class="calc-result"><b id="ac-peso">0.00 kg</b><span>Peso total de acero estimado</span></div>
  </div>
  <button class="btn-primary" style="width:auto;padding:13px 30px" onclick="exportCalcPDF()">📄 Exportar cálculo a PDF</button>`;
}
const PESO_VARILLA={3:0.559,4:0.993,5:1.552,6:2.235,8:3.973};
function calcAcero(){
  if(!requiereMembresiaAccion('La calculadora está disponible para miembros.'))return;
  const peso=PESO_VARILLA[val('ac-var')||'4']||0.993;
  const num=+val('ac-num'),largo=+val('ac-long');
  document.getElementById('ac-peso').textContent=(peso*num*largo).toFixed(2)+' kg';
}
function exportCalcPDF(){
  if(!requiereMembresiaAccion('Exportar cálculos a PDF requiere membresía.'))return;
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
    y+=6;sec('Acero de refuerzo');
    row('Varilla',`#${val('ac-var')||4}`);
    row('Número de varillas',val('ac-num')||0);
    row('Longitud por varilla',`${val('ac-long')||0} m`);
    row('Peso total',document.getElementById('ac-peso')?.textContent||'0.00 kg');
    doc.setFontSize(8);doc.setTextColor(150,150,150);
    doc.text('Cálculo de referencia generado por IMDAC · Club de Miembros · '+new Date().toLocaleDateString('es-MX'),16,285);
    doc.text('Los valores son estimados. Ajusta según proyecto, proveedor y normativa vigente.',16,290);
    doc.save('calculo-materiales-imdac.pdf');toast('PDF generado');
  });
}
function calcConcreto(){
  if(!requiereMembresiaAccion('La calculadora está disponible para miembros.'))return;
  const l=+val('cc-largo'),a=+val('cc-ancho'),e=+val('cc-esp')/100;
  const vol=l*a*e;
  const sacosM3={150:6,200:7,250:8,300:9}[val('cc-fc')||'200']||7;
  document.getElementById('cc-vol').textContent=vol.toFixed(2)+' m³';
  document.getElementById('cc-sacos').textContent=Math.ceil(vol*sacosM3);
  document.getElementById('cc-arena').textContent=(vol*0.51).toFixed(2);
  document.getElementById('cc-grava').textContent=(vol*0.68).toFixed(2);
}
function calcBlock(){
  if(!requiereMembresiaAccion('La calculadora está disponible para miembros.'))return;
  const l=+val('bk-largo'),h=+val('bk-alto');
  const piezas=Math.ceil(l*h*12.5*1.05);
  document.getElementById('bk-piezas').textContent=piezas+' piezas';
}

/* Calculadora de Honorarios — % de referencia según práctica común en
   México por tipo de servicio. Editable: el % es solo un punto de partida,
   nunca una tarifa fija (varía por negociación, región y complejidad). */
const HONORARIOS_DEFAULT={anteproyecto:1.5,ejecutivo:5,supervision:4,dro:3,integral:10};
function renderHonorarios(){
  return `<h1 class="page-h">Calculadora de Honorarios</h1><p class="page-sub">Estima tus honorarios profesionales como % del costo de la obra.</p>
  <div class="tool-intro">
    <div class="tool-row">
      <div class="field"><label>Costo estimado de la obra (MXN)</label><input id="ho-costo" type="number" value="0" oninput="calcHonorarios()"></div>
      <div class="field"><label>Tipo de servicio</label><select id="ho-tipo" class="cfg-select" onchange="calcHonorarios()">
        <option value="anteproyecto">Anteproyecto (diseño conceptual)</option>
        <option value="ejecutivo" selected>Proyecto ejecutivo completo</option>
        <option value="supervision">Supervisión de obra</option>
        <option value="dro">Dirección Responsable de Obra (DRO)</option>
        <option value="integral">Diseño integral (todo incluido)</option>
      </select></div>
    </div>
    <div class="tool-row">
      <div class="field form-full"><label>% de honorario (ajustable)</label><input id="ho-pct" type="number" step="0.1" value="5" oninput="calcHonorarios(true)"></div>
    </div>
    <div class="calc-result"><b id="ho-total">$0.00</b><span>Honorario estimado</span></div>
    <p style="color:var(--muted);font-size:.78rem;margin-top:10px">* Porcentajes de referencia según práctica común en México — ajusta según tu experiencia, complejidad del proyecto y acuerdo con el cliente.</p>
  </div>`;
}
function calcHonorarios(manual){
  if(!requiereMembresiaAccion('La calculadora está disponible para miembros.'))return;
  if(!manual){
    const pct=HONORARIOS_DEFAULT[val('ho-tipo')||'ejecutivo']||5;
    document.getElementById('ho-pct').value=pct;
  }
  const costo=+val('ho-costo'), pct=+val('ho-pct');
  document.getElementById('ho-total').textContent='$'+(costo*pct/100).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
}

/* Calculadora de Presupuesto Rápido — modelo simplificado costo directo +
   % indirectos + % utilidad (cada uno sobre el costo directo), para pasar
   de "cuánto me cuesta" a "cuánto cobro" sin trabajar a pérdida. */
function renderPresupuesto(){
  return `<h1 class="page-h">Calculadora de Presupuesto Rápido</h1><p class="page-sub">Pasa de costo directo a precio de venta, con indirectos y utilidad.</p>
  <div class="tool-intro">
    <div class="tool-row">
      <div class="field"><label>Costo directo (materiales + mano de obra)</label><input id="pr-directo" type="number" value="0" oninput="calcPresupuesto()"></div>
      <div class="field"><label>% Indirectos (administración, imprevistos)</label><input id="pr-indirectos" type="number" step="0.1" value="12" oninput="calcPresupuesto()"></div>
      <div class="field form-full"><label>% Utilidad</label><input id="pr-utilidad" type="number" step="0.1" value="15" oninput="calcPresupuesto()"></div>
    </div>
    <div class="calc-result"><b id="pr-total">$0.00</b><span>Precio de venta sugerido</span></div>
    <div style="margin-top:16px;font-size:.86rem;color:var(--muted)">
      <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--line)"><span>Costo directo</span><b id="pr-d" style="color:var(--text)">$0.00</b></div>
      <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--line)"><span>+ Indirectos</span><b id="pr-i" style="color:var(--text)">$0.00</b></div>
      <div style="display:flex;justify-content:space-between;padding:5px 0"><span>+ Utilidad</span><b id="pr-u" style="color:var(--text)">$0.00</b></div>
    </div>
    <p style="color:var(--muted);font-size:.78rem;margin-top:14px">* Modelo simplificado de referencia. Ajusta los porcentajes a tu operación real.</p>
  </div>`;
}
function calcPresupuesto(){
  if(!requiereMembresiaAccion('La calculadora está disponible para miembros.'))return;
  const d=+val('pr-directo'), pi=+val('pr-indirectos'), pu=+val('pr-utilidad');
  const i=d*pi/100, u=d*pu/100;
  const money=n=>'$'+n.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
  document.getElementById('pr-total').textContent=money(d+i+u);
  document.getElementById('pr-d').textContent=money(d);
  document.getElementById('pr-i').textContent=money(i);
  document.getElementById('pr-u').textContent=money(u);
}

/* Conversor de Unidades — pares fijos de uso diario en obra, bidireccional. */
const CONV_PARES=[
  {id:'area',label:'Área',u1:'m²',u2:'ft²',factor:10.7639},
  {id:'vol',label:'Volumen',u1:'m³',u2:'ft³',factor:35.3147},
  {id:'long',label:'Longitud',u1:'m',u2:'ft',factor:3.28084},
  {id:'peso',label:'Peso',u1:'kg',u2:'lb',factor:2.20462},
  {id:'presion',label:'Presión',u1:'kg/cm²',u2:'psi',factor:14.2233},
];
function renderConversor(){
  return `<h1 class="page-h">Conversor de Unidades</h1><p class="page-sub">Conversiones rápidas de uso común en obra — escribe en cualquiera de los dos campos.</p>
  ${CONV_PARES.map(c=>`
  <div class="tool-intro">
    <h3 style="font-family:var(--font-display);margin-bottom:14px">${c.label}</h3>
    <div class="tool-row">
      <div class="field"><label>${c.u1}</label><input id="cv-${c.id}-1" type="number" value="0" oninput="calcConv('${c.id}',1,${c.factor})"></div>
      <div class="field"><label>${c.u2}</label><input id="cv-${c.id}-2" type="number" value="0" oninput="calcConv('${c.id}',2,${c.factor})"></div>
    </div>
  </div>`).join('')}
  <div class="tool-intro">
    <h3 style="font-family:var(--font-display);margin-bottom:14px">Temperatura</h3>
    <div class="tool-row">
      <div class="field"><label>°C</label><input id="cv-temp-1" type="number" value="0" oninput="calcTemp(1)"></div>
      <div class="field"><label>°F</label><input id="cv-temp-2" type="number" value="32" oninput="calcTemp(2)"></div>
    </div>
  </div>`;
}
function calcConv(id,from,factor){
  if(!requiereMembresiaAccion('El conversor está disponible para miembros.'))return;
  const i1=document.getElementById('cv-'+id+'-1'), i2=document.getElementById('cv-'+id+'-2');
  if(from===1) i2.value=+((+i1.value*factor).toFixed(4));
  else i1.value=+((+i2.value/factor).toFixed(4));
}
function calcTemp(from){
  if(!requiereMembresiaAccion('El conversor está disponible para miembros.'))return;
  const c=document.getElementById('cv-temp-1'), f=document.getElementById('cv-temp-2');
  if(from===1) f.value=+((+c.value*9/5+32).toFixed(2));
  else c.value=+(((+f.value-32)*5/9).toFixed(2));
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
  <div class="card tbl-card">
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
  const schedule=dripStatus(c);
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
    <div class="cd-hero-img" style="background-image:url('${driveImg(c.img)}')"></div>
    <div class="cd-hero-body">
      <div class="cat">${c.categoria||'General'}</div>
      <h2>${c.titulo}</h2>
      <p class="desc">${c.desc||'Capacitación profesional enfocada en arquitectura y construcción. Contenido teórico-práctico con criterios aplicables a obra real.'}</p>
      <div class="cd-hero-meta">
        <span><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:16px;height:16px;display:inline;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m0 16v1m8-9h1M3 12H2m15.364 6.364l.707.707M5.929 5.929l.707.707M18.364 5.636l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg> Nivel: <b>${c.nivel||'Intermedio'}</b></span>
        ${c.hasSyllabus?`<a href="#" onclick="abrirTemario('${c.id}');return false;" style="color:var(--rojo);font-weight:700;text-decoration:none;font-size:.9rem;display:inline-flex;align-items:center;gap:5px"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-.293.707L16.414 21H7a2 2 0 01-2-2V5z"/></svg> Ver temario ${_tieneAcceso()?'':'· Solo miembros'}</a>`:''}
      </div>
      <div class="cd-clases-badge"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>${total} clases</div>
    </div>
  </div>
  ${(_tieneAcceso()&&!schedule.locked)||puedeGuardarProgreso(id)?`<div class="cd-progress"><span class="lbl">Tu progreso</span><div class="bar"><i style="width:${prog}%"></i></div><span class="pct">${prog}%</span></div>`:(schedule.locked?`<div class="cd-progress"><span class="lbl">🔒 Este curso se habilita en ${schedule.dias} día${schedule.dias===1?'':'s'}.</span></div>`:'<div class="cd-progress"><span class="lbl">Activa tu membresía para continuar.</span></div>')}
  ${_tieneAcceso()&&prog>=100?`<div class="cert-banner"><div class="cbi"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></div><div><b>¡Curso completado!</b><p>Descarga tu certificado de finalización con folio y QR verificable.</p></div><button onclick="generarCertificado('${id}')">Descargar certificado</button></div>`:''}
  <div class="cd-list-head"><h3>Lista de clases</h3><span>${hechas.length} de ${total} completadas</span></div>
  ${clases.map((cl,i)=>claseRow(cl,i,cl.isPreview===true||(_tieneAcceso()&&!schedule.locked),id,hechas.includes(i),schedule)).join('')}`;
}
function claseRow(cl,i,disp,cursoId,hecha,schedule={locked:false,dias:0}){
  const playIcon='<svg fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  const clock='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
  const checkDone='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.6" d="M5 13l4 4L19 7"/></svg>';
  const checkEmpty='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke-width="2"/></svg>';
  const lockIcon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>';
  if(!disp){
    return `<div class="clase lock" onclick="mostrarMembresiaClase()" style="cursor:pointer">
      <div class="cst">${lockIcon}</div>
      <div class="cinfo"><b>${cl.titulo||('Clase '+(i+1))}</b><span class="est">${schedule.locked?`Disponible en ${schedule.dias} día${schedule.dias===1?'':'s'}`:'Solo miembros'}</span>
        <div class="dur">${clock}${cl.duracion||'2 Horas'}</div></div>
    </div>`;
  }
  const preview=cl.isPreview===true;
  const canTrack=puedeGuardarProgreso(cursoId);
  return `<div class="clase disp ${hecha?'done':''}">
    ${canTrack?`<button class="cst chk ${hecha?'on':''}" onclick="toggleClaseHecha('${cursoId}',${i})" title="${hecha?'Marcar como pendiente':'Marcar como completada'}">${hecha?checkDone:checkEmpty}</button>`:`<div class="cst">${playIcon}</div>`}
    <div class="cinfo" onclick="playClase('${cursoId}',${i})" style="cursor:pointer"><b>${cl.titulo||('Clase '+(i+1))}</b><span class="est">${preview&&!canTrack?'Curso de prueba':(hecha?'Completada':'Disponible')}</span>
      <div class="dur">${clock}${cl.duracion||'2 Horas'}</div></div>
    <div class="play" onclick="playClase('${cursoId}',${i})" style="cursor:pointer">${playIcon}</div>
  </div>`;
}

function mostrarMembresiaClase(){renderPaywall('Esta clase requiere una membresía vigente. En los cursos de prueba gratuita, la última clase y el certificado son exclusivos para miembros.');}
function mostrarCursoProgramado(c){const s=dripStatus(c);toast(`Este curso se desbloquea en ${s.dias} día${s.dias===1?'':'s'}.`);}

async function abrirTemario(courseId){
  if(!_tieneAcceso())return renderPaywall('Puedes ver el temario del curso; abrir el documento completo requiere membresía.');
  const course=DATA.cursos.find(c=>c.id===courseId);
  if(course&&dripStatus(course).locked)return mostrarCursoProgramado(course);
  try{
    const data=await apiFetch('/temario-acceso',{method:'POST',body:{courseId}});
    if(data.url)window.open(data.url,'_blank','noopener');
  }catch(err){toast(err.message||'Temario no disponible');}
}
async function playClase(cursoId,i){
  const c=DATA.cursos.find(x=>x.id===cursoId); if(!c)return;
  const cl=(c.listaClases||[])[i];
  if(!cl||!cl.hasVideo){toast('Esta clase aún no tiene video cargado');return;}
  if(cl.isPreview!==true&&!_tieneAcceso())return mostrarMembresiaClase();
  if(cl.isPreview!==true&&dripStatus(c).locked)return mostrarCursoProgramado(c);
  try{
    const data=await apiFetch('/reproduccion',{method:'POST',body:{courseId:cursoId,lessonId:cl.lessonId||cl.id}});
    abrirVideoModal(data.embedUrl, cl.titulo||('Clase '+(i+1)), cursoId, i);
  }catch(err){
    if(err.code==='membership_required')return mostrarMembresiaClase();
    if(err.code==='course_locked')return toast(err.message||'Este curso todavía no está disponible');
    if(err.code==='video_not_migrated'||err.code==='bunny_not_configured')return toast('Esta clase está pendiente de vincular con Bunny Stream');
    toast(err.message||'No se pudo reproducir la clase');
  }
}
function marcarHechaSilencio(cursoId,i){
  if(!puedeGuardarProgreso(cursoId))return false;
  const c=DATA.cursos.find(x=>x.id===cursoId); if(!c)return false;
  const total=(c.listaClases&&c.listaClases.length)||c.clases||0; if(!total)return false;
  const set=new Set(DATA.clasesHechas[cursoId]||[]);
  const yaCompleto=set.size>=total;
  set.add(i);
  const arr=[...set].filter(x=>x<total).sort((a,b)=>a-b);
  DATA.clasesHechas[cursoId]=arr;
  const prog=Math.round(arr.length/total*100);
  DATA.progresos[cursoId]=prog;
  guardarProgreso(cursoId,prog,arr);
  return (arr.length>=total&&!yaCompleto); // true si justo se completó el curso
}
function siguienteClase(cursoId,i){
  const c=DATA.cursos.find(x=>x.id===cursoId); if(!c)return;
  const total=(c.listaClases&&c.listaClases.length)||c.clases||0;
  const seCompleto=puedeGuardarProgreso(cursoId)?marcarHechaSilencio(cursoId,i):false;
  const next=i+1;
  const hayNext = next<total && (c.listaClases||[])[next] && (c.listaClases[next].hasVideo);
  // refrescar el detalle de fondo (barra + bolitas)
  if(_cursoActivo===cursoId)openCurso(cursoId);
  if(hayNext){
    cerrarVideoModal();
    playClase(cursoId,next);
  }else{
    cerrarVideoModal();
    if(seCompleto){confetti();setTimeout(()=>toast('¡Felicidades! Completaste el curso 🎉'),250);}
    else toast('Clase completada ✓');
  }
}
function abrirVideoModal(src,titulo,cursoId,i){
  let m=document.getElementById('video-modal');
  if(!m){m=document.createElement('div');m.id='video-modal';m.className='video-modal';document.body.appendChild(m);}
  let btn='';
  if(cursoId!=null&&i!=null){
    const c=DATA.cursos.find(x=>x.id===cursoId);
    const total=c?((c.listaClases&&c.listaClases.length)||c.clases||0):0;
    const esUltima=(i+1)>=total;
    btn=`<button class="video-next" onclick="siguienteClase('${cursoId}',${i})">${esUltima?'Finalizar curso':'Siguiente clase'}</button>`;
  }
  m.innerHTML=`<div class="video-box">
    <div class="video-head"><span>${titulo||'Clase'}</span><button class="video-x" onclick="cerrarVideoModal()">✕</button></div>
    <div class="video-frame"><iframe src="${src}" allow="autoplay; encrypted-media" allowfullscreen frameborder="0"></iframe></div>
    ${btn?`<div class="video-foot">${btn}</div>`:''}
  </div>`;
  m.style.display='flex';
  document.body.style.overflow='hidden';
}
function cerrarVideoModal(){
  const m=document.getElementById('video-modal'); if(m){m.style.display='none';m.innerHTML='';}
  document.body.style.overflow='';
}
function toggleClaseHecha(cursoId,i){
  if(!puedeGuardarProgreso(cursoId))return renderPaywall('El progreso se guarda en tu curso de prueba. Los certificados se habilitan con una membresía vigente.');
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
  if(!puedeGuardarProgreso(cursoId)||!FB_OK||!CURRENT_USER||CURRENT_USER.uid==='demo')return Promise.resolve(false);
  return apiFetch('/progreso-clase',{method:'POST',body:{courseId:cursoId,clases:arr}}).then(data=>{
    DATA.clasesHechas[cursoId]=data.clases||arr;
    DATA.progresos[cursoId]=Number(data.porcentaje??prog);
    return true;
  }).catch(e=>{
    toast(e.message||'No se pudo guardar el avance');
    // Restablece desde el servidor el dato confirmado; no dejamos un 100%
    // falso en pantalla si hubo problema de red o de permisos.
    loadData().then(()=>{if(_cursoActivo===cursoId)openCurso(cursoId);}).catch(()=>{});
    return false;
  });
}
function puedeGuardarProgreso(cursoId){return _tieneAcceso()||String(DATA.cursoPrueba||'')===String(cursoId||'');}
function closeModal(){
  document.getElementById('modal').classList.remove('open');
  // El paso "perfil" del onboarding reutiliza el modal normal de la tarjeta
  // del Directorio (abrirMiTarjeta/guardarTarjeta) tal cual, sin tocarlo —
  // solo se arma esta bandera antes de abrirlo para saber que hay que
  // continuar la secuencia cuando se cierre, sea guardando o cancelando.
  if(window._onboardingEsperandoCierre){window._onboardingEsperandoCierre=false;siguientePasoOnboarding();}
}

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
async function generarCertificado(cursoId){
  if(!_tieneAcceso())return renderPaywall('Los certificados son exclusivos para miembros.');
  const c=DATA.cursos.find(x=>x.id===cursoId);if(!c)return;
  try{
    await apiFetch('/certificado-elegible',{method:'POST',body:{courseId:cursoId}});
  }catch(e){
    toast(e.message||'Aún no se confirmó el avance del curso');
    return;
  }
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
  const {jsPDF}=window.jspdf;const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'letter'});
  const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(); // ~279.4 x 215.9 (Carta)
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
  const base=H-13, bx0=20, bx1=W-20;
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
  const sy=169;
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
  doc.text('ID del certificado: '+folio,W/2,186,{align:'center'});
  doc.text('Fecha de emisión: '+fecha,W/2,192,{align:'center'});
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
  return `<div class="dash-hero">
    <div class="skel" style="height:280px;border-radius:16px"></div>
    <div class="skel" style="height:280px;border-radius:16px"></div>
  </div>
  <div class="quick-row">${Array.from({length:4},()=>'<div class="skel" style="height:90px;border-radius:16px"></div>').join('')}</div>
  <div class="skel skel-line" style="width:200px;height:20px;margin:8px 0 16px"></div>
  ${skelGrid(4)}`;
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
  // Auth puede avisar que la sesión inició antes de que se resuelva este
  // promise. Esta bandera evita que un registro nuevo entre como usuario
  // normal y se salte toda la bienvenida.
  window._registroEnProceso=true;
  auth.createUserWithEmailAndPassword(email,pass).then(cred=>{
    cred.user.updateProfile({displayName:name});
    db.collection('miembros').doc(cred.user.uid).set({nombre:name,email,creado:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    window._esRegistroNuevo=true; // onLogged() lo revisa para lanzar el onboarding
    marcarOnboardingPendiente(cred.user.uid);
    if(CURRENT_USER&&CURRENT_USER.uid===cred.user.uid)iniciarOnboardingRegistro();
  }).catch(e=>{window._registroEnProceso=false;showErr(authMsg(e.code));});
}
function doGoogle(){
  hideErr();
  if(!FB_OK)return demoLogin('miembro@imdac.mx','Miembro IMDAC');
  const provider=new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).then(res=>{
    if(res&&res.user&&res.additionalUserInfo&&res.additionalUserInfo.isNewUser){
      db.collection('miembros').doc(res.user.uid).set({nombre:res.user.displayName||'',email:res.user.email||'',creado:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}).catch(()=>{});
      window._esRegistroNuevo=true;
      marcarOnboardingPendiente(res.user.uid);
      if(CURRENT_USER&&CURRENT_USER.uid===res.user.uid)iniciarOnboardingRegistro();
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
  window._onboardingIniciado=false;
  document.getElementById('maint-overlay')?.remove();
  if(FB_OK)auth.signOut();
  else{CURRENT_USER=null;document.body.classList.remove('logged');document.getElementById('login').classList.remove('hidden');}
}
function demoLogin(email,name){
  CURRENT_USER={email,displayName:name||email.split('@')[0],uid:'demo',metadata:{creationTime:new Date().toISOString()}};
  onLogged();
}

/* ====== 10. CARGA DE DATOS ====== */
// --- Noticias automáticas del sector (vía backend) ---
// La clave de NewsData.io ya no vive aquí: este repositorio es público. El backend
// consulta, filtra y normaliza; aquí sólo se pinta lo que llega.
const NEWSDATA_CACHE_KEY='imdac_news_cache_v1';
function fetchAutoNews(){
  return apiFetch('/api/news').then(data=>{
    const noticias=(data&&Array.isArray(data.noticias))?data.noticias:[];
    if(noticias.length){try{localStorage.setItem(NEWSDATA_CACHE_KEY,JSON.stringify({timestamp:Date.now(),noticias}));}catch(e){}}
    return noticias;
  }).catch(()=>{
    // Respaldo ante un fallo puntual: lo último que se pintó en este navegador.
    try{const raw=localStorage.getItem(NEWSDATA_CACHE_KEY);if(raw){const c=JSON.parse(raw);return c.noticias||[];}}catch(e){}
    return [];
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
  if(m.hasAccess===true)return true;
  if((m.estado||'')==='Activo')return true;
  const fechas=[m.vigenciaHasta,m.cortesiaHasta,m.accesoHasta,m.cancelaAlFinal?m.renovacion:null].filter(Boolean);
  if(fechas.some(x=>new Date(x+'T23:59:59')>=new Date()))return true;
  return false;
}

function requiereMembresiaAccion(message){
  if(_tieneAcceso())return true;
  renderPaywall(message||'Esta acción requiere una membresía vigente.');
  return false;
}

async function apiFetch(path,{method='GET',body}={}){
  if(!CURRENT_USER||CURRENT_USER.uid==='demo'||typeof CURRENT_USER.getIdToken!=='function')throw new Error('Inicia sesión para continuar');
  const token=await CURRENT_USER.getIdToken();
  const response=await fetch(WEBHOOK_URL+path,{
    method,
    headers:{'Authorization':'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
    body:body?JSON.stringify(body):undefined,
    cache:'no-store'
  });
  let data={};try{data=await response.json();}catch(e){}
  if(!response.ok){const err=new Error(data.error||'No se pudo completar la solicitud');err.code=data.code||'';err.status=response.status;throw err;}
  return data;
}

async function loadData(){
  // El catálogo premium se obtiene saneado desde el backend: las URLs privadas nunca llegan aquí.
  DATA.cursos=[]; DATA.webinars=[]; DATA.noticias=[];
  DATA.foro=[]; DATA.material=[]; DATA.progresos={}; DATA.clasesHechas={}; DATA.directorio=[]; DATA.xp=0; DATA.cursoPrueba='';
  if(!FB_OK||!CURRENT_USER||CURRENT_USER.uid==='demo'){
    DATA.cursos=DEMO.cursos; DATA.webinars=DEMO.webinars; DATA.noticias=DEMO.noticias;
    DATA.foro=DEMO.foro; DATA.material=DEMO.material; DATA.progresos=DEMO.progresos;
    await sleep(650);LOADING=false;return;
  }
  try{
    const catalog=await apiFetch('/catalogo');
    DATA.cursos=Array.isArray(catalog.courses)?catalog.courses:[];
    DATA.webinars=Array.isArray(catalog.webinars)?catalog.webinars:[];
    DATA.material=Array.isArray(catalog.materials)?catalog.materials:[];
    window._miMiembro=catalog.membership||{};
    DATA.cursoPrueba=String(catalog.trialCourseId||'');
    BUNNY_READY=!!catalog.bunnyReady;
    try{window._imdacAdmin=(await db.collection('admins').doc(CURRENT_USER.uid).get()).exists;}catch(e){window._imdacAdmin=false;}
    const cd=catalog.config||{};
      if(Array.isArray(cd.categorias)&&cd.categorias.length)CATS=['Todos',...cd.categorias];
      if(cd.precio)IMDAC.precio=cd.precio;
      if(cd.cupon)IMDAC.cupon=cd.cupon;
      if(cd.canal)IMDAC.canalWA=cd.canal;
      if(cd.wa1){IMDAC.soporte.l1=waDigits(cd.wa1);IMDAC.soporte.l1Label=cd.wa1;IMDAC.whatsapp=waDigits(cd.wa1);}
      if(cd.wa2){IMDAC.soporte.l2=waDigits(cd.wa2);IMDAC.soporte.l2Label=cd.wa2;}
      window._mantenimiento=!!cd.mantenimiento;
    try{const not=await db.collection('noticias').orderBy('fecha','desc').limit(20).get();DATA.noticias=not.docs.map(d=>({id:d.id,...d.data()})).filter(n=>n.img);}catch(e){DATA.noticias=[];}
    // El saldo de bienvenida y el curso de prueba viven en el documento
    // progreso/{uid}; se leen aun sin membresía para que no desaparezcan al
    // recargar después de registrarse.
    try{const perfilProgreso=await db.collection('progreso').doc(CURRENT_USER.uid).get();if(perfilProgreso.exists){const p=perfilProgreso.data()||{};DATA.xp=Number(p.xp)||0;DATA.cursoPrueba=String(p.cursoPrueba||DATA.cursoPrueba||'');}}catch(e){}
    if(_tieneAcceso()||DATA.cursoPrueba){
      try{const foro=await db.collection('foro_temas').orderBy('fecha','desc').limit(30).get();DATA.foro=foro.docs.map(d=>({id:d.id,...d.data()}));}catch(e){DATA.foro=[];}
      try{const prog=await db.collection('progreso').where('uid','==',CURRENT_USER.uid).get();prog.forEach(d=>{const x=d.data();DATA.progresos[x.cursoId]=x.porcentaje||0;if(Array.isArray(x.clases))DATA.clasesHechas[x.cursoId]=x.clases;});}catch(e){}
      try{const dir=await db.collection('directorio').get();DATA.directorio=dir.docs.map(d=>({uid:d.id,...d.data()})).filter(x=>x.visible!==false);}catch(e){DATA.directorio=[];}
    }
  }catch(e){console.warn('Catálogo:',e.message);toast('No se pudo cargar el catálogo. Intenta recargar.');}
  LOADING=false;
}

/* ====== 11. UI helpers ====== */
function initials(){const n=CURRENT_USER?.displayName||CURRENT_USER?.email||'U';return n.trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();}
function refreshUserUI(){
  document.getElementById('u-name').textContent=CURRENT_USER?.displayName||'Miembro';
  document.getElementById('u-email').textContent=CURRENT_USER?.email||'';
  document.getElementById('u-av').textContent=initials();
  const topAvatar=document.getElementById('u-av-top');if(topAvatar)topAvatar.textContent=initials();
}
function toggleSidebar(open){
  const sb=document.getElementById('sidebar'),bd=document.getElementById('sb-backdrop');
  if(open===undefined)open=!sb.classList.contains('open');
  sb.classList.toggle('open',open);bd.classList.toggle('open',open);
  // Sin esto la pagina de detras se arrastra al deslizar sobre el drawer.
  document.body.classList.toggle('nav-open',open);
  document.querySelectorAll('[aria-controls="sidebar"]').forEach(b=>b.setAttribute('aria-expanded',String(open)));
}

/* Mostrar u ocultar la contrasena: en movil no se puede revisar lo tecleado. */
function togglePw(id,btn){
  const inp=document.getElementById(id);
  if(!inp)return;
  const ver=inp.type==='password';
  inp.type=ver?'text':'password';
  btn.setAttribute('aria-pressed',String(ver));
  btn.setAttribute('aria-label',ver?'Ocultar contraseña':'Mostrar contraseña');
  inp.focus({preventScroll:true});
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
  aplicarVistaPreview();
  if(window._mantenimiento && !window._imdacAdmin){renderMantenimiento();return;}
  const q=new URLSearchParams(location.search);
  go(seccionInicial());
  if((window._esRegistroNuevo||window._registroEnProceso||onboardingPendiente(CURRENT_USER?.uid)) && !_previewModo){
    iniciarOnboardingRegistro();
  }else if(!_previewModo&&!_tieneAcceso()&&!DATA.cursoPrueba){
    // Cuentas existentes sin prueba elegida reciben solo este paso, sin repetir
    // el tour ni los demás datos de bienvenida.
    setTimeout(mostrarSelectorCursoPrueba,700);
  }
  if(q.get('pago')==='ok'){
    toast('Pago recibido, activando tu membresía…');
    let intentos=0;
    const re=setInterval(async()=>{
      intentos++;
      try{const data=await apiFetch('/mi-acceso');window._miMiembro=data.membership||{};}catch(e){}
      if(_tieneAcceso()){
        clearInterval(re);history.replaceState(null,'',location.pathname);await loadData();go('inicio');
        toast('¡Membresía activa, bienvenido!');
      }else if(intentos>=10){clearInterval(re);toast('Tu pago está en proceso; puedes seguir explorando mientras se activa.');}
    },2000);
  }
  cargarNoticiasAuto();
  if(_tieneAcceso())escucharNotis();
  registrarVisita();
}
/* ====== VISTA PREVIA DE ADMIN ("Ver panel de usuario" en Configuración) ======
   Llega con ?vtok=<custom token>&preview=todo|miembro&volver=<url del admin>.
   El sign-in con vtok ya pasó en DOMContentLoaded; aquí solo se decide qué
   simular y se deja un banner fijo para volver al panel admin. */
let _previewModo=null, _previewVolver='';
function aplicarVistaPreview(){
  const q=new URLSearchParams(location.search);
  const modo=q.get('preview');
  if(!modo)return;
  _previewModo=modo;
  _previewVolver=q.get('volver')||'';
  if(modo==='miembro'){
    // Simulado solo en memoria del navegador — nunca se escribe en Firestore,
    // así que la cuenta real del admin no termina con una membresía falsa.
    window._imdacAdmin=false;
    window._miMiembro={estado:'Activo',plan:'Mensual',hasAccess:true,_simulado:true};
    window._previewEnrollDate=new Date();
  }
  renderBannerPreview();
}
function renderBannerPreview(){
  if(!_previewModo || document.getElementById('preview-banner'))return;
  const texto=_previewModo==='miembro'
    ?'👁️ Viendo como lo vería un miembro VIP · membresía simulada desde hoy'
    :'👁️ Viendo con todo desbloqueado, como administrador';
  const b=document.createElement('div');
  b.id='preview-banner';
  b.innerHTML=`<span>${texto}</span>${_previewVolver?`<a href="${escHtml(_previewVolver)}">← Volver al panel admin</a>`:''}`;
  document.body.appendChild(b);
}
/* ====== ONBOARDING DE REGISTRO NUEVO ======
   Igual que DulceLab: tour guiado → nombre para certificados → tarjeta del
   Directorio → regalo de XP → elegir curso de prueba. Solo corre para quien
   se acaba de registrar (window._esRegistroNuevo, armado en doRegister/
   doGoogle), nunca para un login normal ni para la vista previa de admin.
   Simplificado a propósito frente a DulceLab: un solo orquestador secuencial
   en vez de una cola de prioridades — IMDAC no tiene los otros popups
   (splash de pago, cofres, instalar app) con los que DulceLab sí necesita
   coordinarse, así que esa complejidad no hacía falta aquí. */
const TOUR_PASOS=[
  {sel:'.sb-item[data-sec="inicio"]',titulo:'Bienvenido al Club IMDAC',texto:'Este es tu panel: tu progreso, tus próximas clases y lo nuevo del Club, todo en un solo lugar.'},
  {sel:'.sb-item[data-sec="biblioteca"]',titulo:'Tus cursos',texto:'Todos los cursos del Club, con tu avance y las clases que vayas completando.'},
  {sel:'.sb-item[data-sec="webinar"]',titulo:'Clases en vivo',texto:'Sesiones en vivo con expertos — y sus grabaciones, si no llegas a tiempo.'},
  {sel:'.sb-item[data-sec="material"]',titulo:'PDFs y material',texto:'Guías, planos tipo y documentos descargables del Club IMDAC.'},
  {sel:'.sb-item[data-sec="ficha-obra"]',titulo:'Tus herramientas',texto:'Aquí están tus herramientas de obra: ficha, checklist, calculadoras y conversores.'},
  {sel:'.sb-item[data-sec="certificados"]',titulo:'Tus certificados',texto:'Cuando termines un curso, tu certificado con folio queda disponible aquí.'},
];
let _tourPaso=0;
function tourKey(){return 'imdac_tour_v1_'+((CURRENT_USER&&CURRENT_USER.uid)||'anon');}
function tourVisto(){try{return localStorage.getItem(tourKey())==='1';}catch(e){return false;}}
function marcarTourVisto(){try{localStorage.setItem(tourKey(),'1');}catch(e){}}
function iniciarTour(forzado){
  if(!forzado&&tourVisto())return siguientePasoOnboarding();
  _tourPaso=0;
  mostrarPasoTour();
}
function cerrarTour(){
  document.getElementById('tour-spot')?.remove();
  document.getElementById('tour-card')?.remove();
  marcarTourVisto();
  siguientePasoOnboarding();
}
function mostrarPasoTour(){
  const paso=TOUR_PASOS[_tourPaso];
  if(!paso)return cerrarTour();
  const el=document.querySelector(paso.sel);
  if(!el){_tourPaso++;return mostrarPasoTour();}
  el.scrollIntoView({block:'center',behavior:'smooth'});
  setTimeout(()=>posicionarTour(el,paso),150);
}
function posicionarTour(el,paso){
  const r=el.getBoundingClientRect();
  let spot=document.getElementById('tour-spot');
  if(!spot){spot=document.createElement('div');spot.id='tour-spot';document.body.appendChild(spot);}
  spot.style.cssText=`position:fixed;left:${r.left-6}px;top:${r.top-6}px;width:${r.width+12}px;height:${r.height+12}px;border-radius:14px;box-shadow:0 0 0 9999px rgba(13,13,13,.72);z-index:8100;pointer-events:none;transition:.25s`;
  let card=document.getElementById('tour-card');
  if(!card){card=document.createElement('div');card.id='tour-card';document.body.appendChild(card);}
  let top=r.bottom+14, left=Math.min(Math.max(r.left,16),window.innerWidth-316);
  if(top+170>window.innerHeight)top=Math.max(16,r.top-170);
  card.style.cssText=`position:fixed;left:${left}px;top:${top}px;width:min(300px,calc(100vw - 32px));z-index:8101`;
  card.innerHTML=`<div class="tour-card-in">
    <div class="tour-card-step">GUÍA IMDAC · PASO ${_tourPaso+1} DE ${TOUR_PASOS.length}</div>
    <h4>${escHtml(paso.titulo)}</h4><p>${escHtml(paso.texto)}</p>
    <div class="tour-card-acts">
      <button class="btn-ghost" onclick="cerrarTour()">Saltar</button>
      <button class="btn-primary" onclick="tourSiguiente()">${_tourPaso===TOUR_PASOS.length-1?'Terminar':'Siguiente'}</button>
    </div>
  </div>`;
}
function tourSiguiente(){_tourPaso++;mostrarPasoTour();}

const ONBOARDING_PASOS=['tour','nombre','perfil','regalo','cursoPrueba'];
let _onboardingIdx=-1;
function onboardingStorageKey(uid){return uid?`imdac-onboarding-pendiente-${uid}`:'';}
function onboardingState(uid){
  try{
    const raw=localStorage.getItem(onboardingStorageKey(uid));
    if(!raw)return null;
    // La versión anterior solo guardaba "1". Esas personas ya habían iniciado
    // el flujo, así que las llevamos al único paso pendiente útil: su prueba.
    if(raw==='1')return {step:'cursoPrueba'};
    const state=JSON.parse(raw);
    return state&&ONBOARDING_PASOS.includes(state.step)?state:null;
  }catch(e){return null;}
}
function guardarPasoOnboarding(step){
  try{const key=onboardingStorageKey(CURRENT_USER?.uid);if(key)localStorage.setItem(key,JSON.stringify({step}));}catch(e){}
}
function marcarOnboardingPendiente(uid){
  if(onboardingState(uid))return;
  try{const key=onboardingStorageKey(uid);if(key)localStorage.setItem(key,JSON.stringify({step:'tour'}));}catch(e){}
}
function onboardingPendiente(uid){return !!onboardingState(uid);}
function completarOnboarding(){try{const key=onboardingStorageKey(CURRENT_USER?.uid);if(key)localStorage.removeItem(key);}catch(e){}window._registroEnProceso=false;window._esRegistroNuevo=false;}
function iniciarOnboardingRegistro(){
  if(window._onboardingIniciado)return;
  window._onboardingIniciado=true;
  window._registroEnProceso=false;window._esRegistroNuevo=false;
  marcarOnboardingPendiente(CURRENT_USER?.uid);
  setTimeout(iniciarOnboarding,900);
}
function iniciarOnboarding(){
  const state=onboardingState(CURRENT_USER?.uid);
  const index=state?ONBOARDING_PASOS.indexOf(state.step):-1;
  _onboardingIdx=index-1;
  siguientePasoOnboarding();
}
function siguientePasoOnboarding(){
  _onboardingIdx++;
  const paso=ONBOARDING_PASOS[_onboardingIdx];
  if(paso)guardarPasoOnboarding(paso);
  if(paso==='tour')return iniciarTour();
  if(paso==='nombre')return mostrarModalNombreOnboarding();
  if(paso==='perfil')return mostrarModalPerfilOnboarding();
  if(paso==='regalo')return mostrarModalRegaloOnboarding();
  if(paso==='cursoPrueba')return mostrarSelectorCursoPrueba();
  // fin de la secuencia: nada más que hacer
}
function mostrarModalNombreOnboarding(){
  const nombreActual=(CURRENT_USER&&CURRENT_USER.displayName)||'';
  document.getElementById('modal-content').innerHTML=`<div class="modal-body" style="text-align:center;padding:32px 26px">
    <div style="font-size:2.2rem;margin-bottom:10px">🎓</div>
    <h3 style="font-family:var(--font-display);font-size:1.2rem;margin-bottom:8px">¿Cómo quieres que aparezca tu nombre?</h3>
    <p style="color:var(--muted);font-size:.86rem;line-height:1.5;margin-bottom:18px">Este es el nombre que aparecerá en <b>tus certificados oficiales IMDAC</b>. Escríbelo completo y bien escrito (nombre y apellidos).</p>
    <input id="ob-nombre" value="${escHtml(nombreActual)}" style="width:100%;padding:13px 15px;border:1.5px solid var(--line);border-radius:11px;background:var(--base);color:var(--text);text-align:center;font-weight:600;margin-bottom:16px;box-sizing:border-box">
    <button class="btn-primary" style="width:100%;margin-bottom:10px" onclick="guardarNombreOnboarding()">Guardar y continuar</button>
    <button class="btn-ghost" style="width:100%" onclick="closeModal();siguientePasoOnboarding()">Lo dejo así por ahora</button>
  </div>`;
  document.getElementById('modal').classList.add('open');
}
function guardarNombreOnboarding(){
  const nombre=(document.getElementById('ob-nombre').value||'').trim();
  if(!nombre)return toast('Escribe un nombre');
  if(CURRENT_USER.updateProfile)CURRENT_USER.updateProfile({displayName:nombre}).catch(()=>{});
  db.collection('miembros').doc(CURRENT_USER.uid).set({nombre},{merge:true}).catch(()=>{});
  closeModal();
  siguientePasoOnboarding();
}
function mostrarModalPerfilOnboarding(){
  abrirMiTarjeta(true);
}
async function mostrarModalRegaloOnboarding(){
  let data;
  try{ data=await apiFetch('/regalo-bienvenida',{method:'POST'}); }
  catch(e){ return siguientePasoOnboarding(); } // si falla, no se traba el onboarding por esto
  document.getElementById('modal-content').innerHTML=`<div class="modal-body" style="text-align:center;padding:32px 26px">
    <div style="width:62px;height:62px;border-radius:18px;background:var(--rojo-50);display:grid;place-items:center;margin:0 auto 14px;position:relative">
      <svg width="28" height="28" fill="none" stroke="var(--rojo)" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12v10H4V12M2 7h20v5H2V7zm10 0v15M12 7a2.5 2.5 0 11-2.5-2.5h2.5v2.5zm0 0a2.5 2.5 0 102.5-2.5H12v2.5z"/></svg>
      <span style="position:absolute;top:-8px;right:-14px;background:var(--rojo);color:#fff;font-size:.68rem;font-weight:800;padding:3px 7px;border-radius:50px">+${data.regalo}</span>
    </div>
    <div style="font-size:.68rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Regalo de bienvenida</div>
    <h3 style="font-family:var(--font-display);font-size:1.25rem;margin-bottom:10px">¡Tienes ${data.regalo} XP de regalo!</h3>
    <p style="color:var(--muted);font-size:.86rem;line-height:1.55;margin-bottom:18px">Te los damos por unirte al Club IMDAC. Ya están en tu saldo y sirven para desbloquear material de la biblioteca más adelante — necesitas tu membresía activa para poder canjearlos. Sigue el Club para ganar más.</p>
    <div class="calc-result" style="margin-bottom:18px"><b>${data.xp} XP</b><span>Tu saldo actual</span></div>
    <div style="display:flex;gap:10px">
      <button class="btn-ghost" style="flex:1" onclick="closeModal();siguientePasoOnboarding()">Más tarde</button>
      <button class="btn-primary" style="flex:1" onclick="closeModal();siguientePasoOnboarding()">Elegir mi curso →</button>
    </div>
  </div>`;
  document.getElementById('modal').classList.add('open');
}
function courseIsFreeTrialCliente(c){
  const v=c&&c.esPruebaGratuita;
  if(v===true)return true;
  return String(v||'').trim().toLowerCase()==='true';
}
function mostrarSelectorCursoPrueba(){
  // La elección es entre todos los cursos publicados que tengan al menos dos
  // clases: el usuario verá todas menos la última hasta activar membresía.
  const elegibles=(DATA.cursos||[]).filter(c=>(c.listaClases||[]).length>=2);
  if(!elegibles.length){
    // Si el catálogo todavía estaba cargando, no reiniciamos la bienvenida:
    // mantenemos el paso y reintentamos una vez con los datos recién leídos.
    if(!window._cursoPruebaReintento){
      window._cursoPruebaReintento=true;
      setTimeout(()=>loadData().then(mostrarSelectorCursoPrueba).catch(()=>toast('No se pudieron cargar los cursos todavía')),900);
    }else toast('Aún no hay cursos disponibles. Tu bienvenida seguirá pendiente.');
    return;
  }
  window._cursoPruebaReintento=false;
  document.getElementById('modal-content').innerHTML=`<div class="modal-body" style="padding:30px 28px"><div style="display:flex;gap:14px;align-items:center;margin-bottom:16px"><div style="width:48px;height:48px;border-radius:14px;background:var(--rojo-50);display:grid;place-items:center;color:var(--rojo);font-size:1.4rem">▷</div><div><h3 style="font-family:var(--font-display);font-size:1.2rem;margin:0">Tu prueba gratuita</h3><span style="color:var(--muted);font-size:.82rem">Una función para usuarios nuevos</span></div></div><div style="border-top:1px solid var(--line);padding-top:18px"><p style="font-size:1rem;line-height:1.55;margin:0 0 12px">Al ser nuevo, puedes elegir <b>un curso de tu interés</b> como prueba gratuita.</p><p style="color:var(--muted);font-size:.9rem;line-height:1.55;margin:0 0 20px">Verás todas sus clases menos la última. El certificado se habilita al activar tu membresía.</p></div><button class="btn-primary" style="width:auto;float:right;padding:13px 22px" onclick="mostrarListaCursosPrueba()">Elegir mi curso</button><div style="clear:both"></div></div>`;
  document.getElementById('modal').classList.add('open');
}
function mostrarListaCursosPrueba(){
  if(!(DATA.cursos||[]).some(c=>(c.listaClases||[]).length>=2))return toast('Aún no hay cursos disponibles para prueba');
  _eligiendoCursoPrueba=true;
  closeModal();
  go('biblioteca');
}
function confirmarCursoPrueba(cursoId){
  const c=(DATA.cursos||[]).find(x=>x.id===cursoId);if(!c)return;
  document.getElementById('modal-content').innerHTML=`<div class="modal-body" style="padding:28px 26px"><div style="display:flex;gap:12px;align-items:center;margin-bottom:16px"><div style="width:45px;height:45px;border-radius:13px;background:var(--rojo-50);display:grid;place-items:center;color:var(--rojo);font-size:1.3rem">▷</div><div><h3 style="font-family:var(--font-display);font-size:1.15rem;margin:0">¿Seguro que deseas este curso?</h3><span style="color:var(--muted);font-size:.8rem">Tu prueba gratuita</span></div></div><div style="border-top:1px solid var(--line);padding-top:16px">${c.img?`<div style="height:130px;border-radius:12px;background:url('${driveImg(c.img)}') center/cover;margin-bottom:16px"></div>`:''}<h3 style="font-family:var(--font-display);font-size:1.1rem;margin-bottom:10px">${escHtml(c.titulo)}</h3><p style="color:var(--muted);line-height:1.55">Será tu prueba gratuita y podrás ver todas sus clases menos la última, que se abre con la membresía.</p><p style="font-weight:700;line-height:1.45">Solo puedes elegir uno y después no se puede cambiar.</p></div><button class="btn-ghost" style="width:100%;margin:8px 0" onclick="mostrarListaCursosPrueba()">No, ver otros cursos</button><button class="btn-primary" style="width:100%" onclick='confirmarCursoPruebaOnboarding(${JSON.stringify(cursoId)})'>Sí, es mi prueba gratuita</button></div>`;
  document.getElementById('modal').classList.add('open');
}
async function confirmarCursoPruebaOnboarding(cursoId){
  const confirmBtn=document.querySelector('#modal-content .btn-primary');
  if(confirmBtn){
    if(confirmBtn.disabled)return;
    confirmBtn.disabled=true;
    confirmBtn.textContent='Guardando tu elección…';
    confirmBtn.style.opacity='.72';
    confirmBtn.style.cursor='wait';
  }
  try{
    const data=await apiFetch('/curso-prueba',{method:'POST',body:{cursoId}});
    DATA.cursoPrueba=String(data.cursoId||cursoId);
    _eligiendoCursoPrueba=false;
    completarOnboarding();
    // Hay que esperar esta recarga sí o sí: el catálogo que ya teníamos se
    // pidió ANTES de elegir el curso, así que trae isPreview=false en todas
    // las clases (nadie tenía curso de prueba todavía). Abrir el curso con
    // esos datos viejos mostraba el candado de membresía incluso en tu
    // propia prueba gratuita — por eso se refrescaba "detrás" y nunca se
    // veía el desbloqueo hasta recargar la página a mano.
    if(confirmBtn)confirmBtn.textContent='Preparando tu curso…';
    await loadData().catch(()=>{});
    closeModal();
    openCurso(cursoId);
    toast('¡Listo! Ya puedes ver las clases de tu curso de prueba.');
  }catch(e){
    if(confirmBtn){confirmBtn.disabled=false;confirmBtn.textContent='Sí, es mi prueba gratuita';confirmBtn.style.opacity='';confirmBtn.style.cursor='';}
    toast(e.message||'No se pudo guardar tu curso de prueba',{type:'err'});
  }
}

/* ====== PAYWALL (activa tu membresía) ====== */
let _planes=null;
function renderPaywall(reason){
  document.getElementById('content').innerHTML=`<div class="section active" style="max-width:860px;margin:0 auto">
    <div style="text-align:center;margin:30px 0 26px">
      <h1 class="page-h">Activa tu membresía</h1>
      <p class="page-sub">${reason||'Elige tu plan para desbloquear clases premium y funciones privadas del Club IMDAC.'}</p>
    </div>
    <div class="plan-grid">
      <div class="plan-card">
        <div class="plan-name">Mensual</div>
        <div class="plan-price" id="pp-mensual">$—</div>
        <div class="plan-per">MXN / mes</div>
        <ul class="plan-feats"><li>${DATA.cursos.length?`${DATA.cursos.length} curso${DATA.cursos.length===1?'':'s'} con certificado`:'Cursos con certificado'}</li><li>Clases en vivo</li><li>Material PDF y herramientas</li><li>Foro y canal privado</li><li>20% de descuento adicional</li></ul>
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
      <a href="#" style="color:var(--rojo);font-weight:700" onclick="go('biblioteca');return false">← Seguir explorando cursos</a><br><br>
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
/* ====== PAGO EN POPUP (ventana emergente con Stripe Checkout) ====== */
function irAPagar(plan){
  if(!CURRENT_USER||!FB_OK)return toast('Inicia sesión para continuar');
  // abrir la ventana DE INMEDIATO (dentro del clic, así el navegador no la bloquea)
  const w=480,h=780,x=Math.max(0,(screen.width-w)/2),y=Math.max(0,(screen.height-h)/2);
  const pop=window.open('','imdac_pago',`width=${w},height=${h},left=${x},top=${y}`);
  if(!pop){console.warn('[pago] popup bloqueado → redirect');return irAPagarRedirect(plan);}
  try{pop.document.write('<title>Pago seguro · IMDAC</title><body style="margin:0;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:96vh;color:#555;background:#fafafa">Cargando pago seguro…</body>');}catch(e){}
  apiFetch('/crear-checkout',{method:'POST',body:{plan}}).then(d=>{
      if(!d.url){try{pop.close();}catch(e){} toast('No se pudo abrir el pago');return;}
      pop.location=d.url;
      vigilarPago(pop);
    }).catch(()=>{try{pop.close();}catch(e){} toast('No se pudo abrir el pago, intenta de nuevo');});
}
function vigilarPago(pop){
  toast('Completa tu pago en la ventana emergente');
  let intentos=0,cerradoHace=0;
  const re=setInterval(async()=>{
    intentos++;
    try{const data=await apiFetch('/mi-acceso');window._miMiembro=data.membership||{};}catch(e){}
    if(_tieneAcceso()){
      clearInterval(re);
      try{if(!pop.closed)pop.close();}catch(e){}
      go('inicio');cargarNoticiasAuto();escucharNotis();registrarVisita();
      toast('¡Membresía activa, bienvenido!');return;
    }
    if(pop.closed){cerradoHace++;if(cerradoHace>=3){clearInterval(re);}} // cerró sin pagar: 2 chequeos extra por si pagó y cerró rápido
    if(intentos>=240)clearInterval(re); // tope ~8 min
  },2000);
}
function irAPagarRedirect(plan){
  apiFetch('/crear-checkout',{method:'POST',body:{plan}})
    .then(d=>{if(d.url)location.href=d.url;else toast('No se pudo abrir el pago');})
    .catch(()=>toast('No se pudo abrir el pago, intenta de nuevo'));
}
function cancelarSub(){
  if(!confirm('¿Cancelar tu suscripción? No se te volverá a cobrar y conservas tu acceso hasta el final del periodo que ya pagaste.'))return;
  toast('Cancelando…');
  apiFetch('/cancelar',{method:'POST',body:{}}).then(d=>{
      if(!d.ok)return toast(d.error||'No se pudo cancelar');
      window._miMiembro.cancelaAlFinal=true;
      if(d.fin)window._miMiembro.renovacion=d.fin;
      renderSection('suscripcion');
      toast('Suscripción cancelada — conservas tu acceso hasta el '+(d.fin||'final del periodo'));
    }).catch(()=>toast('No se pudo cancelar, intenta de nuevo'));
}
function reactivarSub(){
  toast('Reactivando…');
  apiFetch('/reactivar',{method:'POST',body:{}}).then(d=>{
      if(!d.ok)return toast(d.error||'No se pudo reactivar');
      window._miMiembro.cancelaAlFinal=false;
      renderSection('suscripcion');
      toast('¡Suscripción reactivada! Tu plan continúa normal');
    }).catch(()=>toast('No se pudo reactivar, intenta de nuevo'));
}
function abrirPortal(){
  if(!CANDADO_ON())return toast('Gestión de pago vía Stripe (pendiente activar)');
  toast('Abriendo portal de pagos…');
  apiFetch('/portal',{method:'POST',body:{}})
    .then(d=>{if(d.url)location.href=d.url;else toast('Aún no tienes una suscripción de pago');})
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
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();_deferredPrompt=e;updatePwaInstallUI();});
  window.addEventListener('appinstalled',()=>{_deferredPrompt=null;updatePwaInstallUI();toast('Club IMDAC quedó instalado.');});
  updatePwaInstallUI();
  // Command palette ⌘K / Ctrl+K
  document.addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(document.body.classList.contains('logged')){document.getElementById('cmdk-bg').classList.contains('open')?closeCmdK():openCmdK();}}
    else if(e.key==='Escape'){closeCmdK();const pop=document.getElementById('notis-pop');if(pop)pop.classList.remove('open');}
  });
  // Dropdown de notificaciones: se cierra al tocar fuera de él.
  document.addEventListener('click',e=>{
    const pop=document.getElementById('notis-pop');
    if(pop&&pop.classList.contains('open')&&!pop.contains(e.target))pop.classList.remove('open');
  });
  if(FB_OK){
    // "Ver panel de usuario" desde el panel admin (Configuración): llega con
    // ?vtok=<custom token>&preview=todo|miembro&volver=<url del panel admin>.
    // Con el token entra firmado como el propio admin, sin pedirle contraseña.
    const qp=new URLSearchParams(location.search);
    const vtok=qp.get('vtok');
    if(vtok) auth.signInWithCustomToken(vtok).catch(e=>showErr(authMsg(e.code)));
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
