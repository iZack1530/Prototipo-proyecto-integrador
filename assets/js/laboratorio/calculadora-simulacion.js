/* Laboratorio RPG — Calculadora de daño y simulación masiva */
(function(){
const $=id=>document.getElementById(id);
const opt=(v,l,sel)=>`<option value="${esc(v)}"${sel?' selected':''}>${esc(l)}</option>`;
const chips=t=>(t||[]).map(x=>`<span class="chip" style="background:${tcol(x)}">${esc(x)}</span>`).join(' ');
const pct=v=>(v*100).toFixed(1)+'%';
const mkR=txt=>{let a=xmur3(String(txt))()|0;return()=>{a=(a+0x6D2B79F5)|0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}};
const dl=(n,t,mime)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:mime||'text/plain'}));a.download=n;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)};
/* ======== calculadora de daño (usa hit() del motor) ======== */
function calcDano(o){
  const pS=S,pR=RNGs,pL=LGMODE,pA=AIX,cap=[];
  try{
    const u=mk(o.atk,{pas:o.atkPas||'',ofe:o.atkOfe||''},0),t=mk(o.def,{pas:o.defPas||'',ofe:''},1);
    u.status=o.stA||null;t.status=o.stD||null;
    if(o.boA)u.bo[o.m.cat==='fis'?'ATK':'MATK']=+o.boA;
    if(o.boD)t.bo[o.m.cat==='fis'?'DEF':'MDEF']=+o.boD;
    t.prot=+o.prot>0;t.gl=+o.prot||1;if(+o.guard>0)t.guards=[{v:Math.min(100,+o.guard),d:'all'}];
    S={w:o.w||'',t:[[u],[t]],a:[[0],[0]],bag:[{},{}],over:false,n:0};AIX=null;LGMODE={cap};
    const mult=o.area?(o.m.aoe||75)/100:1,d=o.m.cat==='est'?0:hit(u,t,o.m,mult,!!o.crit);
    let ty=1;t.tipos.forEach(x=>ty*=gv(o.m.tipo,x));
    return{d,ty,cap,u,t}
  }finally{S=pS;RNGs=pR;LGMODE=pL;AIX=pA}
}
const SK=[['hp','Vida'],['mp','Maná'],['atk','Ataque'],['def','Defensa'],['matk','P. mágico'],['mdef','D. mágica'],['spd','Velocidad']];
function eqRefresh(){
  const cs=db.map(c=>opt(c.id,c.nombre||'(sin nombre)')).join(''),keep=id=>$(id)?$(id).value:'';
  const set=(id,h)=>{const e=$(id);if(!e)return;const v=e.value;e.innerHTML=h;if([...e.options].some(o=>o.value===v))e.value=v};
  set('xc_a',cs);set('xc_d',cs);
  const ip='<option value="">Ninguno</option>'+Object.keys(PAS).map(n=>opt(n,n)).join(''),io='<option value="">Ninguno</option>'+Object.keys(OFE).map(n=>opt(n,n)).join('');
  set('xc_ap',ip);set('xc_ao',io);set('xc_dp',ip);
  const st='<option value="">Ninguno</option>'+Object.keys(STS).map(n=>opt(n,n)).join('');set('xc_as',st);set('xc_ds',st);
  const wh='<option value="">Despejado</option>'+Object.entries(WEA).map(([k,w])=>opt(k,w.n)).join('');set('xc_w',wh);set('xs_w','<option value="*">Aleatorio por combate</option>'+wh);
  set('xs_f','<option value="">(todas)</option>'+cs);
  fillMoves();calcRender();
}
function fillMoves(){
  const c=db.find(x=>x.id===$('xc_a').value),own=c?(c.atk||[]).map(id=>A.find(a=>a.id===id)).filter(Boolean):[];
  const rest=A.filter(a=>!own.includes(a)),v=$('xc_m').value;
  $('xc_m').innerHTML=(own.length?`<optgroup label="Del atacante">${own.map(a=>opt(a.id,`${a.nombre} (${a.tipo} · ${a.pot})`)).join('')}</optgroup>`:'')+(rest.length?`<optgroup label="Resto del catálogo">${rest.map(a=>opt(a.id,`${a.nombre} (${a.tipo} · ${a.pot})`)).join('')}</optgroup>`:'');
  if([...$('xc_m').options].some(o=>o.value===v))$('xc_m').value=v;
}
function inputs(){return{atk:db.find(x=>x.id===$('xc_a').value),def:db.find(x=>x.id===$('xc_d').value),m:A.find(a=>a.id===$('xc_m').value),w:$('xc_w').value,atkPas:$('xc_ap').value,atkOfe:$('xc_ao').value,defPas:$('xc_dp').value,stA:$('xc_as').value,stD:$('xc_ds').value,boA:$('xc_ab').value,boD:$('xc_db').value,guard:$('xc_gd').value,prot:$('xc_pr').value,area:$('xc_ar').checked}}
function calcRender(){
  const o=inputs(),out=$('xec_out');
  if(!o.atk||!o.def||!o.m){out.innerHTML='<p class="hint">Crea al menos una criatura y un ataque para usar la calculadora.</p>';$('xc_all').innerHTML='';return}
  const r=calcDano(o),rcr=o.m.cat==='est'?null:calcDano({...o,crit:true}),mh=r.t.maxhp,hits=r.d>0?Math.ceil(mh/r.d):null;
  const ln=r.cap.find(x=>x.includes('Cálculo'))||'';
  const stt=(f,l)=>`<div class="fx">${retHTML(f.cid,46)}<b>${esc(l)}</b><div class="hint">${SK.map(([k,n])=>n+' '+(k==='hp'||k==='mp'?Math.round(k==='hp'?f.maxhp:f.maxmp):Math.round(f.st[k]))).join(' · ')}</div></div>`;
  out.innerHTML=`<div class="grid g3"><div class="fx"><div class="hint">Daño</div><div class="big">${o.m.cat==='est'?'—':r.d}</div><div class="hint">${o.m.cat==='est'?'Ataque de estado: no inflige daño directo':(r.ty===0||r.d===0?'No afecta (inmunidad)':('Sin variación aleatoria · Con crítico ('+r.u.crit+'%): '+rcr.d))}</div></div>
  <div class="fx"><div class="hint">% de la vida del defensor</div><div class="big">${o.m.cat==='est'?'—':pct(r.d/mh)}</div><div class="hint">Vida máx. ${mh}</div></div>
  <div class="fx"><div class="hint">Golpes para derrotarlo</div><div class="big">${hits==null?'—':hits}</div><div class="hint">Efectividad de tipo ×${+r.ty.toFixed(3)}</div></div></div>
  <div class="fx" style="margin:8px 0"><b>Desglose</b><div class="hint" style="white-space:normal">${esc(ln.trim()||'Sin cálculo')}</div></div>
  <div class="grid g3">${stt(r.u,'Atacante: '+(o.atk.nombre||''))}${stt(r.t,'Defensor: '+(o.def.nombre||''))}<div class="fx"><b>Efectos del ataque</b><div class="hint" style="white-space:normal">${(o.m.fx||[]).length?o.m.fx.map(f=>`${FXN[f.k]||f.k}${f.p!=null?' ('+f.p+'%)':''}`).join(' · '):'Sin efectos secundarios'}${o.m.prio?' · Prioridad +'+o.m.prio:''}</div></div></div>`;
  const best=$('xc_mode').value==='b',own=(o.atk.atk||[]).map(id=>A.find(a=>a.id===id)).filter(Boolean).filter(a=>a.cat!=='est');
  const R2=db.map(dd=>{let b=null;(best?own:[o.m]).forEach(m=>{if(m.cat==='est')return;const q=calcDano({...o,def:dd,m});if(!b||q.d>b.d)b={d:q.d,ty:q.ty,mh:q.t.maxhp,m}});return b?{c:dd,...b}:{c:dd,d:0,ty:1,mh:1,m:o.m}}).sort((a,b)=>b.d/b.mh-a.d/a.mh);
  $('xc_all').innerHTML=`<table class="mx"><tr><th>Defensor</th><th>Tipos</th><th>Tipo ×</th>${best?'<th>Mejor ataque</th>':''}<th>Daño</th><th>% vida</th><th>Golpes</th></tr>${R2.map(x=>`<tr><td>${retHTML(x.c,26)} <b>${esc(x.c.nombre||'')}</b></td><td>${chips(x.c.tipos)}</td><td>×${+x.ty.toFixed(3)}</td>${best?`<td>${esc(x.m.nombre)}</td>`:''}<td>${x.d}</td><td>${pct(x.d/x.mh)}</td><td>${x.d>0?Math.ceil(x.mh/x.d):'—'}</td></tr>`).join('')}</table>`;
}
/* ======== simulación masiva ======== */
const poolOK=()=>db.filter(c=>{try{return mk(c,{pas:'',ofe:''},0).mv.length>=5}catch(e){return false}});
const TPL=new Map();
function mkUnit(c,pas,ofe,s){
  const k=c.id+'|'+pas+'|'+ofe;let t=TPL.get(k);if(!t){t=mk(c,{pas,ofe},0);TPL.set(k,t)}
  const u=Object.assign({},t,{side:s,bo:{HP:0,ATK:0,DEF:0,MATK:0,MDEF:0,SPD:0},low:{},status:null,ko:false,prot:false,trap:0,gc:0,cd:0,gl:0,gmp:0,rcv:false,blk:false,first:true,hp:t.bhp,maxhp:t.bhp,mp:t.maxmp,_d:0,_k:0,_in:0,cid:c.id});
  delete u.guards;delete u.lastPr;return u}
