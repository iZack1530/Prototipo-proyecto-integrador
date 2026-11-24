/* Laboratorio RPG — Núcleo: datos, fórmulas, RNG y motor de combate */

/* Laboratorio RPG — Datos, fórmulas, RNG, simulador de combate e interfaz */
// Añadir un tipo nuevo = añadir una línea aquí.
const TIPOS=[['Fuego','#ef4444'],['Planta','#22c55e'],['Agua','#3b82f6'],['Viento','#7dd3fc'],['Hielo','#a5f3fc'],['Tierra','#b45309'],['Eléctrico','#facc15'],['Roca','#a8a29e'],['Tóxico','#a855f7'],['Metal','#94a3b8'],['Oscuro','#6b7280'],['Sagrado','#fde68a'],['Neutro','#e2e8f0']];
const STATS=[
 {k:'hp',n:'Vida',s:'HP',c:'#22c55e',cat:'hp'},
 {k:'mp',n:'Maná',s:'MP',c:'#38bdf8',cat:'mp'},
 {k:'atk',n:'Ataque Físico',s:'ATK',c:'#ef4444',cat:'stat'},
 {k:'def',n:'Defensa Física',s:'DEF',c:'#f59e0b',cat:'stat'},
 {k:'matk',n:'Poder Mágico',s:'MATK',c:'#a855f7',cat:'stat'},
 {k:'mdef',n:'Defensa Mágica',s:'MDEF',c:'#6366f1',cat:'stat'},
 {k:'spd',n:'Velocidad',s:'SPD',c:'#14b8a6',cat:'stat'}];
const DEF_F={hp:'((310 * B^0.5) + ((E / 8) * 25) * N / 100) + 100 + (N * 2)',mp:'B + N * 2 + 50',stat:'[((B * 2 / 5) + (E / 16)) / 2] * N + 50 + N'};
const PRE={
 hp:{'Ejemplo':DEF_F.hp,'HP RPG':'(2 * B + E / 4) * N / 100 + N + 10','Lineal':'B + N * 3 + E','Base':'B'},
 mp:{'Ejemplo':DEF_F.mp,'HP RPG':'B * N / 50 + N + 20','Lineal':'B + N','Base':'B'},
 stat:{'Ejemplo':DEF_F.stat,'HP RPG':'((2 * B + E / 4) * N / 100) + 5','Lineal':'B + N + E / 4','Base':'B'}};
const TIERS=[[30,'Muy bajo','#e2573e'],[70,'Bajo','#94a3b8'],[100,'Medio','#38bdf8'],[140,'Alto','#f59e0b'],[256,'Épico','#a855f7']];
const tierOf=v=>TIERS.find(x=>v<x[0])||TIERS[TIERS.length-1];
const BMIN=1,BMAX=255;
function normBase(list){let n=0;(list||[]).forEach(c=>{const bl=blank(),cl=x=>JSON.parse(JSON.stringify(x));if(!c.f)c.f=cl(bl.f);if(!c.ev)c.ev=cl(bl.ev);if(!c.tipos||!c.tipos.length)c.tipos=['Neutro'];if(!c.atk)c.atk=['','','','',''];c.base=c.base||{};STATS.forEach(s=>{const o=c.base[s.k];let v=Math.round(+o);if(!isFinite(v)||v<BMIN)v=BMIN;if(v>BMAX)v=BMAX;if(v!==o){c.base[s.k]=v;n++}})});return n}
let MAX_E=160;const KEY='rpg_criaturas_v1';
/* El núcleo es puro: la interfaz registra estos puentes al arrancar. */
let avisar=()=>{},registrarLog=()=>{},leerAccion=()=>null;
const escuchas=new Set();
const notificar=(k,v)=>escuchas.forEach(f=>f(k,v));
const UI={arena(){},playTL(){},msg(){},centro(){},inspector(){},clima(){},iniciar(){},actualizar(){}};
function configUI(o){
  if(!o)return;
  if(typeof o.avisar==='function')avisar=o.avisar;
  if(typeof o.registrarLog==='function')registrarLog=o.registrarLog;
  if(typeof o.leerAccion==='function')leerAccion=o.leerAccion;
  Object.keys(UI).forEach(k=>{if(typeof o[k]==='function')UI[k]=o[k]});
}

/* ---------- Evaluador seguro (sin eval) ---------- */
const FN={floor:Math.floor,ceil:Math.ceil,round:Math.round,sqrt:Math.sqrt,abs:Math.abs,min:Math.min,max:Math.max};
const cache=new Map();
function compile(src){
  if(cache.has(src))return cache.get(src);
  let r;
  try{r={ok:true,fn:parse(src)}}catch(e){r={ok:false,err:e.message}}
  cache.set(src,r);return r;
}
function parse(src){
  const t=[];let i=0;
  while(i<src.length){
    const c=src[i];
    if(/\s/.test(c)){i++;continue}
    if(/[0-9.]/.test(c)){const m=/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));if(!m)throw Error('número mal formado');t.push({t:'n',v:parseFloat(m[0])});i+=m[0].length;continue}
    if(/[A-Za-z]/.test(c)){const w=/^[A-Za-z]+/.exec(src.slice(i))[0],lw=w.toLowerCase();if(FN[lw]&&src.slice(i+w.length).trim()[0]==='('){t.push({t:'f',v:lw});i+=w.length;continue}if(w.length===1&&'BNE'.includes(w.toUpperCase())){t.push({t:'v',v:w.toUpperCase()});i++;continue}throw Error('«'+w+'» no válido (variables B, N, E; funciones floor, ceil, round, sqrt, abs, min, max)')}
    if(c===','){t.push({t:',',v:','});i++;continue}
    if(c==='*'&&src[i+1]==='*'){t.push({t:'o',v:'^'});i+=2;continue}
    if('+-*/^'.includes(c)){t.push({t:'o',v:c});i++;continue}
    if('([ '.includes(c)&&c!==' '){t.push({t:'(',v:c});i++;continue}
    if(')]'.includes(c)){t.push({t:')',v:c});i++;continue}
    throw Error('carácter no válido «'+c+'»');
  }
  if(!t.length)throw Error('fórmula vacía');
  let p=0;const pk=()=>t[p],eat=()=>t[p++];
  const pair={'(':')','[':']'};
  function expr(){let l=term();while(pk()&&pk().t==='o'&&'+-'.includes(pk().v)){const o=eat().v,r=term(),a=l;l=o==='+'?x=>a(x)+r(x):x=>a(x)-r(x)}return l}
  function term(){let l=un();while(pk()&&pk().t==='o'&&'*/'.includes(pk().v)){const o=eat().v,r=un(),a=l;l=o==='*'?x=>a(x)*r(x):x=>a(x)/r(x)}return l}
  function un(){if(pk()&&pk().t==='o'&&'+-'.includes(pk().v)){const o=eat().v,a=un();return o==='-'?x=>-a(x):a}return pw()}
  function pw(){const b=atom();if(pk()&&pk().t==='o'&&pk().v==='^'){eat();const e=un();return x=>Math.pow(b(x),e(x))}return b}
  function atom(){
    const k=eat();
    if(!k)throw Error('expresión incompleta');
    if(k.t==='n')return()=>k.v;
    if(k.t==='f'){const o=eat(),a=[];if(!o||o.t!=='(')throw Error('falta «(» tras '+k.v);if(pk()&&pk().t!==')'){a.push(expr());while(pk()&&pk().t===','){eat();a.push(expr())}}const c=eat();if(!c||c.t!==')')throw Error('función '+k.v+' sin cerrar');const fn=FN[k.v];return x=>fn(...a.map(g=>g(x)))}
    if(k.t==='v')return x=>x[k.v];
    if(k.t==='('){const e=expr(),c=eat();if(!c||c.t!==')'||c.v!==pair[k.v])throw Error('paréntesis o corchetes sin cerrar bien');return e}
    throw Error('símbolo inesperado «'+k.v+'»');
  }
  const f=expr();
  if(p<t.length)throw Error('sobra «'+t[p].v+'»');
  return f;
}
function calc(src,B,N,E){
  const r=compile(src);
  if(!r.ok)return NaN;
  const v=r.fn({B,N,E});
  return Number.isFinite(v)?v:NaN;
}

