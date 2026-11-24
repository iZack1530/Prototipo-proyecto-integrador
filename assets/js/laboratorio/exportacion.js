/* Laboratorio RPG — Validador, paquete Unity v3, exportación y repeticiones */
(function(){
const $=id=>document.getElementById(id);
const dl=(n,t)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'application/json'}));a.download=n;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)};
const fnv=t=>{let h=0x811c9dc5;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};
/* identificadores de entidades antiguas */
let ch=false;db.forEach(c=>{if(!c.id){c.id=uid();ch=true}});if(ch)persist();
ch=false;A.forEach(a=>{if(!a.id){a.id=uid();ch=true}});if(ch)save3s();
ch=false;H.forEach(h=>{if(!h.id){h.id=uid();ch=true}});if(ch)saveH();
ensureItemIds();ensureTypeIds();
/* ---------- semilla ---------- */
$('xseed').value=cfg.seed||'';
$('xseed').addEventListener('input',e=>{cfg.seed=e.target.value;save4()});
$('xseedr').onclick=()=>{$('xseed').value=Math.random().toString(36).slice(2,8);cfg.seed=$('xseed').value;save4()};
/* ---------- paquete de datos v3 ---------- */
const tid=n=>{const t=TIPOS.find(x=>x[0]===n);return t?t[2]:null};
const stid=n=>'estado.'+idSlug(n);
const mapFx=a=>(a||[]).map(f=>{const o={};Object.entries(f).forEach(([k,v])=>{if(k==='tipo'){o.tipoId=tid(v);o.tipoNombre=v}else o[k]=v});if((f.k==='status'||f.k==='stt')&&f.e)o.estadoId=stid(f.e);if(f.k==='wea'&&f.w)o.climaId=f.w;return o});
const mapT=o=>o?Object.entries(o).map(([n,m])=>({tipoId:tid(n),tipoNombre:n,mult:m})):[];
const sinId=v=>{const o={...v};delete o.id;return o};
function paquete(){
  const P={formato:'rpg-lab-datos',schema:SCHEMA,
   motor:{rng:{algoritmo:'mulberry32',semilla:'El texto de la semilla pasa por xmur3; la primera salida (entero de 32 bits con signo) es el estado inicial. Cada llamada suma 0x6D2B79F5 al estado.',usos:['desempate de velocidad','probabilidad de efectos y habilidades','parálisis (20%)','golpe crítico (5% / 7,5% / 12,5% según el ataque)','objetivo aleatorio','rebotes','pivote']},
    formulas:{variables:['B (base)','N (nivel)','E (esfuerzo)'],operadores:['+','-','*','/','^ (potencia)','paréntesis () y corchetes [] como agrupación'],funciones:['floor','ceil','round','sqrt','abs','min','max'],resultado:'max(1, round(valor))'},
    daño:{formula:'floor(base × bonus × tipo × clima × objeto × guardia × área × habilidades × (1 − reducción))',base:'((N+5)·√(Ataque/Defensa)·(Potencia+30))/15+1',bonus:'1 + 0,5 si crítico + 0,3 si STAB (aditivo)',critico:{origen:'cada ataque define su índice (campo critico)',prob:CRIT,multiplicador:1.5,ignoraBoosteosDefensivos:true},stab:{multiplicador:1.3,reduccionCosteMana:'10% (floor, mínimo 1)'},variacion:'ninguna',precisionEvasion:'no existen'},
    guardia:{reduccion:[0.9,0.5,0.2],reposoTrasTercera:1,manaPorBloqueo:'10% de la suma de maná de los ataques bloqueados'},recuperacion:'no hace nada, queda vulnerable; si sobrevive recupera todo el maná',esfuerzoDesesperado:{tipo:'Neutro',categoria:'fis',potencia:40,mp:0,retroceso:'10% de la vida máxima',disponible:'solo si no hay maná para ningún ataque'},
    orden:'prioridad descendente, velocidad efectiva descendente, desempate aleatorio con el RNG',
    mochila:{prioridad:PRI,multiplicadoresBoost:MUL}},
   reglas:{statBase:{min:BMIN,max:BMAX},maxEsfuerzoPorStat:MAX_E,formulasPorDefecto:DEF_F,rangos:TIERS},
   tipos:TIPOS.map(t=>({id:t[2],nombre:t[0],color:t[1]})),
   tablaTipos:{porDefecto:1,relaciones:Object.entries(M).map(([k,v])=>{const [a,d]=k.split('>');return{atacanteId:tid(a),defensorId:tid(d),mult:v}}).filter(r=>r.atacanteId&&r.defensorId&&r.mult!==1)},
   habilidades:H.map(h=>({id:h.id,nombre:h.nombre,desc:h.desc||'',fx:mapFx(h.fx)})),
   ataques:A.map(a=>({id:a.id,nombre:a.nombre,desc:a.desc||'',tipoId:tid(a.tipo),mp:a.mp,cat:a.cat,pot:a.pot,alc:a.alc,aoe:a.aoe,reb:a.reb||[],prio:a.prio||0,critico:CRIT[a.crit]?a.crit:'bajo',criticoProb:CRIT[a.crit]||CRIT.bajo,fx:mapFx(a.fx)})),
   criaturas:db.map(c=>({id:c.id,nombre:c.nombre,especie:c.especie||'',tipoIds:(c.tipos||[]).map(tid),habilidadId:(getAb(c)||{}).id||null,ataqueIds:(c.atk||[]).filter(Boolean),ataquesAprendibles:learnOf(c),nivel:c.nivel,esfuerzoMax:c.cap,base:c.base,esfuerzo:c.ev,formulas:c.f})),
   objetos:{pasivos:Object.entries(PAS).map(([n,v])=>({id:v.id,nombre:n,mult:sinId(v)})),ofensivos:Object.entries(OFE).map(([n,v])=>({id:v.id,nombre:n,mult:sinId(v)})),consumibles:Object.entries(CONS).map(([n,v])=>({id:v.id,nombre:n,efecto:{tipo:v.t,potencia:v.p},cantidadInicial:BAG0[n]||0}))},
   climas:Object.entries(WEA).map(([k,w])=>{const o={id:k,nombre:w.n};Object.entries(w).forEach(([f,v])=>{if(f!=='n')o[f]=(v&&typeof v==='object')?mapT(v):v});return o}),
   estados:Object.entries(STS).map(([n,v])=>({id:stid(n),nombre:n,...v}))};
  P.hash=fnv(JSON.stringify(P));return P}
