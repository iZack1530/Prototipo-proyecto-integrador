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
const $=id=>document.getElementById(id);

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
let tt;function toast(m){const e=$('toast');e.textContent=m;e.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('on'),2200)}
const tcol=n=>(TIPOS.find(t=>t[0]===n)||[0,'#e2e8f0'])[1];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- Construcción de UI ---------- */
function build(){
  $('t1').innerHTML=TIPOS.map(t=>`<option>${t[0]}</option>`).join('');
  $('t2').innerHTML='<option value="">— ninguno —</option>'+TIPOS.map(t=>`<option>${t[0]}</option>`).join('');
  $('stats').innerHTML=STATS.map(s=>`<div class="stat" data-k="${s.k}" tabindex="0" role="button" aria-label="Desglose de ${s.n}">
    <div class="nm">${s.s}<small>${s.n}</small></div>
    <input type="number" min="1" max="255" step="1" data-b="${s.k}" aria-label="Base ${s.s}">
    ${s.k==='mp'?'<span class="hint">sin esfuerzo</span>':`<input type="number" min="0" max="500" data-e="${s.k}" aria-label="Esfuerzo ${s.s}">`}
    <span></span>
    <div class="res"><span class="val" data-v="${s.k}"></span><div class="bar"><i data-bar="${s.k}"></i></div><span class="tier" data-t="${s.k}"></span><div class="brk" data-brk="${s.k}"></div></div></div>`).join('');
  const cats=[['hp','Fórmula de Vida (HP)'],['mp','Fórmula de Maná (MP)'],['stat','Fórmula de Stat Normal (ATK, DEF, MATK, MDEF, SPD)']];
  $('forms').innerHTML=cats.map(([c,t])=>`<details data-cat="${c}"><summary><span>${t}</span><span class="badge" data-st="${c}"></span></summary><div>
    ${c==='stat'?`<div class="row" style="margin:4px 0 8px"><label style="display:flex;gap:6px;align-items:center;margin:0"><input type="checkbox" id="sync" style="width:auto"> Sincronizar en todos los stats normales</label>
    <select id="fsel" style="width:auto">${STATS.filter(s=>s.cat==='stat').map(s=>`<option value="${s.k}">${s.s}</option>`).join('')}</select></div>`:''}
    <textarea data-f="${c}" spellcheck="false" aria-label="${t}"></textarea>
    <div class="row" style="margin-top:6px">${Object.keys(PRE[c]).map(n=>`<button class="sm" data-pre="${c}" data-n="${n}">${n}</button>`).join('')}</div>
    <p class="hint" style="margin:8px 0 0">Variables: B base, N nivel, E esfuerzo. Operadores + − * / ^ ** y ( ) [ ].</p></div></details>`).join('');
}
function fval(c){return c==='stat'?cur.f[cur.sync?'atk':$('fsel').value]:cur.f[c]}
function setF(c,str){
  if(c==='stat'){if(cur.sync)['atk','def','matk','mdef','spd'].forEach(k=>cur.f[k]=str);else cur.f[$('fsel').value]=str}
  else cur.f[c]=str;
}

/* ---------- Render / cálculo ---------- */
function fillForm(){
  $('nombre').value=cur.nombre;$('especie').value=cur.especie;
  $('t1').value=cur.tipos[0]||'Neutro';$('t2').value=cur.tipos[1]||'';
  fillHab();fillMoves();$('habd').value=cur.habd;$('nivel').value=cur.nivel;$('cap').value=cur.cap;
  STATS.forEach(s=>{document.querySelector(`[data-b="${s.k}"]`).value=cur.base[s.k];const e=document.querySelector(`[data-e="${s.k}"]`);if(e)e.value=cur.ev[s.k]});
  $('sync').checked=cur.sync;$('fsel').disabled=cur.sync;
  fillFormulas();
}
function fillFormulas(){
  ['hp','mp','stat'].forEach(c=>{const ta=document.querySelector(`[data-f="${c}"]`);ta.value=fval(c);status(c)});
}
function status(c){
  const r=compile(fval(c)),el=document.querySelector(`[data-st="${c}"]`);
  el.textContent=r.ok?'✓ Válida':'✕ Inválida';el.className='badge '+(r.ok?'okc':'bdc');
  el.title=r.ok?'':r.err;
  const ta=document.querySelector(`[data-f="${c}"]`);ta.classList.toggle('bad',!r.ok);
  let m=ta.parentNode.querySelector('.err');
  if(!r.ok){if(!m){m=document.createElement('p');m.className='err bdc hint';ta.after(m)}m.textContent=r.err}else if(m)m.remove();
}
function totalE(){return STATS.reduce((a,s)=>a+(s.k==='mp'?0:+cur.ev[s.k]||0),0)}
function refresh(){if(window.retRefresh)retRefresh();
  const N=cur.nivel;
  STATS.forEach(s=>{
    const B=+cur.base[s.k]||0,E=s.k==='mp'?0:(+cur.ev[s.k]||0),raw=calc(cur.f[s.k],B,N,E);
    const val=document.querySelector(`[data-v="${s.k}"]`),bar=document.querySelector(`[data-bar="${s.k}"]`),tier=document.querySelector(`[data-t="${s.k}"]`),brk=document.querySelector(`[data-brk="${s.k}"]`);
    const ei=document.querySelector(`[data-e="${s.k}"]`);if(ei)ei.classList.toggle('bad',E>MAX_E);
    if(isNaN(raw)){val.textContent='—';bar.style.width='0';tier.textContent='';brk.textContent='Fórmula inválida o resultado no numérico';return}
    const pct=Math.max(0,Math.min(100,B/BMAX*100));
    const t=tierOf(B);
    val.textContent=Math.round(raw);bar.style.width=pct+'%';bar.style.background=s.c;
    tier.textContent=t[1];tier.style.color=t[2];tier.style.borderColor=t[2];
    brk.hidden=s.k!==sel;
    brk.textContent=`B=${B}  N=${N}  E=${E}  →  ${+raw.toFixed(4)}  →  ${Math.round(raw)}`;
  });
  document.querySelectorAll('.stat[data-k]').forEach(r=>r.style.background=r.dataset.k===sel?'rgba(56,189,248,.07)':'');
  const T=totalE(),cap=cur.cap,over=T>cap,ind=STATS.some(s=>s.k!=='mp'&&cur.ev[s.k]>MAX_E);
  const tot=$('tot');tot.classList.toggle('bad',over||ind);
  tot.innerHTML=`<b>Esfuerzo usado: ${T} / ${cap}</b> <span class="hint">· restante ${cap-T}</span>
    ${over?`<div class="bdc">Superas el tope global por ${T-cap} puntos.</div>`:''}
    ${ind?`<div class="bdc">Algún stat supera ${MAX_E} puntos de esfuerzo.</div>`:''}
    <div class="bar"><i style="width:${Math.min(100,cap?T/cap*100:0)}%;background:${over?'var(--bad)':'var(--cy)'}"></i></div>`;
}
function renderList(){
  $('list').innerHTML=db.length?db.filter(c=>{const q=($('lq')||{value:''}).value.toLowerCase().trim();return !q||[c.nombre,c.especie,c.hab,...(c.tipos||[])].join(' ').toLowerCase().includes(q)}).map(c=>`<div class="card ${c.id===cur.id?'act':''}" draggable="true" data-id="${c.id}">${window.retHTML?retHTML(c,52):''}<b>${esc(c.nombre||'Sin nombre')}</b>
    <div class="sub">${esc(c.especie||'—')} · Nv ${c.nivel}</div>
    <div>${c.tipos.map(t=>`<span class="chip" style="background:${tcol(t)}">${esc(t)}</span>`).join('')}</div>${window.defHTML?defHTML(c,true):''}
    ${c.hab?`<div class="hint" style="margin-top:4px">Habilidad: ${esc(c.hab)}</div>`:''}
    <div class="row" style="margin-top:8px"><button class="sm pri" data-a="load" data-id="${c.id}">Cargar</button><button class="sm am" data-a="ficha" data-id="${c.id}">Ficha</button><button class="sm" data-a="up" data-id="${c.id}" aria-label="Subir">▲</button><button class="sm" data-a="dn" data-id="${c.id}" aria-label="Bajar">▼</button><button class="sm" data-a="dup" data-id="${c.id}">Duplicar</button><button class="sm danger" data-a="del" data-id="${c.id}">Eliminar</button></div></div>`).join('')
    :'<p class="hint">Aún no hay criaturas. Completa el editor y pulsa «Guardar».</p>';
}

