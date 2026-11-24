/* Laboratorio RPG — Ficha de criatura: radar, detalle y aprendizajes */
import { PUENTES } from './nucleo.js';
const $=id=>document.getElementById(id);
let sel=null,sl=0;
const statsOf=c=>{try{return mk(c,{pas:'',ofe:''},0).st}catch(e){const o={};STATS.forEach(s=>o[s.k]=1);return o}};
const sv=(c,k)=>{const v=calc(c.f[k],+(c.base||{})[k]||0,c.nivel,k==='mp'?0:(+(c.ev||{})[k]||0));return isFinite(v)?Math.round(v):0};
const sp=(c,k)=>{const E=k==='mp'?0:(+(c.ev||{})[k]||0),raw=calc(c.f[k],+(c.base||{})[k]||0,c.nivel,E),ref=calc(c.f[k],255,c.nivel,k==='mp'?0:MAX_E);return ref>0&&isFinite(raw)?Math.max(0,Math.min(100,raw/ref*100)):0};
const sums=c=>({fin:STATS.reduce((q,s)=>q+sv(c,s.k),0),base:STATS.reduce((q,s)=>q+(+(c.base||{})[s.k]||0),0)});
const nf=n=>n.toLocaleString('es-MX');
PUENTES.sumHTML=c=>{const t=sums(c),mx=BMAX*STATS.length,p=Math.min(100,t.base/mx*100),tr=tierOf(t.base/STATS.length);
  return`<b>Total base</b><span class="xn">${nf(t.base)}</span><span class="xm">de ${nf(mx)}</span><span class="chip" style="background:${tr[2]}">${tr[1]}</span><span class="xf">Total final ${nf(t.fin)}</span><div class="bar xb"><i style="width:${p.toFixed(1)}%;background:${tr[2]}"></i></div>`};
function radar(c){
  const cx=180,cy=165,R=112,n=STATS.length;
  const pt=(i,r)=>{const a=-Math.PI/2+i*2*Math.PI/n;return[cx+Math.cos(a)*r,cy+Math.sin(a)*r]};
  const f1=v=>v.toFixed(1),poly=r=>STATS.map((_,i)=>pt(i,r).map(f1).join(',')).join(' ');
  const rr=STATS.map(s=>R*Math.max(.02,Math.min(BMAX,+(c.base||{})[s.k]||BMIN)/BMAX));
  const rings=[.25,.5,.75,1].map(f=>`<polygon class="rg" points="${poly(R*f)}" stroke-opacity="${f===1?.75:.25}" stroke-width="${f===1?1.5:1}"/>`).join('');
  const axes=STATS.map((_,i)=>{const [x,y]=pt(i,R);return`<line class="rx" x1="${cx}" y1="${cy}" x2="${f1(x)}" y2="${f1(y)}"/>`}).join('');
  const dp=STATS.map((s,i)=>pt(i,rr[i]).map(f1).join(',')).join(' ');
  const dots=STATS.map((s,i)=>{const [x,y]=pt(i,rr[i]);return`<rect class="rp" x="${f1(x-3.5)}" y="${f1(y-3.5)}" width="7" height="7" transform="rotate(45 ${f1(x)} ${f1(y)})"/>`}).join('');
  const lab=STATS.map((s,i)=>{const [x,y]=pt(i,R+24),an=Math.abs(x-cx)<6?'middle':x>cx?'start':'end';return`<text class="rt" x="${f1(x)}" y="${f1(y)}" text-anchor="${an}">${s.s}<tspan class="rv" x="${f1(x)}" dy="13">${Math.round(+(c.base||{})[s.k]||0)}</tspan></text>`}).join('');
  return`<svg class="rad" viewBox="0 0 360 330" role="img" aria-label="Estadísticas de ${esc(c.nombre||'la criatura')}">${rings}${axes}<polygon class="rd" points="${dp}"/>${dots}${lab}</svg><div class="xsum2"><div class="xsum" style="justify-content:center">${sumHTML(c)}</div><div class="hint">Estadísticas base: del centro (1) al borde (255), igual que las barras.</div></div>`}