function aiFn(pol,R){
  return(s,pos)=>{
    const ti=S.a[s][pos],u=S.t[s][ti];if(!u||u.ko)return null;
    const foes=alive(1-s),bench=S.t[s].map((b,i)=>[b,i]).filter(([b,i])=>!b.ko&&!S.a[s].includes(i));
    const base={t:'atk',m:'',tg:'',it:'',ia:'',sw:bench.length?String(bench[0][1]):'',pv:bench.length?String(bench[0][1]):''};
    const rc={...base,t:'rc'},gd={...base,t:'pr'},canG=!u.blk;
    const tg=f=>(1-s)+':'+S.t[1-s].indexOf(f);
    const mvs=u.mv.filter(m=>u.mp>=cost(u,m));
    if(!foes.length)return rc;
    const threat=()=>{let t=0;foes.forEach(f=>f.mv.forEach(m=>{if(m.cat==='est'||f.mp<cost(f,m))return;const d=m.alc==='area'&&alive(s).length>1?hit(f,u,m,(m.aoe||75)/100):hit(f,u,m,1);if(d>t)t=d}));return t};
    const lvl=(u.lastPr?u.gc:0)+1,gf=GRD[Math.min(3,lvl)-1];
    const dsp=f=>({...base,m:DESP.id,tg:tg(f)});
    if(!mvs.length){
      if(pol==='al'){const o=[rc,dsp(foes[Math.floor(R()*foes.length)])];if(canG)o.push(gd);return o[Math.floor(R()*o.length)]}
      const kill=foes.find(f=>hit(u,f,DESP,1)>=f.hp);if(kill&&u.hp>u.maxhp*.1+1)return dsp(kill);
      const th=threat();
      if(th>=u.hp&&canG&&th*gf<u.hp)return gd;
      const weak=foes.slice().sort((x,y)=>x.hp/x.maxhp-y.hp/y.maxhp)[0];
      if(weak.hp<=weak.maxhp*.25&&u.hp>u.maxhp*.3&&th<u.hp)return dsp(weak);
      return rc;
    }
    if((pol==='gro'||pol==='in')&&u.hp/u.maxhp<.35){const it=Object.keys(S.bag[s]).find(k=>S.bag[s][k]>0&&CONS[k]&&CONS[k].t==='hp');if(it)return{...base,t:'it',it,ia:String(ti)}}
    if(pol==='al'){const m=mvs[Math.floor(R()*mvs.length)],f=foes[Math.floor(R()*foes.length)];return{...base,m:m.id,tg:tg(f)}}
    let bm=null,bt=foes[0],bv=-1,bd=0;
    mvs.forEach(m=>{
      if(m.cat==='est'){if(bv<.1){bv=.1;bm=m;bt=foes[0];bd=0}return}
      if(m.alc==='area'){let v=0;const mu=foes.length>1?(m.aoe||75)/100:1;foes.forEach(f=>{v+=Math.min(hit(u,f,m,mu),f.hp)});if(v>bv){bv=v;bm=m;bt=foes[0];bd=0}}
      else foes.forEach(f=>{const d=hit(u,f,m,1),v=Math.min(d,f.hp)*(d>=f.hp?1.3:1);if(v>bv){bv=v;bm=m;bt=f;bd=d}})});
    if(pol==='in'){
      const kills=bm&&bd>=bt.hp;
      if(!kills){
        const th=threat();
        if(th>=u.hp&&canG&&th*gf<u.hp)return gd;
        const minC=Math.min(...u.mv.map(m=>cost(u,m)));
        if(u.mp<minC*1.5&&th<u.hp*.6)return rc;
      }
    }
    return{...base,m:(bm||mvs[0]).id,tg:tg(bt)}}}
