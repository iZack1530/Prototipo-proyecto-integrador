/* Laboratorio RPG — Interfaz: formularios, eventos y paneles */

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
  $('xdemo').onclick=e=>{const b=e.currentTarget;if(b.dataset.armed){imp(JSON.stringify(window.rpgDemo))}else{b.dataset.armed=1;b.textContent='¿Seguro? Sustituye tus datos';setTimeout(()=>{delete b.dataset.armed;b.textContent='Cargar datos de prueba'},2500)}};
  $('xfile').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$('xj').value=r.result;imp(r.result)};r.readAsText(f);e.target.value=''};
  $('xr').onclick=e=>{const b=e.currentTarget;if(b.dataset.armed){Object.values(ALLK).forEach(k=>localStorage.removeItem(k));location.reload()}else{b.dataset.armed=1;b.textContent='¿Seguro? Borra todo';setTimeout(()=>{delete b.dataset.armed;b.textContent='Restablecer proyecto'},2500)}};
}

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