/* ---------- Eventos ---------- */
function bind(){
  const sync=()=>{
    cur.nombre=$('nombre').value;cur.especie=$('especie').value;
    cur.tipos=[$('t1').value,$('t2').value].filter(Boolean);
    if(cur.tipos[1]===cur.tipos[0])cur.tipos.pop();
    {const hv=$('hab').value,h=H.find(x=>x.id===hv);if(h){cur.habId=h.id;cur.hab=h.nombre}else if(hv!=='__old'){cur.habId='';cur.hab=''}}cur.habd=$('habd').value;
    cur.nivel=Math.max(1,Math.min(100,Math.round(+$('nivel').value)||1));
    cur.cap=Math.max(0,Math.min(500,Math.round(+$('cap').value)||0));
    refresh();
  };
  ['nombre','especie','t1','t2','hab','habd','nivel','cap'].forEach(id=>$(id).addEventListener('input',sync));
  ['nivel','cap'].forEach(id=>$(id).addEventListener('change',()=>{$('nivel').value=cur.nivel;$('cap').value=cur.cap}));
  $('stats').addEventListener('input',e=>{
    const t=e.target;
    if(t.dataset.b)cur.base[t.dataset.b]=Math.max(0,+t.value||0);
    if(t.dataset.e)cur.ev[t.dataset.e]=Math.max(0,Math.round(+t.value)||0);
    refresh();
  });
  const pick=e=>{const r=e.target.closest('.stat[data-k]');if(r&&e.target.tagName!=='INPUT'){sel=r.dataset.k;refresh()}};
  $('stats').addEventListener('click',pick);
  $('stats').addEventListener('keydown',e=>{if(e.key==='Enter')pick(e)});
  $('forms').addEventListener('input',e=>{
    const c=e.target.dataset.f;if(!c)return;
    setF(c,e.target.value);status(c);
    if(c==='stat'&&cur.sync)refresh();else refresh();
  });
  $('forms').addEventListener('click',e=>{
    const b=e.target.closest('[data-pre]');if(!b)return;
    setF(b.dataset.pre,PRE[b.dataset.pre][b.dataset.n]);fillFormulas();refresh();toast('Preset «'+b.dataset.n+'» aplicado');
  });
  $('forms').addEventListener('change',e=>{
    if(e.target.id==='sync'){
      cur.sync=e.target.checked;$('fsel').disabled=cur.sync;
      if(cur.sync){const s=cur.f[$('fsel').value];setF('stat',s)}
      fillFormulas();refresh();if(cur.sync)toast('Fórmula aplicada a todos los stats normales');
    }
    if(e.target.id==='fsel'){fillFormulas()}
  });
  $('new').onclick=()=>{cur=blank();fillForm();refresh();renderList()};
  $('save').onclick=()=>{
    sync();
    if(!cur.nombre.trim())return toast('Escribe un nombre para la criatura');
    for(const c of ['hp','mp','atk'])if(!compile(cur.f[c]).ok)return toast('Corrige la fórmula inválida');
    if(!Object.values(cur.f).every(f=>compile(f).ok))return toast('Corrige la fórmula inválida');
    if(totalE()>cur.cap||STATS.some(s=>s.k!=='mp'&&cur.ev[s.k]>MAX_E))return toast('Los puntos de esfuerzo superan los límites');
    const i=db.findIndex(c=>c.id===cur.id);
    if(i>=0){db[i]=clone(cur)}else{cur.id=uid();db.push(clone(cur))}
    if(persist()){toast(i>=0?'Criatura actualizada':'Criatura guardada');renderList()}
  };
  $('list').addEventListener('click',e=>{
    const b=e.target.closest('[data-a]');if(!b)return;
    const id=b.dataset.id,i=db.findIndex(c=>c.id===id);if(i<0)return;
    if(b.dataset.a==='up'||b.dataset.a==='dn'){const j=i+(b.dataset.a==='up'?-1:1);if(j>=0&&j<db.length){const [x]=db.splice(i,1);db.splice(j,0,x);persist();renderList()}return}
    if(b.dataset.a==='load'){cur=Object.assign(blank(),clone(db[i]));fillForm();refresh();renderList()}
    if(b.dataset.a==='dup'){const d=clone(db[i]);d.id=uid();d.nombre+=' (copia)';db.splice(i+1,0,d);persist();renderList();toast('Criatura duplicada')}
    if(b.dataset.a==='del'){
      if(b.dataset.armed){db.splice(i,1);if(cur.id===id)cur.id=null;persist();renderList();toast('Criatura eliminada')}
      else{b.dataset.armed=1;b.textContent='¿Seguro?';setTimeout(()=>{if(b.isConnected){delete b.dataset.armed;b.textContent='Eliminar'}},2500)}
    }
  });
  $('exp').onclick=()=>{$('json').value=JSON.stringify(db,null,2);toast('Catálogo exportado: copia el texto')};
  $('cpy').onclick=async()=>{
    if(!$('json').value)$('json').value=JSON.stringify(db,null,2);
    try{await navigator.clipboard.writeText($('json').value);toast('Copiado al portapapeles')}
    catch(e){$('json').select();toast('Selecciona y copia el texto (Ctrl+C)')}
  };
  const doImport=txt=>{
    try{
      const a=JSON.parse(txt);if(!Array.isArray(a))throw 0;
      let n=0;
      a.forEach(o=>{
        if(!o||typeof o!=='object'||!o.nombre)return;
        const c=Object.assign(blank(),o);
        if(!Array.isArray(c.tipos)||!c.tipos.length)c.tipos=['Neutro'];
        c.tipos=c.tipos.slice(0,2);c.nivel=Math.max(1,Math.min(100,+c.nivel||1));c.cap=Math.max(0,Math.min(500,+c.cap||480));delete c.crit;c.learn=Array.isArray(c.learn)?c.learn.filter(x=>typeof x==='string'):[];
        c.base=Object.assign(blank().base,c.base);c.ev=Object.assign(blank().ev,c.ev);c.f=Object.assign(blank().f,c.f);
        const i=c.id?db.findIndex(x=>x.id===c.id):-1;
        if(i>=0)db[i]=c;else{c.id=uid();db.push(c)}
        n++;
      });
      persist();renderList();toast(n+' criatura(s) importada(s)');
    }catch(e){toast('JSON no válido')}
  };
  $('imp').onclick=()=>doImport($('json').value);
  $('file').onchange=e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();r.onload=()=>{$('json').value=r.result;doImport(r.result)};r.readAsText(f);e.target.value='';
  };
}
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
function f2save(){ensureTypeIds();try{localStorage.setItem(KEY2,JSON.stringify({m:M,ro:RO,co:CO,types:TIPOS}))}catch(e){toast('No se pudo guardar la matriz')}try{rCons(true);rOfen()}catch(e){}}
function fillTypeSel(){
  const a=$('t1').value,b=$('t2').value;
  $('t1').innerHTML=TIPOS.map(t=>`<option>${esc(t[0])}</option>`).join('');
  $('t2').innerHTML='<option value="">— ninguno —</option>'+TIPOS.map(t=>`<option>${esc(t[0])}</option>`).join('');
  $('t1').value=a||'Neutro';$('t2').value=b;
  if(!$('t1').value)$('t1').selectedIndex=0;
  fillSel3();fillTE();
  $('t1').dispatchEvent(new Event('input'));
}
function renderM(){
  const cb=n=>TIPOS.length>1?`<button class="x danger" data-del="${esc(n)}" title="Quitar tipo" aria-label="Quitar ${esc(n)}">×</button>`:'';
  let h='<table class="mx"><thead><tr><th class="corner">Atac. ↓ · Def. →</th>'+CO.map(d=>`<th draggable="true" data-k="col" data-n="${esc(d)}" style="border-bottom:3px solid ${tcol(d)}">${esc(d)}${cb(d)}</th>`).join('')+'</tr></thead><tbody>';
  RO.forEach(a=>{
    h+=`<tr><th class="rh" draggable="true" data-k="row" data-n="${esc(a)}" style="border-left:3px solid ${tcol(a)}">${esc(a)}${cb(a)}</th>`+CO.map(d=>{const v=gv(a,d);
      return `<td class="${cls(v)}" data-a="${esc(a)}" data-d="${esc(d)}"><select aria-label="${esc(a)} contra ${esc(d)}">${[2,1,.5,0].map(x=>`<option value="${x}"${x===v?' selected':''}>×${x}</option>`).join('')}</select></td>`}).join('')+'</tr>';
  });
  $('mx').innerHTML=h+'</tbody></table>';
}
function f2init(){
  renderM();
  const mx=$('mx');
  mx.addEventListener('change',e=>{
    const td=e.target.closest('td');if(!td)return;
    const v=parseFloat(e.target.value),k=td.dataset.a+'>'+td.dataset.d;
    if(v===1)delete M[k];else M[k]=v;
    td.className=cls(v);f2save();
  });
  mx.addEventListener('click',e=>{
    const b=e.target.closest('[data-del]');if(!b)return;
    const n=b.dataset.del,i=TIPOS.findIndex(t=>t[0]===n);if(i<0||TIPOS.length<2)return;
    TIPOS.splice(i,1);RO=RO.filter(x=>x!==n);CO=CO.filter(x=>x!==n);
    Object.keys(M).forEach(k=>{if(k.split('>').includes(n))delete M[k]});
    f2save();fillTypeSel();renderM();toast('Tipo «'+n+'» eliminado');
  });
  mx.addEventListener('dragstart',e=>{const t=e.target.closest('th[draggable]');if(!t)return;drag={k:t.dataset.k,n:t.dataset.n};e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',t.dataset.n)});
  mx.addEventListener('dragover',e=>{const t=e.target.closest('th[draggable]');if(!drag||!t||t.dataset.k!==drag.k)return;e.preventDefault();mx.querySelectorAll('.over').forEach(x=>x.classList.remove('over'));t.classList.add('over')});
  mx.addEventListener('drop',e=>{
    const t=e.target.closest('th[draggable]');if(!drag||!t||t.dataset.k!==drag.k)return;e.preventDefault();
    const arr=drag.k==='row'?RO:CO,i=arr.indexOf(drag.n),j=arr.indexOf(t.dataset.n);
    if(i>=0&&j>=0&&i!==j){arr.splice(i,1);arr.splice(j,0,drag.n);f2save();renderM()}
    drag=null;
  });
  mx.addEventListener('dragend',()=>{drag=null;mx.querySelectorAll('.over').forEach(x=>x.classList.remove('over'))});
  $('mord').onclick=()=>{const n=TIPOS.map(t=>t[0]);RO=n.slice();CO=n.slice();f2save();renderM();toast('Orden restablecido')};
  $('mreset').onclick=e=>{
    const b=e.currentTarget;
    if(b.dataset.armed){M={};delete b.dataset.armed;b.textContent='Restablecer todo a ×1';f2save();renderM();toast('Matriz restablecida a ×1')}
    else{b.dataset.armed=1;b.textContent='¿Seguro? Pulsa otra vez';setTimeout(()=>{if(b.dataset.armed){delete b.dataset.armed;b.textContent='Restablecer todo a ×1'}},2500)}
  };
  $('tadd').onclick=()=>{
    const n=$('tn').value.replace(/[<>&"'>]/g,'').trim();
    if(!n)return toast('Escribe el nombre del tipo');
    if(TIPOS.some(t=>t[0].toLowerCase()===n.toLowerCase()))return toast('Ese tipo ya existe');
    TIPOS.push([n,$('tc').value]);RO.push(n);CO.push(n);$('tn').value='';
    f2save();fillTypeSel();renderM();toast('Tipo «'+n+'» añadido');
  };
  $('tn').addEventListener('keydown',e=>{if(e.key==='Enter')$('tadd').click()});
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
function fillSel3(){[['at',0],['ft',1]].forEach(([id,all])=>{const e=$(id),v=e.value;e.innerHTML=(all?`<option value=''>Todos los tipos</option>`:'')+TIPOS.map(t=>`<option>${esc(t[0])}</option>`).join('');e.value=v;if(!e.value&&!all)e.value='Neutro'})}
function vis3(){
  const d=a3.cat!=='est',h=(id,x)=>$(id).classList.toggle('hid',x);
  h('rpot',!d);h('rcon',a3.cat!=='fis');h('raoe',!(d&&a3.alc==='area'));h('rreb',!(d&&a3.alc==='uni'));
  h('rb1w',a3.reb.length<1);h('rb2w',a3.reb.length<2);
  $('fxk').innerHTML=Object.keys(FXN).filter(k=>d||!['lifesteal','recoil'].includes(k)).map(k=>`<option value='${k}'>${FXN[k]}</option>`).join('');
}
function fxRow(f,i){
  const n=(fld,v,mn,mx)=>`<input type='number' min='${mn}' max='${mx}' data-i='${i}' data-f='${fld}' value='${v}'>`;
  const s=(fld,v,o,num)=>`<select data-i='${i}' data-f='${fld}'${num?' data-num=1':''}>${o.map(([x,l])=>`<option value='${x}'${String(x)===String(v)?' selected':''}>${esc(l)}</option>`).join('')}</select>`;
  const L=(t,h)=>`<div><label>${t}</label>${h}</div>`;
  let b='';
  if(f.k==='boost')b=L('Objetivo',s('t',f.t,[['rival','Rival'],['user','Usuario'],['team','Todo el equipo (usuario + aliados)'],['allies','Solo aliados (sin el usuario)'],['ua','Usuario + un aliado elegido']]))+L('Stat',s('s',f.s,ST3.map(x=>[x,x])))+L('Nivel',s('n',f.n,[-4,-3,-2,-1,1,2,3,4].map(x=>[x,(x>0?'+':'')+x+' (×'+MUL[x]+')']),1));
  if(f.k==='lifesteal')b=L('% del daño curado',n('v',f.v,1,100));
  if(f.k==='mpsteal')b=L('Modo',s('m',f.m,[['fijo','Cantidad fija'],['pct','% del maná rival'],['dmg','% del daño real infligido']]))+L(f.m==='dmg'?'% del daño real':'Cantidad',n('v',f.v,1,f.m==='dmg'?100:999))+(f.m==='dmg'?L('Límite de MP por golpe',n('c',f.c||50,1,999)):'');
  if(f.k==='guard')b=L('Objetivo',s('t',f.t,[['one','Único (aliado elegido en combate)'],['team','Todo el equipo en el campo']]))+L('Daño que reduce',s('d',f.d||'all',[['all','Todo el daño recibido'],['fis','Daño físico'],['mag','Daño mágico'],['cont','Daño por contacto'],['area','Daño de área']]))+L('% de daño reducido (solo ese turno)',n('v',f.v,1,100));
  if(f.k==='pivot')b=L('Boosteos del usuario al salir',s('keep',String(f.keep||'0'),[['0','Los pierde (como Cambiar)'],['1','Los conserva']]));
  if(f.k==='recoil')b=L('Base',s('b',f.b,[['dmg','% del daño infligido'],['hp','% de vida máxima']]))+L('Porcentaje',n('v',f.v,1,100));
  if(f.k==='status')b=L('Estado',s('e',f.e,ESTADOS.map(x=>[x,x])));
  if(f.k==='trap')b=L('Turnos sin poder retirarse (3 a 5)',n('turns',f.turns,3,5));
  return `<div class='fx'><div class='row' style='justify-content:space-between'><b>${FXN[f.k]}</b><button class='sm danger' data-del='${i}'>Quitar</button></div><div class='gp'>${L('Probabilidad %',n('p',f.p,1,100))}${b}</div></div>`;
}
function renderFx(){$('fxl').innerHTML=a3.fx.length?a3.fx.map(fxRow).join(''):`<p class='hint'>Sin efectos secundarios.</p>`}
function fill3(){
  fillSel3();
  $('an').value=a3.nombre;$('ad').value=a3.desc;$('at').value=a3.tipo;$('amp').value=a3.mp;$('apr').value=a3.prio||0;$('acr').value=CRIT[a3.crit]?a3.crit:'bajo';$('ac').value=a3.cat;$('ap').value=a3.pot;$('aa').value=a3.alc;$('aaoe').value=a3.aoe;
  $('acon').checked=!!a3.con;$('rbn').value=a3.reb.length;$('rb1').value=a3.reb[0]??75;$('rb2').value=a3.reb[1]??50;
  vis3();renderFx();
}
function fillMoves(){if(!Array.isArray(cur.atk))cur.atk=[];while(cur.atk.length<5)cur.atk.push('');cur.atk=cur.atk.slice(0,5).map(v=>A.some(m=>m.id===v)?v:'');const e=$('mvs');if(!e)return;e.innerHTML=cur.atk.map((v,i)=>`<div><label>Ataque ${i+1}</label><select data-mv='${i}'><option value=''>— vacío —</option>${A.map(m=>`<option value='${m.id}'${m.id===v?' selected':''}>${esc(m.nombre)} · ${esc(m.tipo)} · ${m.mp} MP</option>`).join('')}</select></div>`).join('')}
function cleanHP(){try{A.forEach(a=>{a.fx=(a.fx||[]).filter(f=>!(f.k==='boost'&&f.s==='HP'))})}catch(e){}try{H.forEach(h=>{h.fx=(h.fx||[]).filter(f=>!((f.k==='low'||f.k==='dbl')&&f.s==='HP'))})}catch(e){}}
function list3(){cleanHP();fillMoves();
  const q=$('fq').value.toLowerCase(),c=$('fc').value,t=$('ft').value,al=$('fa').value;
  const r=A.filter(a=>(!q||(a.nombre+' '+a.desc).toLowerCase().includes(q))&&(!c||a.cat===c)&&(!t||a.tipo===t)&&(!al||a.alc===al));
  $('l3').innerHTML=r.length?r.map(a=>`<div class='card ${a.id===a3.id?'act':''}'><b>${esc(a.nombre)}</b>
    <div class='sub'><span class='chip' style='background:${tcol(a.tipo)}'>${esc(a.tipo)}</span>${CATN[a.cat]}${a.con?' (contacto)':''}${a.cat==='fis'?' [ATK vs DEF; ignora MATK/MDEF]':a.cat==='mag'?' [MATK vs MDEF; ignora ATK/DEF]':' [sin daño]'} · ${a.alc==='area'?`Área (${a.aoe}% con 2+)`:'Único'} · ${a.mp} MP${a.prio?' · Prio '+(a.prio>0?'+':'')+a.prio:''}${a.cat==='est'?'':' · Pot '+a.pot+' · Crít. '+(CRITN[a.crit]||CRITN.bajo)}${a.reb&&a.reb.length?' · Rebote '+a.reb.join('% / ')+'%':''}</div>
    ${a.desc?`<div class='hint'>${esc(a.desc)}</div>`:''}
    ${(a.fx||[]).map(f=>`<div class='hint'>• ${esc(fxTxt(f))}</div>`).join('')}
    <div class='row' style='margin-top:8px'><button class='sm pri' data-a3='edit' data-id='${a.id}'>Editar</button><button class='sm' data-a3='dup' data-id='${a.id}'>Duplicar</button><button class='sm danger' data-a3='del' data-id='${a.id}'>Eliminar</button></div></div>`).join(''):`<p class='hint'>${A.length?'Ningún ataque coincide con los filtros.':'Aún no hay ataques. Completa el formulario y pulsa «Guardar ataque».'}</p>`;
}
function f3init(){
  fill3();list3();
  $('f3form').addEventListener('input',e=>{
    const id=e.target.id,v=e.target.value;
    if(id==='acon')a3.con=e.target.checked;else if(id==='an')a3.nombre=v;else if(id==='ad')a3.desc=v;else if(id==='at')a3.tipo=v;
    else if(id==='amp')a3.mp=+v;else if(id==='apr')a3.prio=+v;else if(id==='acr')a3.crit=v;else if(id==='ap')a3.pot=+v;else if(id==='aaoe')a3.aoe=+v;
    else if(id==='ac'){a3.cat=v;if(v!=='fis'){a3.con=false;$('acon').checked=false}if(v==='est'){a3.reb=[];a3.pot=0;a3.fx=a3.fx.filter(f=>f.k!=='lifesteal'&&f.k!=='recoil');$('rbn').value=0}else if(!a3.pot){a3.pot=60;$('ap').value=60}vis3();renderFx()}
    else if(id==='aa'){a3.alc=v;if(v==='area'){a3.reb=[];$('rbn').value=0}vis3()}
    else if(id==='rbn'){a3.reb=[+$('rb1').value||75,+$('rb2').value||50].slice(0,+v);vis3()}
    else if(id==='rb1'||id==='rb2'){a3.reb=[+$('rb1').value,+$('rb2').value].slice(0,a3.reb.length)}
  });
  $('fxl').addEventListener('input',e=>{const t=e.target,f=a3.fx[t.dataset.i];if(!f)return;f[t.dataset.f]=(t.type==='number'||t.dataset.num)?+t.value:t.value;if(t.tagName==='SELECT')renderFx()});
  $('fxl').addEventListener('change',e=>{const t=e.target,f=a3.fx[t.dataset.i];if(f&&f.k==='trap'&&t.dataset.f==='turns'){f.turns=Math.max(3,Math.min(5,Math.round(+t.value)||3));t.value=f.turns}});
  $('fxl').addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(b){a3.fx.splice(+b.dataset.del,1);renderFx()}});
  $('fxadd').onclick=()=>{a3.fx.push(FXNEW[$('fxk').value]());renderFx()};
  $('a3new').onclick=()=>{a3=blank3();fill3();list3()};
  $('a3save').onclick=()=>{
    const a=a3;
    if(!a.nombre.trim())return toast('Escribe el nombre del ataque');
    if(!(a.mp>=0))return toast('El consumo de maná debe ser 0 o más');
    if(a.cat!=='est'&&!(a.pot>0))return toast('La potencia debe ser mayor que 0');
    const cl=(x,lo,hi)=>Math.max(lo,Math.min(hi,Math.round(+x)||lo));
    a.crit=CRIT[a.crit]?a.crit:'bajo';a.mp=cl(a.mp,0,9999);a.prio=Math.max(-3,Math.min(3,Math.round(+a.prio)||0));if(a.cat!=='fis')a.con=false;a.pot=a.cat==='est'?0:cl(a.pot,1,999);a.aoe=cl(a.aoe,1,100);a.reb=a.reb.map(x=>cl(x,1,100));
    a.fx.forEach(f=>{f.p=cl(f.p,1,100);if('v' in f)f.v=cl(f.v,1,999);if(f.k==='trap')f.turns=cl(f.turns,3,5)});
    const i=A.findIndex(x=>x.id===a.id);
    if(i>=0)A[i]=clone(a);else{a.id=uid();A.push(clone(a))}
    if(save3s()){toast(i>=0?'Ataque actualizado':'Ataque guardado');fill3();list3()}
  };
  $('l3').addEventListener('click',e=>{
    const b=e.target.closest('[data-a3]');if(!b)return;
    const id=b.dataset.id,i=A.findIndex(x=>x.id===id);if(i<0)return;
    if(b.dataset.a3==='edit'){a3=Object.assign(blank3(),clone(A[i]));fill3();list3();$('f3form').scrollIntoView({behavior:'smooth'})}
    if(b.dataset.a3==='dup'){const d=clone(A[i]);d.id=uid();d.nombre+=' (copia)';A.splice(i+1,0,d);save3s();list3();toast('Ataque duplicado')}
    if(b.dataset.a3==='del'){
      if(b.dataset.armed){A.splice(i,1);if(a3.id===id)a3.id=null;save3s();list3();toast('Ataque eliminado')}
      else{b.dataset.armed=1;b.textContent='¿Seguro?';setTimeout(()=>{if(b.isConnected){delete b.dataset.armed;b.textContent='Eliminar'}},2500)}
    }
  });
  ['fq','fc','ft','fa'].forEach(id=>$(id).addEventListener('input',list3));
  $('e3').onclick=()=>{$('j3').value=JSON.stringify(A,null,2);toast('Catálogo exportado: copia el texto')};
  $('c3').onclick=async()=>{if(!$('j3').value)$('j3').value=JSON.stringify(A,null,2);try{await navigator.clipboard.writeText($('j3').value);toast('Copiado al portapapeles')}catch(e){$('j3').select();toast('Selecciona y copia el texto (Ctrl+C)')}};
  const imp=txt=>{try{
    const arr=JSON.parse(txt);if(!Array.isArray(arr))throw 0;let n=0;
    arr.forEach(o=>{if(!o||!o.nombre)return;const a=Object.assign(blank3(),o);
      if(!CATN[a.cat])a.cat='fis';if(a.cat==='est')a.pot=0;if(a.alc!=='area')a.alc='uni';
      a.reb=Array.isArray(a.reb)?a.reb.slice(0,2):[];a.fx=Array.isArray(a.fx)?a.fx.filter(f=>f&&FXNEW[f.k]):[];a.fx.forEach(f=>{if(f.k==='trap')f.turns=Math.max(3,Math.min(5,Math.round(+f.turns)||3))});
      const i=a.id?A.findIndex(x=>x.id===a.id):-1;if(i>=0)A[i]=a;else{a.id=uid();A.push(a)}n++});
    save3s();list3();toast(n+' ataque(s) importado(s)');
  }catch(e){toast('JSON no válido')}};
  $('i3').onclick=()=>imp($('j3').value);
  $('f3file').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$('j3').value=r.result;imp(r.result)};r.readAsText(f);e.target.value=''};
}
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
function lg(m,c,tu){if(!S)return;if(LGMODE){if(LGMODE.cap)LGMODE.cap.push(m);return}const d=document.createElement('div');d.className=c||'';d.textContent=m;$('lg4').appendChild(d);$('lg4').scrollTop=1e9;if(S.tl)S.tl.push({m,c:c||'',tg:tu&&tu.side!=null?[tu.side,S.t[tu.side].indexOf(tu)]:null,sn:snap()})}
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
function enter(f){f._in=1;f.ab.forEach(x=>{if(x.k==='wea'&&WEA[x.w]&&S.w!==x.w){S.w=x.w;if($('w4b')&&!AIX)$('w4b').value=S.w;lg(`${f.nm} (${f.abn}) invoca ${WEA[x.w].n}`,'t')}if(x.k==='trap'&&x.w==='enter'){alive(f.side===0?1:0).forEach(r=>{if(r.prot)return;if(rng()*100>=x.p)return lg(`  (Habilidad de ${f.nm}: trampa ${x.p}% no se activa)`,'calc');if(r.trap>0)return;r.trap=x.turns;r._trapNew=true;lg(`${f.nm} (${f.abn}) atrapa a ${r.nm}: no podrá retirarse durante ${x.turns} turnos`,'t')})}if(x.k==='int'&&['ATK','DEF','MATK','MDEF','SPD'].includes(x.s)){const s=f.side,pos=S.a[s].indexOf(S.t[s].indexOf(f)),fo=alive(1-s);const g=x.w==='front'?fo.filter(r=>S.a[1-s].indexOf(S.t[1-s].indexOf(r))===pos):x.w==='rand'?(fo.length?[fo[Math.floor(rng()*fo.length)]]:[]):fo;lg(`${f.nm} (${f.abn}) reduce ${x.s} rival al entrar`,'t');if(!g.length)lg('  Sin rival objetivo');g.forEach(r=>boost(r,x.s,-Math.abs(+x.n||1)))}})}
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
  const c=document.querySelector(`.fc[data-s='${s}'][data-p='${pos}']`);if(!c)return null;
  const v=k=>{const e=c.querySelector(`[data-k=${k}]`);return e?e.value:''};
  return {t:v('act'),m:v('m'),tg:v('tg'),it:v('it'),ia:v('ia'),sw:v('sw'),pv:v('pv')};
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
  if(AIX||LGMODE||S.fast||!S.tl)arena();else playTL(S.tls);
}
function card(s,pos){
  const ti=S.a[s][pos],f=S.t[s][ti],pc=(a,b)=>Math.max(0,Math.round(a/b*100)),hp=pc(f.hp,f.maxhp),col=hp>50?'#22c55e':hp>20?'#f59e0b':'#ef4444';
  const o=(v,l,sl)=>`<option value='${v}'${sl?' selected':''}>${esc(l)}</option>`;
  let h=`<div class='fc${f.ko?' ko':''}' data-s='${s}' data-p='${pos}' data-act='${A.length?'atk':(f.cd>0?'rc':'pr')}'><div class='row' style='justify-content:space-between'><b>${window.retHTML?retHTML(f.cid,34):''} ${esc(f.nm)}</b><span>${f.tipos.map(t=>`<span class='chip' style='background:${tcol(t)}'>${esc(t)}</span>`).join('')}</span></div>
  <div class='hint'>Nv ${f.N}${f.abn?' · Hab: '+esc(f.abn):''}</div>
  <div class='hint'>MP ${f.mp}/${f.maxmp}${f.mv.some(m=>f.mp>=cost(f,m))?'':' · Sin MP: Guardia, Recuperar o Esfuerzo desesperado'}</div>`;
  if(!f.ko&&!S.over){
    const tg=[1-s,s].flatMap((ss,k)=>S.a[ss].filter(i=>!S.t[ss][i].ko).map((i,j)=>o(ss+':'+i,`${ss===s?'Aliado':'Rival'}: ${S.t[ss][i].nm}`,k===0&&j===0))).join('');
    const al=S.a[s].filter(i=>!S.t[s][i].ko).map(i=>o(i,S.t[s][i].nm)).join('');
    const bn=S.t[s].map((b,i)=>[b,i]).filter(([b,i])=>!b.ko&&!S.a[s].includes(i)).map(([b,i])=>o(i,`${b.nm} (${b.hp}/${b.maxhp})`)).join('');
    h+=`<select data-k='act' aria-label='Acción'>${A.length?o('atk','Atacar'):''}${f.cd>0?'':o('pr',`Guardia nivel ${Math.min(3,(f.prot?f.gc:0)+1)} (−${[90,50,20][Math.min(3,(f.prot?f.gc:0)+1)-1]}%) (+4)`)}${o('rc','Recuperar maná (último)')}${o('it','Mochila (+5)')}${f.trap>0?'':o('sw','Cambiar (+7)')}</select>
    <div class='cc c-atk'><select data-k='m' aria-label='Ataque'>${f.mv.map(m=>{const ok=f.mp>=cost(f,m);return `<option value='${m.id}'${ok?'':' disabled'}>${esc(m.nombre)} · ${cost(f,m)} MP · ${m.alc==='area'?'Área':'Único'}${ok?'':' (sin maná)'}</option>`}).join('')}${canAtk(f)?'':`<option value='${DESP.id}' selected>Esfuerzo desesperado · 0 MP · −10% de vida</option>`}</select><select data-k='tg' aria-label='Objetivo' style='margin-top:4px'>${tg}</select><div class='pvw' style='${(f.mv[0]&&(f.mv[0].fx||[]).some(x=>x.k==='pivot'))?'':'display:none'}'><div class='hint'>Pivote a:</div><select data-k='pv' aria-label='Pivote a'>${bn}</select></div></div>
    <div class='cc c-it'><select data-k='it' aria-label='Objeto'>${Object.keys(BAG0).filter(k=>S.bag[s][k]>0).map(k=>o(k,`${k} (${S.bag[s][k]})`)).join('')}</select><select data-k='ia' aria-label='Sobre' style='margin-top:4px'>${al}</select></div>
    <div class='cc c-sw'><select data-k='sw' aria-label='Banca'>${bn}</select></div>`;
  }
  return h+'</div>';
}
/* ---------- Arena visual 3v3 ---------- */
const snap=()=>({n:S.n,w:S.w,a:S.a.map(q=>q.slice()),u:S.t.map(t=>t.map(f=>({hp:f.hp,mx:f.maxhp,mp:f.mp,mm:f.maxmp,ko:f.ko,st:f.status,bo:Object.assign({},f.bo),tr:f.trap,gc:f.gc,cd:f.cd,pr:f.prot,rc:f.rcv})))});
const STCOL={'Quemadura':'#e0592a','Parálisis':'#d9b43a','Intoxicación':'#9a4fd0','Congelación':'#4aa8e0','Maldición':'#6b3fa0','Sangrado':'#b5303a'};
let VEL='normal',pbSkip=false,STEP=false;try{VEL=localStorage.getItem('rpg_vel')||'normal'}catch(e){}
const velK=()=>({lento:1.6,normal:1,rapido:.45,ins:0})[VEL]??1;
const actLbl=(u,a)=>a.t==='atk'?(a.m===DESP.id?DESP.nombre:((u.mv.find(m=>m.id===a.m)||{}).nombre||'Ataque')):({pr:'Guardia',rc:'Recuperar',it:'Mochila',sw:'Cambiar',em:DESP.nombre})[a.t]||a.t;
const tieMark=L=>L.forEach((o,k)=>{const n=L[k+1],p=L[k-1];o.tie=!!((n&&n.p===o.p&&n.spd===o.spd)||(p&&p.p===o.p&&p.spd===o.spd))});
function renderOrd(list,title,hl){const b=$('ordbar');if(!b)return;b.innerHTML=list.length?`<div class='ordt'>${title}</div><div class='ordl'>${list.map((o,k)=>{const f=S.t[o.s][o.i];return `<div class='oi s${o.s}${hl===k?' on':''}${hl>k?' dn':''}'>${window.retHTML?retHTML(f.cid,28):''}<span><b>${esc(f.nm)}</b><small>${esc(o.l)} · prio ${o.p>0?'+':''}${o.p} · VEL ${o.spd}${o.tie?' ≈':''}</small></span></div>`}).join('<i class="oar">›</i>')}</div>`:''}
function previewOrder(){
  const L=[];[0,1].forEach(s=>S.a[s].forEach((ti,pos)=>{const u=S.t[s][ti];if(u.ko)return;const a=readAct(s,pos);if(!a)return;let t=a.t,m=a.m;if(t==='em'){t='atk';m=DESP.id}
    const mv=u.mv.find(x=>x.id===m)||(m===DESP.id?DESP:{}),first=u.first?Math.min(3,u.ab.reduce((q,f)=>q+(f.k==='pri'?f.v:0),0)):0;
    L.push({s,i:ti,l:actLbl(u,{t,m}),p:(PRI[t]||0)+(t==='atk'?Math.max(-3,Math.min(3,(mv.prio||0)+first)):0),spd:Math.round(eff(u,'spd'))})}));
  L.sort((x,y)=>y.p-x.p||y.spd-x.spd);tieMark(L);return L}
