/* Laboratorio RPG — Asistente rápido de objetos y consumibles */
(function(){
const $=id=>document.getElementById(id);
const FP=[['atk','Ataque'],['def','Defensa'],['matk','Poder mágico'],['mdef','Def. mágica'],['spd','Velocidad'],['hp','Vida máx.']],FO=[['all','Todo el daño'],['fis','Daño físico'],['mag','Daño mágico']];
const CT={hp:'Cura vida (% de la vida máx.)',mp:'Cura maná (% del maná máx.)',cura:'Cura el estado alterado'};
const G={pas:{t:'Pasivos',s:'pasivo',o:PAS,f:FP,fld:'pas',h:'Equipables: modifican las estadísticas de la criatura durante todo el combate.'},
 ofe:{t:'Ofensivos',s:'ofensivo',o:OFE,f:FO,fld:'ofe',h:'Equipables: multiplican el daño de los ataques de la criatura.'},
 cons:{t:'Consumibles',s:'consumible',o:CONS,h:'Se gastan desde la mochila durante el combate y se aplican sobre una criatura.'}};
let cat='act',ed=null;
const mx=v=>'×'+(+(+v).toFixed(3));
const fx=(f,o)=>f.filter(([k])=>o[k]&&+o[k]!==1).map(([k,l])=>l+' '+mx(o[k])).join(' · ')||'Sin efecto';
const ct=n=>{const e=CONS[n]||{};return (CT[e.t]||'Sin efecto')+(e.t==='hp'||e.t==='mp'?' '+(e.p||0)+'%':'')+' · Cantidad inicial: '+(BAG0[n]||0)};
const persist=m=>{ed=null;saveRules();try{save4()}catch(e){}try{fillSet4()}catch(e){}render();toast(m)};
const ref=(f,a,b)=>{try{cfg.t.forEach(l=>l.forEach(x=>{if(x[f]===a)x[f]=b}))}catch(e){}};
function render(){
  document.querySelectorAll('#xosb button').forEach(b=>b.classList.toggle('on',b.dataset.c===cat));
  $('xolist').innerHTML=(cat==='pas'?['pas']:['ofe','cons']).map(g=>{const X=G[g],ks=Object.keys(X.o);
    return `<h3>${X.t}</h3><p class="hint">${X.h}</p>`+(ks.length?ks.map(n=>`<div class="fx" style="display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:6px"><div><b>${esc(n)}</b><div class="hint">${esc((g==='cons'?ct(n):fx(X.f,X.o[n]))+' · id: '+(X.o[n].id||'—'))}</div></div><div class="row"><button class="sm" data-e="${g}" data-n="${encodeURIComponent(n)}">Editar</button><button class="sm danger" data-d="${g}" data-n="${encodeURIComponent(n)}" aria-label="Eliminar ${esc(n)}">✕</button></div></div>`).join(''):'<p class="hint">Sin objetos.</p>')+`<button class="sm am" data-new="${g}">+ Nuevo ${X.s}</button>`}).join('');
  form();
}
function form(){
  const box=$('xoform');if(!ed){box.innerHTML='';return}
  const X=G[ed.g],nw=ed.n==null,o=nw?{}:X.o[ed.n];
  let h=`<h3>${nw?'Nuevo':'Editar'} ${X.s}</h3><div class="grid g3"><div><label for="xon">Nombre</label><input id="xon" maxlength="30" value="${esc(ed.n||'')}"></div>`;
  if(ed.g==='cons')h+=`<div><label for="xoc">Efecto</label><select id="xoc">${Object.entries(CT).map(([k,v])=>`<option value="${k}"${o.t===k?' selected':''}>${v}</option>`).join('')}</select></div><div><label for="xop">Potencia (%)</label><input id="xop" type="number" min="0" max="100" value="${o.p==null?30:o.p}"></div><div><label for="xoq">Cantidad inicial</label><input id="xoq" type="number" min="0" max="99" value="${nw?1:(BAG0[ed.n]||0)}"></div>`;
  else h+=X.f.map(([k,l])=>`<div><label for="xof_${k}">${l} (×)</label><input id="xof_${k}" type="number" step="0.05" min="0" value="${o[k]==null?1:o[k]}"></div>`).join('');
  box.innerHTML=h+`</div><div class="row" style="margin-top:10px"><button class="pri" id="xosave">Guardar</button><button id="xocancel">Cancelar</button></div>`;
  $('xon').focus();
}
function save(){
  const g=ed.g,X=G[g],old=ed.n,nn=$('xon').value.replace(/[<>&"']/g,'').trim();
  if(!nn)return toast('Escribe un nombre');
  if(nn!==old&&X.o[nn]!==undefined)return toast('Ya existe un objeto con ese nombre');
  let v;
  if(g==='cons')v={t:$('xoc').value,p:Math.max(0,Math.min(100,+$('xop').value||0))};
  else{v={};X.f.forEach(([k])=>{const x=+$('xof_'+k).value;if(x>=0&&x!==1)v[k]=+x.toFixed(3)})}
  v.id=(old!=null&&X.o[old]&&X.o[old].id)||mkId('obj.'+(g==='cons'?'con':g),nn,Object.values(X.o).map(o=>o&&o.id));
  const q=g==='cons'?Math.max(0,Math.min(99,Math.floor(+$('xoq').value||0))):0;
  if(old!=null&&old!==nn){
    setObj(X.o,Object.fromEntries(Object.entries(X.o).map(([k,x])=>k===old?[nn,v]:[k,x])));
    if(g==='cons')delete BAG0[old];else ref(X.fld,old,nn);
  }else X.o[nn]=v;
  if(g==='cons')BAG0[nn]=q;
  persist('Objeto guardado');
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.closest('#xosb')){cat=b.dataset.c;ed=null;render();return}
  if(!b.closest('#fase7'))return;
  const n=b.dataset.n?decodeURIComponent(b.dataset.n):null;
  if(b.dataset.new){ed={g:b.dataset.new,n:null};form();return}
  if(b.dataset.e){ed={g:b.dataset.e,n};form();return}
  if(b.dataset.d){const X=G[b.dataset.d];delete X.o[n];if(b.dataset.d==='cons')delete BAG0[n];else ref(X.fld,n,'');persist('Objeto eliminado');return}
  if(b.id==='xosave')save();
  if(b.id==='xocancel'){ed=null;form()}
  if(b.id==='xoreset'){if(b.dataset.armed){const c=k=>JSON.parse(JSON.stringify(R0[k]));applyRules({pas:c('pas'),ofe:c('ofe'),bag:c('bag'),cons:c('cons')});['pas','ofe'].forEach(f=>{try{cfg.t.forEach(l=>l.forEach(x=>{if(x[f]&&!(f==='pas'?PAS:OFE)[x[f]])x[f]=''}))}catch(e){}});delete b.dataset.armed;b.textContent='Restablecer objetos predeterminados';persist('Objetos restablecidos')}else{b.dataset.armed=1;b.textContent='¿Seguro? Se perderán tus objetos';setTimeout(()=>{delete b.dataset.armed;b.textContent='Restablecer objetos predeterminados'},2500)}}
});
window.objRender=render;render();
})();
