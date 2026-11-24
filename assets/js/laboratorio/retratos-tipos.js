/* Laboratorio RPG — Iconos de tipo, retratos y debilidades */
(function(){
const $=id=>document.getElementById(id);
/* ---- iconos de tipo (trazo, 24×24) ---- */
const ICO={
Fuego:'<path d="M12 2c1 4 6 6 6 11a6 6 0 0 1-12 0c0-2.5 1.2-4 2.4-5.2.3 1.6 1 2.6 2 3C10.2 8 11 5 12 2z"/><path d="M12 21a2.6 2.6 0 0 1-2.6-2.6c0-1.6 1.4-2.4 2.6-4 1.2 1.6 2.6 2.4 2.6 4A2.6 2.6 0 0 1 12 21z"/>',
Planta:'<path d="M12 21V9"/><path d="M12 14C7 14 4 11 4 6c5 0 8 2 8 8z"/><path d="M12 11c0-4 3-7 8-7 0 5-3 8-8 8"/>',
Agua:'<path d="M12 2.5S5 10 5 14.5a7 7 0 0 0 14 0C19 10 12 2.5 12 2.5z"/><path d="M8.5 15c1.2-1 2.3-1 3.5 0s2.3 1 3.5 0"/>',
Viento:'<path d="M4 8h9a3 3 0 1 0-3-3"/><path d="M3 12h14a3 3 0 1 1-3 3"/><path d="M6 17h6a2.5 2.5 0 1 1-2.5 2.5"/>',
Hielo:'<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M9.5 4l2.5 2.5L14.5 4M9.5 20l2.5-2.5 2.5 2.5"/>',
Tierra:'<path d="M3 20v-4h3v-4h3V8h6v4h3v4h3v4z"/><path d="M9 12h6"/>',
'Eléctrico':'<path d="M13 2L5 13.5h6L10 22l9-12.5h-6z"/>',
Roca:'<path d="M12 2.5l8 5v9l-8 5-8-5v-9z"/><path d="M12 2.5v19M4 7.5l8 5 8-5"/>',
'Tóxico':'<path d="M12 3a8 8 0 0 0-8 8c0 2.6 1.2 4.4 3 5.6V20h10v-3.4c1.8-1.2 3-3 3-5.6a8 8 0 0 0-8-8z"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/><path d="M10 20v-2.5M12 20v-2.5M14 20v-2.5"/>',
Metal:'<circle cx="12" cy="12" r="7.5" stroke-dasharray="3.1 2.2" stroke-width="3.2"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.8"/>',
Oscuro:'<circle cx="12" cy="12" r="9"/><path d="M15.5 6.2A6.5 6.5 0 1 0 17.8 15 5.2 5.2 0 0 1 15.5 6.2z"/>',
Sagrado:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22M4.9 4.9l2.5 2.5M16.6 16.6l2.5 2.5M19.1 4.9l-2.5 2.5M7.4 16.6l-2.5 2.5"/>',
Neutro:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/>'};
const GEN='<path d="M12 3l9 9-9 9-9-9z"/><path d="M12 8l4 4-4 4-4-4z"/>';
const body=n=>ICO[n]||GEN;
const tIcon=(n,px)=>`<svg class="ti" viewBox="0 0 24 24" width="${px||14}" height="${px||14}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body(n)}</svg>`;
/* ---- retrato: imagen subida o estela generada ---- */
let gid=0;
function fallback(c){
  const t1=(c.tipos||[])[0]||'Neutro',t2=(c.tipos||[])[1],col=tcol(t1),id='rg'+(gid++);
  return `<svg viewBox="0 0 100 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".6"/><stop offset="1" stop-color="#070a09"/></linearGradient></defs><rect width="100" height="120" fill="url(#${id})"/><path d="M0 120V96h12v-8h12v-8h52v8h12v8h12v24z" fill="#000" opacity=".28"/><g transform="translate(50 54) scale(3.3) translate(-12 -12)" fill="none" stroke="#fff" stroke-opacity=".92" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body(t1)}</g>${t2?`<g transform="translate(78 100) scale(.95) translate(-12 -12)" fill="none" stroke="${tcol(t2)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body(t2)}</g>`:''}</svg>`}
function retHTML(x,px){
  const c=typeof x==='string'?db.find(k=>k.id===x):x;if(!c)return'';
  const w=px||60,h=Math.round(w*1.2);
  return `<span class="ret" style="width:${w}px;height:${h}px" role="img" aria-label="Retrato de ${esc(c.nombre||'criatura')}">${c.retrato?`<img src="${c.retrato}" alt="" loading="lazy">`:fallback(c)}</span>`}
/* ---- debilidades, tolerancias e inmunidades ---- */
function defMult(c,a){let m=1;(c.tipos||[]).forEach(t=>m*=gv(a,t));const ab=getAb(c);if(ab)(ab.fx||[]).forEach(f=>{if(f.tipo===a){if(f.k==='imm')m=0;else if(f.k==='res')m*=f.m}});return m}
function defHTML(c,compact){
  if(!c||!(c.tipos||[]).length)return'';
  const g={d:[],r:[],i:[]};TIPOS.forEach(([a])=>{const m=defMult(c,a);if(m===0)g.i.push([a,m]);else if(m>1)g.d.push([a,m]);else if(m<1)g.r.push([a,m])});
  const row=(l,arr)=>arr.length?`<div class="dfr"><span class="dfl">${l}</span>${arr.map(([a,m])=>`<span class="dfi" title="${esc(a)} ×${+m.toFixed(3)}" style="--c:${tcol(a)}">${tIcon(a,compact?13:16)}${m>0&&m!==1?`<small>×${+m.toFixed(2)}</small>`:''}</span>`).join('')}</div>`:'';
  const h=row('Debilidad',g.d)+row('Tolerancia',g.r)+row('Inmune',g.i);
  return h?`<div class="df">${h}</div>`:''}
/* ---- editor de retrato ---- */
function retRefresh(){const v=$('xretv');if(!v||typeof cur==='undefined')return;v.innerHTML=retHTML(cur,112);$('xdef').innerHTML=defHTML(cur);if(window.sumHTML&&$('xsum'))$('xsum').innerHTML=sumHTML(cur)}
$('xretf').onchange=e=>{
  const f=e.target.files[0];if(!f)return;const fr=new FileReader();
  fr.onload=()=>{const img=new Image();img.onload=()=>{
    const W=192,H=230,cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d');
    const r=Math.max(W/img.width,H/img.height),w=img.width*r,h=img.height*r;g.drawImage(img,(W-w)/2,(H-h)/2,w,h);
    let q=.8,u=cv.toDataURL('image/jpeg',q);while(u.length>60000&&q>.4){q-=.1;u=cv.toDataURL('image/jpeg',q)}
    cur.retrato=u;retRefresh();toast('Retrato cargado: pulsa «Guardar» para conservarlo')};img.onerror=()=>toast('No se pudo leer la imagen');img.src=fr.result};
  fr.readAsDataURL(f);e.target.value=''};
$('xretq').onclick=()=>{delete cur.retrato;retRefresh()};
/* ---- iconos automáticos en las etiquetas de tipo ---- */
let q=0;const dec=()=>document.querySelectorAll('.chip:not([data-ti])').forEach(ch=>{const n=ch.textContent.trim();if(TIPOS.some(t=>t[0]===n))ch.insertAdjacentHTML('afterbegin',tIcon(n,13));ch.dataset.ti='1'});
new MutationObserver(()=>{if(q)return;q=1;requestAnimationFrame(()=>{q=0;dec()})}).observe(document.body,{childList:true,subtree:true});
Object.assign(window,{tIcon,retHTML,defHTML,retRefresh});
dec();renderList();retRefresh();
Object.assign(window.rpgLab,{tIcon,retHTML,defHTML});
})();
