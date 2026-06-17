/* ============================================================
   IMDAC · PANEL DE ADMINISTRACIÓN — app.js
   Mismas colecciones Firestore que el Club. CRUD completo.
   ============================================================ */

/* ====== CONFIG — usar la MISMA cuenta Firebase que el Club ====== */
const firebaseConfig = {
  apiKey: "AIzaSyA2b3n294FxG3GmPNEUX_Odc1NZVw2G77U",
  authDomain: "imdac-club.firebaseapp.com",
  projectId: "imdac-club",
  storageBucket: "imdac-club.firebasestorage.app",
  messagingSenderId: "619551799543",
  appId: "1:619551799543:web:594105a2e0e6dd11047bf2"
};
// Credenciales demo (cuando Firebase no está configurado aún)
const DEMO_ADMIN = { email:"admin@imdac.mx", pass:"IMDACAdmin2026" };

let db=null, auth=null, FB_OK=false;
try{
  // App con NOMBRE propio → sesión independiente de la del Club (mismo dominio, distinta llave)
  const _adminApp=firebase.initializeApp(firebaseConfig,'imdac-admin');
  auth=_adminApp.auth(); db=_adminApp.firestore();
  FB_OK = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("REEMPLAZAR");
}catch(e){ console.warn("Firebase sin configurar — modo demo.",e); }

let CURRENT_USER=null;
let DATA={cursos:[],webinars:[],noticias:[],material:[],foro:[],miembros:[],notificaciones:[],precios:[]};
let CATS=["Estructuras","Instalaciones","Costos y Presupuestos","Topografía","Diseño CAD","Normatividad","Sustentabilidad","Gestión de Obra"];
const NIVELES=["Básico","Intermedio","Avanzado"];
const ESTADOS=["Publicado","Borrador"];
/* estado de búsqueda / filtros / paginación */
let _search={}, _page={}, _filterCat='Todos', _filterEstado='Todos';
let _appCfg={};
const PER_PAGE=8;