function detail(m){
  if(!m)return'<div class="hxd"><div class="hint">Este espacio está vacío.</div></div>';
  return`<div class="hxd"><div class="hxn">${esc(m.nombre)}</div><div class="hint" style="white-space:normal">${esc(m.desc||'Sin descripción.')}</div><div class="row" style="justify-content:center;margin-top:8px"><span class="chip" style="background:${tcol(m.tipo)}">${esc(m.tipo)}</span><span class="dfi" style="--c:var(--oro)">${CATN[m.cat]||''}</span><span class="dfi" style="--c:var(--jade2)">Poder ${m.pot}</span><span class="dfi" style="--c:var(--turq)">${m.mp} MP</span><span class="dfi" style="--c:var(--mut)">${m.alc==='area'?'Área '+(m.aoe||75)+'%':'Único'}</span>${m.prio?`<span class="dfi" style="--c:var(--pu)">Prioridad +${m.prio}</span>`:''}</div>${(m.fx||[]).length?`<div class="hint" style="margin-top:6px">Efectos: ${m.fx.map(f=>esc(FXN[f.k]||f.k)+(f.p!=null?' ('+f.p+'%)':'')).join(' · ')}</div>`:''}</div>`}
function render(){
  const box=$('xfsec');if(!box)return;
  if(!db.length){box.innerHTML='<h2>Ficha</h2><p class="hint">Aún no hay criaturas guardadas. Crea una en la pestaña «Crear».</p>';return}
  if(!db.some(c=>c.id===sel))sel=db[0].id;
  const c=db.find(x=>x.id===sel),mv=(c.atk||[]).map(id=>A.find(a=>a.id===id)).filter(Boolean),ab=getAb(c);
  if(sl>4||sl<0)sl=0;
  box.innerHTML=`<div class="xcar"><button class="cv" data-d="-1" aria-label="Criatura anterior">«</button><div class="xcarl" id="xcl">${db.map(k=>`<button class="xth${k.id===sel?' on':''}" data-id="${k.id}" title="${esc(k.nombre||'')}" aria-label="${esc(k.nombre||'criatura')}">${retHTML(k,52)}</button>`).join('')}</div><button class="cv" data-d="1" aria-label="Criatura siguiente">»</button></div>
  <div class="fct flor">${esc(c.nombre||'Sin nombre')}</div>
  <div class="fcs">${esc(c.especie||'—')} · Nv ${c.nivel} · ${(c.tipos||[]).map(t=>`<span class="chip" style="background:${tcol(t)}">${esc(t)}</span>`).join('')}</div>
  <div class="fch"><div class="flor">${radar(c)}</div><div class="fcc flor">${retHTML(c,200)}<div class="plat"><i></i><i></i></div></div>
  <div class="fcr flor"><div class="fabx"><b>${ab?esc(ab.nombre):'Sin habilidad'}</b><div class="hint" style="white-space:normal">${esc((ab&&ab.desc)||c.habd||'—')}</div></div>${defHTML(c)||'<div class="hint">Sin debilidades ni tolerancias.</div>'}<div class="row" style="margin-top:12px"><button class="pri" data-ed="1">Editar criatura</button></div></div></div>
  <div class="hxs">${Array.from({length:5},(_,i)=>{const m=mv[i];return m?`<button class="hx flor${i===sl?' on':''}" data-i="${i}" title="${esc(m.nombre)}" style="--c:${tcol(m.tipo)}">${tIcon(m.tipo,26)}<small>${esc(m.nombre)}</small></button>`:`<button class="hx vacio flor" disabled><span>＋</span><small>vacío</small></button>`}).join('')}</div>
  <div id="xhd">${detail(mv[sl])}</div>
  ${learnHTML(c)}`;
  const t=box.querySelector('.xth.on'),l=$('xcl');if(t&&l)l.scrollLeft=t.offsetLeft-l.clientWidth/2+t.clientWidth/2;
}
let lrnOpen=false;
function learnHTML(c){
  const L=new Set(learnOf(c)),base=new Set((c.atk||[]).filter(Boolean));
  const rows=A.map(m=>`<label class="lrr" data-q="${esc((m.nombre+' '+m.tipo).toLowerCase())}"><input type="checkbox" data-lm="${m.id}"${L.has(m.id)?' checked':''}${base.has(m.id)?' disabled':''}> <span class="chip" style="background:${tcol(m.tipo)}">${esc(m.tipo)}</span> <b>${esc(m.nombre)}</b> <span class="hint">${CATN[m.cat]||''}${m.cat==='est'?'':' · Pot '+m.pot} · ${m.mp} MP</span>${base.has(m.id)?' <span class="dfi" style="--c:var(--oro)">Base</span>':''}</label>`).join('');
  return `<div class="lrn"><button class="lrb" data-lrn="t">Movimientos que puede aprender · ${L.size}/${A.length} ${lrnOpen?'▴':'▾'}</button>${lrnOpen?`<div class="lrp"><div class="row" style="margin-bottom:8px"><input id="lrq" placeholder="Buscar ataque o tipo…" aria-label="Buscar ataque" style="flex:1;min-width:160px"><button class="sm" data-lrn="all">Marcar todos</button><button class="sm" data-lrn="base">Solo los base</button></div><p class="hint">Los 5 ataques base siempre se pueden usar. Antes de cada combate, cada jugador elige los 5 ataques de esta lista.</p><div class="lrl">${A.length?rows:'<p class="hint">Aún no hay ataques guardados.</p>'}</div></div>`:''}</div>`;
}
function learnSet(c,ids){c.learn=ids;persist();const y=window.scrollY;render();window.scrollTo(0,y)}
function pick(id){sel=id;sl=0;render()}
function step(d){if(!db.length)return;const i=Math.max(0,db.findIndex(c=>c.id===sel));pick(db[(i+d+db.length)%db.length].id)}
function show(v){const bar=document.querySelector('main>.sb'),b=bar&&bar.querySelector('[data-v="f"]');if(b)b.click()}
/* sub-pestaña «Ficha» dentro de Criaturas */
const bar=document.querySelector('main>.sb');
if(bar){
  bar.insertAdjacentHTML('beforeend',"<button data-v='f'><i class='ic ic-ficha'></i>Ficha</button>");
  const panel=$('xficha'),sync=()=>{const f=bar.querySelector('.on');const on=f&&f.dataset.v==='f';panel.classList.toggle('hid',!on);if(on)render()};
  bar.addEventListener('click',e=>{if(e.target.closest('button'))setTimeout(sync,0)});
  try{if(localStorage.getItem('rpg_sub_cr')==='f')bar.querySelector('[data-v="f"]').click()}catch(e){}
}
$('xfsec').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.lrn){const c=db.find(x=>x.id===sel);if(!c)return;if(b.dataset.lrn==='t'){lrnOpen=!lrnOpen;return render()}if(b.dataset.lrn==='all')return learnSet(c,A.map(a=>a.id));if(b.dataset.lrn==='base')return learnSet(c,[])}
  if(b.dataset.d)return step(+b.dataset.d);
  if(b.classList.contains('xth'))return pick(b.dataset.id);
  if(b.classList.contains('hx')&&!b.disabled){sl=+b.dataset.i;const c=db.find(x=>x.id===sel),mv=(c.atk||[]).map(id=>A.find(a=>a.id===id)).filter(Boolean);document.querySelectorAll('#xfsec .hx').forEach((h,i)=>h.classList.toggle('on',i===sl));$('xhd').innerHTML=detail(mv[sl]);$('xhd').classList.remove('flor');void $('xhd').offsetWidth;$('xhd').classList.add('flor');return}
  if(b.dataset.ed){const i=db.findIndex(c=>c.id===sel);if(i<0)return;cur=Object.assign(blank(),clone(db[i]));fillForm();refresh();renderList();bar.querySelector('[data-v="c"]').click()}
});
$('xfsec').addEventListener('change',e=>{const k=e.target.dataset.lm;if(!k)return;const c=db.find(x=>x.id===sel);if(!c)return;const s=new Set(c.learn||[]);e.target.checked?s.add(k):s.delete(k);learnSet(c,[...s])});
$('xfsec').addEventListener('input',e=>{if(e.target.id!=='lrq')return;const q=e.target.value.toLowerCase().trim();document.querySelectorAll('#xfsec .lrr').forEach(r=>r.classList.toggle('hid',!!q&&!r.dataset.q.includes(q)))});
$('list').addEventListener('click',e=>{const b=e.target.closest('[data-a="ficha"]');if(!b)return;sel=b.dataset.id;sl=0;show()});
document.addEventListener('keydown',e=>{if(!$('xficha')||$('xficha').classList.contains('hid')||$('xfsec').closest('.hid'))return;if(/INPUT|SELECT|TEXTAREA/.test((e.target||{}).tagName))return;if(e.key==='ArrowLeft')step(-1);if(e.key==='ArrowRight')step(1)});
window.rpgLab.ficha={render,pick};

export {render,pick};