/* ---------- Estado ---------- */
const blank=()=>({id:null,nombre:'',especie:'',tipos:['Neutro'],hab:'',habId:'',habd:'',atk:['','','','',''],nivel:50,learn:[],cap:480,
  base:{hp:80,mp:60,atk:70,def:70,matk:70,mdef:70,spd:70},ev:{hp:0,atk:0,def:0,matk:0,mdef:0,spd:0},
  f:{hp:DEF_F.hp,mp:DEF_F.mp,atk:DEF_F.stat,def:DEF_F.stat,matk:DEF_F.stat,mdef:DEF_F.stat,spd:DEF_F.stat},sync:true});
let cur=blank(),sel='atk',db=load();
function load(){try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
function persist(){normBase(db);try{localStorage.setItem(KEY,JSON.stringify(db));return true}catch(e){toast('No se pudo guardar en este navegador');return false}}
const clone=o=>JSON.parse(JSON.stringify(o));
/* ---------- RNG determinista (xmur3 + mulberry32) e identificadores estables ---------- */
function xmur3(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19}return()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return(h^=h>>>16)|0}}
let RNGs=1;
const seedRng=txt=>{RNGs=xmur3(String(txt))()|0};
const rng=()=>{RNGs=(RNGs+0x6D2B79F5)|0;let t=RNGs;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
const idSlug=x=>String(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'x';
function mkId(pre,name,used){const b=pre+'.'+idSlug(name),u=new Set(used||[]);let id=b,i=2;while(u.has(id))id=b+'-'+(i++);return id}
function ensureTypeIds(){const u=TIPOS.map(t=>t[2]).filter(Boolean);TIPOS.forEach(t=>{if(!t[2]){t[2]=mkId('tipo',t[0],u);u.push(t[2])}})}
function ensureItemIds(){[['pas',PAS],['ofe',OFE],['con',CONS]].forEach(([g,o])=>{const u=Object.values(o).map(v=>v&&v.id).filter(Boolean);Object.entries(o).forEach(([n,v])=>{if(v&&!v.id){v.id=mkId('obj.'+g,n,u);u.push(v.id)}})})}
const uid=()=>'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function toast(m){avisar(m)}
const tcol=n=>(TIPOS.find(t=>t[0]===n)||[0,'#e2e8f0'])[1];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- Fase 2: matriz de tipos ---------- */
const KEY2='rpg_matriz_v1',BASE_N=TIPOS.length;
let M={},RO=[],CO=[],drag=null;
const gv=(a,d)=>{const v=M[a+'>'+d];return v===undefined?1:v};
const cls=v=>v>=2?'m2':v===1?'m1':v>0?'m05':'m0';
const fix=o=>{const n=TIPOS.map(t=>t[0]);return o.filter(x=>n.includes(x)).concat(n.filter(x=>!o.includes(x)))};
const DEF_EFF={"Planta": {"Agua": 2, "Tierra": 2, "Fuego": 0.5, "Planta": 0.5, "Viento": 0.5}, "Fuego": {"Planta": 2, "Hielo": 2, "Agua": 0.5, "Fuego": 0.5, "Tierra": 0.5}, "Agua": {"Fuego": 2, "Tierra": 2, "Planta": 0.5, "Agua": 0.5, "Eléctrico": 0.5}, "Viento": {"Planta": 2, "Tierra": 2, "Viento": 0.5, "Eléctrico": 0.5, "Hielo": 0.5}, "Hielo": {"Planta": 2, "Viento": 2, "Tierra": 2, "Fuego": 0.5, "Agua": 0.5, "Hielo": 0.5}, "Tierra": {"Fuego": 2, "Eléctrico": 2, "Planta": 0.5, "Viento": 0.5}, "Eléctrico": {"Agua": 2, "Viento": 2, "Eléctrico": 0.5, "Planta": 0.5, "Tierra": 0.5}, "Oscuro": {"Sagrado": 2, "Oscuro": 0.5, "Neutro": 0.5}, "Sagrado": {"Oscuro": 2, "Sagrado": 0.5, "Neutro": 0.5}};
function f2load(){
  let s=null;try{s=JSON.parse(localStorage.getItem(KEY2)||'null')}catch(e){}
  if(s&&Array.isArray(s.types)){TIPOS.length=0;s.types.forEach(t=>{if(t&&t[0])TIPOS.push([String(t[0]),t[1]||'#e2e8f0',t[2]||''])})}
  else if(s)(s.custom||[]).forEach(t=>{if(t&&t[0]&&!TIPOS.some(x=>x[0]===t[0]))TIPOS.push([t[0],t[1]||'#e2e8f0'])});
  if(s){M=s.m||{};RO=s.ro||[];CO=s.co||[]}
  else{M={};Object.entries(DEF_EFF).forEach(([a,o])=>Object.entries(o).forEach(([d,v])=>{if(TIPOS.some(t=>t[0]===a)&&TIPOS.some(t=>t[0]===d))M[a+'>'+d]=v}))}
  RO=fix(RO);CO=fix(CO);ensureTypeIds();
}

/* ---------- Fase 3: ataques ---------- */
const KEY3='rpg_ataques_v1',MUL={'-4':.45,'-3':.55,'-2':.65,'-1':.8,1:1.25,2:1.5,3:1.75,4:2};
const ESTADOS=['Quemadura','Parálisis','Intoxicación','Congelación','Maldición','Sangrado'];
const ST3=['ATK','DEF','MATK','MDEF','SPD'];
const CATN={fis:'Daño Físico',mag:'Daño Mágico',est:'Estado'},FXN={boost:'Boosteo de stat',lifesteal:'Robo de vida',mpsteal:'Robo de maná',recoil:'Retroceso',status:'Estado alterado',guard:'Reducción de daño recibido',pivot:'Pivote (cambio al impactar)',trap:'Impedir retirada del rival (3–5 turnos)'};
const FXNEW={boost:()=>({k:'boost',p:100,t:'rival',s:'ATK',n:-1}),lifesteal:()=>({k:'lifesteal',p:100,v:50}),mpsteal:()=>({k:'mpsteal',p:100,m:'fijo',v:10}),recoil:()=>({k:'recoil',p:100,b:'dmg',v:25}),status:()=>({k:'status',p:30,e:'Quemadura'}),guard:()=>({k:'guard',p:100,t:'one',v:30,d:'all'}),pivot:()=>({k:'pivot',p:100,keep:'0'}),trap:()=>({k:'trap',p:100,turns:3})};
const CRIT={bajo:5,medio:7.5,alto:12.5},CRITN={bajo:'Bajo (5%)',medio:'Medio (7,5%)',alto:'Alto (12,5%)'},GRD=[.1,.5,.8];
const DESP={id:'__desp',nombre:'Esfuerzo desesperado',desc:'Ataque universal sin maná: potencia baja y retroceso del 10% de la vida máxima.',tipo:'Neutro',mp:0,cat:'fis',pot:40,alc:'uni',aoe:75,reb:[],prio:0,con:false,fx:[{k:'recoil',p:100,b:'hp',v:10}]};
const canAtk=u=>u.mv.some(m=>u.mp>=cost(u,m));
const pn=s=>{const raw=S&&S.names?S.names[s]:((cfg.names||[])[s]||''),t=String(raw).trim();return t||(s===1&&(S?S.cpu===1:cfg.vs==='cpu')?'Máquina':'Jugador '+(s+1))};
const learnOf=c=>{const ok=new Set(A.map(a=>a.id));return[...new Set([...(c.atk||[]).filter(Boolean),...(c.learn||[])])].filter(id=>ok.has(id))};
const movesFor=(c,x)=>{const m=x&&x.mv;return m&&m.length===5&&new Set(m).size===5&&m.every(i=>learnOf(c).includes(i))?m:(c.atk||[])};
const cost=(u,m)=>m.mp>0&&u.tipos.includes(m.tipo)?Math.max(1,Math.floor(m.mp*.9)):m.mp;
const blank3=()=>({id:null,nombre:'',desc:'',tipo:'Neutro',mp:10,cat:'fis',pot:60,alc:'uni',aoe:75,reb:[],fx:[],prio:0,crit:'bajo'});
let A=[],a3=blank3();
try{const s=JSON.parse(localStorage.getItem(KEY3)||'[]');if(Array.isArray(s))A=s.map(a=>Object.assign(a,{crit:CRIT[a.crit]?a.crit:'bajo'}))}catch(e){}
const save3s=()=>{try{localStorage.setItem(KEY3,JSON.stringify(A));return true}catch(e){toast('No se pudo guardar');return false}};
const fxTxt=f=>{const p=f.p>=100?'Asegurado':f.p+'%';const m={boost:()=>`${({user:'Usuario',team:'Todo el equipo',allies:'Aliados',ua:'Usuario + aliado elegido'})[f.t]||'Rival'} ${f.s} ${f.n>0?'+':''}${f.n} (×${MUL[f.n]})`,lifesteal:()=>`Roba ${f.v}% del daño como vida`,mpsteal:()=>f.m==='dmg'?`Roba MP = ${f.v}% del daño real (máx. ${f.c||50} MP)`:`Roba ${f.v}${f.m==='pct'?'%':''} MP`,guard:()=>`Reduce ${f.v}% el daño ${({all:'(todo tipo)',fis:'físico',mag:'mágico',cont:'por contacto',area:'de área'})[f.d||'all']} recibido (${f.t==='team'?'todo el equipo':'aliado objetivo'}, solo ese turno)`,pivot:()=>`Pivote: el usuario se cambia al impactar (${String(f.keep)==='1'?'conserva':'pierde'} sus boosteos)`,recoil:()=>`Retroceso ${f.v}% ${f.b==='hp'?'de vida máx.':'del daño'}`,trap:()=>`El rival no puede retirarse durante ${f.turns} turnos`,status:()=>f.e};return p+' · '+(m[f.k]?m[f.k]():f.k)};

/* ---------- Fase 4: combate ---------- */
const KEY4='rpg_combate_v1',PRI={sw:7,it:5,pr:4,atk:0,em:0,rc:-6};
const WEA={ob:{n:'Tormenta de Obsidiana',dmg:{Tierra:1.2}},cy:{n:'Ciclón Tropical',dmg:{Agua:1.2,Fuego:.8},def:{Planta:1.1}},ne:{n:'Neblina',def:{Oscuro:1.25}},so:{n:'Soleado',dmg:{Fuego:1.2,Agua:.8},def:{Oscuro:.9}},gr:{n:'Granizo',dmg:{Hielo:1.2},def:{Hielo:1.1,Planta:.9}},oj:{n:'Ojo de Tormenta',dmg:{Viento:1.2},spd:{Viento:1.1}}};
const STS={'Quemadura':{def:.85,tick:.075},'Parálisis':{spd:.85},'Intoxicación':{atk:.85,tick:.075},'Congelación':{spd:.9,def:.9,mdef:.9},'Maldición':{matk:.8},'Sangrado':{atk:.9,def:.9,tick:.05}};
const ALIAS={Envenenamiento:'Intoxicación'};
const PAS={'Cinto Férreo':{def:1.1,mdef:1.1},'Amuleto Veloz':{spd:1.1}};
const OFE={'Lente de Poder':{all:1.1},'Garra Afilada':{fis:1.2},'Orbe Arcano':{mag:1.2}};
const SCHEMA=5,KEYEQ='rpg_equipos_v1',KEYPA='rpg_partidas_v1';
const BAG0={'Poción':3,'Éter':2,'Antídoto':2};
const CONS={'Poción':{t:'hp',p:30},'Éter':{t:'mp',p:30},'Antídoto':{t:'cura',p:0}};
const blankCfg=()=>({w:'',t:[0,1].map(()=>Array.from({length:6},()=>({id:'',nm:'',pas:'',ofe:''})))});
let cfg=blankCfg(),S=null;
function norm4(){if(!WEA[cfg.w])cfg.w='';if(!Array.isArray(cfg.names))cfg.names=['',''];cfg.names=[0,1].map(i=>String(cfg.names[i]||'').slice(0,20));if(cfg.vs!=='cpu')cfg.vs='pvp';if(!['in','gr','al'].includes(cfg.pol))cfg.pol='in';cfg.t=[0,1].map(i=>Array.from({length:6},(_,j)=>Object.assign({id:'',nm:'',pas:'',ofe:'',mv:[]},(cfg.t&&cfg.t[i]||[])[j])))}
const mvPanel=x=>{const c=db.find(c=>c.id===x.id);if(!c)return'';const lr=learnOf(c).map(id=>A.find(a=>a.id===id)).filter(Boolean),cu=movesFor(c,x),custom=cu!==(c.atk||[]);return `<details class='mvd' style='grid-column:1/-1'><summary>Ataques: <span class='mvs'>${cu.map(id=>esc((A.find(a=>a.id===id)||{}).nombre||'—')).join(' · ')}</span>${custom?' <span class=\'dfi\' style=\'--c:var(--oro)\'>personalizado</span>':''}</summary><div class='mvg'>${[0,1,2,3,4].map(n=>`<select data-k='mv' data-n='${n}' aria-label='Ataque ${n+1}'>${lr.map(m=>`<option value='${m.id}'${m.id===cu[n]?' selected':''}>${esc(m.nombre)} · ${esc(m.tipo)}${m.cat==='est'?'':' · Pot '+m.pot} · ${m.mp} MP</option>`).join('')}</select>`).join('')}</div><button class='sm' data-k='mvr'>Ataques por defecto</button></details>`};
try{const s=JSON.parse(localStorage.getItem(KEY4)||'null');if(s&&Array.isArray(s.t))cfg=s}catch(e){}
norm4();
const save4=()=>{try{localStorage.setItem(KEY4,JSON.stringify(cfg))}catch(e){toast('No se pudo guardar')}};
let LGMODE=null,AIX=null;
function lg(m,c,tu){if(!S)return;if(LGMODE){if(LGMODE.cap)LGMODE.cap.push(m);return}registrarLog(m,c||'');if(S.tl)S.tl.push({m,c:c||'',tg:tu&&tu.side!=null?[tu.side,S.t[tu.side].indexOf(tu)]:null,sn:snap()})}
function mk(c,x,s){
  const st={};STATS.forEach(k=>{const v=calc(c.f[k.k],c.base[k.k],c.nivel,k.k==='mp'?0:(c.ev[k.k]||0));st[k.k]=Math.max(1,Math.round(isNaN(v)?1:v))});
  (getAb(c)||{fx:[]}).fx.forEach(f=>{const k=f.k==='dbl'&&f.s.toLowerCase();if(k&&st[k])st[k]=Math.max(1,Math.round(st[k]*f.m))});
  const hp=Math.round(st.hp*((PAS[x.pas]||{}).hp||1));
  return {side:s,cid:c.id,nm:c.nombre,tipos:c.tipos,N:c.nivel,st,bhp:hp,maxhp:hp,hp,maxmp:st.mp,mp:st.mp,bo:{HP:0,ATK:0,DEF:0,MATK:0,MDEF:0,SPD:0},status:null,trap:0,gc:0,cd:0,gl:0,gmp:0,rcv:false,blk:false,pas:x.pas,ofe:x.ofe,ko:false,prot:false,abn:(getAb(c)||{}).nombre||'',ab:((getAb(c)||{}).fx||[]).filter(f=>!((f.k==='low'||f.k==='dbl')&&f.s==='HP')),first:true,low:{},mv:movesFor(c,x).map(id=>A.find(m=>m.id===id)).filter(Boolean)};
}
function eff(f,k,nb){
  let v=f.st[k]*(nb?1:(MUL[f.bo[k.toUpperCase()]]||1));
  const s=STS[f.status];if(s&&s[k])v*=s[k];
  const p=PAS[f.pas];if(p&&p[k])v*=p[k];
  const w=WEA[S.w];if(w&&w[k])f.tipos.forEach(t=>{if(w[k][t])v*=w[k][t]});
  return v;
}
const alive=s=>S.a[s].map(i=>S.t[s][i]).filter(f=>!f.ko);
function dmg(t,d,why){t.hp=Math.max(0,t.hp-d);lg(`  ${t.nm} pierde ${d} HP (${t.hp}/${t.maxhp})${why||''}`);if(!t.hp&&!t.ko){t.ko=true;lg(`  ${t.nm} se debilita`,'ko');if(S.endLoser===t.side)lg(`  ${pn(t.side)}: ¡Resistan, todavía no termina!`,'t')}if(t.hp)lowChk(t)}
function check4(){if(S.over)return;if(!AIX&&!LGMODE){const L=liveEnd();S.endLoser=L;if(L!=null&&!S.endOn){S.endOn=true;lg(`¡El combate se acerca a su final! ${pn(L)} está contra las cuerdas`,'t');if(S.tl&&S.tl.length)S.tl[S.tl.length-1].fx='end'}}const d=[0,1].map(s=>S.t[s].every(f=>f.ko));if(d[0]&&d[1]){S.over=true;lg('¡Empate! Ambos equipos quedaron sin criaturas','t')}else if(d[0]||d[1]){S.over=true;lg(`¡Gana ${pn(d[0]?1:0)}!`,'t')}}
function hit(u,t,m,mult,crit){
  const fis=m.cat==='fis',A_=eff(u,fis?'atk':'matk'),D=eff(t,fis?'def':'mdef',crit);
  const base=(u.N+5)*Math.sqrt(A_/D)*(m.pot+30)/15+1,stab=u.tipos.includes(m.tipo),bonus=1+(crit?.5:0)+(stab?.3:0);
  let ty=1;t.tipos.forEach(x=>ty*=gv(m.tipo,x));t._ty=ty;
  const w=WEA[S.w],cw=(w&&w.dmg&&w.dmg[m.tipo])||1,o=OFE[u.ofe]||{},ci=(o.all||1)*(o[m.cat]||1),pr=t.prot?GRD[(t.gl||1)-1]:1;
  let ab=1,pw=1;t.ab.forEach(f=>{if(f.k==='cut'){if(f.c===m.cat)ab*=1-f.v/100}else if(f.tipo===m.tipo){if(f.k==='imm')ab=0;else if(f.k==='res')ab*=f.m}});u.ab.forEach(f=>{if(f.k==='pow'&&f.tipo===m.tipo)pw*=f.m});
  const gd=Math.min(100,Math.max(0,...(t.guards||[]).filter(g=>g.d==='all'||g.d===m.cat||(g.d==='cont'&&m.con)||(g.d==='area'&&m.alc==='area')).map(g=>g.v)));
  const d=(ty===0||ab===0)?0:Math.max(1,Math.floor(base*bonus*ty*cw*ci*pr*mult*pw*ab*(1-gd/100)));
  if(!LGMODE&&S&&S.calcs)S.calcs.push({t:S.n,u:u.nm,g:t.nm,m:m.nombre,N:u.N,pot:m.pot,fis,A:Math.round(A_),D:Math.round(D),crit:!!crit,stab,bonus,ty,cw,ci,pr,pw,ab,gd,mult,base,d});
  if(!LGMODE||LGMODE.cap)lg(`  Cálculo ${t.nm}: base ${base.toFixed(1)} [((${u.N}+5)·√(${Math.round(A_)}/${Math.round(D)}${crit?' defensa base':''})·(${m.pot}+30))/15+1] × bonus ${+bonus.toFixed(2)} (${crit?'crítico +50%':''}${crit&&stab?' y ':''}${stab?'STAB +30%':''}${!crit&&!stab?'ninguno':''}) × tipo ${ty} × clima ${cw} × objeto ${ci.toFixed(2)}${t.prot?' × Guardia '+pr:''}${gd?' × Reducción '+gd+'%':''}${mult!==1?' × '+mult:''}${pw*ab!==1?' × habilidad '+(+(pw*ab).toFixed(3)):''} = ${d}${ty>1?' (¡Súper eficaz!)':ty>0&&ty<1?' (Poco eficaz)':''}`,'calc');
  return d;
}
function boost(t,s,n){
  n=+n;const o=t.bo[s]||0,v=Math.max(-4,Math.min(4,o+n));
  if(v===o)return lg(`  ${t.nm}: ${s} no puede ${n>0?'subir':'bajar'} más`);
  t.bo[s]=v;
  lg(`  ${t.nm}: ${s} ${n>0?'+':''}${n} → nivel ${v} (×${MUL[v]||1})`);
}
function teamT(u,s,mode,tgv){const al=alive(s);if(mode==='team')return al;if(mode==='allies')return al.filter(x=>x!==u);const [ts,ti]=String(tgv).split(':').map(Number);const c=ts===s&&S.t[s][ti];return c&&!c.ko&&c!==u&&S.a[s].includes(ti)?[u,c]:[u]}
function fx(u,m,hits,dealt,s,tgv){
  (m.fx||[]).filter(f=>f.k==='guard').forEach(f=>{if(rng()*100>=f.p)return lg(`  (Reducción de daño ${f.p}%: no se activa)`,'calc');let g;if(f.t==='team')g=alive(s);else{const [ts,ti]=String(tgv).split(':').map(Number);const c=ts===s&&S.t[s][ti];g=[c&&!c.ko?c:u]}g.forEach(t=>{(t.guards=t.guards||[]).push({v:Math.min(100,f.v),d:f.d||'all'});lg(`  ${t.nm} recibe ${f.v}% menos de daño (${({all:'todo tipo',fis:'físico',mag:'mágico',cont:'contacto',area:'área'})[f.d||'all']}) este turno`)})});
  (m.fx||[]).forEach(f=>{
    if(f.k==='guard'||f.k==='pivot'||(f.k==='boost'&&f.s==='HP'))return;const self=(f.k==='boost'&&f.t==='user')||f.k==='lifesteal'||f.k==='recoil';const grp=f.k==='boost'&&['team','allies','ua'].includes(f.t)?teamT(u,s,f.t,tgv):null;
    (grp||(self?[u]:hits)).forEach(t=>{
      if(t.ko)return;
      if(t!==u&&t.prot&&!grp)return lg(`  ${t.nm} está protegido: ignora ${FXN[f.k]}`);
      if(rng()*100>=f.p)return lg(`  (${FXN[f.k]} ${f.p}%: no se activa)`,'calc');
      if(f.k==='boost')boost(t,f.s,f.n);
      else if(f.k==='trap'){if(t.trap>0)return lg(`  ${t.nm} ya está atrapado`);t.trap=f.turns;t._trapNew=true;lg(`  ${t.nm} queda atrapado: no podrá retirarse durante ${f.turns} turnos`)}
      else if(f.k==='status'){const e=ALIAS[f.e]||f.e;if(!STS[e])return;if(t.status)return lg(`  ${t.nm} ya tiene ${t.status}`);t.status=e;lg(`  ${t.nm} sufre ${e}`)}
      else if(f.k==='mpsteal'){const q=Math.min(t.mp,f.m==='dmg'?Math.min(Math.floor((t._real||0)*f.v/100),f.c||50):f.m==='pct'?Math.floor(t.mp*f.v/100):f.v);t.mp-=q;u.mp=Math.min(u.maxmp,u.mp+q);lg(`  ${u.nm} roba ${q} MP a ${t.nm}`)}
      else if(f.k==='lifesteal'){const h=Math.floor(dealt*f.v/100);u.hp=Math.min(u.maxhp,u.hp+h);lg(`  ${u.nm} recupera ${h} HP (robo de vida)`)}
      else if(f.k==='recoil'){const r=Math.floor((f.b==='hp'?u.maxhp:dealt)*f.v/100);if(r>0)dmg(u,r,' (retroceso)')}
    });
  });
}
function pivot(u,s,a,pv){if(u.trap>0)return lg(`  ${u.nm} está atrapado y no puede salir (pivote bloqueado)`);const ti=+a.pv,n=S.t[s][ti],pos=S.a[s].indexOf(S.t[s].indexOf(u));if(a.pv===''||!n||n.ko||S.a[s].includes(ti)||pos<0)return lg(`  ${u.nm}: pivote sin reemplazo válido`);const keep=String(pv.keep)==='1';if(!keep){Object.keys(u.bo).forEach(k=>u.bo[k]=0);u.maxhp=u.bhp;u.hp=Math.min(u.hp,u.maxhp)}n.first=true;S.a[s][pos]=ti;lg(`  PIVOTE: ${u.nm} sale y entra ${n.nm} (${keep?'conserva':'pierde'} sus boosteos)`);enter(n)}
function enter(f){f._in=1;f.ab.forEach(x=>{if(x.k==='wea'&&WEA[x.w]&&S.w!==x.w){S.w=x.w;if(!AIX)UI.clima(S.w);lg(`${f.nm} (${f.abn}) invoca ${WEA[x.w].n}`,'t')}if(x.k==='trap'&&x.w==='enter'){alive(f.side===0?1:0).forEach(r=>{if(r.prot)return;if(rng()*100>=x.p)return lg(`  (Habilidad de ${f.nm}: trampa ${x.p}% no se activa)`,'calc');if(r.trap>0)return;r.trap=x.turns;r._trapNew=true;lg(`${f.nm} (${f.abn}) atrapa a ${r.nm}: no podrá retirarse durante ${x.turns} turnos`,'t')})}if(x.k==='int'&&['ATK','DEF','MATK','MDEF','SPD'].includes(x.s)){const s=f.side,pos=S.a[s].indexOf(S.t[s].indexOf(f)),fo=alive(1-s);const g=x.w==='front'?fo.filter(r=>S.a[1-s].indexOf(S.t[1-s].indexOf(r))===pos):x.w==='rand'?(fo.length?[fo[Math.floor(rng()*fo.length)]]:[]):fo;lg(`${f.nm} (${f.abn}) reduce ${x.s} rival al entrar`,'t');if(!g.length)lg('  Sin rival objetivo');g.forEach(r=>boost(r,x.s,-Math.abs(+x.n||1)))}})}
function doSw({u,s,pos,a}){
  const ti=+a.sw,n=S.t[s][ti];
  if(u.trap>0)return lg(`${u.nm} está atrapado (${u.trap} turno(s)) y no puede ser retirado`);
  if(!n||n.ko||S.a[s].includes(ti))return lg(`${u.nm} no puede cambiarse (sin reemplazo válido)`);
  Object.keys(u.bo).forEach(k=>u.bo[k]=0);u.maxhp=u.bhp;u.hp=Math.min(u.hp,u.maxhp);
  n.first=true;S.a[s][pos]=ti;lg(`${pn(s)}: ¡${u.nm}, regresa! ${goTxt(s,n.nm)}`,'t');enter(n);
}
function doIt({u,s,a}){
  const n=a.it,t=S.t[s][+a.ia];
  if(!S.bag[s][n]||!t||t.ko)return lg(`${u.nm} no puede usar ${n||'objeto'}`);
  S.bag[s][n]--;
  const e=CONS[n]||{};
  if(e.t==='hp'){const h=Math.min(t.maxhp-t.hp,Math.floor(t.maxhp*(e.p||0)/100));t.hp+=h;lg(`${u.nm} usa ${n} en ${t.nm}: +${h} HP`)}
  else if(e.t==='mp'){const h=Math.min(t.maxmp-t.mp,Math.floor(t.maxmp*(e.p||0)/100));t.mp+=h;lg(`${u.nm} usa ${n} en ${t.nm}: +${h} MP`)}
  else if(e.t==='cura'){lg(`${u.nm} usa ${n} en ${t.nm}: ${t.status?'cura '+t.status:'sin efecto'}`);t.status=null}
  else lg(`${u.nm} usa ${n} en ${t.nm}: sin efecto`);
}
function doEm({u,s,a}){const foes=alive(1-s);const [ts,ti]=String(a.tg).split(':').map(Number);let t=S.t[ts]&&S.t[ts][ti];if(!t||t.ko||ts===s||!S.a[ts].includes(ti))t=foes[Math.floor(rng()*foes.length)];if(!t)return;u.first=false;lg(`${u.nm} (J${s+1}) usa ATAQUE DE EMERGENCIA contra ${t.nm}`);dmg(u,Math.max(1,Math.floor(u.maxhp*.1)),' (coste del ataque de emergencia)');dmg(t,Math.max(1,Math.floor(t.maxhp*.1*(t.prot?.1:1))),' (ataque de emergencia)')}
function doPr({u}){u.gc=(u.gc||0)+1;u.gl=u.gc;u.prot=true;if(u.gc>=3)u.cd=1;lg(`${u.nm} se pone en guardia (nivel ${u.gc}: −${[90,50,20][u.gc-1]}% de daño recibido${u.gc>=3?'; no podrá guardia el próximo turno':''})`)}
function doRc({u}){u.rcv=true;lg(`${u.nm} se concentra en recuperar maná y queda vulnerable`)}
function doAtk({u,s,a}){
  const m=a.m===DESP.id?(canAtk(u)?null:DESP):u.mv.find(x=>x.id===a.m);if(!m)return lg(`${u.nm} no tiene ataque elegido`);
  if(u.status==='Parálisis'&&rng()<.2)return lg(`${u.nm} está paralizado y no puede moverse`);
  const cs=cost(u,m);
  if(u.mp<cs)return lg(`${u.nm} no tiene maná para ${m.nombre} (${u.mp}/${cs} MP)`);
  u.mp-=cs;u.first=false;
  const foes=alive(1-s);let tg;foes.forEach(t=>t._real=0);
  if(m.alc==='area')tg=foes;
  else{const [ts,ti]=a.tg.split(':').map(Number);let t=S.t[ts]&&S.t[ts][ti];if(!t||t.ko||!S.a[ts].includes(ti))t=foes[Math.floor(rng()*foes.length)];tg=t?[t]:[]}
  lg(`${u.nm} (${pn(s)}) usa ${m.nombre} [${m.tipo} · ${CATN[m.cat]}${m.con?' contacto':''} · ${cs} MP${cs<m.mp?' (−10% por STAB)':''}]`);
  if(!tg.length)return lg('  Sin objetivo válido');
  tg.forEach(t=>{if(t.prot)t.gmp=(t.gmp||0)+cs});
  let hits=tg,dealt=0;
  if(m.cat!=='est'){
    const mult=tg.length>1?(m.aoe||75)/100:1;hits=[];
    tg.forEach(t=>{const cr=rng()*100<(CRIT[m.crit]||CRIT.bajo),d=hit(u,t,m,mult,cr);if(d>0){if(cr)lg('  ¡Golpe crítico!','crit',t);dealt+=d;hits.push(t);t._real+=Math.min(d,t.hp);effMsg(t);dmg(t,d);refl(u,t,d,m)}else lg(`  No afecta a ${t.nm}`,'eff0',t)});
    if(m.alc==='uni'&&m.reb&&m.reb.length){
      const pool=foes.filter(f=>!tg.includes(f)&&!f.ko);
      m.reb.forEach((p,i)=>{if(!pool.length)return;const t=pool.splice(Math.floor(rng()*pool.length),1)[0];lg(`  Rebote ${i+1} (${p}%) sobre ${t.nm}`);const cr=rng()*100<(CRIT[m.crit]||CRIT.bajo),d=hit(u,t,m,p/100,cr);if(d>0){if(cr)lg('  ¡Golpe crítico!','crit',t);dealt+=d;hits.push(t);t._real+=Math.min(d,t.hp);effMsg(t);dmg(t,d);refl(u,t,d,m)}});
    }
  }
  fx(u,m,hits,dealt,s,a.tg);
  if(S.stat)S.stat(u,m,dealt,hits.filter(t=>t.ko).length);
  {const pv=(m.fx||[]).find(f=>f.k==='pivot');if(pv&&!u.ko&&(m.cat==='est'||hits.length)&&rng()*100<pv.p)pivot(u,s,a,pv)}
}
function readAct(s,pos){
  if(AIX)return AIX(s,pos);
  if(!S.fast&&((S.cpuFn&&s===S.cpu)||(S.auto&&S.autoFn))){const fn=s===S.cpu&&S.cpuFn?S.cpuFn:S.autoFn,pl=LGMODE;LGMODE={};try{return fn(s,pos)}finally{LGMODE=pl}}
  return leerAccion(s,pos);
}
function endTurn(){
  [0,1].forEach(s=>alive(s).forEach(f=>{if(f.trap>0){if(f._trapNew)f._trapNew=false;else{f.trap--;if(!f.trap)lg(`${f.nm} ya puede retirarse`,'calc')}}}));
  [0,1].forEach(s=>alive(s).forEach(f=>{
    if(S.w==='ob'&&!f.tipos.includes('Tierra'))dmg(f,Math.max(1,Math.floor(f.maxhp*.05)),' (Tormenta de Obsidiana)');
    const st=f.ko?null:STS[f.status];if(st&&st.tick)dmg(f,Math.max(1,Math.floor(f.maxhp*st.tick)),` (${f.status})`);
  }));
  [0,1].forEach(s=>S.a[s].forEach(ti=>{const f=S.t[s][ti];if(f.ko)return;if(f.rcv){const h=f.maxmp-f.mp;f.mp=f.maxmp;f.rcv=false;lg(`${f.nm} sobrevive y recupera todo su maná (+${h} MP)`)}else if(f.prot&&f.gmp>0){const h=Math.min(f.maxmp-f.mp,Math.floor(f.gmp*.1));f.mp+=h;lg(`${f.nm} recupera ${h} MP por los ataques bloqueados (10% de ${f.gmp} MP)`)}}));
  [0,1].forEach(s=>S.a[s].forEach((ti,pos)=>{if(S.t[s][ti].ko){const n=S.t[s].findIndex((f,i)=>!f.ko&&!S.a[s].includes(i));if(n>=0){S.a[s][pos]=n;lg(`${pn(s)}: ${goTxt(s,S.t[s][n].nm)}`,'t');enter(S.t[s][n])}}}));
  check4();
}
function turn4(){
  if(!S||S.over||S.busy)return;S.tls=S.tl?S.tl.length:0;
  S.n++;lg(`— Turno ${S.n} —`,'t');
  const L=[];
  [0,1].forEach(s=>S.t[s].forEach(f=>{f.lastPr=f.prot;f.prot=false;f.guards=[];f.gl=0;f.gmp=0;f.rcv=false;if(f.cd>0){f.blk=true;f.cd--;f.gc=0}else{f.blk=false;if(!f.lastPr)f.gc=0}}));
  [0,1].forEach(s=>S.a[s].forEach((ti,pos)=>{
    const u=S.t[s][ti];if(u.ko)return;const a=readAct(s,pos);if(!a)return;if(S.rec)(S.rec[S.n-1]=S.rec[S.n-1]||[]).push({s,pos,...a});
    {if(a.t==='em'){a.t='atk';a.m=DESP.id}const cant=!u.mv.some(m=>u.mp>=cost(u,m));if(a.t==='atk'&&a.m===DESP.id&&!cant)a.m=u.mv.find(m=>u.mp>=cost(u,m)).id;
    if(a.t==='atk'&&cant&&a.m!==DESP.id){a.t=u.blk?'rc':'pr';lg(`${u.nm} no tiene MP para ningún ataque: ${a.t==='pr'?'se pone en guardia':'recupera maná'}`)}
    else if(a.t==='pr'&&u.blk){a.t=cant?'rc':'atk';if(a.t==='atk'&&!u.mv.some(m=>m.id===a.m&&u.mp>=cost(u,m)))a.m=u.mv.find(m=>u.mp>=cost(u,m)).id;lg(`${u.nm} no puede ponerse en guardia este turno`)}}
    L.push({u,s,pos,ti,a,p:(PRI[a.t]||0)+(a.t==='atk'?Math.max(-3,Math.min(3,((u.mv.find(m=>m.id===a.m)||{}).prio||0)+(u.first?Math.min(3,u.ab.reduce((q,f)=>q+(f.k==='pri'?f.v:0),0)):0))):0),spd:eff(u,'spd'),r:rng()});
  }));
  L.sort((x,y)=>y.p-x.p||y.spd-x.spd||x.r-y.r);
  if(!AIX&&!LGMODE){S.order=L.map(x=>({s:x.s,i:x.ti,l:actLbl(x.u,x.a),p:x.p,spd:Math.round(x.spd)}));tieMark(S.order)}
  lg('Orden: '+L.map(x=>`${x.u.nm} (${pn(x.s)}, prio +${x.p}, SPD ${Math.round(x.spd)})`).join(' → '),'calc');
  L.forEach((x,k)=>{
    if(S.over||x.u.ko||S.a[x.s][x.pos]!==x.ti)return;
    if(S.tl&&!LGMODE&&!AIX)S.tl.push({m:'',c:'act',k,tg:null,sn:snap()});
    const fn={sw:doSw,it:doIt,pr:doPr,rc:doRc,atk:doAtk,em:doEm}[x.a.t];if(fn)fn(x);
    check4();
  });
  if(!S.over)endTurn();
  if(AIX||LGMODE||S.fast||!S.tl)UI.arena();else UI.playTL(S.tls);
}
const snap=()=>({n:S.n,w:S.w,a:S.a.map(q=>q.slice()),u:S.t.map(t=>t.map(f=>({hp:f.hp,mx:f.maxhp,mp:f.mp,mm:f.maxmp,ko:f.ko,st:f.status,bo:Object.assign({},f.bo),tr:f.trap,gc:f.gc,cd:f.cd,pr:f.prot,rc:f.rcv})))});
let VEL='normal',pbSkip=false,STEP=false;try{VEL=localStorage.getItem('rpg_vel')||'normal'}catch(e){}
const velK=()=>({lento:1.6,normal:1,rapido:.45,ins:0})[VEL]??1;
const actLbl=(u,a)=>a.t==='atk'?(a.m===DESP.id?DESP.nombre:((u.mv.find(m=>m.id===a.m)||{}).nombre||'Ataque')):({pr:'Guardia',rc:'Recuperar',it:'Mochila',sw:'Cambiar',em:DESP.nombre})[a.t]||a.t;
const tieMark=L=>L.forEach((o,k)=>{const n=L[k+1],p=L[k-1];o.tie=!!((n&&n.p===o.p&&n.spd===o.spd)||(p&&p.p===o.p&&p.spd===o.spd))});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const halfEnd=arr=>{const n=arr.length,al=arr.filter(x=>!x.ko);return al.length>0&&n-al.length>=Math.floor(n/2)&&al.some(x=>x.hp<=x.mx*.5)};
const nearEnd=sn=>sn.u.some(t=>t.every(x=>x.ko))||sn.u.some(halfEnd);
const liveEnd=()=>{if(!S)return null;const r=[0,1].filter(s=>halfEnd(S.t[s].map(f=>({ko:f.ko,hp:f.hp,mx:f.maxhp}))));if(!r.length)return null;if(r.length===1)return r[0];const fr=s=>S.t[s].reduce((q,f)=>q+f.hp,0)/S.t[s].reduce((q,f)=>q+f.maxhp,0);return fr(0)<=fr(1)?0:1};
const goTxt=(s,nm)=>S&&S.endLoser===s?['¡Ánimo, '+nm+'! ¡Tú puedes!','¡Todo depende de ti, '+nm+'!','¡'+nm+', aún no termina! ¡Con todo!'][(S.n+nm.length)%3]:'¡Adelante, '+nm+'!';
const effMsg=t=>{if(t._ty>1)lg('  ¡Es súper eficaz!','eff+',t);else if(t._ty>0&&t._ty<1)lg('  No es muy eficaz…','eff-',t)};
/* ---------- Habilidades ---------- */
const KEYH='rpg_habilidades_v1',WT={any:'cualquier golpe',fis:'golpe físico',mag:'golpe mágico',cont:'golpe por contacto',muerte:'al morir'};
const HK={imm:'Inmunidad a un tipo',res:'Resistencia o debilidad a un tipo',ref:'Devolver daño recibido',stt:'Aplicar estado al recibir un golpe',cut:'Reducir daño físico o mágico',dbl:'Duplicar una estadística',pri:'Prioridad en el primer ataque',low:'Boosteo con poca vida',pow:'Potenciar ataques de un tipo',wea:'Invocar clima al entrar al campo',int:'Reducir stat del rival al entrar al campo',trap:'Impedir retirada del rival (3–5 turnos)'};
const HNEW={imm:()=>({k:'imm',tipo:TIPOS[0][0]}),res:()=>({k:'res',tipo:TIPOS[0][0],m:0.5}),ref:()=>({k:'ref',v:25,w:'fis',b:'dmg'}),stt:()=>({k:'stt',p:30,e:'Quemadura',w:'cont'}),cut:()=>({k:'cut',c:'fis',v:25}),dbl:()=>({k:'dbl',s:'ATK',m:2}),pri:()=>({k:'pri',v:1}),low:()=>({k:'low',pct:33,s:'ATK',n:1}),pow:()=>({k:'pow',tipo:TIPOS[0][0],m:1.2}),wea:()=>({k:'wea',w:'ob'}),int:()=>({k:'int',s:'ATK',n:-1,w:'all'}),trap:()=>({k:'trap',p:100,turns:3,w:'enter'})};
let H=[],h5={id:null,nombre:'',desc:'',fx:[]};
try{const s=JSON.parse(localStorage.getItem(KEYH)||'[]');if(Array.isArray(s))H=s}catch(e){}
const saveH=()=>{try{localStorage.setItem(KEYH,JSON.stringify(H));return true}catch(e){toast('No se pudo guardar');return false}};
const WTR={enter:'al entrar al campo, a todos los rivales en el campo',any:'al recibir cualquier golpe, al atacante',fis:'al recibir un golpe físico, al atacante',mag:'al recibir un golpe mágico, al atacante',cont:'al recibir un golpe por contacto, al atacante'};
const hfx=f=>({trap:()=>`${f.p}%: impide retirarse durante ${f.turns} turnos ${WTR[f.w||'enter']}`,imm:()=>`Inmune a ${f.tipo}`,res:()=>`Recibe ×${f.m} de daño de tipo ${f.tipo}`,ref:()=>`Devuelve el ${f.v}% ${f.b==='hp'?'de la vida máxima del atacante':'del daño recibido'} (${WT[f.w||'any']})`,stt:()=>`${f.p}% de causar ${f.e} al atacante (${WT[f.w||'any']})`,cut:()=>`Recibe ${f.v}% menos de daño ${f.c==='mag'?'mágico':'físico'}`,dbl:()=>`${f.s} ×${f.m} (siempre activo)`,pri:()=>`+${f.v} de prioridad en su primer ataque`,low:()=>`Con ≤${f.pct}% de HP: ${f.s} ${f.n>0?'+':''}${f.n} (una vez)`,pow:()=>`Ataques de tipo ${f.tipo} ×${f.m}`,wea:()=>`Al entrar al campo invoca ${(WEA[f.w]||{n:f.w}).n}`,int:()=>`Al entrar al campo baja ${f.n} nivel(es) de ${f.s} a ${({all:'todos los rivales en el campo',front:'el rival de enfrente',rand:'un rival al azar'})[f.w||'all']}`}[f.k]||(()=>f.k))();
const hdesc=h=>[h.desc,h.fx.map(hfx).join('. ')].filter(Boolean).join(' — ');
const getAb=c=>H.find(h=>h.id===c.habId)||H.find(h=>h.nombre===c.hab&&!c.habId)||null;
/* ---------- Reacciones de habilidades ---------- */
function refl(u,t,d,m){
  t.ab.forEach(f=>{
    if(f.k!=='ref'&&f.k!=='stt'&&!(f.k==='trap'&&f.w!=='enter'))return;
    const w=f.w||'any';
    if((w==='fis'&&m.cat!=='fis')||(w==='mag'&&m.cat!=='mag')||(w==='cont'&&!(m.cat==='fis'&&m.con))||(w==='muerte'&&!t.ko))return;
    if(u.ko||u===t)return;
    if(f.k==='trap'){if(u.prot)return lg(`  ${u.nm} está protegido: ignora la trampa de ${t.nm}`);if(rng()*100>=f.p)return lg(`  (Habilidad de ${t.nm}: trampa ${f.p}% no se activa)`,'calc');if(u.trap>0)return lg(`  ${u.nm} ya está atrapado`);u.trap=f.turns;u._trapNew=true;lg(`  Habilidad de ${t.nm}: ${u.nm} no podrá retirarse durante ${f.turns} turnos`)}
    else if(f.k==='ref'){const r=Math.floor((f.b==='hp'?u.maxhp:d)*f.v/100);if(r>0)dmg(u,r,` (daño devuelto por ${t.nm})`)}
    else{
      if(u.prot)return lg(`  ${u.nm} está protegido: ignora ${f.e} de ${t.nm}`);
      if(rng()*100>=f.p)return lg(`  (Habilidad de ${t.nm}: ${f.e} ${f.p}% no se activa)`,'calc');
      const e=ALIAS[f.e]||f.e;if(!STS[e])return;
      if(u.status)return lg(`  ${u.nm} ya tiene ${u.status}`);
      u.status=e;lg(`  Habilidad de ${t.nm}: ${u.nm} sufre ${e}`);
    }
  });
}
function lowChk(t){t.ab.forEach((f,i)=>{if(f.k==='low'&&!t.ko&&!t.low[i]&&t.hp/t.maxhp*100<=f.pct){t.low[i]=true;lg(`  Habilidad de ${t.nm}: poca vida`);boost(t,f.s,f.n)}})}

/* ---------- Reglas editables ---------- */
const KEYR='rpg_reglas_v1';
const setObj=(o,n)=>{Object.keys(o).forEach(k=>delete o[k]);Object.assign(o,n)};
const getR=()=>({wea:WEA,sts:STS,pas:PAS,ofe:OFE,bag:BAG0,cons:CONS,rangos:TIERS,maxE:MAX_E,defF:DEF_F});
const R0=JSON.parse(JSON.stringify(getR()));
function applyRules(r){
  if(r.wea)setObj(WEA,r.wea);if(r.sts)setObj(STS,r.sts);if(r.pas)setObj(PAS,r.pas);if(r.ofe)setObj(OFE,r.ofe);if(r.bag)setObj(BAG0,r.bag);if(r.cons)setObj(CONS,r.cons);
  if(r.defF){setObj(DEF_F,r.defF);['hp','mp','stat'].forEach(c=>PRE[c]['Ejemplo']=DEF_F[c])}
  if(+r.maxE>0)MAX_E=+r.maxE;
  if(Array.isArray(r.rangos)&&r.rangos.length)TIERS.splice(0,TIERS.length,...r.rangos);
  ESTADOS.length=0;ESTADOS.push(...Object.keys(STS));ensureItemIds();
}
try{const s=JSON.parse(localStorage.getItem(KEYR)||'null');if(s)applyRules(s)}catch(e){}
cur=blank();
try{const s=JSON.parse(localStorage.getItem(KEY4)||'null');if(s&&Array.isArray(s.t))cfg=s}catch(e){}norm4();
Object.assign(PRE.hp,{'Clásico':'floor((2 * B + E / 4) * N / 100) + N + 10','Escalado':'floor(B * (1 + N * 0.02)) + floor(E * 0.5)'});
Object.assign(PRE.mp,{'Clásico':'floor((2 * B + E / 4) * N / 100) + 5','Escalado':'floor(B * (1 + N * 0.02)) + floor(E * 0.5)'});
Object.assign(PRE.stat,{'Clásico':'floor((2 * B + E / 4) * N / 100) + 5','Escalado':'floor(B * (1 + N * 0.02)) + floor(E * 0.5)'});

f2load();

/* Superficie única del núcleo: sin DOM, compartida por los módulos y por el bestiario. */
const NUCLEO={
  get MAX_E(){return MAX_E},set MAX_E(v){MAX_E=v},
  get cur(){return cur},set cur(v){cur=v},
  get sel(){return sel},set sel(v){sel=v},
  get db(){return db},set db(v){db=v},
  get RNGs(){return RNGs},set RNGs(v){RNGs=v},
  get M(){return M},set M(v){M=v},
  get RO(){return RO},set RO(v){RO=v},
  get CO(){return CO},set CO(v){CO=v},
  get drag(){return drag},set drag(v){drag=v},
  get A(){return A},set A(v){A=v},
  get a3(){return a3},set a3(v){a3=v},
  get cfg(){return cfg},set cfg(v){cfg=v},
  get S(){return S},set S(v){S=v},
  get LGMODE(){return LGMODE},set LGMODE(v){LGMODE=v},
  get AIX(){return AIX},set AIX(v){AIX=v},
  get VEL(){return VEL},set VEL(v){VEL=v},
  get pbSkip(){return pbSkip},set pbSkip(v){pbSkip=v},
  get STEP(){return STEP},set STEP(v){STEP=v},
  get H(){return H},set H(v){H=v},
  get h5(){return h5},set h5(v){h5=v},
  set(cambios){Object.entries(cambios||{}).forEach(([k,v])=>{if(k in NUCLEO)NUCLEO[k]=v;notificar(k,v)})},
  on(fn){escuchas.add(fn);return()=>escuchas.delete(fn)},
  configUI,avisar:m=>avisar(m),registrarLog:(m,c)=>registrarLog(m,c),leerAccion:(s,p)=>leerAccion(s,p),
  toast,lg,readAct,UI,
  TIPOS,STATS,DEF_F,PRE,TIERS,tierOf,
  BMIN,BMAX,normBase,FN,cache,compile,
  parse,calc,blank,clone,xmur3,seedRng,
  rng,idSlug,mkId,ensureTypeIds,ensureItemIds,uid,
  tcol,esc,KEY2,BASE_N,gv,cls,
  fix,DEF_EFF,f2load,KEY3,MUL,ESTADOS,
  ST3,CATN,FXN,FXNEW,CRIT,CRITN,GRD,DESP,canAtk,
  pn,learnOf,movesFor,cost,blank3,save3s,
  fxTxt,KEY4,PRI,WEA,STS,ALIAS,
  PAS,OFE,SCHEMA,KEYEQ,KEYPA,BAG0,
  CONS,blankCfg,norm4,mvPanel,save4,KEY,
  mk,eff,alive,dmg,check4,hit,
  boost,teamT,fx,pivot,enter,doSw,
  doIt,doEm,doPr,doRc,doAtk,endTurn,
  turn4,snap,velK,actLbl,tieMark,wait,
  halfEnd,nearEnd,liveEnd,goTxt,effMsg,KEYH,
  HK,HNEW,saveH,WT,WTR,hfx,hdesc,
  getAb,refl,lowChk,KEYR,setObj,getR,
  R0,applyRules,
};
Object.defineProperty(globalThis,'__rpgNucleo',{value:NUCLEO,configurable:true,writable:true});