window.rpgLab.aiFn=aiFn;window.rpgLab.mkR=mkR;
function battle(T,w,seed,pol,maxT,R){
  const prev={S,RNGs,AIX,LGMODE};
  try{
    const un=T.map((side,s)=>side.map(x=>mkUnit(x.c,x.pas,x.ofe,s)));
    S={w,t:un,a:un.map(t=>t.slice(0,3).map((_,i)=>i)),bag:[{...BAG0},{...BAG0}],over:false,n:0};
    const mv={};S.stat=(u,m,d,k)=>{u._d+=d;u._k+=k;const q=mv[m.id]||(mv[m.id]={n:0,d:0});q.n++;q.d+=d};
    LGMODE={};AIX=aiFn(pol,R);seedRng(seed);
    S.a.forEach((q,s)=>q.forEach(i=>enter(S.t[s][i])));
    let g=0;while(!S.over&&S.n<maxT&&g++<maxT+5)turn4();
    const dead=S.t.map(t=>t.every(f=>f.ko));
    return{win:(dead[0]&&dead[1])?-1:dead[1]?0:dead[0]?1:-1,turns:S.n,un,mv}
  }finally{S=prev.S;RNGs=prev.RNGs;AIX=prev.AIX;LGMODE=prev.LGMODE}
}
function simular(p,onProg,ctl){
  return new Promise((res,rej)=>{
    const P=poolOK();if(P.length<2)return rej(new Error('Hacen falta al menos 2 criaturas con 5 ataques'));
    const R=mkR(p.seed+':equipos'),RA=mkR(p.seed+':ia'),size=Math.min(+p.size||3,P.length),focus=P.find(c=>c.id===p.focus)||null;
    const jobs=[];
    if(p.mode==='d'){for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){if(focus&&P[i]!==focus&&P[j]!==focus)continue;for(let k=0;k<p.n;k++)jobs.push([P[i],P[j],k])}}
    else for(let g=0;g<p.n;g++)jobs.push(null);
    const total=jobs.length;if(!total)return rej(new Error('No hay combates que simular'));
    const rItem=()=>({pas:Math.floor(R()*(Object.keys(PAS).length+1)),ofe:Math.floor(R()*(Object.keys(OFE).length+1))});
    const items=(c)=>{if(!+p.items)return{c,pas:'',ofe:''};const q=rItem(),kp=Object.keys(PAS),ko=Object.keys(OFE);return{c,pas:q.pas?kp[q.pas-1]:'',ofe:q.ofe?ko[q.ofe-1]:''}};
    const pick=(n,must)=>{const a=P.filter(c=>c!==must);for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return(must?[must]:[]).concat(a.slice(0,n-(must?1:0)))};
    const agg={},mvA={},tyA={},pair={};let draws=0,turns=0,done=0;const t0=Date.now();
    const A0=c=>agg[c.id]||(agg[c.id]={c,n:0,w:0,d:0,k:0,s:0});
    const ws=Object.keys(WEA);
    const run=idx=>{
      let T;
      if(p.mode==='d'){const [a,b,k]=jobs[idx];T=k%2?[[items(b)],[items(a)]]:[[items(a)],[items(b)]]}
      else{T=[pick(size,focus).map(items),pick(size).map(items)]}
      const w=p.w==='*'?['',...ws][Math.floor(R()*(ws.length+1))]:p.w;
      const r=battle(T,w,p.seed+'#'+idx,p.ai,p.maxT,RA);turns+=r.turns;if(r.win<0)draws++;
      r.un.forEach((side,s)=>side.forEach(u=>{if(!u._in)return;const a=A0(db.find(c=>c.id===u.cid)),sc=r.win<0?.5:(r.win===s?1:0);a.n++;a.w+=sc;a.d+=u._d;a.k+=u._k;if(!u.ko)a.s++;
        u.tipos.forEach(t=>{const q=tyA[t]||(tyA[t]={n:0,w:0});q.n++;q.w+=sc})}));
      if(p.mode==='d'){const [x,y]=r.un.map(s=>s[0].cid);const sx=r.win<0?.5:(r.win===0?1:0);const kk=x+'>'+y,k2=y+'>'+x;(pair[kk]=pair[kk]||{n:0,w:0}).n++;pair[kk].w+=sx;(pair[k2]=pair[k2]||{n:0,w:0}).n++;pair[k2].w+=1-sx}
      Object.entries(r.mv).forEach(([id,q])=>{const m=mvA[id]||(mvA[id]={n:0,d:0});m.n+=q.n;m.d+=q.d});
    };
    const step=()=>{
      if(ctl&&ctl.stop)return rej(new Error('Simulación cancelada'));
      const t1=Date.now();
      try{while(done<total&&Date.now()-t1<30){run(done);done++}}catch(e){return rej(e)}
      if(onProg)onProg(done,total);
      if(done<total)setTimeout(step,0);
      else{const rows=Object.values(agg).map(a=>({id:a.c.id,nombre:a.c.nombre,tipos:a.c.tipos,n:a.n,wr:a.w/a.n,dmg:a.d/a.n,ko:a.k/a.n,sup:a.s/a.n}));
        res({params:p,total,draws,turnosMedios:turns/total,ms:Date.now()-t0,rows,pair,mv:mvA,tipos:tyA,pool:P.map(c=>c.id),datosHash:window.rpgLab.datosHash()})}
    };
    setTimeout(step,0);
  })}