function renderPreview(){if(!S||!$('ordbar'))return;if(S.cpu!=null||S.gate){$('ordbar').innerHTML='';return}if(S.over||S.busy){if(S.over)$('ordbar').innerHTML='';return}renderOrd(previewOrder(),'Orden estimado del próximo turno · ≈ empate (se resuelve al azar)',-1)}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const SLOTS={};
function chipsHTML(st){
  let h='';
  if(st.st)h+=`<span class='achip' style='background:${STCOL[st.st]||'#a16207'}'>${esc(st.st)}</span>`;
  Object.entries(st.bo).forEach(([k,v])=>{if(v)h+=`<span class='achip ${v>0?'up':'dn'}'>${k} ${v>0?'▲':'▼'}${Math.abs(v)}</span>`});
  if(st.tr>0)h+=`<span class='achip trap' title='No puede ser retirada'>Atrapado ${st.tr}</span>`;
  if(st.rc)h+=`<span class='achip rc'>Recargando</span>`;
  if(st.pr||st.cd>0){const g=st.gc||0;h+=`<span class='achip gd' title='Guardia consecutiva'>Guardia ${[0,1,2].map(i=>`<i class='${i<(st.cd>0?3:g)?'on':''}'></i>`).join('')}${st.cd>0?' reposo':(g<3?' sig. −'+[90,50,20][g]+'%':'')}</span>`}
  return h;
}
function tileHTML(s,i){
  const f=S.t[s][i];
  return `<div class='atl' data-s='${s}' data-i='${i}'><div class='atp'>${window.retHTML?retHTML(f.cid,64):''}</div><div class='atb'>
    <div class='atn'><b>${esc(f.nm)}</b><span class='atv'>Nv ${f.N}</span>${f.tipos.map(t=>`<span class='chip' style='background:${tcol(t)}'>${esc(t)}</span>`).join('')}</div>
    <div class='tbar hp'><i></i><span></span></div><div class='tbar mp'><i></i><span></span></div><div class='atf'></div></div></div>`;
}
function setTile(el,st){
  const hp=Math.max(0,Math.round(st.hp/st.mx*100)),mp=Math.max(0,Math.round(st.mp/st.mm*100));
  el.querySelector('.hp i').style.width=hp+'%';el.querySelector('.hp span').textContent=`HP ${st.hp}/${st.mx}`;
  el.querySelector('.mp i').style.width=mp+'%';el.querySelector('.mp span').textContent=`MP ${st.mp}/${st.mm}`;
  el.classList.toggle('lowhp',st.hp>0&&hp<=20);el.classList.toggle('ko',!!st.ko);
  el.querySelector('.atf').innerHTML=chipsHTML(st);
}
function floatTxt(el,txt,cls){if(!el)return;const d=document.createElement('div');d.className='flt '+(cls||'');d.textContent=txt;el.appendChild(d);setTimeout(()=>d.remove(),1300)}
function benchHTML(s,sn){
  return S.t[s].map((f,i)=>[f,i]).filter(([f,i])=>!sn.a[s].includes(i)).map(([f,i])=>{const st=sn.u[s][i];return `<div class='abi${st.ko?' ko':''}' title='${esc(f.nm)} · HP ${st.hp}/${st.mx}'>${window.retHTML?retHTML(f.cid,34):''}<div class='tbar hp mini'><i style='width:${Math.round(st.hp/st.mx*100)}%'></i></div></div>`}).join('')||`<span class='hint'>Sin banca</span>`;
}
function paintCenter(sn){const w=WEA[sn.w];$('arc').innerHTML=`<div class='arT'>Turno ${sn.n}</div><div class='arW'>${w?esc(w.n):'Despejado'}</div><div class='arV'>VS</div>`}
function paintAll(){
  if(!S||!$('arv'))return;const sn=snap();
  [0,1].forEach(s=>{
    const box=$('sl'+s);box.innerHTML='';SLOTS[s]=[];
    sn.a[s].forEach((i,p)=>{const w=document.createElement('div');w.innerHTML=tileHTML(s,i);const el=w.firstChild;el.classList.add('in');box.appendChild(el);setTile(el,sn.u[s][i]);SLOTS[s][p]={el,i}});
    $('bn'+s).innerHTML=benchHTML(s,sn);
  });
  paintCenter(sn);S.prevSn=sn;$('an0').textContent=pn(0);$('an1').textContent=pn(1);
}
function applySnap(sn,prev,e,quick){
  if(!prev)prev=sn;
  [0,1].forEach(s=>{
    sn.a[s].forEach((i,p)=>{
      let sl=SLOTS[s][p];
      if(!sl||sl.i!==i){
        const old=sl&&sl.el,mk2=()=>{const w=document.createElement('div');w.innerHTML=tileHTML(s,i);const el=w.firstChild;el.classList.add('in');if(old&&old.parentNode)old.replaceWith(el);else $('sl'+s).appendChild(el);SLOTS[s][p]={el,i};setTile(el,sn.u[s][i])};
        if(old&&!quick){old.classList.add('out');setTimeout(mk2,260)}else mk2();
        return;
      }
      const el=sl.el,a=sn.u[s][i],b=(prev.u[s]||[])[i]||a;
      if(!quick){
        if(a.hp<b.hp){el.classList.remove('hit');void el.offsetWidth;el.classList.add('hit');floatTxt(el,'−'+(b.hp-a.hp),'dmg')}
        else if(a.hp>b.hp){el.classList.remove('heal');void el.offsetWidth;el.classList.add('heal');floatTxt(el,'+'+(a.hp-b.hp),'heal')}
        if(a.mp>b.mp)floatTxt(el,'+'+(a.mp-b.mp)+' MP','mpf');
        if(a.st&&a.st!==b.st)floatTxt(el,a.st,'stf');
        Object.keys(a.bo).forEach(k=>{if(a.bo[k]!==b.bo[k])floatTxt(el,`${k} ${a.bo[k]>b.bo[k]?'▲':'▼'}`,a.bo[k]>b.bo[k]?'up':'dn')});
        if(a.tr>0&&!(b.tr>0))floatTxt(el,'¡Atrapado!','stf');
        if(a.ko&&!b.ko)el.classList.add('ko');
      }
      setTile(el,a);
    });
    $('bn'+s).innerHTML=benchHTML(s,sn);
  });
  if(e&&e.tg&&!quick){const sl=(SLOTS[e.tg[0]]||[]).find(x=>x&&x.i===e.tg[1]);if(sl){const m={'eff+':['¡Súper eficaz!','sup'],'eff-':['Poco eficaz','res'],'eff0':['Sin efecto','nul'],'crit':['¡CRÍTICO!','crt']}[e.c];if(m)floatTxt(sl.el,m[0],m[1])}}
  paintCenter(sn);
}
const showMsg=t=>{const m=$('msg4');m.textContent=t;m.classList.remove('pop');void m.offsetWidth;m.classList.add('pop')};
function entryMs(e){
  if(/pierde \d+ HP/.test(e.m))return 520;
  if(e.c==='eff+'||e.c==='eff-'||e.c==='eff0'||e.c==='crit')return 650;
  if(e.c==='ko'||/se debilita/.test(e.m))return 950;
  if(e.c==='t')return 700;
  return 780;
}
async function playTL(from){
  S.busy=true;pbSkip=false;$('run4').disabled=true;$('ords4').classList.add('hid');$('skip4').classList.remove('hid');
  try{
    let prev=S.prevSn||snap();const tl=S.tl,quickAll=VEL==='ins'&&!STEP;if(S.order)renderOrd(S.order,'Orden de este turno',-1);
    for(let k=from;k<tl.length;k++){
      const e=tl[k];if(e.c==='calc')continue;
      if(e.c==='act'){document.querySelectorAll('#ordbar .oi').forEach((el,q)=>{el.classList.toggle('on',q===e.k);el.classList.toggle('dn',q<e.k)});continue}
      if(pbSkip||quickAll)break;
      if(e.fx==='end')alertSfx();showMsg(e.m.trim());applySnap(e.sn,prev,e,false);prev=e.sn;musicCheck(e.sn,false);
      if(STEP&&!pbSkip){$('next4').classList.remove('hid');await new Promise(r=>{S.nx=r});$('next4').classList.add('hid')}else await wait(entryMs(e)*velK());
    }
    const fin=snap();applySnap(fin,prev,null,pbSkip||quickAll);S.prevSn=fin;
    const last=tl.slice(from).filter(e=>e.c!=='calc').pop();if(last&&(pbSkip||quickAll))showMsg(last.m.trim());
  }finally{S.busy=false;$('skip4').classList.add('hid');$('ords4').classList.remove('hid');arena(true);finDlg()}
}
function finDlg(){
  if(!S||!S.over)return;
  const d0=S.t[0].every(f=>f.ko),d1=S.t[1].every(f=>f.ko);
  $('fin4t').textContent=d0&&d1?'¡Empate!':`¡Victoria de ${pn(d0?1:0)}!`;
  $('fin4s').textContent=d0&&d1?'Ambos equipos quedaron sin criaturas.':`${pn(d0?0:1)} se quedó sin criaturas · ${S.n} turno(s)`;
  $('fin4').classList.remove('hid');
}