/* ====== NAV ====== */
const NAV=[
  {id:"dashboard",label:"Dashboard",icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'},
  {id:"cursos",label:"Cursos",icon:'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'},
  {id:"webinars",label:"Webinars",icon:'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'},
  {id:"noticias",label:"Noticias",icon:'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9'},
  {id:"material",label:"Material PDF",icon:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'},
  {id:"precios",label:"Precios Unitarios",icon:'M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z'},
  {id:"miembros",label:"Miembros",icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'},
  {id:"foro",label:"Foro",icon:'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z'},
  {id:"notificaciones",label:"Notificaciones",icon:'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'},
  {id:"configuracion",label:"Configuración",icon:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z'},
];
function renderSidebar(){
  document.getElementById('sb-nav').innerHTML=NAV.map(it=>`
    <div class="sb-item" data-sec="${it.id}" onclick="go('${it.id}')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${it.icon}"/></svg>${it.label}
    </div>`).join('');
}

/* ====== ROUTER ====== */
let currentSection="dashboard";
function go(sec){
  currentSection=sec;
  document.querySelectorAll('.sb-item').forEach(e=>e.classList.toggle('active',e.dataset.sec===sec));
  document.getElementById('tb-title').textContent=NAV.find(n=>n.id===sec)?.label||'';
  if(window.innerWidth<=900)toggleSidebar(false);
  renderSection(sec);window.scrollTo(0,0);
}
function renderSection(sec){
  const R={dashboard:renderDashboard,cursos:renderCursos,webinars:renderWebinars,noticias:renderNoticias,
    material:renderMaterial,precios:renderPrecios,miembros:renderMiembros,foro:renderForo,notificaciones:renderNotificaciones,configuracion:renderConfig};
  document.getElementById('content').innerHTML=`<div class="section active">${(R[sec]||renderDashboard)()}</div>`;
}

/* ====== DASHBOARD ====== */
function renderDashboard(){
  const precio=+(_appCfg.precio)||499;
  const activos=DATA.miembros.filter(m=>(m.estado||'Activo')!=='Cancelado').length;
  const cancelados=DATA.miembros.filter(m=>(m.estado||'Activo')==='Cancelado').length;
  const base=activos+cancelados;
  const mrr=activos*precio, arr=mrr*12, churn=base?(cancelados/base*100):0;
  const money=n=>'$'+Math.round(n).toLocaleString('es-MX');
  return `
  <div class="page-head"><div><h1 class="page-h">Dashboard</h1><p class="page-sub">Resumen general del Club IMDAC.</p></div></div>
  <div class="stats">
    ${statCard('Miembros activos',activos,'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z')}
    ${statCard('MRR',money(mrr),'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z')}
    ${statCard('ARR',money(arr),'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6')}
    ${statCard('Churn',churn.toFixed(1)+'%','M13 17h8m0 0V9m0 8l-8-8-4 4-6-6')}
  </div>
  <div class="stats" style="margin-top:4px">
    ${statCard('Cursos',DATA.cursos.length,'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253')}
    ${statCard('Webinars',DATA.webinars.length,'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z')}
    ${statCard('Material',DATA.material.length,'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z')}
    ${statCard('Precio mensual',money(precio),'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z')}
  </div>
  <div class="card">
    <table class="tbl"><thead><tr><th>Últimos miembros</th><th>Correo</th><th>Alta</th></tr></thead>
    <tbody>${DATA.miembros.slice(0,5).map(m=>`<tr><td class="t-title">${m.nombre||'—'}</td><td>${m.email||'—'}</td><td>${m.alta||'—'}</td></tr>`).join('')||'<tr><td colspan="3"><div class="empty"><b>Sin miembros aún</b></div></td></tr>'}</tbody></table>
  </div>`;
}
function statCard(label,val,icon){return `<div class="stat"><div class="top"><div class="si"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${icon}"/></svg></div></div><b>${val}</b><span>${label}</span></div>`;}

/* ====== INFRA DE LISTAS: búsqueda + filtros + paginación ====== */
const ROWCFG={
  cursos:{key:'cursos',fields:c=>[c.titulo,c.categoria,c.instructor],row:cursoRow},
  webinars:{key:'webinars',fields:w=>[w.titulo,w.fecha],row:webinarRow},
  noticias:{key:'noticias',fields:n=>[n.titulo,n.fuente],row:noticiaRow},
  material:{key:'material',fields:m=>[m.titulo,m.desc],row:materialRow},
  miembros:{key:'miembros',fields:m=>[m.nombre,m.email,m.ciudad],row:miembroRow},
  foro:{key:'foro',fields:t=>[t.titulo,t.autor],row:foroRow},
  precios:{key:'precios',fields:p=>[p.concepto,p.unidad],row:precioRow},
};
function getList(sec){
  const cfg=ROWCFG[sec]; let list=DATA[cfg.key]||[];
  const q=(_search[sec]||'').toLowerCase().trim();
  if(q)list=list.filter(it=>cfg.fields(it).join(' ').toLowerCase().includes(q));
  if(sec==='cursos')list=list.filter(c=>(_filterCat==='Todos'||c.categoria===_filterCat)&&(_filterEstado==='Todos'||(c.estado||'Publicado')===_filterEstado));
  const total=list.length, pages=Math.max(1,Math.ceil(total/PER_PAGE));
  const page=Math.min(_page[sec]||1,pages); _page[sec]=page;
  return {pageItems:list.slice((page-1)*PER_PAGE,page*PER_PAGE),total,pages,page};
}
function rowsHTML(sec){
  const cfg=ROWCFG[sec]; const {pageItems,total}=getList(sec);
  if(!pageItems.length)return `<tr><td colspan="20"><div class="empty"><b>${total?'Sin resultados':'Aún no hay registros'}</b><span>${total?'Prueba con otra búsqueda o filtro.':'Crea el primero con el botón de arriba.'}</span></div></td></tr>`;
  return pageItems.map(cfg.row).join('');
}
function pagerInner(sec){
  const {total,pages,page}=getList(sec); if(pages<=1)return total?`<div class="pager"><span style="color:var(--muted);font-size:.85rem">${total} registro(s)</span><span></span></div>`:'';
  return `<div class="pager"><span style="color:var(--muted);font-size:.85rem">${total} registros · página ${page} de ${pages}</span><div style="display:flex;gap:8px"><button onclick="setPage('${sec}',-1)" ${page<=1?'disabled':''}>Anterior</button><button onclick="setPage('${sec}',1)" ${page>=pages?'disabled':''}>Siguiente</button></div></div>`;
}
function rebuildRows(){const b=document.getElementById('tbl-body');if(!b)return;b.innerHTML=rowsHTML(currentSection);const p=document.getElementById('tbl-pager');if(p)p.innerHTML=pagerInner(currentSection);}
function onSearch(sec,v){_search[sec]=v;_page[sec]=1;rebuildRows();}
function setPage(sec,d){_page[sec]=(_page[sec]||1)+d;rebuildRows();}
function setCatFilter(c){_filterCat=c;_page.cursos=1;renderSection('cursos');}
function setEstadoFilter(e){_filterEstado=e;_page.cursos=1;renderSection('cursos');}
function searchBar(sec,ph){return `<div class="search-admin"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg><input value="${esc(_search[sec]||'')}" oninput="onSearch('${sec}',this.value)" placeholder="${ph}"></div>`;}
function listSection(sec,o){
  const add=o.addFn?`<button class="btn-add" onclick="${o.addFn}"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>${o.addLabel}</button>`:'';
  return `<div class="page-head"><div><h1 class="page-h">${o.title}</h1><p class="page-sub">${o.sub}</p></div>${add}</div>
    ${searchBar(sec,o.search||'Buscar...')}
    <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr>${o.head.map(h=>`<th>${h}</th>`).join('')}<th></th></tr></thead>
    <tbody id="tbl-body">${rowsHTML(sec)}</tbody></table></div><div id="tbl-pager">${pagerInner(sec)}</div></div>`;
}

/* ====== ROW FUNCTIONS ====== */
function cursoRow(c){const est=(c.estado||'Publicado')==='Borrador';return `<tr>
  <td><div class="t-cell"><div class="t-thumb" style="background-image:url('${c.img||''}')"></div><span class="t-title">${c.titulo}</span></div></td>
  <td><span class="tag">${c.categoria||'—'}</span></td>
  <td>${c.nivel||'—'}</td>
  <td>${(c.listaClases?c.listaClases.length:c.clases)||0}</td>
  <td>${est?'<span class="tag gray">Borrador</span>':'<span class="tag green">Publicado</span>'}</td>
  <td>${c.dripDias?`<span class="tag gray">En ${c.dripDias} días</span>`:'<span class="tag green">Abierto</span>'}</td>
  <td><div class="row-actions">
    <button class="ico-btn" onclick="previewCurso('${c.id}')" title="Vista previa"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
    <button class="ico-btn" onclick="duplicarCurso('${c.id}')" title="Duplicar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></button>
    <button class="ico-btn" onclick="editItem('cursos','${c.id}')" title="Editar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
    <button class="ico-btn del" onclick="delItem('cursos','${c.id}')" title="Eliminar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
  </div></td></tr>`;}
function webinarRow(w){return `<tr><td class="t-title">${w.titulo}</td><td>${w.fecha||'—'}</td>
  <td>${w.grabacion?'<span class="tag green">Con grabación</span>':'<span class="tag gray">En vivo</span>'}</td>
  <td>${actions('webinars',w.id)}</td></tr>`;}
function noticiaRow(n){return `<tr><td><div class="t-cell"><div class="t-thumb" style="background-image:url('${n.img||''}')"></div><span class="t-title">${n.titulo}</span></div></td>
  <td><span class="tag">${n.fuente||'IMDAC'}</span></td><td>${n.fecha||'—'}</td><td>${actions('noticias',n.id)}</td></tr>`;}
function materialRow(m){return `<tr><td class="t-title">📄 ${m.titulo}</td><td>${m.desc||'—'}</td><td>${actions('material',m.id)}</td></tr>`;}
function miembroRow(m){return `<tr>
  <td><div class="t-cell"><div class="t-thumb" style="border-radius:9px;background:var(--rojo);color:#fff;display:grid;place-items:center;font-weight:700;font-family:var(--font-display)">${(m.nombre||'U')[0].toUpperCase()}</div><span class="t-title">${m.nombre||'—'}</span></div></td>
  <td>${m.email||'—'}</td><td>${m.ciudad||'—'}</td><td>${(m.estado||'Activo')==='Cancelado'?'<span class="tag gray">Cancelado</span>':(m.estado==='Suspendido'?'<span class="tag">Suspendido</span>':'<span class="tag green">Activo</span>')}</td>
  <td><div class="row-actions"><button class="ico-btn" onclick="verMiembro('${m.id}')" title="Ver"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
  <button class="ico-btn del" onclick="delItem('miembros','${m.id}')" title="Eliminar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></div></td></tr>`;}
function foroRow(t){return `<tr><td class="t-title">${t.titulo}</td><td>${t.autor||'—'}</td><td><span class="tag">${t.tag||'General'}</span></td>
  <td>❤️ ${t.likes||0} · 👁 ${t.vistas||0}</td>
  <td><div class="row-actions"><button class="ico-btn del" onclick="delItem('foro','${t.id}')" title="Eliminar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></div></td></tr>`;}

/* ====== DUPLICAR + VISTA PREVIA ====== */
function duplicarCurso(id){
  const c=DATA.cursos.find(x=>x.id===id);if(!c)return;
  const copy=JSON.parse(JSON.stringify(c));delete copy.id;copy.titulo=(c.titulo||'Curso')+' (copia)';
  saveDoc('cursos',null,copy);toast('Curso duplicado');
}
function previewCurso(id){
  const c=DATA.cursos.find(x=>x.id===id);if(!c)return;
  const total=c.listaClases?c.listaClases.length:(c.clases||0);
  const clases=c.listaClases&&c.listaClases.length?c.listaClases:Array.from({length:total},(_,i)=>({titulo:'Clase '+(i+1),duracion:'2 Horas'}));
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-head"><h3>Vista previa · como lo ve el miembro</h3><button class="modal-x" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="pv-hero"><div class="pv-img" style="background-image:url('${c.img||''}')"></div>
        <div class="pv-body"><div class="pv-cat">${c.categoria||'General'}</div><h3>${c.titulo}</h3>
          <p class="pv-desc">${c.desc||'Capacitación profesional IMDAC.'}</p><span class="tag">${total} clases · ${c.nivel||'Intermedio'}</span></div></div>
      <div class="pv-progress"><span>Tu progreso</span><div class="pv-bar"><i style="width:0%"></i></div><b>0%</b></div>
      <div style="font-family:var(--font-display);font-weight:700;margin:16px 0 10px">Lista de clases</div>
      ${clases.length?clases.map((cl,i)=>`<div class="pv-clase"><div class="pv-cnum">${i+1}</div><div style="flex:1"><b>${cl.titulo||('Clase '+(i+1))}</b><div style="color:var(--muted);font-size:.82rem">⏱ ${cl.duracion||'2 Horas'}</div></div><div class="pv-play">▶</div></div>`).join(''):'<p style="color:var(--muted)">Sin clases aún.</p>'}
      <div class="modal-foot"><button class="btn-ghost" onclick="closeModal()">Cerrar</button></div>
    </div>`;
  document.getElementById('modal').classList.add('open');
}

/* ====== CRUD GENÉRICO (webinars, noticias, material) ====== */
function tableShell(title,sub,addLabel,addFn,head,rows){
  return `<div class="page-head"><div><h1 class="page-h">${title}</h1><p class="page-sub">${sub}</p></div>
    <button class="btn-add" onclick="${addFn}"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>${addLabel}</button></div>
    <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}<th></th></tr></thead>
    <tbody>${rows||`<tr><td colspan="${head.length+1}"><div class="empty"><b>Aún no hay registros</b><span>Crea el primero con el botón de arriba.</span></div></td></tr>`}</tbody></table></div></div>`;
}
function actions(coll,id){return `<div class="row-actions">
  <button class="ico-btn" onclick="editItem('${coll}','${id}')" title="Editar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
  <button class="ico-btn del" onclick="delItem('${coll}','${id}')" title="Eliminar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
</div>`;}

/* ====== CURSOS ====== */
function renderCursos(){
  const catChips=['Todos',...CATS].map(c=>`<button class="chip ${_filterCat===c?'active':''}" onclick="setCatFilter('${c.replace(/'/g,"\\'")}')">${c}</button>`).join('');
  const estChips=['Todos','Publicado','Borrador'].map(e=>`<button class="chip ${_filterEstado===e?'active':''}" onclick="setEstadoFilter('${e}')">${e}</button>`).join('');
  return `<div class="page-head"><div><h1 class="page-h">Cursos</h1><p class="page-sub">Gestiona el catálogo y las clases de cada curso.</p></div>
    <button class="btn-add" onclick="newCurso()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Nuevo curso</button></div>
    ${searchBar('cursos','Buscar curso por título, categoría o instructor...')}
    <div class="chips-row">${catChips}</div>
    <div class="chips-row" style="margin-bottom:18px">${estChips}</div>
    <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr>${['Curso','Categoría','Nivel','Clases','Estado','Goteo'].map(h=>`<th>${h}</th>`).join('')}<th></th></tr></thead>
    <tbody id="tbl-body">${rowsHTML('cursos')}</tbody></table></div><div id="tbl-pager">${pagerInner('cursos')}</div></div>`;
}
function cursoForm(c={}){
  const clases=c.listaClases||[];
  return `
  <div class="form-grid">
    <div class="field form-full"><label>Nombre del curso</label><input id="f-titulo" value="${esc(c.titulo)}" placeholder="Ej. Diseño Estructural de Concreto"></div>
    <div class="field form-full"><label>Descripción</label><textarea id="f-desc" rows="3">${esc(c.desc)}</textarea></div>
    <div class="field"><label style="display:flex;justify-content:space-between">Categoría <a onclick="addCategoria()" style="color:var(--rojo);font-weight:700;cursor:pointer;text-transform:none;letter-spacing:0">+ Nueva</a></label><select id="f-categoria">${CATS.map(x=>`<option ${c.categoria===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label>Nivel</label><select id="f-nivel">${NIVELES.map(x=>`<option ${c.nivel===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label>Instructor</label><input id="f-instructor" value="${esc(c.instructor)}" placeholder="Ej. Arq. Nombre"></div>
    <div class="field"><label>Estado</label><select id="f-estado">${ESTADOS.map(x=>`<option ${c.estado===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field form-full"><label>Liberación por goteo (días desde registro del socio)</label><input id="f-drip" type="number" value="${c.dripDias||0}" placeholder="0">
      <p style="color:var(--muted);font-size:.82rem;margin-top:6px">Si el valor es 0, el curso se desbloquea desde que el socio se registra. Si es 13, se desbloquea 13 días después.</p></div>
    <div class="field form-full"><label>📄 Temario del curso (Google Drive)</label><input id="f-temario" value="${esc(c.temario)}" placeholder="https://drive.google.com/file/d/..."></div>
    <div class="field form-full"><label>🖼️ Imagen de portada (Google Drive)</label><input id="f-img" value="${esc(c.img)}" placeholder="https://drive.google.com/file/d/..."></div>
  </div>
  <div class="form-full" style="margin-top:8px">
    <label style="display:block;font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:10px">Clases del curso</label>
    <div id="clases-list">${clases.map((cl,i)=>claseEditRow(cl,i)).join('')}</div>
    <button class="btn-add-clase" onclick="addClaseRow()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M12 4v16m8-8H4"/></svg>Agregar clase</button>
  </div>`;
}
function addCategoria(){
  const n=prompt('Nombre de la nueva categoría:');
  if(n&&n.trim()){const v=n.trim();if(CATS.includes(v)){toast('Ya existe');return;}CATS.push(v);const sel=document.getElementById('f-categoria');const o=document.createElement('option');o.textContent=v;o.selected=true;sel.appendChild(o);if(FB_OK)db.collection('config').doc('app').set({categorias:CATS},{merge:true});toast('Categoría agregada');}
}
function claseEditRow(cl={},i){return `<div class="clase-edit" data-clase draggable="true" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondragend="dragEnd(event)">
  <span class="grip" title="Arrastra para reordenar">⠿</span>
  <span class="num">${i+1}</span>
  <input class="in-titulo" data-cl="titulo" value="${esc(cl.titulo)}" placeholder="Título de la clase">
  <input class="in-dur" data-cl="duracion" value="${esc(cl.duracion)||'2 Horas'}" placeholder="Duración">
  <input class="in-url" data-cl="videoUrl" value="${esc(cl.videoUrl)}" placeholder="URL Google Drive">
  <button class="rm" onclick="this.parentElement.remove();renumClases()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
</div>`;}
let _dragEl=null;
function dragStart(e){_dragEl=e.currentTarget;e.currentTarget.classList.add('dragging');}
function dragEnd(e){e.currentTarget.classList.remove('dragging');_dragEl=null;renumClases();}
function dragOver(e){
  e.preventDefault();const t=e.currentTarget;if(!_dragEl||t===_dragEl)return;
  const list=t.parentElement,items=[...list.children];
  if(items.indexOf(t)<items.indexOf(_dragEl))list.insertBefore(_dragEl,t);
  else list.insertBefore(_dragEl,t.nextSibling);
}
function addClaseRow(){const l=document.getElementById('clases-list');l.insertAdjacentHTML('beforeend',claseEditRow({},l.children.length));}
function renumClases(){document.querySelectorAll('#clases-list .clase-edit').forEach((r,i)=>r.querySelector('.num').textContent=i+1);}
function collectClases(){return [...document.querySelectorAll('#clases-list .clase-edit')].map(r=>({titulo:r.querySelector('[data-cl="titulo"]').value,duracion:r.querySelector('[data-cl="duracion"]').value,videoUrl:r.querySelector('[data-cl="videoUrl"]').value}));}
function newCurso(){openForm('Nuevo curso',cursoForm(),()=>saveCurso(null));}
function saveCurso(id){
  const clases=collectClases();
  const data={titulo:fv('f-titulo'),categoria:fv('f-categoria'),nivel:fv('f-nivel'),instructor:fv('f-instructor'),estado:fv('f-estado'),dripDias:+fv('f-drip')||0,temario:fv('f-temario'),img:fv('f-img'),desc:fv('f-desc'),listaClases:clases,clases:clases.length};
  if(!data.titulo)return toast('El título es obligatorio');
  saveDoc('cursos',id,data);
}

/* ====== WEBINARS ====== */
function renderWebinars(){return listSection('webinars',{title:'Webinars',sub:'Programa sesiones en vivo y sube grabaciones.',addLabel:'Nuevo webinar',addFn:'newWebinar()',head:['Título','Fecha','Estado'],search:'Buscar webinar...'});}
function webinarForm(w={}){return `<div class="form-grid">
  <div class="field form-full"><label>Título</label><input id="f-titulo" value="${esc(w.titulo)}"></div>
  <div class="field"><label>Fecha (texto visible)</label><input id="f-fecha" value="${esc(w.fecha)}" placeholder="15 jun 2026, 18:00"></div>
  <div class="field"><label>Fecha y hora (para countdown)</label><input id="f-fechaISO" type="datetime-local" value="${esc(w.fechaISO)}"></div>
  <div class="field form-full"><label>URL en vivo (Meet / Zoom)</label><input id="f-envivo" value="${esc(w.envivo)}" placeholder="https://meet.google.com/... o https://zoom.us/..."></div>
  <div class="field form-full"><label>URL grabación (opcional)</label><input id="f-grabacion" value="${esc(w.grabacion)}" placeholder="https://drive.google.com/..."></div>
  <div class="field form-full"><label>Imagen (URL)</label><input id="f-img" value="${esc(w.img)}"></div>
</div>`;}
function newWebinar(){openForm('Nuevo webinar',webinarForm(),()=>saveWebinar(null));}
function saveWebinar(id){const d={titulo:fv('f-titulo'),fecha:fv('f-fecha'),fechaISO:fv('f-fechaISO'),envivo:fv('f-envivo'),grabacion:fv('f-grabacion'),img:fv('f-img')};if(!d.titulo)return toast('El título es obligatorio');saveDoc('webinars',id,d);}

/* ====== NOTICIAS ====== */
function renderNoticias(){return listSection('noticias',{title:'Noticias',sub:'Publica novedades del sector de la construcción.',addLabel:'Nueva noticia',addFn:'newNoticia()',head:['Noticia','Fuente','Fecha'],search:'Buscar noticia...'});}
function noticiaForm(n={}){return `<div class="form-grid">
  <div class="field form-full"><label>Título</label><input id="f-titulo" value="${esc(n.titulo)}"></div>
  <div class="field"><label>Fuente</label><input id="f-fuente" value="${esc(n.fuente)||'IMDAC'}"></div>
  <div class="field"><label>Fecha</label><input id="f-fecha" value="${esc(n.fecha)||new Date().toLocaleDateString('es-MX')}"></div>
  <div class="field form-full"><label>Resumen</label><textarea id="f-resumen" rows="3">${esc(n.resumen)}</textarea></div>
  <div class="field form-full"><label>Imagen (URL)</label><input id="f-img" value="${esc(n.img)}"></div>
  <div class="field form-full"><label>Enlace (URL)</label><input id="f-url" value="${esc(n.url)}" placeholder="https://..."></div>
</div>`;}
function newNoticia(){openForm('Nueva noticia',noticiaForm(),()=>saveNoticia(null));}
function saveNoticia(id){const d={titulo:fv('f-titulo'),fuente:fv('f-fuente'),fecha:fv('f-fecha'),resumen:fv('f-resumen'),img:fv('f-img'),url:fv('f-url')};if(!d.titulo)return toast('El título es obligatorio');saveDoc('noticias',id,d);}

/* ====== MATERIAL ====== */
function renderMaterial(){return listSection('material',{title:'Material PDF',sub:'Sube guías, planos tipo y documentos descargables.',addLabel:'Nuevo material',addFn:'newMaterial()',head:['Título','Descripción'],search:'Buscar material...'});}
function materialForm(m={}){
  const opts=(DATA.cursos||[]).map(c=>`<option value="${c.id}" ${m.cursoId===c.id?'selected':''}>${esc(c.titulo)}</option>`).join('');
  return `<div class="form-grid">
  <div class="field form-full"><label>Título</label><input id="f-titulo" value="${esc(m.titulo)}"></div>
  <div class="field form-full"><label>Descripción</label><textarea id="f-desc" rows="2">${esc(m.desc)}</textarea></div>
  <div class="field form-full"><label>URL del PDF</label><input id="f-url" value="${esc(m.url)}" placeholder="https://..."></div>
  <div class="field form-full"><label>Desbloquear junto con el curso (opcional)</label>
    <select id="f-curso"><option value="">Disponible desde el inicio (sin goteo)</option>${opts}</select>
    <small style="color:var(--muted);font-size:.78rem">Si eliges un curso, el socio verá este PDF bloqueado hasta que ese curso se le abra por goteo.</small>
  </div>
</div>`;}
function newMaterial(){openForm('Nuevo material',materialForm(),()=>saveMaterial(null));}
function saveMaterial(id){const d={titulo:fv('f-titulo'),desc:fv('f-desc'),url:fv('f-url'),cursoId:fv('f-curso')||''};if(!d.titulo)return toast('El título es obligatorio');saveDoc('material',id,d);}

/* ====== PRECIOS UNITARIOS ====== */
function renderPrecios(){return listSection('precios',{title:'Precios Unitarios',sub:'Catálogo de conceptos de obra que ven los miembros en el Club.',addLabel:'Nuevo concepto',addFn:'newPrecio()',head:['Concepto','Unidad','P.U.'],search:'Buscar concepto...'});}
function precioRow(p){return `<tr><td class="t-title">${p.concepto||''}</td><td><span class="tag">${p.unidad||'—'}</span></td><td style="font-weight:700">${p.precio||'—'}</td><td>${actions('precios',p.id)}</td></tr>`;}
function precioForm(p={}){return `<div class="form-grid">
  <div class="field form-full"><label>Concepto</label><input id="f-concepto" value="${esc(p.concepto)}" placeholder="Ej. Muro de block 15 cm asentado"></div>
  <div class="field"><label>Unidad</label><input id="f-unidad" value="${esc(p.unidad)}" placeholder="m², m³, ml, pza, lote"></div>
  <div class="field"><label>P.U. estimado</label><input id="f-precio" value="${esc(p.precio)}" placeholder="$540.00"></div>
</div>`;}
function newPrecio(){openForm('Nuevo concepto',precioForm(),()=>savePrecio(null));}
function savePrecio(id){const d={concepto:fv('f-concepto'),unidad:fv('f-unidad'),precio:fv('f-precio')};if(!d.concepto)return toast('El concepto es obligatorio');saveDoc('precios',id,d);}

/* ====== MIEMBROS ====== */
function renderMiembros(){return listSection('miembros',{title:'Miembros',sub:'Consulta y administra los miembros del club.',head:['Miembro','Correo','Ciudad','Estado'],search:'Buscar por nombre, correo o ciudad...'});}
function verMiembro(id){
  const m=DATA.miembros.find(x=>x.id===id);if(!m)return;
  const estado=(m.estado||'Activo');
  const estTag=estado==='Cancelado'?'<span class="tag gray">Cancelado</span>':estado==='Suspendido'?'<span class="tag">Suspendido</span>':'<span class="tag green">Activo</span>';
  const nAsign=(m.cursosAsignados||[]).length;
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-head"><h3>Detalle del miembro</h3><button class="modal-x" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="member-hero"><div class="av">${(m.nombre||'U')[0].toUpperCase()}</div><div><h3 style="font-family:var(--font-display);font-size:1.3rem">${m.nombre||'—'}</h3><span style="color:var(--muted)">${m.email||''}</span></div><div style="margin-left:auto">${estTag}</div></div>
      <div class="member-info">
        <div class="it"><div class="l">Teléfono</div><div class="v">${m.telefono||'—'}</div></div>
        <div class="it"><div class="l">Ciudad</div><div class="v">${m.ciudad||'—'}</div></div>
        <div class="it"><div class="l">Profesión</div><div class="v">${m.profesion||'—'}</div></div>
        <div class="it"><div class="l">Alta</div><div class="v">${m.alta||'—'}</div></div>
        <div class="it"><div class="l">Vigencia hasta</div><div class="v">${m.vigenciaHasta||'—'}${m.diasRegalados?` <span class="tag gray">+${m.diasRegalados}d</span>`:''}</div></div>
        <div class="it"><div class="l">Cursos asignados</div><div class="v">${nAsign}</div></div>
        <div class="it" style="grid-column:1/-1"><div class="l">Biografía</div><div class="v" style="font-weight:400">${m.bio||'—'}</div></div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 2px">
        <button class="btn-ghost" onclick="verProgreso('${id}')">📊 Ver progreso</button>
        <button class="btn-ghost" onclick="regalarTiempo('${id}')">🎁 Regalar tiempo</button>
        <button class="btn-ghost" onclick="asignarCurso('${id}')">📚 Asignar curso</button>
        <button class="btn-ghost" onclick="toggleMiembroEstado('${id}')">${estado==='Cancelado'?'✅ Reactivar':'⛔ Cancelar'}</button>
      </div>
      <div id="mbr-panel"></div>
      <div class="modal-foot"><button class="btn-ghost" onclick="closeModal()">Cerrar</button></div>
    </div>`;
  document.getElementById('modal').classList.add('open');
}
const _MBRFORM='background:var(--base);border:1.5px solid var(--line);border-radius:12px;padding:14px;margin-top:8px';
const _MBRINP='flex:1;padding:10px 12px;border:1.5px solid var(--line);border-radius:10px;background:var(--surface,var(--base));color:var(--text)';
function notificarMiembro(uid,emoji,titulo,mensaje){
  if(!FB_OK||!uid)return;
  db.collection('notificaciones').add({
    emoji,titulo,mensaje,
    paraUid:uid,
    fecha:new Date().toLocaleDateString('es-MX'),
    creado:firebase.firestore.FieldValue.serverTimestamp()
  }).catch(()=>{});
}
function _saveMiembro(m,msg){
  if(FB_OK){const {id,alta,...rest}=m;db.collection('miembros').doc(id).set(rest,{merge:true}).then(()=>toast(msg,{type:'ok'})).catch(()=>toast('Error al guardar',{type:'err'}));}
  else toast(msg+' (demo)',{type:'ok'});
}
function regalarTiempo(id){
  const p=document.getElementById('mbr-panel');if(!p)return;
  p.innerHTML=`<div style="${_MBRFORM}">
    <label style="font-size:.82rem;color:var(--muted)">Días a regalar / extender vigencia</label>
    <div style="display:flex;gap:8px;margin-top:6px">
      <input id="rt-dias" type="number" min="1" value="30" style="${_MBRINP}">
      <button class="btn-save" onclick="confirmRegalarTiempo('${id}')">Aplicar</button>
    </div></div>`;
}
function confirmRegalarTiempo(id){
  const m=DATA.miembros.find(x=>x.id===id);if(!m)return;
  const dias=+document.getElementById('rt-dias').value||0;
  if(dias<=0)return toast('Indica un número de días válido',{type:'err'});
  let base=m.vigenciaHasta?new Date(m.vigenciaHasta):new Date();
  if(isNaN(base.getTime()))base=new Date();
  base.setDate(base.getDate()+dias);
  m.vigenciaHasta=base.toISOString().slice(0,10);
  m.diasRegalados=(m.diasRegalados||0)+dias;
  _saveMiembro(m,`Se regalaron ${dias} días a ${m.nombre||'el miembro'}`);
  notificarMiembro(id,'🎁','¡Te regalamos acceso!',`IMDAC te otorgó ${dias} días de acceso de cortesía. Tu membresía está activa hasta el ${m.vigenciaHasta}. ¡Disfruta el contenido!`);
  verMiembro(id);
}
function asignarCurso(id){
  const m=DATA.miembros.find(x=>x.id===id);if(!m)return;
  const asign=m.cursosAsignados||[];
  const opts=DATA.cursos.map(c=>`<option value="${c.id}" ${asign.includes(c.id)?'disabled':''}>${esc(c.titulo)}${asign.includes(c.id)?' (ya asignado)':''}</option>`).join('');
  const p=document.getElementById('mbr-panel');if(!p)return;
  p.innerHTML=`<div style="${_MBRFORM}">
    <label style="font-size:.82rem;color:var(--muted)">Asignar curso (acceso inmediato, ignora el goteo)</label>
    <div style="display:flex;gap:8px;margin-top:6px">
      <select id="ac-curso" style="${_MBRINP}">${opts||'<option value="">Sin cursos disponibles</option>'}</select>
      <button class="btn-save" onclick="confirmAsignarCurso('${id}')">Asignar</button>
    </div></div>`;
}
function confirmAsignarCurso(id){
  const m=DATA.miembros.find(x=>x.id===id);if(!m)return;
  const cid=document.getElementById('ac-curso').value;if(!cid)return;
  m.cursosAsignados=Array.from(new Set([...(m.cursosAsignados||[]),cid]));
  const c=DATA.cursos.find(x=>x.id===cid);
  _saveMiembro(m,`Curso "${c?c.titulo:cid}" asignado`);
  notificarMiembro(id,'📚','Nuevo curso desbloqueado',`Se te dio acceso al curso "${c?c.titulo:'nuevo curso'}". Ya puedes verlo en tu biblioteca, sin esperar al goteo. ¡A aprender!`);
  verMiembro(id);
}
function verProgreso(id){
  const m=DATA.miembros.find(x=>x.id===id);if(!m)return;
  const p=document.getElementById('mbr-panel');if(!p)return;
  const asign=m.cursosAsignados||[];
  const pintar=(prog)=>{
    const ids=Array.from(new Set([...Object.keys(prog),...asign]));
    if(!ids.length){p.innerHTML=`<div style="${_MBRFORM}"><span style="color:var(--muted);font-size:.88rem">Sin datos de progreso ni cursos asignados.</span></div>`;return;}
    p.innerHTML=`<div style="${_MBRFORM}">${ids.map(cid=>{
      const c=DATA.cursos.find(x=>x.id===cid);const pct=Math.round(prog[cid]||0);
      return `<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:4px"><span>${c?esc(c.titulo):cid}</span><b>${pct}%</b></div><div style="height:8px;background:var(--line);border-radius:6px;overflow:hidden"><i style="display:block;height:100%;width:${pct}%;background:var(--rojo)"></i></div></div>`;
    }).join('')}</div>`;
  };
  if(FB_OK){
    p.innerHTML=`<div style="${_MBRFORM}"><span style="color:var(--muted);font-size:.88rem">Cargando progreso…</span></div>`;
    db.collection('progreso').where('uid','==',id).get().then(snap=>{
      const prog={};snap.forEach(d=>{const x=d.data();prog[x.cursoId]=x.porcentaje||0;});
      pintar(prog);
    }).catch(()=>pintar(m.progreso||{}));
  }else pintar(m.progreso||{});
}
function toggleMiembroEstado(id){
  const m=DATA.miembros.find(x=>x.id===id);if(!m)return;
  m.estado=(m.estado||'Activo')==='Cancelado'?'Activo':'Cancelado';
  _saveMiembro(m,m.estado==='Cancelado'?'Membresía cancelada':'Membresía reactivada');
  if(m.estado==='Cancelado')notificarMiembro(id,'⛔','Membresía cancelada','Tu membresía fue cancelada por el equipo IMDAC. Si crees que es un error, escríbenos por WhatsApp.');
  else notificarMiembro(id,'✅','Membresía reactivada','¡Buenas noticias! Tu membresía fue reactivada por el equipo IMDAC. Ya tienes acceso completo de nuevo.');
  verMiembro(id);if(typeof rebuildRows==='function')rebuildRows();
}

/* ====== FORO (moderación) ====== */
function renderForo(){return listSection('foro',{title:'Foro',sub:'Modera los temas publicados por la comunidad.',head:['Tema','Autor','Categoría','Interacción'],search:'Buscar tema o autor...'});}

/* ====== NOTIFICACIONES ====== */
const NOTIF_TIPOS=[['📢','Anuncio'],['📚','Nuevo curso'],['🎥','Webinar'],['📄','Material'],['🏷️','Promoción']];
let _notifEmoji='📢';
function renderNotificaciones(){
  const rows=DATA.notificaciones.map(n=>`<tr><td class="t-title">${n.emoji||'📢'} ${n.titulo}</td><td>${n.mensaje||''}</td><td>${n.fecha||'—'}</td>
    <td>${actions('notificaciones',n.id)}</td></tr>`).join('');
  return `<div class="page-head"><div><h1 class="page-h">Notificaciones</h1><p class="page-sub">Envía avisos a los miembros del club.</p></div>
    <button class="btn-add" onclick="newNotif()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Nueva notificación</button></div>
    <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Notificación</th><th>Mensaje</th><th>Fecha</th><th></th></tr></thead>
    <tbody>${rows||'<tr><td colspan="4"><div class="empty"><b>Sin notificaciones enviadas</b></div></td></tr>'}</tbody></table></div></div>`;
}
function notifForm(n={}){_notifEmoji=n.emoji||'📢';return `
  <div class="field"><label>Tipo</label><div class="emoji-pick" id="emoji-pick">${NOTIF_TIPOS.map(t=>`<button class="${t[0]===_notifEmoji?'active':''}" onclick="pickEmoji('${t[0]}')" title="${t[1]}">${t[0]}</button>`).join('')}</div></div>
  <div class="field" style="margin-top:16px"><label>Título</label><input id="f-titulo" value="${esc(n.titulo)}" placeholder="Ej. Nuevo curso disponible"></div>
  <div class="field"><label>Mensaje</label><textarea id="f-mensaje" rows="3">${esc(n.mensaje)}</textarea></div>
  <div class="field"><label>Segmento</label><select id="f-segmento"><option>Todos los miembros</option><option>Solo Premium</option><option>Nuevos (último mes)</option></select></div>`;}
function pickEmoji(e){_notifEmoji=e;document.querySelectorAll('#emoji-pick button').forEach(b=>b.classList.toggle('active',b.textContent===e));}
function newNotif(){openForm('Nueva notificación',notifForm(),()=>saveNotif(null));}
function saveNotif(id){const d={emoji:_notifEmoji,titulo:fv('f-titulo'),mensaje:fv('f-mensaje'),segmento:fv('f-segmento'),fecha:new Date().toLocaleDateString('es-MX'),creado:firebase.firestore.FieldValue.serverTimestamp()};if(!d.titulo)return toast('El título es obligatorio');saveDoc('notificaciones',id,d);}

/* ====== CONFIG ====== */
function renderConfig(){
  return `<div class="page-head"><div><h1 class="page-h">Configuración</h1><p class="page-sub">Ajustes globales del club.</p></div></div>
  <div class="card" style="padding:8px 26px;max-width:620px">
    <div class="cfg-item"><div class="ci-t"><b>Modo mantenimiento</b><span>Bloquea el acceso de miembros al Club mientras actualizas contenido</span></div>
      <label class="toggle"><input type="checkbox" id="cfg-maint" ${_appCfg.mantenimiento?'checked':''} onchange="saveMaint(this.checked)"><span class="tk"></span></label></div>
  </div>
  <div class="card" style="padding:26px;max-width:620px;margin-top:18px">
    <h3 style="font-family:var(--font-display);font-size:1.1rem;margin-bottom:6px">Categorías de cursos</h3>
    <p style="color:var(--muted);font-size:.86rem;margin-bottom:16px">Aparecen en el formulario de cursos y en los filtros del Club. Recuerda guardar.</p>
    <div class="chips-row" id="cat-chips">${CATS.map((c,i)=>catChip(c,i)).join('')}</div>
    <div style="display:flex;gap:10px;margin-top:14px">
      <input id="cat-new" placeholder="Nueva categoría" onkeydown="if(event.key==='Enter')addCatInput()" style="flex:1;padding:11px 14px;border:1.5px solid var(--line);border-radius:11px;background:var(--base);color:var(--text)">
      <button class="btn-ghost" onclick="addCatInput()">Agregar</button>
    </div>
    <button class="btn-save" style="margin-top:16px" onclick="saveCats()">Guardar categorías</button>
  </div>
  <div class="card" style="padding:26px;max-width:620px;margin-top:18px">
    <h3 style="font-family:var(--font-display);font-size:1.1rem;margin-bottom:16px">Plan y contacto</h3>
    <div class="form-grid">
      <div class="field"><label>Precio mensual (MXN)</label><input id="cfg-precio" type="number" value="${_appCfg.precio||499}"></div>
      <div class="field"><label>Cupón de descuento</label><input id="cfg-cupon" value="${esc(_appCfg.cupon)||'CLUB20IMDAC'}"></div>
      <div class="field"><label>WhatsApp soporte 1</label><input id="cfg-wa1" value="${esc(_appCfg.wa1)||'238 219 6286'}"></div>
      <div class="field"><label>WhatsApp soporte 2</label><input id="cfg-wa2" value="${esc(_appCfg.wa2)||'236 111 2213'}"></div>
      <div class="field form-full"><label>Enlace canal WhatsApp</label><input id="cfg-canal" value="${esc(_appCfg.canal)}" placeholder="https://chat.whatsapp.com/..."></div>
    </div>
    <button class="btn-save" style="margin-top:18px" onclick="saveContacto()">Guardar plan y contacto</button>
  </div>`;
}
function saveMaint(on){_appCfg.mantenimiento=on;if(FB_OK)db.collection('config').doc('app').set({mantenimiento:on},{merge:true});toast(on?'Modo mantenimiento ACTIVADO':'Modo mantenimiento desactivado',{type:on?'info':'ok'});}
function catChip(c,i){return `<span class="cat-tag">${esc(c)}<button onclick="removeCat(${i})" title="Quitar">✕</button></span>`;}
function addCatInput(){const v=document.getElementById('cat-new').value.trim();if(!v)return;if(CATS.includes(v))return toast('Esa categoría ya existe');CATS.push(v);document.getElementById('cat-chips').innerHTML=CATS.map((c,j)=>catChip(c,j)).join('');document.getElementById('cat-new').value='';}
function removeCat(i){CATS.splice(i,1);document.getElementById('cat-chips').innerHTML=CATS.map((c,j)=>catChip(c,j)).join('');}
function saveCats(){if(FB_OK)db.collection('config').doc('app').set({categorias:CATS},{merge:true}).then(()=>toast('Categorías guardadas')).catch(()=>toast('Error al guardar'));else toast('Categorías guardadas (demo)');}
function saveContacto(){
  const d={precio:+fv('cfg-precio')||499,cupon:fv('cfg-cupon'),wa1:fv('cfg-wa1'),wa2:fv('cfg-wa2'),canal:fv('cfg-canal')};
  Object.assign(_appCfg,d);
  if(FB_OK)db.collection('config').doc('app').set(d,{merge:true}).then(()=>toast('Plan y contacto guardados',{type:'ok'})).catch(()=>toast('Error al guardar',{type:'err'}));
  else toast('Plan y contacto guardados (demo)',{type:'ok'});
}

/* ====== MODAL FORM (reusable) ====== */
let _saveFn=null;
function openForm(title,bodyHtml,saveFn){
  _saveFn=saveFn;
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-head"><h3>${title}</h3><button class="modal-x" onclick="closeModal()">✕</button></div>
    <div class="modal-body">${bodyHtml}
      <div class="modal-foot"><button class="btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn-save" id="modal-save" onclick="_saveFn()">Guardar</button></div>
    </div>`;
  document.getElementById('modal').classList.add('open');
}
function closeModal(){document.getElementById('modal').classList.remove('open');_saveFn=null;}

/* ====== EDIT / DELETE genéricos ====== */
const COLL_MAP={cursos:{data:'cursos',form:cursoForm,save:saveCurso,title:'Editar curso'},
  webinars:{data:'webinars',form:webinarForm,save:saveWebinar,title:'Editar webinar'},
  noticias:{data:'noticias',form:noticiaForm,save:saveNoticia,title:'Editar noticia'},
  material:{data:'material',form:materialForm,save:saveMaterial,title:'Editar material'},
  notificaciones:{data:'notificaciones',form:notifForm,save:saveNotif,title:'Editar notificación'},
  precios:{data:'precios',form:precioForm,save:savePrecio,title:'Editar concepto'}};
function editItem(coll,id){
  const cfg=COLL_MAP[coll];const item=DATA[cfg.data].find(x=>x.id===id);if(!item)return;
  openForm(cfg.title,cfg.form(item),()=>cfg.save(id));
}
function delItem(coll,id){
  const dataKey=coll, collName=coll==='foro'?'foro_temas':coll;
  const item=DATA[dataKey].find(x=>x.id===id); if(!item)return;
  const snap=JSON.parse(JSON.stringify(item));
  const restore=()=>{
    if(FB_OK){const{id:iid,...rest}=snap;db.collection(collName).doc(iid).set(rest).then(()=>{DATA[dataKey].unshift(snap);renderSection(currentSection);toast('Restaurado',{type:'ok'});});}
    else{DATA[dataKey].unshift(snap);renderSection(currentSection);toast('Restaurado',{type:'ok'});}
  };
  if(FB_OK){
    db.collection(collName).doc(id).delete().then(()=>{DATA[dataKey]=DATA[dataKey].filter(x=>x.id!==id);renderSection(currentSection);toast('Registro eliminado',{type:'ok',undo:restore});}).catch(()=>toast('Error al eliminar',{type:'err'}));
  }else{
    DATA[dataKey]=DATA[dataKey].filter(x=>x.id!==id);renderSection(currentSection);toast('Registro eliminado',{type:'ok',undo:restore});
  }
}

/* ====== SAVE genérico ====== */
function saveDoc(coll,id,data){
  const btn=document.getElementById('modal-save');
  if(btn){btn.disabled=true;btn._txt=btn.textContent;btn.textContent='Guardando…';}
  const ok=()=>{toast(id?'Cambios guardados':'Creado correctamente',{type:'ok'});closeModal();if(FB_OK)reload();else renderSection(currentSection);};
  const fail=()=>{if(btn){btn.disabled=false;btn.textContent=btn._txt||'Guardar';}toast('Error al guardar',{type:'err'});};
  if(FB_OK){
    const ref=id?db.collection(coll).doc(id):db.collection(coll).doc();
    ref.set(data,{merge:true}).then(ok).catch(fail);
  }else{
    setTimeout(()=>{if(id){const it=DATA[coll].find(x=>x.id===id);Object.assign(it,data);}else DATA[coll].unshift({id:'demo'+Date.now(),...data});ok();},450);
  }
}

/* ====== AUTH ====== */
function showErr(m){const e=document.getElementById('auth-err');e.textContent=m;e.style.display='block';}
function doLogin(){
  const email=fv('li-email'),pass=fv('li-pass');
  if(!email||!pass)return showErr('Completa todos los campos.');
  if(!FB_OK){
    if(email===DEMO_ADMIN.email&&pass===DEMO_ADMIN.pass){CURRENT_USER={email,displayName:'Administrador',uid:'demo'};onLogged();}
    else showErr('Credenciales demo: '+DEMO_ADMIN.email+' / '+DEMO_ADMIN.pass);
    return;
  }
  auth.signInWithEmailAndPassword(email,pass).then(async cred=>{
    const adm=await db.collection('admins').doc(cred.user.uid).get();
    if(!adm.exists){showErr('Esta cuenta no tiene permisos de administrador.');auth.signOut();return;}
    CURRENT_USER=cred.user;onLogged();
  }).catch(()=>showErr('Correo o contraseña incorrectos.'));
}
function doLogout(){if(FB_OK)auth.signOut();else{CURRENT_USER=null;document.body.classList.remove('logged');document.getElementById('login').classList.remove('hidden');}}

/* ====== DATA LOAD ====== */
async function reload(){await loadData();renderSection(currentSection);}
async function loadData(){
  // Modo real: arranca vacío y solo se llena con Firestore. El demo aplica únicamente sin Firebase.
  DATA={cursos:[],webinars:[],noticias:[],material:[],foro:[],miembros:[],notificaciones:[],precios:[]};
  if(!FB_OK){DATA={cursos:[...DEMO.cursos],webinars:[...DEMO.webinars],noticias:[...DEMO.noticias],material:[...DEMO.material],foro:[...DEMO.foro],miembros:[...DEMO.miembros],notificaciones:[...DEMO.notificaciones],precios:[...DEMO.precios]};return;}
  try{
    const cols=['cursos','webinars','noticias','material'];
    const snaps=await Promise.all(cols.map(c=>db.collection(c).get()));
    cols.forEach((c,i)=>{DATA[c]=snaps[i].docs.map(d=>({id:d.id,...d.data()}));});
    const foro=await db.collection('foro_temas').get();DATA.foro=foro.docs.map(d=>({id:d.id,...d.data()}));
    const miem=await db.collection('miembros').get();DATA.miembros=miem.docs.map(d=>{const x=d.data();return {id:d.id,...x,alta:x.creado?.toDate?x.creado.toDate().toLocaleDateString('es-MX'):'—'};});
    const notif=await db.collection('notificaciones').orderBy('fecha','desc').get();DATA.notificaciones=notif.docs.map(d=>({id:d.id,...d.data()}));
    const pre=await db.collection('precios').get();DATA.precios=pre.docs.map(d=>({id:d.id,...d.data()}));
    const cfg=await db.collection('config').doc('app').get();if(cfg.exists){_appCfg=cfg.data();if(Array.isArray(_appCfg.categorias)&&_appCfg.categorias.length)CATS=_appCfg.categorias;}
  }catch(e){console.warn('Firestore:',e.message);}
}

/* ====== UI helpers ====== */
const esc=s=>(s==null?'':String(s)).replace(/"/g,'&quot;').replace(/</g,'&lt;');
const fv=id=>document.getElementById(id)?.value||'';
function initials(){const n=CURRENT_USER?.displayName||CURRENT_USER?.email||'A';return n.trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();}
function refreshUserUI(){document.getElementById('u-name').textContent=CURRENT_USER?.displayName||'Admin';document.getElementById('u-email').textContent=CURRENT_USER?.email||'';document.getElementById('u-av').textContent=initials();}
function toggleSidebar(open){const sb=document.getElementById('sidebar'),bd=document.getElementById('sb-backdrop');if(open===undefined)open=!sb.classList.contains('open');sb.classList.toggle('open',open);bd.classList.toggle('open',open);}
function toggleTheme(){const cur=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=cur;try{localStorage.setItem('imdac-admin-theme',cur);}catch(e){}updateThemeIcon();}
function updateThemeIcon(){const btn=document.getElementById('theme-btn');if(!btn)return;const dark=document.documentElement.dataset.theme==='dark';btn.innerHTML=dark?'<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>':'<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>';btn.title=dark?'Modo claro':'Modo oscuro';}
function toast(m,opts={}){
  const t=document.getElementById('toast');
  const type=opts.type||'ok';const icon=type==='err'?'✕':type==='info'?'i':'✓';
  t.innerHTML=`<span class="tic ${type}">${icon}</span><span>${m}</span>${opts.undo?'<button class="undo" id="toast-undo">Deshacer</button>':''}`;
  t.classList.add('show');
  if(opts.undo){document.getElementById('toast-undo').onclick=()=>{opts.undo();t.classList.remove('show');};}
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),opts.undo?5500:2600);
}

/* ====== ARRANQUE ====== */
async function onLogged(){
  document.body.classList.add('logged');document.getElementById('login').classList.add('hidden');
  renderSidebar();refreshUserUI();updateThemeIcon();
  renderLoading();
  await loadData();go('dashboard');
}
function renderLoading(msg){const c=document.getElementById('content');if(c)c.innerHTML=`<div class="adm-loading"><div class="adm-spin"></div><span>${msg||'Cargando datos…'}</span></div>`;}
window.addEventListener('DOMContentLoaded',()=>{
  try{const t=localStorage.getItem('imdac-admin-theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}
  if(FB_OK){
    auth.onAuthStateChanged(async u=>{
      document.getElementById('boot').classList.add('hide');
      if(u){const adm=await db.collection('admins').doc(u.uid).get();if(adm.exists){CURRENT_USER=u;onLogged();}else{auth.signOut();document.getElementById('login').classList.remove('hidden');}}
      else document.getElementById('login').classList.remove('hidden');
    });
  }else{document.getElementById('boot').classList.add('hide');document.getElementById('login').classList.remove('hidden');}
});

/* ====== DATOS DEMO ====== */
const DEMO={
  cursos:[
    {id:'c1',titulo:'Diseño Estructural de Concreto Reforzado',categoria:'Estructuras',nivel:'Intermedio',dripDias:0,clases:3,img:'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&q=70',desc:'Fundamentos del diseño de elementos de concreto según NTC.',listaClases:[{titulo:'Introducción y normativa',duracion:'2 Horas',videoUrl:''},{titulo:'Diseño de vigas',duracion:'2 Horas',videoUrl:''},{titulo:'Diseño de columnas',duracion:'2 Horas',videoUrl:''}]},
    {id:'c2',titulo:'Presupuestos y Precios Unitarios de Obra',categoria:'Costos y Presupuestos',nivel:'Básico',dripDias:0,clases:0,img:'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&q=70',desc:'Integración de precios unitarios.',listaClases:[]},
  ],
  webinars:[],
  noticias:[{id:'n1',titulo:'Nuevas Normas Técnicas Complementarias entran en vigor',fuente:'CMIC',resumen:'Actualización de requisitos de diseño estructural.',fecha:'30/5/2026',img:'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&q=70',url:'#'}],
  material:[],
  foro:[{id:'f1',titulo:'¿Qué software usan para presupuestar?',autor:'Arq. Demo',tag:'Costos',likes:3,vistas:12}],
  miembros:[
    {id:'m1',nombre:'Arq. Demo Usuario',email:'demo@imdac.mx',ciudad:'Tehuacán, Pue.',telefono:'238 000 0000',profesion:'Arquitecto',alta:'21/5/2026',bio:'Miembro de prueba.',estado:'Activo',vigenciaHasta:'2026-12-31',cursosAsignados:['c1'],progreso:{c1:60}},
    {id:'m2',nombre:'Ing. Laura Méndez',email:'laura@imdac.mx',ciudad:'Puebla, Pue.',telefono:'222 111 2222',profesion:'Ing. Civil',alta:'2/5/2026',bio:'',estado:'Activo'},
    {id:'m3',nombre:'Arq. Carlos Ruiz',email:'carlos@imdac.mx',ciudad:'CDMX',telefono:'55 333 4444',profesion:'Arquitecto',alta:'10/4/2026',bio:'',estado:'Cancelado'},
  ],
  notificaciones:[],
  precios:[],
};