const datosHash=()=>paquete().hash;
/* ---------- validador ---------- */
const dups=l=>{const c={};l.forEach(x=>c[x]=(c[x]||0)+1);return Object.keys(c).filter(k=>c[k]>1)};
function validar(){
  const R=[],er=(a,t,m)=>R.push({s:'error',a,t,m}),av=(a,t,m)=>R.push({s:'aviso',a,t,m});
  const TN=TIPOS.map(t=>t[0]),ts=new Set(TN),EV=STATS.filter(x=>x.k!=='mp').map(x=>x.k),nm=x=>x||'(sin nombre)';
  const ids=(l,a,t)=>{if(l.some(x=>!x))er(a,t,'Hay entradas sin identificador');dups(l.filter(Boolean)).forEach(d=>er(a,t,'Identificador repetido: '+d))};
  /* tipos */
  dups(TN.map(n=>n.toLowerCase())).forEach(n=>er('Tipos',1,'Nombre de tipo repetido: '+n));
  TN.forEach(n=>{if(/[<>&"']/.test(n))er('Tipos',1,`El tipo «${n}» tiene caracteres no permitidos`)});
  ids(TIPOS.map(t=>t[2]),'Tipos',1);
  Object.entries(M).forEach(([k,v])=>{const [a,d]=k.split('>');if(!ts.has(a)||!ts.has(d))er('Tipos',1,'Relación huérfana en la tabla: '+k);else if(typeof v!=='number'||!isFinite(v)||v<0)er('Tipos',1,`Multiplicador inválido en ${k}`)});
  TN.forEach(n=>{const o=Object.keys(M).some(k=>k.startsWith(n+'>')&&M[k]!==1),i=Object.keys(M).some(k=>k.endsWith('>'+n)&&M[k]!==1);if(!o&&!i)av('Tipos',1,`«${n}» no tiene ninguna relación (todo ×1)`)});
  /* criaturas */
  ids(db.map(c=>c.id),'Criaturas',0);
  dups(db.map(c=>(c.nombre||'').toLowerCase()).filter(Boolean)).forEach(n=>av('Criaturas',0,'Nombre de criatura repetido: '+n));
  db.forEach(c=>{const L=`«${nm(c.nombre)}»`;
    if(!c.nombre)er('Criaturas',0,'Hay una criatura sin nombre');
    (c.tipos||[]).forEach(t=>{if(!ts.has(t))er('Criaturas',0,`${L}: tipo inexistente «${t}»`)});
    if(!(c.tipos||[]).length)er('Criaturas',0,`${L}: no tiene tipos`);
    if(c.habId&&!H.some(h=>h.id===c.habId))er('Criaturas',0,`${L}: su habilidad ya no existe`);else if(!getAb(c))av('Criaturas',0,`${L}: no tiene habilidad`);
    const at=(c.atk||[]).filter(Boolean);at.forEach(i=>{if(!A.some(a=>a.id===i))er('Criaturas',0,`${L}: usa un ataque que ya no existe`)});
    if(at.length<5)av('Criaturas',0,`${L}: tiene ${at.length}/5 ataques y no podrá combatir`);
    dups(at).length&&av('Criaturas',0,`${L}: repite ataques`);
    if(!(Number.isInteger(+c.nivel)&&c.nivel>=1&&c.nivel<=100))er('Criaturas',0,`${L}: nivel fuera de 1–100`);
    STATS.forEach(x=>{const bv=+(c.base||{})[x.k];if(!(Number.isInteger(bv)&&bv>=BMIN&&bv<=BMAX))er('Criaturas',0,`${L}: base de ${x.s||x.k} fuera de ${BMIN}–${BMAX}`);
      const f=(c.f||{})[x.k],cp=compile(f||'');if(!cp.ok)er('Criaturas',0,`${L}: fórmula de ${x.s||x.k} inválida`);
      else{const v=calc(f,+c.base[x.k],c.nivel,x.k==='mp'?0:(+(c.ev||{})[x.k]||0));if(!isFinite(v))er('Criaturas',0,`${L}: la fórmula de ${x.s||x.k} no da un número`);else if(v<1)av('Criaturas',0,`${L}: ${x.s||x.k} da menos de 1`)}});
    let tot=0;EV.forEach(k=>{const e=+(c.ev||{})[k]||0;tot+=e;if(e<0||e>MAX_E)er('Criaturas',0,`${L}: esfuerzo de ${k} fuera de 0–${MAX_E}`)});
    if(tot>(+c.cap||0))er('Criaturas',0,`${L}: esfuerzo total ${tot} supera su tope ${c.cap}`)});
  /* ataques */
  ids(A.map(a=>a.id),'Ataques',2);
  dups(A.map(a=>(a.nombre||'').toLowerCase()).filter(Boolean)).forEach(n=>av('Ataques',2,'Nombre de ataque repetido: '+n));
  A.forEach(a=>{const L=`«${nm(a.nombre)}»`;
    if(!a.nombre)er('Ataques',2,'Hay un ataque sin nombre');
    if(!ts.has(a.tipo))er('Ataques',2,`${L}: tipo inexistente «${a.tipo}»`);
    if(!CATN[a.cat])er('Ataques',2,`${L}: categoría inválida`);
    if(a.cat!=='est'&&!(+a.pot>0))av('Ataques',2,`${L}: potencia 0`);
    if(!(+a.mp>=0))er('Ataques',2,`${L}: coste de MP inválido`);
    (a.fx||[]).forEach(f=>{if(!FXN[f.k])er('Ataques',2,`${L}: efecto desconocido «${f.k}»`);if(f.k==='status'&&!STS[f.e])er('Ataques',2,`${L}: estado inexistente «${f.e}»`)});
    if(!db.some(c=>(c.atk||[]).includes(a.id)))av('Ataques',2,`${L}: no lo usa ninguna criatura`)});
  /* habilidades */
  ids(H.map(h=>h.id),'Habilidades',3);
  dups(H.map(h=>(h.nombre||'').toLowerCase()).filter(Boolean)).forEach(n=>av('Habilidades',3,'Nombre de habilidad repetido: '+n));
  H.forEach(h=>{const L=`«${nm(h.nombre)}»`;if(!h.nombre)er('Habilidades',3,'Hay una habilidad sin nombre');
    (h.fx||[]).forEach(f=>{if(!HK[f.k])er('Habilidades',3,`${L}: efecto desconocido «${f.k}»`);if(f.tipo&&!ts.has(f.tipo))er('Habilidades',3,`${L}: tipo inexistente «${f.tipo}»`);if(f.k==='wea'&&!WEA[f.w])er('Habilidades',3,`${L}: clima inexistente «${f.w}»`);if(f.k==='stt'&&f.e&&!STS[f.e])er('Habilidades',3,`${L}: estado inexistente «${f.e}»`)});
    if(!db.some(c=>c.habId===h.id))av('Habilidades',3,`${L}: no la usa ninguna criatura`)});
  /* objetos */
  const allI=[...Object.values(PAS),...Object.values(OFE),...Object.values(CONS)].map(v=>v&&v.id);ids(allI,'Objetos',4);
  [['Pasivo',PAS],['Ofensivo',OFE]].forEach(([g,o])=>Object.entries(o).forEach(([n,v])=>{const ks=Object.keys(v).filter(k=>k!=='id');
    if(!ks.length||ks.every(k=>+v[k]===1))av('Objetos',4,`${g} «${n}»: no tiene ningún efecto`);
    ks.forEach(k=>{if(!(+v[k]>=0))er('Objetos',4,`${g} «${n}»: multiplicador inválido en ${k}`);else if(+v[k]===0)av('Objetos',4,`${g} «${n}»: ${k} ×0`)})}));
  Object.entries(CONS).forEach(([n,e])=>{if(!['hp','mp','cura'].includes(e.t))er('Objetos',4,`Consumible «${n}»: efecto inválido`);if(!(n in BAG0))av('Objetos',4,`Consumible «${n}»: no está en la mochila inicial`)});
  Object.keys(BAG0).forEach(n=>{if(!CONS[n])av('Objetos',4,`«${n}» está en la mochila sin efecto definido`)});
  cfg.t.forEach((side,s)=>side.forEach(x=>{if(x.pas&&!PAS[x.pas])er('Combate',5,`J${s+1}: objeto pasivo inexistente «${x.pas}»`);if(x.ofe&&!OFE[x.ofe])er('Combate',5,`J${s+1}: objeto ofensivo inexistente «${x.ofe}»`);if(x.id&&!db.some(c=>c.id===x.id))av('Combate',5,`J${s+1}: una criatura de la configuración ya no existe`)}));
  /* climas y reglas */
  Object.entries(WEA).forEach(([k,w])=>Object.entries(w).forEach(([f,v])=>{if(v&&typeof v==='object')Object.keys(v).forEach(t=>{if(!ts.has(t))er('Reglas',7,`Clima «${w.n}»: tipo inexistente «${t}»`)})}));
  if(!(MAX_E>0))er('Reglas',7,'El esfuerzo máximo por stat debe ser mayor que 0');
  ['hp','mp','stat'].forEach(k=>{if(!compile(DEF_F[k]||'').ok)er('Reglas',7,`Fórmula por defecto «${k}» inválida`)});
  return R}
function pintaVal(){
  const R=validar(),e=R.filter(x=>x.s==='error').length,a=R.length-e;
  $('xvs').textContent=` ${e} errores · ${a} avisos`;
  $('xvl').innerHTML=R.length?R.sort((x,y)=>(x.s==='error'?0:1)-(y.s==='error'?0:1)).slice(0,300).map(x=>`<div class="fx" style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:6px"><div><span class="chip" style="background:${x.s==='error'?'#ef4444':'#f59e0b'}">${x.s}</span> <b>${x.a}</b> — ${esc(x.m)}</div><button class="sm" data-go="${x.t}">Ir</button></div>`).join(''):'<p class="hint">✔ Sin problemas encontrados.</p>';
  return R}
$('xvr').onclick=pintaVal;
$('xvl').addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)document.querySelectorAll('#nav button')[+b.dataset.go].click()});
pintaVal();
/* ---------- exportar para Unity ---------- */
$('xu').onclick=e=>{
  const b=e.currentTarget,R=validar(),er=R.filter(x=>x.s==='error').length;
  if(er&&!b.dataset.armed){b.dataset.armed=1;b.textContent=`Hay ${er} errores: pulsa otra vez para exportar igual`;pintaVal();setTimeout(()=>{delete b.dataset.armed;b.textContent='Exportar para Unity (v3)'},4000);return}
  delete b.dataset.armed;b.textContent='Exportar para Unity (v3)';
  const P=paquete();P.generado=new Date().toISOString();dl('rpg_datos_v'+SCHEMA+'.json',JSON.stringify(P,null,1));toast('Paquete exportado')};
/* ---------- replay ---------- */
const finalState=()=>({ganador:S.over?(S.t[0].every(f=>f.ko)?2:1):null,turnos:S.n,unidades:S.t.map(l=>l.map(f=>({nombre:f.nm,hp:f.hp,mp:f.mp,ko:f.ko,estado:f.status||null})))});
function buildReplay(){return S?{formato:'rpg-lab-replay',schema:SCHEMA,semilla:S.seed,clima:S.w0,nombres:S.names,modo:S.cpu==null?'pvp':'cpu',ia:S.pol,equipos:S.teams,mochila:S.bag0,eventos:S.ev,acciones:S.rec,resultado:finalState(),datosHash:datosHash()}:null}
function setAct(a){const c=document.querySelector(`.fc[data-s='${a.s}'][data-p='${a.pos}']`);if(!c)return;
  Object.entries({act:a.t,m:a.m,tg:a.tg,it:a.it,ia:a.ia,sw:a.sw,pv:a.pv}).forEach(([k,v])=>{const el=c.querySelector(`[data-k=${k}]`);if(el&&v!=null&&v!=='')el.value=v})}
function runReplay(r){
  if(!r||r.formato!=='rpg-lab-replay')throw Error('No es un replay válido');
  cfg.t=[0,1].map(i=>Array.from({length:6},(_,j)=>{const x=(r.equipos[i]||[])[j],c=x&&db.find(c=>c.id===x.id);return c?{id:c.id,nm:c.nombre,pas:x.pas||'',ofe:x.ofe||'',mv:x.mv||[]}:{id:'',nm:'',pas:'',ofe:'',mv:[]}}));
  cfg.w=r.clima||'';cfg.names=Array.isArray(r.nombres)?r.nombres:['',''];cfg.vs=r.modo==='cpu'?'cpu':'pvp';cfg.pol=r.ia||'in';norm4();fillSet4();$('xseed').value=r.semilla;window.NOINTRO=1;try{$('go4').onclick()}finally{window.NOINTRO=0}
  if(!S)throw Error('No se pudo iniciar el combate (¿faltan criaturas del replay?)');S.fast=true;
  for(let k=0;k<(r.acciones||[]).length&&!S.over;k++){
    (r.eventos||[]).filter(e=>e.tras===S.n).forEach(e=>{S.w=e.clima;S.ev.push({tras:S.n,clima:S.w});$('w4b').value=S.w});
    (r.acciones[k]||[]).forEach(setAct);turn4()}
  S.fast=false;arena();
  const got=finalState();return{ok:JSON.stringify(got)===JSON.stringify(r.resultado),got,mismosDatos:!r.datosHash||r.datosHash===datosHash()}}
$('xrcp').onclick=async()=>{const r=buildReplay();if(!r)return;const t=JSON.stringify(r,null,1);$('xrp').value=t;try{await navigator.clipboard.writeText(t);toast('Replay copiado')}catch(e){toast('Replay guardado en el cuadro de la pestaña Combate')}};
$('xrrun').onclick=()=>{try{const r=JSON.parse($('xrp').value),x=runReplay(r);
  const m=(x.ok?'Replay idéntico ✔':'Replay con diferencias ✖')+(x.mismosDatos?'':' (los datos cambiaron desde que se grabó)');
  $('xrres').textContent=m;lg(m,'t');toast(m)}catch(e){toast(e.message||'Replay no válido')}};
window.rpgLab={validar,paquete,buildReplay,runReplay,datosHash};
})();