const halfEnd=arr=>{const n=arr.length,al=arr.filter(x=>!x.ko);return al.length>0&&n-al.length>=Math.floor(n/2)&&al.some(x=>x.hp<=x.mx*.5)};
const nearEnd=sn=>sn.u.some(t=>t.every(x=>x.ko))||sn.u.some(halfEnd);
const liveEnd=()=>{if(!S)return null;const r=[0,1].filter(s=>halfEnd(S.t[s].map(f=>({ko:f.ko,hp:f.hp,mx:f.maxhp}))));if(!r.length)return null;if(r.length===1)return r[0];const fr=s=>S.t[s].reduce((q,f)=>q+f.hp,0)/S.t[s].reduce((q,f)=>q+f.maxhp,0);return fr(0)<=fr(1)?0:1};
const goTxt=(s,nm)=>S&&S.endLoser===s?['¡Ánimo, '+nm+'! ¡Tú puedes!','¡Todo depende de ti, '+nm+'!','¡'+nm+', aún no termina! ¡Con todo!'][(S.n+nm.length)%3]:'¡Adelante, '+nm+'!';
function alertSfx(){try{if(window.rpgLab&&rpgLab.sfx&&!rpgLab.sfx().on)return;const v=window.rpgVol&&rpgVol.sfx!=null?rpgVol.sfx:.5,C=new(window.AudioContext||window.webkitAudioContext)(),t0=C.currentTime;[[660,0],[495,.16],[330,.32]].forEach(([f,d])=>{const o=C.createOscillator(),g=C.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(0,t0+d);g.gain.linearRampToValueAtTime(.3*v,t0+d+.02);g.gain.exponentialRampToValueAtTime(.001,t0+d+.28);o.connect(g);g.connect(C.destination);o.start(t0+d);o.stop(t0+d+.3)});setTimeout(()=>{try{C.close()}catch(e){}},900)}catch(e){}}
const musicSet=k=>{try{window.rpgMusic&&rpgMusic.set(k)}catch(e){}};
const musicCheck=(sn,rev)=>{if(nearEnd(sn))musicSet('ultimo');else if(rev)musicSet('combate')};
function renderInsp(){
  const el=$('insl');if(!el||!S||!S.calcs)return;
  const all=$('insf').value==='all',mx=S.calcs.reduce((q,c)=>Math.max(q,c.t),0),L=S.calcs.filter(c=>all||c.t===mx).slice(-80);
  el.innerHTML=L.length?L.map(c=>`<details class='inr'><summary>T${c.t} · ${esc(c.u)} → ${esc(c.g)} · ${esc(c.m)}: <b>${c.d}</b>${c.crit?' · ⚡ crítico':''}${c.ty>1?' · súper eficaz':c.ty>0&&c.ty<1?' · poco eficaz':c.ty===0?' · sin efecto':''}</summary><div class='ins'>
    <div>Base = ((${c.N}+5) · √(${c.A}/${c.D}) · (${c.pot}+30)) / 15 + 1 = <b>${c.base.toFixed(2)}</b></div>
    <div>${c.fis?'ATK':'MATK'} del atacante ${c.A} · ${c.fis?'DEF':'MDEF'} del defensor ${c.D}${c.crit?' (defensa base: el crítico ignora sus boosteos)':''}</div>
    <div>Bonus = 1${c.crit?' + 0,5 (crítico)':''}${c.stab?' + 0,3 (STAB)':''} = <b>${+c.bonus.toFixed(2)}</b></div>
    <div>Tipo ×${+c.ty.toFixed(3)} · Clima ×${c.cw} · Objeto ×${+c.ci.toFixed(2)} · Habilidades ×${+(c.pw*c.ab).toFixed(3)} · Guardia ×${c.pr} · Reducción de guardia ${c.gd}% · Área ×${c.mult}</div>
    <div>Daño = floor(base × bonus × tipo × clima × objeto × guardia × área × habilidades × (1 − reducción)) = <b>${c.d}</b></div></div></details>`).join(''):'<p class="hint">Aún no hay cálculos en este turno.</p>';
}
function playIntro(){
  const o=$('intro4'),R=(a,b)=>a+Math.random()*(b-a);
  const lines=()=>Array.from({length:11},()=>`<i class='il' style='top:${R(3,96).toFixed(1)}%;width:${R(18,48).toFixed(0)}%;height:${R(2,4.5).toFixed(1)}px;animation-duration:${R(.9,2.6).toFixed(2)}s;animation-delay:-${R(0,2.5).toFixed(2)}s'></i>`).join('');
  const sil=`<svg class='isl' viewBox='0 0 100 100'><path d='M30 38c0-14 8-22 20-22s20 8 20 22c0 6-1 9-3 13-3 8-9 12-17 12s-14-4-17-12c-2-4-3-7-3-13z' fill='#000'/><path d='M8 99c3-22 16-31 31-33l6 6h10l6-6c15 2 28 11 31 33z' fill='#000'/></svg>`;
  o.innerHTML=`<div class='iflash'></div><div class='ibox'><div class='ipn j1'>${lines()}${sil}<div class='inm'>${esc(pn(0))}</div></div><div class='ivs'><i></i><b>VS</b></div><div class='ipn j2'>${lines()}${sil}<div class='inm'>${esc(pn(1))}</div></div></div>`;
  o.className='on';let done=false;const T=[];
  const end=()=>{if(done)return;done=true;T.forEach(clearTimeout);o.classList.add('out');setTimeout(()=>{o.className='';o.innerHTML=''},520)};
  T.push(setTimeout(()=>o.classList.add('ph2'),560),setTimeout(()=>o.classList.add('ph3'),1250),setTimeout(end,4400));
  o.onclick=end;
}
const effMsg=t=>{if(t._ty>1)lg('  ¡Es súper eficaz!','eff+',t);else if(t._ty>0&&t._ty<1)lg('  No es muy eficaz…','eff-',t)};
function arena(noPaint){
  if(AIX)return;
  [0,1].forEach(s=>{
    const bn=S.t[s].filter((b,i)=>!S.a[s].includes(i));
    $('ar'+s).innerHTML=`<h3 style='margin-top:0'>Órdenes · ${esc(pn(s))}</h3>`+S.a[s].map((_,p)=>card(s,p)).join('')+`<p class='hint'>Banca: ${bn.map(b=>`${esc(b.nm)}${b.ko?' (KO)':''}`).join(', ')||'—'}<br>Mochila: ${Object.keys(BAG0).map(k=>k+' '+S.bag[s][k]).join(' · ')}</p>`;
  });
  $('run4').disabled=S.over||!!S.busy;$('undo4').disabled=!S.n||!!S.busy;$('ar1').classList.toggle('hid',S.cpu===1);$('ords4').classList.toggle('one',S.cpu===1);$('auto4').disabled=S.over||(!!S.busy&&!S.auto);renderInsp();musicCheck(snap(),!noPaint);
  if(!noPaint)paintAll();
  S.ph=0;gate();renderPreview();
}
function gate(){
  if(!S)return;clearInterval(S.tmr);
  const on=S.cpu==null&&!S.auto&&!S.over&&!S.busy;S.gate=on;
  const a0=$('ar0'),a1=$('ar1'),run=$('run4'),tm=$('tmr4');
  const dk=(el,t)=>{el.classList.toggle('dk',!!t);el.dataset.dk=t||'';el.inert=!!t};
  if(!on){dk(a0,'');dk(a1,'');run.textContent='Ejecutar turno';tm.textContent='';return}
  const q=S.ph||0;
  dk(a0,q===0?'':'Jugada de '+pn(0)+' oculta');dk(a1,q===1?'':'Turno de '+pn(0)+' · el panel de '+pn(1)+' está oculto');
  run.textContent=q===0?'Confirmar jugada de '+pn(0):'Confirmar jugada de '+pn(1)+' y ejecutar turno';
  const t0=Date.now(),me=S,tick=()=>{if(S!==me||S.over||S.busy||S.ph!==q||$('bt4').classList.contains('hid')){clearInterval(me.tmr);tm.textContent='';return}
    const left=Math.max(0,60-Math.floor((Date.now()-t0)/1000));tm.textContent='Tiempo de '+pn(q)+': '+left+' s';tm.classList.toggle('warn',left<=10);
    if(!left){clearInterval(me.tmr);toast('Tiempo agotado: se usa la jugada seleccionada');$('run4').click()}};
  S.tmr=setInterval(tick,250);tick();
}
function fillSet4(){
  const co=`<option value=''>— vacío —</option>`+db.map(c=>`<option value='${c.id}'>${esc(c.nombre)} (Nv ${c.nivel})</option>`).join('');
  const op=(o,l)=>`<option value=''>${l}</option>`+Object.keys(o).map(k=>`<option>${k}</option>`).join('');
  $('sl4').innerHTML=[0,1].map(s=>`<div><h3 style='margin-top:0'>Jugador ${s+1}</h3>`+cfg.t[s].map((x,i)=>`<div class='slot' data-s='${s}' data-i='${i}'><select data-k='id' aria-label='Criatura ${i+1}'>${co}</select><select data-k='pas' aria-label='Pasivo'>${op(PAS,'Pasivo: ninguno')}</select><select data-k='ofe' aria-label='Ofensivo'>${op(OFE,'Ofensivo: ninguno')}</select>${mvPanel(x)}</div>`).join('')+'</div>').join('');
  document.querySelectorAll('#sl4 .slot').forEach(r=>{const x=cfg.t[r.dataset.s][r.dataset.i];['id','pas','ofe'].forEach(k=>r.querySelector(`[data-k=${k}]`).value=x[k])});
  $('w4').value=cfg.w;$('pn0').value=cfg.names[0];$('pn1').value=cfg.names[1];$('vs4').value=cfg.vs;$('pol4').value=cfg.pol;$('polw').classList.toggle('hid',cfg.vs!=='cpu');
}
function pickLeads(T){return new Promise(res=>{
  const cpu=cfg.vs==='cpu',nm=q=>String(cfg.names[q]||'').trim()||(q===1&&cpu?'Máquina':'Jugador '+(q+1));
  let o=document.getElementById('pick4');if(!o){o=document.createElement('div');o.id='pick4';document.body.appendChild(o)}
  const full=(q,ch)=>ch.concat(T[q].map((_,i)=>i).filter(i=>!ch.includes(i)));
  const auto=q=>T[q].map((f,i)=>[i,f.st.hp+f.st.atk+f.st.def+f.st.matk+f.st.mdef+f.st.spd]).sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,3).map(x=>x[0]);
  const out=[0,1].map(q=>T[q].map((_,i)=>i));if(cpu&&T[1].length>3)out[1]=full(1,auto(1));
  const need=[0,1].filter(q=>T[q].length>3&&!(cpu&&q===1));let idx=0,sel=[];
  if(!need.length){res(out);return}
  const draw=()=>{const s=need[idx];o.className='on';
    o.innerHTML=`<div class='pkh'><h2>${esc(nm(s))}: elige a tus 3 combatientes</h2><p class='hint'>El orden de selección define quién abre el combate; el resto queda en la banca.${cpu?'':' '+esc(nm(1-s))+' no ve tu elección.'}</p></div><div class='pkc'>`+[0,1].map(q=>`<div class='pkp j${q+1} ${q===s?'on':'off'}'><h3>${esc(nm(q))}</h3><div class='pkl'>`+T[q].map((f,i)=>{const k=q===s?sel.indexOf(i):-1;return `<button type='button' class='pki${k>=0?' sel':''}' data-i='${i}'${q===s?'':' disabled tabindex="-1"'}>${window.retHTML?retHTML(f.cid,52):''}<span><b>${esc(f.nm)}</b><small>${f.tipos.map(esc).join(' / ')} · Nv ${f.N}</small></span>${k>=0?`<em>${k+1}</em>`:''}</button>`}).join('')+`</div></div>`).join('')+`</div><div class='pkf'><button type='button' id='pkok' class='am'${sel.length===3?'':' disabled'}>Confirmar ${esc(nm(s))}</button></div>`};
  o.onclick=e=>{const s=need[idx],b=e.target.closest('.pki');
    if(b&&!b.disabled){const i=+b.dataset.i,k=sel.indexOf(i);if(k>=0)sel.splice(k,1);else if(sel.length<3)sel.push(i);draw();return}
    if(e.target.id==='pkok'&&sel.length===3){out[s]=full(s,sel);sel=[];idx++;if(idx>=need.length){o.className='';o.innerHTML='';res(out)}else draw()}};
  draw();
})}
function f4init(){
  const wo=`<option value=''>Despejado (sin clima)</option>`+Object.entries(WEA).map(([k,v])=>`<option value='${k}'>${v.n}</option>`).join('');
  $('w4').innerHTML=wo;$('w4b').innerHTML=wo;fillSet4();
  $('w4').onchange=e=>{cfg.w=e.target.value;save4()};
  $('w4b').onchange=e=>{S.w=e.target.value;S.ev.push({tras:S.n,clima:S.w});lg('Clima: '+(WEA[S.w]?WEA[S.w].n:'Despejado'),'t');paintCenter(snap())};
  $('r4').onclick=()=>{fillSet4();toast('Listas actualizadas')};
  const reSlot=r=>{const x=cfg.t[r.dataset.s][r.dataset.i],d=r.querySelector('.mvd');if(d)d.remove();r.insertAdjacentHTML('beforeend',mvPanel(x))};
  $('sl4').addEventListener('change',e=>{const r=e.target.closest('.slot'),k=e.target.dataset.k;if(!r||!k)return;const x=cfg.t[r.dataset.s][r.dataset.i];
    if(k==='mv'){const sels=[...r.querySelectorAll('[data-k=mv]')],v=sels.map(s=>s.value);if(new Set(v).size<5){toast('Cada ataque solo puede ir una vez');const c=db.find(c=>c.id===x.id),cu=movesFor(c,x);sels.forEach((s,n)=>s.value=cu[n]);return}x.mv=v;const c=db.find(c=>c.id===x.id);r.querySelector('.mvs').textContent=v.map(id=>(A.find(a=>a.id===id)||{}).nombre||'—').join(' · ');save4();return}
    x[k]=e.target.value;if(k==='id'){const c=db.find(c=>c.id===e.target.value);x.nm=c?c.nombre:'';x.mv=[];reSlot(r)}save4()});
  $('sl4').addEventListener('click',e=>{const b=e.target.closest('[data-k=mvr]');if(!b)return;const r=b.closest('.slot'),x=cfg.t[r.dataset.s][r.dataset.i];x.mv=[];save4();reSlot(r);r.querySelector('.mvd').open=true});
  $('go4').onclick=()=>{
    const T=cfg.t.map((side,s)=>side.map(x=>{const c=db.find(c=>c.id===x.id)||(x.nm&&db.find(c=>c.nombre===x.nm));return c?mk(c,x,s):null}).filter(Boolean));
    if(T.some(t=>t.length<3))return toast('Cada jugador necesita al menos 3 criaturas guardadas');
    {const bad=T.flat().find(f=>f.mv.length<5);if(bad)return toast(bad.nm+' necesita sus 5 ataques (pestaña Criaturas)')}
    const proceed=ORD=>{if(ORD)T.forEach((t,s)=>{const r=ORD[s].map(i=>t[i]);t.length=0;r.forEach(x=>t.push(x))});
    S={w:cfg.w,t:T,a:[[0,1,2],[0,1,2]],bag:[{...BAG0},{...BAG0}],over:false,n:0,tl:[]};S.names=cfg.names.slice();S.cpu=cfg.vs==='cpu'?1:null;S.pol=cfg.pol;S.calcs=[];
    S.seed=($('xseed').value||'').trim()||Math.random().toString(36).slice(2,8);seedRng(S.seed);S.rec=[];S.ev=[];S.w0=cfg.w;S.bag0={...BAG0};
    S.teams=cfg.t.map(side=>side.map(x=>{const c=db.find(c=>c.id===x.id)||(x.nm&&db.find(c=>c.nombre===x.nm));return c?{id:c.id,pas:x.pas||'',ofe:x.ofe||'',mv:movesFor(c,x)===(c.atk||[])?[]:movesFor(c,x)}:null}).filter(Boolean));
    $('lg4').innerHTML='';lg('¡Comienza el combate 3v3! Clima: '+(WEA[S.w]?WEA[S.w].n:'Despejado'),'t');lg('Semilla: '+S.seed,'calc');
    $('setup4').classList.add('hid');$('bt4').classList.remove('hid');S.a.forEach((q,s)=>q.forEach(i=>enter(S.t[s][i])));$('w4b').value=S.w;S.tl.length=0;S.prevSn=null;$('fin4').classList.add('hid');showMsg('¡Comienza el combate! '+pn(0)+' vs '+pn(1)+' · Clima: '+(WEA[S.w]?WEA[S.w].n:'Despejado'));S.cpuFn=S.cpu==null?null:rpgLab.aiFn(S.pol,rpgLab.mkR(S.seed+':ia'));S.autoFn=rpgLab.aiFn('in',rpgLab.mkR(S.seed+':auto'));musicSet('combate');if(ORD)S.teams=S.teams.map((t,s)=>ORD[s].map(i=>t[i]));arena();if(!window.NOINTRO)playIntro();};
    if(window.NOINTRO||T.every(t=>t.length<=3))proceed(null);else pickLeads(T).then(proceed);
  };
  $('run4').onclick=()=>{if(S&&S.gate&&S.ph===0){S.ph=1;gate();return}turn4()};
  $('vel4').value=VEL;$('vel4').onchange=e=>{VEL=e.target.value;try{localStorage.setItem('rpg_vel',VEL)}catch(x){}};document.body.appendChild($('intro4'));document.body.appendChild($('fin4'));['pn0','pn1'].forEach((id,i)=>$(id).addEventListener('input',e=>{cfg.names[i]=e.target.value.slice(0,20);save4()}));
  $('vs4').onchange=e=>{cfg.vs=e.target.value;$('polw').classList.toggle('hid',cfg.vs!=='cpu');save4()};$('pol4').onchange=e=>{cfg.pol=e.target.value;save4()};
  $('insf').onchange=renderInsp;
  $('auto4').onclick=async()=>{
    if(!S||S.over)return;if(S.auto){S.stop=true;return}if(S.busy)return;
    S.auto=true;S.stop=false;$('auto4').textContent='Detener';const koN=()=>S.t.flat().filter(f=>f.ko).length,k0=koN();
    try{for(let g=0;g<40&&S&&!S.over&&!S.stop;g++){turn4();while(S&&S.busy)await wait(60);if(S&&koN()>k0)break}}
    finally{$('auto4').textContent='Avanzar hasta un KO';if(S){S.auto=false;S.stop=false;arena(true)}}};
  $('skip4').onclick=()=>{pbSkip=true;if(S&&S.nx)S.nx()};$('next4').onclick=()=>{if(S&&S.nx)S.nx()};
  try{STEP=localStorage.getItem('rpg_step')==='1'}catch(x){}$('step4').checked=STEP;$('step4').onchange=e=>{STEP=e.target.checked;try{localStorage.setItem('rpg_step',STEP?'1':'0')}catch(x){}if(!STEP&&S&&S.nx)S.nx()};
  document.addEventListener('keydown',e=>{if(STEP&&S&&S.busy&&(e.key==='ArrowRight'||e.key===' '||e.key==='Enter')&&!/INPUT|SELECT|TEXTAREA|BUTTON/.test((e.target||{}).tagName)){e.preventDefault();if(S.nx)S.nx()}});
  $('ords4').addEventListener('change',()=>{if(S&&!S.busy)renderPreview()});
  /* deshacer: se reconstruye el combate con las acciones anteriores (determinista) */
  const rewind=k=>{const r=rpgLab.buildReplay();if(!r)return;const bak=JSON.stringify(cfg);r.acciones=(r.acciones||[]).slice(0,k);try{rpgLab.runReplay(r)}finally{cfg=JSON.parse(bak);norm4();fillSet4()}};
  $('undo4').onclick=()=>{if(!S||S.busy||!S.n)return;try{rewind(S.n-1);toast('Turno deshecho')}catch(e){toast(e.message||'No se pudo deshacer')}};
  /* equipos y combates guardados */
  const rd=k=>{try{const v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch(e){return[]}},wr=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){toast('No se pudo guardar (almacenamiento lleno)');return false}};
  const fmt=d=>{try{return new Date(d).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'})}catch(e){return''}};
  const armed=(b,fn,txt)=>{if(b.dataset.armed){fn()}else{b.dataset.armed=1;const o=b.textContent;b.textContent='¿Seguro?';setTimeout(()=>{if(b.isConnected){delete b.dataset.armed;b.textContent=o}},2500)}};
  function listSaved(){
    const E=rd(KEYEQ),P=rd(KEYPA);
    $('eql').innerHTML=E.length?E.map(q=>`<div class='eqr'><b>${esc(q.nombre)}</b><span class='hint'>${q.t.filter(x=>x.id).length} criaturas · ${fmt(q.fecha)}</span><button class='sm' data-eq='l0' data-id='${q.id}'>Cargar en J1</button><button class='sm' data-eq='l1' data-id='${q.id}'>Cargar en J2</button><button class='sm danger' data-eq='d' data-id='${q.id}'>Eliminar</button></div>`).join(''):`<p class='hint'>Aún no hay equipos guardados.</p>`;
    $('cbl').innerHTML=P.length?P.map(q=>`<div class='eqr'><b>${esc(q.nombre)}</b><span class='hint'>${q.turnos} turno(s) · ${q.estado} · ${fmt(q.fecha)}</span><button class='sm am' data-cb='l' data-id='${q.id}'>Retomar</button><button class='sm danger' data-cb='d' data-id='${q.id}'>Eliminar</button></div>`).join(''):`<p class='hint'>Aún no hay combates guardados. Usa «Guardar combate» durante una partida.</p>`;
  }
  [0,1].forEach(s=>{$('eqs'+s).onclick=()=>{const t=cfg.t[s].filter(x=>x.id);if(t.length<1)return toast('Elige al menos una criatura');const n=($('eqn').value||'').trim()||`Equipo ${rd(KEYEQ).length+1}`;const E=rd(KEYEQ);E.push({id:uid(),nombre:n,fecha:new Date().toISOString(),t:cfg.t[s].map(x=>({...x,mv:[...(x.mv||[])]}))});if(wr(KEYEQ,E)){$('eqn').value='';listSaved();toast('Equipo guardado')}}});
  $('eql').addEventListener('click',e=>{const b=e.target.closest('[data-eq]');if(!b)return;const E=rd(KEYEQ),q=E.find(x=>x.id===b.dataset.id);if(!q)return;
    if(b.dataset.eq==='d')return armed(b,()=>{wr(KEYEQ,E.filter(x=>x.id!==q.id));listSaved()});
    const s=+b.dataset.eq[1];cfg.t[s]=Array.from({length:6},(_,j)=>{const x=q.t[j]||{};const c=db.find(c=>c.id===x.id);return c?{id:c.id,nm:c.nombre,pas:PAS[x.pas]?x.pas:'',ofe:OFE[x.ofe]?x.ofe:'',mv:Array.isArray(x.mv)?x.mv:[]}:{id:'',nm:'',pas:'',ofe:'',mv:[]}});save4();fillSet4();toast(`«${q.nombre}» cargado en Jugador ${s+1}`)});
  $('sv4').onclick=()=>{if(!S)return;const r=rpgLab.buildReplay();if(!r)return;const P=rd(KEYPA),d0=S.t[0].every(f=>f.ko),d1=S.t[1].every(f=>f.ko);P.unshift({id:uid(),nombre:($('svn').value||'').trim()||`Combate ${P.length+1}`,fecha:new Date().toISOString(),turnos:S.n,estado:S.over?(d0&&d1?'empate':`ganó J${d0?2:1}`):'en curso',replay:r});if(wr(KEYPA,P.slice(0,30))){$('svn').value='';listSaved();toast('Combate guardado')}};
  $('cbl').addEventListener('click',e=>{const b=e.target.closest('[data-cb]');if(!b)return;const P=rd(KEYPA),q=P.find(x=>x.id===b.dataset.id);if(!q)return;
    if(b.dataset.cb==='d')return armed(b,()=>{wr(KEYPA,P.filter(x=>x.id!==q.id));listSaved()});
    try{const bak=JSON.stringify(cfg),x=rpgLab.runReplay(q.replay);cfg=JSON.parse(bak);norm4();fillSet4();toast(x.ok?'Combate retomado':'Retomado con diferencias: los datos cambiaron desde que se guardó')}catch(err){toast(err.message||'No se pudo retomar')}});
  listSaved();$('fin4c').onclick=()=>$('fin4').classList.add('hid');$('fin4e').onclick=()=>$('end4').click();
  $('end4').onclick=()=>{$('fin4').classList.add('hid');musicSet('menu');S=null;$('bt4').classList.add('hid');$('setup4').classList.remove('hid')};
  ['ar0','ar1'].forEach(id=>$(id).addEventListener('change',e=>{if(e.target.dataset.k==='act')e.target.closest('.fc').dataset.act=e.target.value;if(e.target.dataset.k==='m'){const c=e.target.closest('.fc'),u=S.t[+c.dataset.s][S.a[+c.dataset.s][+c.dataset.p]],m=u.mv.find(x=>x.id===e.target.value);c.querySelector('.pvw').style.display=(m&&(m.fx||[]).some(x=>x.k==='pivot'))?'':'none'}}));
  $('e4').onclick=()=>{$('j4').value=JSON.stringify(cfg,null,2);toast('Configuración exportada: copia el texto')};
  $('c4').onclick=async()=>{if(!$('j4').value)$('j4').value=JSON.stringify(cfg,null,2);try{await navigator.clipboard.writeText($('j4').value);toast('Copiado al portapapeles')}catch(e){$('j4').select();toast('Selecciona y copia el texto (Ctrl+C)')}};
  const imp4=txt=>{try{const o=JSON.parse(txt);if(!o||!Array.isArray(o.t))throw 0;cfg=o;norm4();save4();fillSet4();toast('Configuración importada')}catch(e){toast('JSON no válido')}};
  $('i4').onclick=()=>imp4($('j4').value);
  $('f4file').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$('j4').value=r.result;imp4(r.result)};r.readAsText(f);e.target.value=''};
}
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
function fillHab(){
  const e=$('hab');
  e.innerHTML=`<option value=''>— ninguna —</option>`+H.map(h=>`<option value='${h.id}'>${esc(h.nombre)}</option>`).join('')+(cur.hab&&!getAb(cur)?`<option value='__old'>${esc(cur.hab)} (texto libre)</option>`:'');
  const ab=getAb(cur);e.value=ab?ab.id:(cur.hab?'__old':'');
}
function hRow(f,i){
  const n=(fld,v,mn,mx,st)=>`<input type='number' min='${mn}' max='${mx}' step='${st||1}' data-i='${i}' data-f='${fld}' value='${v}'>`;
  const tp=fld=>`<select data-i='${i}' data-f='${fld}'>${TIPOS.map(t=>`<option${t[0]===f[fld]?' selected':''}>${esc(t[0])}</option>`).join('')}</select>`;
  const L=(t,x)=>`<div><label>${t}</label>${x}</div>`;
  let b='';
  if(f.k==='imm')b=L('Tipo',tp('tipo'));
  if(f.k==='res')b=L('Tipo',tp('tipo'))+L('Multiplicador de daño recibido (0.5 = mitad)',n('m',f.m,0,5,0.05));
  const W=[['any','Cualquier golpe'],['fis','Golpe físico'],['mag','Golpe mágico'],['cont','Golpe por contacto'],['muerte','Al morir']];const wS=`<select data-i='${i}' data-f='w'>${W.map(([v,l])=>`<option value='${v}'${(f.w||'any')===v?' selected':''}>${l}</option>`).join('')}</select>`;
  const sel=(fld,v,o)=>`<select data-i='${i}' data-f='${fld}'>${o.map(([x,l])=>`<option value='${x}'${x===v?' selected':''}>${l}</option>`).join('')}</select>`;
  if(f.k==='ref')b=L('Se activa cuando',wS)+L('Base',sel('b',f.b||'dmg',[['dmg','Daño que te infligen'],['hp','Vida máxima del rival']]))+L('Porcentaje',n('v',f.v,1,100));
  if(f.k==='stt')b=L('Se activa cuando',wS)+L('Estado al atacante',sel('e',f.e,ESTADOS.map(x=>[x,x])))+L('Probabilidad %',n('p',f.p,1,100));
  if(f.k==='trap')b=L('Se activa',sel('w',f.w||'enter',[['enter','Al entrar al campo (rivales en campo)'],['any','Al recibir cualquier golpe'],['fis','Al recibir golpe físico'],['mag','Al recibir golpe mágico'],['cont','Al recibir golpe por contacto']]))+L('Turnos sin poder retirarse (3 a 5)',n('turns',f.turns,3,5))+L('Probabilidad %',n('p',f.p,1,100));
  if(f.k==='cut')b=L('Categoría',sel('c',f.c,[['fis','Físico'],['mag','Mágico']]))+L('% de daño reducido',n('v',f.v,1,100));
  if(f.k==='dbl')b=L('Estadística',sel('s',f.s,['MP','ATK','DEF','MATK','MDEF','SPD'].map(x=>[x,x])))+L('Multiplicador (2 = doble)',n('m',f.m,1,5,0.1));
  if(f.k==='pri')b=L('Prioridad extra (+)',n('v',f.v,1,3));
  if(f.k==='low')b=L('Cuando HP ≤ (%)',n('pct',f.pct,1,99))+L('Stat',`<select data-i='${i}' data-f='s'>${ST3.map(x=>`<option${x===f.s?' selected':''}>${x}</option>`).join('')}</select>`)+L('Nivel',`<select data-i='${i}' data-f='n' data-num='1'>${[-4,-3,-2,-1,1,2,3,4].map(x=>`<option value='${x}'${x===f.n?' selected':''}>${x>0?'+':''}${x} (×${MUL[x]})</option>`).join('')}</select>`);
  if(f.k==='pow')b=L('Tipo',tp('tipo'))+L('Multiplicador (1.2 = +20%)',n('m',f.m,0.1,5,0.05));
  if(f.k==='wea')b=L('Clima',sel('w',f.w,Object.entries(WEA).map(([k,v])=>[k,v.n])));
  if(f.k==='int')b=L('Stat',sel('s',f.s,['ATK','DEF','MATK','MDEF','SPD'].map(x=>[x,x])))+L('Niveles que baja',`<select data-i='${i}' data-f='n' data-num='1'>${[-1,-2,-3,-4].map(x=>`<option value='${x}'${x===+f.n?' selected':''}>${x}</option>`).join('')}</select>`)+L('Afecta a',sel('w',f.w||'all',[['all','Todos los rivales en el campo'],['front','El rival de enfrente'],['rand','Un rival al azar']]));
  return `<div class='fx'><div class='row' style='justify-content:space-between'><b>${HK[f.k]}</b><button class='sm danger' data-del='${i}'>Quitar</button></div><div class='gp'>${b}</div></div>`;
}
function renderH(){$('hfl').innerHTML=h5.fx.length?h5.fx.map(hRow).join(''):`<p class='hint'>Sin efectos todavía.</p>`}
function fillH(){$('hn').value=h5.nombre;$('hd').value=h5.desc;renderH()}
function listH(){
  $('hl').innerHTML=H.length?H.filter(h=>{const q=($('hq')||{value:''}).value.toLowerCase().trim();return !q||(h.nombre+' '+hdesc(h)).toLowerCase().includes(q)}).map(h=>`<div class='card ${h.id===h5.id?'act':''}'><b>${esc(h.nombre)}</b>${h.desc?`<div class='hint'>${esc(h.desc)}</div>`:''}${h.fx.map(f=>`<div class='hint'>• ${esc(hfx(f))}</div>`).join('')}<div class='row' style='margin-top:8px'><button class='sm pri' data-h='edit' data-id='${h.id}'>Editar</button><button class='sm' data-h='dup' data-id='${h.id}'>Duplicar</button><button class='sm danger' data-h='del' data-id='${h.id}'>Eliminar</button></div></div>`).join(''):`<p class='hint'>Aún no hay habilidades.</p>`;
}
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
function hInit(){
  $('mvs').addEventListener('change',e=>{const i=e.target.dataset.mv;if(i===undefined)return;const v=e.target.value;if(v&&cur.atk.some((x,j)=>x===v&&j!=i)){toast('Ese ataque ya está en otra ranura');e.target.value=cur.atk[i]||'';return}cur.atk[i]=v});
  $('hk').innerHTML=Object.keys(HK).map(k=>`<option value='${k}'>${HK[k]}</option>`).join('');
  fillH();listH();
  $('hab').addEventListener('change',()=>{const h=H.find(x=>x.id===$('hab').value);$('habd').value=h?hdesc(h):($('hab').value==='__old'?$('habd').value:'');$('habd').dispatchEvent(new Event('input'))});
  $('hn').oninput=e=>{h5.nombre=e.target.value};$('hd').oninput=e=>{h5.desc=e.target.value};
  $('hfl').addEventListener('input',e=>{const t=e.target,f=h5.fx[t.dataset.i];if(!f)return;f[t.dataset.f]=(t.type==='number'||t.dataset.num)?+t.value:t.value});
  $('hfl').addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(b){h5.fx.splice(+b.dataset.del,1);renderH()}});
  $('hadd').onclick=()=>{h5.fx.push(HNEW[$('hk').value]());renderH()};
  $('hnew').onclick=()=>{h5={id:null,nombre:'',desc:'',fx:[]};fillH();listH()};
  $('hsave').onclick=()=>{
    const a=h5;
    if(!a.nombre.trim())return toast('Escribe el nombre de la habilidad');
    if(!a.fx.length)return toast('Añade al menos un efecto');
    const cl=(x,lo,hi)=>Math.max(lo,Math.min(hi,+x||lo));
    a.fx.forEach(f=>{if('m' in f)f.m=cl(f.m,0,5);if(f.k==='ref'||f.k==='cut')f.v=cl(f.v,1,100);if(f.k==='stt')f.p=cl(f.p,1,100);if(f.k==='pri')f.v=Math.round(cl(f.v,1,3));if(f.k==='trap'){f.turns=Math.round(cl(f.turns,3,5));f.p=cl(f.p,1,100)}if(f.k==='low')f.pct=cl(f.pct,1,99)});
    const i=H.findIndex(x=>x.id===a.id);
    if(i>=0)H[i]=clone(a);else{a.id=uid();H.push(clone(a))}
    db.forEach(c=>{if(c.habId===a.id)c.hab=a.nombre});persist();
    if(saveH()){toast(i>=0?'Habilidad actualizada':'Habilidad guardada');fillHab();fillH();listH()}
  };
  $('hl').addEventListener('click',e=>{
    const b=e.target.closest('[data-h]');if(!b)return;
    const id=b.dataset.id,i=H.findIndex(x=>x.id===id);if(i<0)return;
    if(b.dataset.h==='edit'){h5=clone(H[i]);fillH();listH();$('f5form').scrollIntoView({behavior:'smooth'})}
    if(b.dataset.h==='dup'){const d=clone(H[i]);d.id=uid();d.nombre+=' (copia)';H.splice(i+1,0,d);saveH();fillHab();listH();toast('Habilidad duplicada')}
    if(b.dataset.h==='del'){
      if(b.dataset.armed){H.splice(i,1);if(h5.id===id)h5.id=null;saveH();fillHab();listH();toast('Habilidad eliminada')}
      else{b.dataset.armed=1;b.textContent='¿Seguro?';setTimeout(()=>{if(b.isConnected){delete b.dataset.armed;b.textContent='Eliminar'}},2500)}
    }
  });
  $('he').onclick=()=>{$('hj').value=JSON.stringify(H,null,2);toast('Habilidades exportadas: copia el texto')};
  $('hc').onclick=async()=>{if(!$('hj').value)$('hj').value=JSON.stringify(H,null,2);try{await navigator.clipboard.writeText($('hj').value);toast('Copiado al portapapeles')}catch(e){$('hj').select();toast('Selecciona y copia el texto (Ctrl+C)')}};
  const impH=txt=>{try{
    const arr=JSON.parse(txt);if(!Array.isArray(arr))throw 0;let n=0;
    arr.forEach(o=>{if(!o||!o.nombre)return;const a={id:o.id||null,nombre:String(o.nombre),desc:o.desc||'',fx:Array.isArray(o.fx)?o.fx.filter(f=>f&&HNEW[f.k]):[]};
      const i=a.id?H.findIndex(x=>x.id===a.id):-1;if(i>=0)H[i]=a;else{a.id=uid();H.push(a)}n++});
    saveH();fillHab();listH();toast(n+' habilidad(es) importada(s)');
  }catch(e){toast('JSON no válido')}};
  $('hi').onclick=()=>impH($('hj').value);
  $('hfile').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$('hj').value=r.result;impH(r.result)};r.readAsText(f);e.target.value=''};
}

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
/* ---------- Edición de tipos ---------- */
function syncTE(){const t=TIPOS.find(x=>x[0]===$('xte').value);if(t){$('xtr').value=t[0];$('xtk').value=/^#[0-9a-f]{6}$/i.test(t[1])?t[1]:'#38bdf8'}}
function fillTE(){const e=$('xte');if(!e)return;const v=e.value;e.innerHTML=TIPOS.map(t=>`<option>${esc(t[0])}</option>`).join('');e.value=v;if(!e.value)e.selectedIndex=0;syncTE()}
function applyTypeEdit(){
  const old=$('xte').value,nn=$('xtr').value.replace(/[<>&"'>]/g,'').trim()||old,t=TIPOS.find(x=>x[0]===old);if(!t)return;
  if(nn!==old&&TIPOS.some(x=>x[0].toLowerCase()===nn.toLowerCase()))return toast('Ese nombre ya existe');
  t[1]=$('xtk').value;
  if(nn!==old){
    t[0]=nn;const sw=l=>l.map(x=>x===old?nn:x);RO=sw(RO);CO=sw(CO);
    const M2={};Object.keys(M).forEach(k=>{const [p,q]=k.split('>');M2[(p===old?nn:p)+'>'+(q===old?nn:q)]=M[k]});M=M2;
    db.forEach(c=>{c.tipos=sw(c.tipos)});cur.tipos=sw(cur.tipos);
    A.forEach(a=>{if(a.tipo===old)a.tipo=nn});if(a3.tipo===old)a3.tipo=nn;
    H.forEach(h=>h.fx.forEach(f=>{if(f.tipo===old)f.tipo=nn}));
    Object.values(WEA).forEach(w=>['dmg','def','spd'].forEach(k=>{if(w[k]&&old in w[k]){w[k][nn]=w[k][old];delete w[k][old]}}));
    persist();save3s();saveH();saveRules();
  }
  f2save();fillTypeSel();renderM();renderList();list3();listH();toast('Tipo actualizado');
}
/* ---------- Consultor defensivo y cobertura ofensiva ---------- */
const chipT=n=>`<span class="chip" style="background:${tcol(n)}">${esc(n)}</span>`,fmtM=v=>'×'+(+v.toFixed(3));
function fillCons(){
  const o=TIPOS.map(t=>`<option>${esc(t[0])}</option>`).join(''),a=$('xcp').value,b=$('xcs').value,h=$('xch').value;
  $('xcp').innerHTML=o;$('xcs').innerHTML='<option value="">— ninguno —</option>'+o;
  $('xch').innerHTML='<option value="">— ninguna —</option>'+H.map(x=>`<option value="${x.id}">${esc(x.nombre)}</option>`).join('');
  $('xcp').value=a;if(!$('xcp').value)$('xcp').selectedIndex=0;$('xcs').value=b;$('xch').value=h;
}
function rCons(f){
  if(f)fillCons();
  const t1=$('xcp').value,t2=$('xcs').value===t1?'':$('xcs').value,ab=H.find(x=>x.id===$('xch').value),g={};
  TIPOS.forEach(([a])=>{let m=gv(a,t1)*(t2?gv(a,t2):1);if(ab)ab.fx.forEach(x=>{if(x.tipo===a){if(x.k==='imm')m=0;else if(x.k==='res')m*=x.m}});m=Math.round(m*1000)/1000;(g[m]=g[m]||[]).push(a)});
  $('xcres').innerHTML=Object.keys(g).map(Number).sort((x,y)=>y-x).map(m=>`<div class="fx"><b>${fmtM(m)}</b> <span class="hint">${m===0?'Inmune':m>1?'Débil':m<1?'Resiste':'Neutro'}</span><div>${g[m].map(chipT).join(' ')}</div></div>`).join('');
}
let OS=new Set();
function rOfen(){
  const T=TIPOS.map(t=>t[0]);OS=new Set([...OS].filter(x=>T.includes(x)));
  $('xochips').innerHTML=T.map(n=>`<button class="sm${OS.has(n)?' pri':''}" data-o="${esc(n)}">${esc(n)}</button>`).join('');
  const r={hi:[],eq:[],lo:[]};
  if(OS.size)T.forEach(d=>{const m=Math.max(...[...OS].map(a=>gv(a,d)));(m>1?r.hi:m===1?r.eq:r.lo).push([d,m])});
  const L=a=>a.length?a.map(([d,m])=>chipT(d)+(m!==1?`<small>${fmtM(m)}</small> `:' ')).join(''):'<span class="hint">—</span>';
  $('xores').innerHTML=`<div class="grid g3"><div class="fx"><b>Súper eficaz</b><div>${L(r.hi)}</div></div><div class="fx"><b>Neutro</b><div>${L(r.eq)}</div></div><div class="fx"><b>Resistido / inmune</b><div>${L(r.lo)}</div></div></div>`;
}
/* ---------- Herramientas rápidas de stats ---------- */
const ARQ={Guerrero:[120,30,145,105,25,60,90],Mago:[70,160,35,45,155,110,85],Guardián:[165,40,85,170,30,130,45],Pícaro:[80,65,125,55,40,50,175],Jefe:[200,180,185,150,190,145,135],Balanceado:[95,95,95,95,95,95,95]};
function qtools(){
  $('xq').innerHTML='<span class="hint">Arquetipos:</span>'+Object.keys(ARQ).map(n=>`<button class="sm" data-arq="${n}">${n}</button>`).join('')+'<button class="sm" data-q="rnd"><i class="ic ic-dado"></i>Aleatorio</button><button class="sm" data-q="e0">Esfuerzo a 0</button><button class="sm" data-lv="1">Nv 1</button><button class="sm" data-lv="50">Nv 50</button><button class="sm" data-lv="100">Nv 100</button><button class="sm" data-q="cp"><i class="ic ic-copia"></i>Copiar resumen</button>';
  $('xq').addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.arq){STATS.forEach((s,i)=>cur.base[s.k]=ARQ[b.dataset.arq][i])}
    else if(b.dataset.q==='rnd'){STATS.forEach(s=>cur.base[s.k]=35+Math.floor(Math.random()*116))}
    else if(b.dataset.q==='e0'){STATS.forEach(s=>{if(s.k!=='mp')cur.ev[s.k]=0})}
    else if(b.dataset.lv){cur.nivel=+b.dataset.lv}
    else if(b.dataset.q==='cp'){
      const t=`${cur.nombre||'Criatura'} (Nv ${cur.nivel})\n`+STATS.map(s=>{const B=+cur.base[s.k]||0,E=s.k==='mp'?0:(+cur.ev[s.k]||0);return `${s.s}: B=${B} E=${E} -> ${Math.round(calc(cur.f[s.k],B,cur.nivel,E))}`}).join('\n');
      try{await navigator.clipboard.writeText(t);toast('Resumen copiado')}catch(x){toast('No se pudo copiar')}return;
    }
    fillForm();refresh();
  });
}
/* ---------- Reglas: UI ---------- */
const RUL=[['wea','Climas','Objeto: clave → {n:nombre, dmg:{Tipo:mult}, def:{Tipo:mult}, spd:{Tipo:mult}}. El daño residual de «ob» es fijo.'],['sts','Estados alterados','Clave → {atk,def,matk,mdef,spd: multiplicador, tick: fracción de HP por turno}.'],['rangos','Rangos de estadística base','Lista de [valor base máximo (exclusivo), nombre, color] en la escala 1–255. Por defecto: <30 Muy bajo, <70 Bajo, <100 Medio, <140 Alto, resto Épico.'],['maxE','Esfuerzo máximo por stat','Número.'],['defF','Fórmulas por defecto (criaturas nuevas)','Objeto {hp, mp, stat}. Funciones: floor, ceil, round, sqrt, abs, min, max.']];
const saveRules=()=>{try{localStorage.setItem(KEYR,JSON.stringify(getR()))}catch(e){toast('No se pudo guardar')}};
function refreshW(){const wo=`<option value=''>Despejado (sin clima)</option>`+Object.entries(WEA).map(([k,v])=>`<option value='${k}'>${esc(v.n)}</option>`).join('');const a=$('w4').value,b=$('w4b').value;$('w4').innerHTML=wo;$('w4b').innerHTML=wo;$('w4').value=WEA[a]?a:'';$('w4b').value=WEA[b]?b:''}
function rulesUI(){
  $('xrules').innerHTML=RUL.map(([k,t,h])=>`<details><summary><span>${t}</span></summary><div><p class="hint">${h}</p><textarea data-rk="${k}" rows="6" spellcheck="false"></textarea><div class="row" style="margin-top:6px"><button class="sm pri" data-ra="${k}">Aplicar</button><button class="sm" data-rd="${k}">Restablecer</button></div></div></details>`).join('');
  const fill=()=>RUL.forEach(([k])=>{document.querySelector(`[data-rk="${k}"]`).value=JSON.stringify(getR()[k],null,1)});fill();
  const post=()=>{saveRules();refreshW();fillSet4();fillFormulas();refresh();fill()};
  $('xrules').addEventListener('click',e=>{
    const a=e.target.closest('[data-ra]'),d=e.target.closest('[data-rd]');
    if(a){const k=a.dataset.ra;try{const v=JSON.parse(document.querySelector(`[data-rk="${k}"]`).value);
      if(k==='maxE'?!(+v>0):k==='rangos'?!Array.isArray(v):(typeof v!=='object'||v===null||Array.isArray(v)))throw 0;
      if(k==='defF'&&!['hp','mp','stat'].every(c=>typeof v[c]==='string'&&compile(v[c]).ok))throw Error('fórmula inválida');
      applyRules({[k]:v});post();toast('Regla aplicada')}catch(x){toast(x&&x.message?x.message:'JSON no válido para esta regla')}}
    if(d){const k=d.dataset.rd;applyRules({[k]:JSON.parse(JSON.stringify(R0[k]))});post();toast('Regla restablecida')}
  });
}
/* ---------- Proyecto completo ---------- */
const ALLK={equipos:KEYEQ,partidas:KEYPA,criaturas:KEY,ataques:KEY3,habilidades:KEYH,tipos:KEY2,combate:KEY4,reglas:KEYR};
function allInit(){
  $('xe').onclick=()=>{const o={version:SCHEMA};Object.entries(ALLK).forEach(([n,k])=>{try{o[n]=JSON.parse(localStorage.getItem(k)||'null')}catch(e){}});$('xj').value=JSON.stringify(o,null,2);toast('Proyecto exportado')};
  $('xc').onclick=async()=>{if(!$('xj').value)$('xe').click();try{await navigator.clipboard.writeText($('xj').value);toast('Copiado')}catch(e){$('xj').select()}};
  const imp=t=>{try{const o=JSON.parse(t);if(!o||typeof o!=='object')throw 0;if(o.version>SCHEMA){toast('Este archivo es de una versión más nueva ('+o.version+')');return}Object.entries(ALLK).forEach(([n,k])=>{if(o[n]!=null)localStorage.setItem(k,JSON.stringify(o[n]))});toast('Importado: recargando…');setTimeout(()=>location.reload(),600)}catch(e){toast('JSON no válido')}};
  $('xi').onclick=()=>imp($('xj').value);
  $('xdemo').onclick=e=>{const b=e.currentTarget;if(b.dataset.armed){imp($('xdemo_d').textContent)}else{b.dataset.armed=1;b.textContent='¿Seguro? Sustituye tus datos';setTimeout(()=>{delete b.dataset.armed;b.textContent='Cargar datos de prueba'},2500)}};
  $('xfile').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$('xj').value=r.result;imp(r.result)};r.readAsText(f);e.target.value=''};
  $('xr').onclick=e=>{const b=e.currentTarget;if(b.dataset.armed){Object.values(ALLK).forEach(k=>localStorage.removeItem(k));location.reload()}else{b.dataset.armed=1;b.textContent='¿Seguro? Borra todo';setTimeout(()=>{delete b.dataset.armed;b.textContent='Restablecer proyecto'},2500)}};
}
f2load();
build();fillForm();bind();refresh();renderList();f2init();f3init();f4init();hInit();tabsInit();dragList();
qtools();rulesUI();allInit();refreshW();fillTE();rCons(true);rOfen();
$('xte').addEventListener('change',syncTE);$('xtapl').onclick=applyTypeEdit;
['xcp','xcs','xch'].forEach(id=>$(id).addEventListener('change',()=>rCons()));
$('xochips').addEventListener('click',e=>{const b=e.target.closest('[data-o]');if(!b)return;const n=b.dataset.o;OS.has(n)?OS.delete(n):OS.add(n);rOfen()});
try{const o=JSON.parse(localStorage.getItem('rpg_calculator_def_skills')||'null');
  if(o&&Array.isArray(o.skills)&&!localStorage.getItem('rpg_mig_skills')){
    o.skills.forEach(s=>{const fx=Object.entries(s.modifiers||{}).filter(([t,m])=>+m!==1&&TIPOS.some(x=>x[0]===t)).map(([t,m])=>+m===0?{k:'imm',tipo:t}:{k:'res',tipo:t,m:+m});
      if(s.name&&fx.length&&!H.some(h=>h.nombre===s.name))H.push({id:uid(),nombre:s.name,desc:s.desc||'',fx})});
    saveH();fillHab();listH();localStorage.setItem('rpg_mig_skills','1')}}catch(e){}