function renderSim(r){
  const hi=+$('xs_hi').value/100,lo=+$('xs_lo').value/100,rows=r.rows.slice().sort((a,b)=>b.wr-a.wr);
  const flag=x=>x.wr>=hi?'<span class="chip" style="background:#ef4444">Dominante</span>':x.wr<=lo?'<span class="chip" style="background:#38bdf8">Débil</span>':'';
  const heat=v=>`background:${v>=.5?`rgba(47,158,91,${(.12+(v-.5)*1.4).toFixed(2)})`:`rgba(181,56,44,${(.12+(.5-v)*1.4).toFixed(2)})`}`;
  let h=`<p class="hint">${r.total} combates · ${r.draws} empates (límite de turnos) · ${r.turnosMedios.toFixed(1)} turnos de media · ${(r.ms/1000).toFixed(1)} s · semilla «${esc(r.params.seed)}» · datos ${r.datosHash}</p>`;
  h+=`<h3>Criaturas</h3><div class="mxw"><table class="mx"><tr><th>Criatura</th><th>Tipos</th><th>Combates</th><th>Victorias</th><th>Daño medio</th><th>KO causados</th><th>Sobrevive</th><th></th></tr>${rows.map(x=>`<tr><td>${retHTML(x.id,26)} <b>${esc(x.nombre||'')}</b></td><td>${chips(x.tipos)}</td><td>${x.n}</td><td style="${heat(x.wr)}">${pct(x.wr)}</td><td>${x.dmg.toFixed(0)}</td><td>${x.ko.toFixed(2)}</td><td>${pct(x.sup)}</td><td>${flag(x)}</td></tr>`).join('')}</table></div>`;
  const ty=Object.entries(r.tipos).map(([t,q])=>({t,n:q.n,wr:q.w/q.n})).sort((a,b)=>b.wr-a.wr);
  h+=`<h3>Por tipo</h3><div class="mxw"><table class="mx"><tr><th>Tipo</th><th>Apariciones</th><th>Victorias</th></tr>${ty.map(x=>`<tr><td>${chips([x.t])}</td><td>${x.n}</td><td style="${heat(x.wr)}">${pct(x.wr)}</td></tr>`).join('')}</table></div>`;
  const mv=Object.entries(r.mv).map(([id,q])=>({m:A.find(a=>a.id===id),n:q.n,avg:q.d/q.n,tot:q.d})).filter(x=>x.m).sort((a,b)=>b.tot-a.tot);
  h+=`<h3>Ataques</h3><div class="mxw"><table class="mx"><tr><th>Ataque</th><th>Tipo</th><th>Categoría</th><th>Usos</th><th>Daño medio por uso</th><th>Daño total</th></tr>${mv.map(x=>`<tr><td><b>${esc(x.m.nombre)}</b></td><td>${chips([x.m.tipo])}</td><td>${CATN[x.m.cat]||''}</td><td>${x.n}</td><td>${x.avg.toFixed(1)}</td><td>${Math.round(x.tot)}</td></tr>`).join('')}</table></div>`;
  if(r.params.mode==='d'&&rows.length<=40){const ids=rows.map(x=>x.id),nm=Object.fromEntries(rows.map(x=>[x.id,x.nombre]));
    h+=`<h3>Matriz de victorias (fila contra columna)</h3><div class="mxw"><table class="mx"><tr><th></th>${ids.map(i=>`<th>${esc(nm[i])}</th>`).join('')}</tr>${ids.map(a=>`<tr><th>${esc(nm[a])}</th>${ids.map(b=>{const q=r.pair[a+'>'+b];return a===b||!q?'<td>—</td>':`<td style="${heat(q.w/q.n)}">${(q.w/q.n*100).toFixed(0)}%</td>`}).join('')}</tr>`).join('')}</table></div>`}
  h+=`<div class="row"><button id="xs_csv">Copiar CSV</button><button id="xs_json" class="am">Descargar informe (JSON)</button></div>`;
  $('xs_res').innerHTML=h;LAST=r;
  $('xs_csv').onclick=async()=>{const t='criatura;tipos;combates;victorias;dano_medio;ko_causados;sobrevive\n'+rows.map(x=>[x.nombre,(x.tipos||[]).join('/'),x.n,(x.wr*100).toFixed(1),x.dmg.toFixed(1),x.ko.toFixed(2),(x.sup*100).toFixed(1)].join(';')).join('\n');try{await navigator.clipboard.writeText(t);toast('CSV copiado')}catch(e){toast('No se pudo copiar')}};
  $('xs_json').onclick=()=>dl('informe_equilibrio.json',JSON.stringify(r,null,1),'application/json');
}
let LAST=null,CTL=null;
function simUI(){
  const lab=(id,l,c)=>`<div><label for="${id}">${l}</label>${c}</div>`;
  $('xesim').innerHTML=`<div class="grid g3">${lab('xs_mode','Modo','<select id="xs_mode"><option value="d">Duelos 1v1 (todos contra todos)</option><option value="t">Equipos aleatorios</option></select>')}${lab('xs_n','<span id="xs_nl">Combates por pareja</span>','<input id="xs_n" type="number" value="4" min="1" max="2000">')}${lab('xs_size','Tamaño de equipo (modo equipos)','<select id="xs_size"><option>3</option><option>6</option></select>')}
  ${lab('xs_ai','Estrategia de los jugadores','<select id="xs_ai"><option value="in">Inteligente (Guardia, Recuperación y Esfuerzo desesperado)</option><option value="gr">Voraz (el ataque que más daña)</option><option value="gro">Voraz + usa curas con poca vida</option><option value="al">Aleatoria</option></select>')}${lab('xs_it','Objetos equipados','<select id="xs_it"><option value="0">Ninguno</option><option value="1">Aleatorios</option></select>')}${lab('xs_w','Clima','<select id="xs_w"></select>')}
  ${lab('xs_f','Criatura foco (opcional)','<select id="xs_f"></select>')}${lab('xs_t','Límite de turnos','<input id="xs_t" type="number" value="60" min="5" max="500">')}${lab('xs_seed','Semilla base','<input id="xs_seed" value="equilibrio-1">')}
  ${lab('xs_hi','Umbral «dominante» (% victorias)','<input id="xs_hi" type="number" value="60" min="50" max="100">')}${lab('xs_lo','Umbral «débil» (% victorias)','<input id="xs_lo" type="number" value="40" min="0" max="50">')}</div>
  <p class="hint">Los combates usan el mismo motor que el simulador, con la semilla base: repetir la simulación con los mismos datos da el mismo resultado. Con foco, solo se simulan los combates de esa criatura.</p>
  <div class="row" style="margin:10px 0"><button id="xs_go" class="pri">Simular</button><button id="xs_stop" class="hid">Cancelar</button><span id="xs_st" class="hint"></span></div><div class="bar hid" id="xs_bar"><i style="width:0;background:var(--cy)"></i></div><div id="xs_res"></div>`;
  $('xs_mode').onchange=()=>{const d=$('xs_mode').value==='d';$('xs_nl').textContent=d?'Combates por pareja':'Número de combates';$('xs_n').value=d?4:500};
  $('xs_go').onclick=async()=>{
    const p={mode:$('xs_mode').value,n:Math.max(1,Math.min(2000,+$('xs_n').value||1)),size:+$('xs_size').value,ai:$('xs_ai').value,items:$('xs_it').value,w:$('xs_w').value,focus:$('xs_f').value,maxT:Math.max(5,+$('xs_t').value||60),seed:$('xs_seed').value||'equilibrio-1'};
    CTL={stop:false};$('xs_go').disabled=true;$('xs_stop').classList.remove('hid');$('xs_bar').classList.remove('hid');$('xs_res').innerHTML='';
    try{const r=await simular(p,(d,t)=>{$('xs_bar').firstChild.style.width=(d/t*100)+'%';$('xs_st').textContent=` ${d}/${t} combates`},CTL);renderSim(r);$('xs_st').textContent=' Listo'}
    catch(e){$('xs_st').textContent=' '+(e.message||'Error');toast(e.message||'Error')}
    $('xs_go').disabled=false;$('xs_stop').classList.add('hid');$('xs_bar').classList.add('hid')};
  $('xs_stop').onclick=()=>{if(CTL)CTL.stop=true};
  ['xs_hi','xs_lo'].forEach(id=>$(id).addEventListener('input',()=>{if(LAST)renderSim(LAST)}));
}
function calcUI(){
  const sel=(id,l)=>`<div><label for="${id}">${l}</label><select id="${id}"></select></div>`,num=(id,l,v,a,b)=>`<div><label for="${id}">${l}</label><input id="${id}" type="number" value="${v}" min="${a}" max="${b}"></div>`;
  $('xecalc').innerHTML=`<div class="grid g3"><div><h3>Atacante</h3>${sel('xc_a','Criatura')}${sel('xc_ap','Objeto pasivo')}${sel('xc_ao','Objeto ofensivo')}${sel('xc_as','Estado')}${num('xc_ab','Boost de ataque (−4 a +4)',0,-4,4)}</div>
  <div><h3>Ataque</h3>${sel('xc_m','Ataque')}${sel('xc_w','Clima')}<label style="display:block;margin-top:8px"><input type="checkbox" id="xc_ar"> Objetivo múltiple (área)</label></div>
  <div><h3>Defensor</h3>${sel('xc_d','Criatura')}${sel('xc_dp','Objeto pasivo')}${sel('xc_ds','Estado')}${num('xc_db','Boost de defensa (−4 a +4)',0,-4,4)}${num('xc_gd','Reducción de daño (%)',0,0,100)}<label style="display:block;margin-top:8px" for="xc_pr">Guardia</label><select id="xc_pr"><option value="0">Sin guardia</option><option value="1">1.ª guardia (−90%)</option><option value="2">2.ª guardia (−50%)</option><option value="3">3.ª guardia (−20%)</option></select></div></div>
  <div id="xec_out" style="margin-top:10px"></div>
  <h3>Comparar contra todas las criaturas</h3><div style="width:300px;margin-bottom:8px"><label for="xc_mode">Ataque a usar</label><select id="xc_mode"><option value="m">El ataque elegido</option><option value="b">El mejor ataque del atacante</option></select></div><div id="xc_all" class="mxw"></div>`;
  $('xc_a').addEventListener('change',()=>{fillMoves();calcRender()});
  $('xecalc').addEventListener('input',e=>{if(e.target.id!=='xc_a')calcRender()});
  $('xecalc').addEventListener('change',e=>{if(e.target.id!=='xc_a')calcRender()});
}
calcUI();simUI();
document.addEventListener('click',e=>{const b=e.target.closest('#xesb button');if(!b)return;document.querySelectorAll('#xesb button').forEach(x=>x.classList.toggle('on',x===b));$('xecalc').classList.toggle('hid',b.dataset.c!=='calc');$('xesim').classList.toggle('hid',b.dataset.c!=='sim')});
window.eqRefresh=eqRefresh;try{eqRefresh()}catch(e){}
Object.assign(window.rpgLab,{calcDano,simular,battle});
})();