function dragList(){
  const L=$('list');let id=null;
  L.addEventListener('dragstart',e=>{const c=e.target.closest('.card[data-id]');if(!c)return;id=c.dataset.id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);c.style.opacity='.5'});
  L.addEventListener('dragover',e=>{const c=e.target.closest('.card[data-id]');if(!id||!c)return;e.preventDefault();L.querySelectorAll('.over').forEach(x=>x.classList.remove('over'));if(c.dataset.id!==id)c.classList.add('over')});
  L.addEventListener('drop',e=>{const c=e.target.closest('.card[data-id]');if(!id||!c)return;e.preventDefault();const i=db.findIndex(x=>x.id===id),j=db.findIndex(x=>x.id===c.dataset.id);if(i>=0&&j>=0&&i!==j){const [x]=db.splice(i,1);db.splice(j,0,x);persist();renderList()}id=null});
  L.addEventListener('dragend',()=>{id=null;renderList()});
}
function subInit(key,place,grid,cP,vP){const bar=document.createElement('div');bar.className='sb';bar.innerHTML="<button data-v='c'><i class='ic ic-lapiz'></i>Crear</button><button data-v='v'><i class='ic ic-ojo'></i>Ver</button>";place(bar);grid.classList.add('one');const go=v=>{cP.forEach(e=>e.classList.toggle('hid',v!=='c'));vP.forEach(e=>e.classList.toggle('hid',v!=='v'));bar.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));try{localStorage.setItem('rpg_sub_'+key,v)}catch(e){}};bar.onclick=e=>{const b=e.target.closest('button');if(b)go(b.dataset.v)};let v='c';try{v=localStorage.getItem('rpg_sub_'+key)||'c'}catch(e){}go(v==='v'?'v':'c');return go}
function tabsInit(){cleanHP();
  const P=[document.querySelector('main'),$('fase2').parentNode,$('fase3').parentNode,$('fase5').parentNode,$('fase7').parentNode,$('fase4').parentNode,$('fase8').parentNode,$('fase6').parentNode],ids=['criaturas','tipos','ataques','habilidades','objetos','combate','equilibrio','reglas'],bs=document.querySelectorAll('#nav button');
  const go=i=>{if(i===1){try{rCons(true);rOfen()}catch(e){}}if(i===4){try{objRender()}catch(e){}}if(i===5){try{fillSet4()}catch(e){}}if(i===6){try{eqRefresh()}catch(e){}}P.forEach((p,j)=>p.classList.toggle('hid',j!==i));bs.forEach((b,j)=>{b.classList.toggle('on',j===i);b.setAttribute('aria-pressed',j===i)});try{localStorage.setItem('rpg_tab',i)}catch(e){}window.scrollTo(0,0)};
  bs.forEach((b,j)=>b.onclick=()=>go(j));
  let i=ids.indexOf(location.hash.slice(1));
  if(i<0){try{i=+localStorage.getItem('rpg_tab')||0}catch(e){i=0}}
  const ed=(el,go)=>el.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&/editar|cargar/i.test(b.textContent))go('c')});
  const main=document.querySelector('main'),[cL,vR]=main.querySelectorAll(':scope>div'),svr=$('save').parentNode;cL.insertBefore(svr,cL.firstChild);svr.style.margin='0 0 16px';
  const g1=subInit('cr',b=>main.prepend(b),main,[cL],[vR]);ed($('list'),g1);$('lq').addEventListener('input',renderList);
  {const f=$('f3form').parentNode,g=subInit('at',b=>f.before(b),f,[$('f3form')],[$('f3form').nextElementSibling]);ed($('l3'),g)}
  {const f=$('f5form').parentNode,g=subInit('hb',b=>f.before(b),f,[$('f5form')],[$('f5form').nextElementSibling]);ed($('hl'),g);$('hq').addEventListener('input',listH)}
  go(Math.max(0,Math.min(7,i)));
}
