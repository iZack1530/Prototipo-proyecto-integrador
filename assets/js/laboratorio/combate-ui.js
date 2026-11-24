/* Laboratorio RPG — Interfaz del combate 3v3 (todo el DOM que antes vivía en motor.js). */
import { N, PUENTES } from './nucleo.js';

const $=id=>document.getElementById(id);
let tt;
function toast(m){const e=$('toast');e.textContent=m;e.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('on'),2200)}

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
const STCOL={'Quemadura':'#e0592a','Parálisis':'#d9b43a','Intoxicación':'#9a4fd0','Congelación':'#4aa8e0','Maldición':'#6b3fa0','Sangrado':'#b5303a'};
function renderOrd(list,title,hl){const b=$('ordbar');if(!b)return;b.innerHTML=list.length?`<div class='ordt'>${title}</div><div class='ordl'>${list.map((o,k)=>{const f=S.t[o.s][o.i];return `<div class='oi s${o.s}${hl===k?' on':''}${hl>k?' dn':''}'>${window.retHTML?retHTML(f.cid,28):''}<span><b>${esc(f.nm)}</b><small>${esc(o.l)} · prio ${o.p>0?'+':''}${o.p} · VEL ${o.spd}${o.tie?' ≈':''}</small></span></div>`}).join('<i class="oar">›</i>')}</div>`:''}
function previewOrder(){
  const L=[];[0,1].forEach(s=>S.a[s].forEach((ti,pos)=>{const u=S.t[s][ti];if(u.ko)return;const a=readAct(s,pos);if(!a)return;let t=a.t,m=a.m;if(t==='em'){t='atk';m=DESP.id}
    const mv=u.mv.find(x=>x.id===m)||(m===DESP.id?DESP:{}),first=u.first?Math.min(3,u.ab.reduce((q,f)=>q+(f.k==='pri'?f.v:0),0)):0;
    L.push({s,i:ti,l:actLbl(u,{t,m}),p:(PRI[t]||0)+(t==='atk'?Math.max(-3,Math.min(3,(mv.prio||0)+first)):0),spd:Math.round(eff(u,'spd'))})}));
  L.sort((x,y)=>y.p-x.p||y.spd-x.spd);tieMark(L);return L}
function renderPreview(){if(!S||!$('ordbar'))return;if(S.cpu!=null||S.gate){$('ordbar').innerHTML='';return}if(S.over||S.busy){if(S.over)$('ordbar').innerHTML='';return}renderOrd(previewOrder(),'Orden estimado del próximo turno · ≈ empate (se resuelve al azar)',-1)}
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
function alertSfx(){try{if(window.rpgLab&&rpgLab.sfx&&!rpgLab.sfx().on)return;const v=window.rpgVol&&rpgVol.sfx!=null?rpgVol.sfx:.5,C=new(window.AudioContext||window.webkitAudioContext)(),t0=C.currentTime;[[660,0],[495,.16],[330,.32]].forEach(([f,d])=>{const o=C.createOscillator(),g=C.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(0,t0+d);g.gain.linearRampToValueAtTime(.3*v,t0+d+.02);g.gain.exponentialRampToValueAtTime(.001,t0+d+.28);o.connect(g);g.connect(C.destination);o.start(t0+d);o.stop(t0+d+.3)});setTimeout(()=>{try{C.close()}catch(e){}},900)}catch(e){}}
const musicSet=k=>{try{PUENTES.music&&PUENTES.music.set(k)}catch(e){}};
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
/* Registro de puentes: el núcleo nunca ve el DOM. */
PUENTES.toast=toast;
PUENTES.arena=arena;
PUENTES.fillSet4=fillSet4;
PUENTES.f4init=f4init;
N.configUI({
  avisar:toast,
  registrarLog(m,c){const e=document.createElement('div');e.className=c||'';e.textContent=m;const box=$('lg4');if(box){box.appendChild(e);box.scrollTop=1e9}},
  leerAccion(s,pos){
    const c=document.querySelector(`.fc[data-s='${s}'][data-p='${pos}']`);if(!c)return null;
    const v=k=>{const e=c.querySelector(`[data-k=${k}]`);return e?e.value:''};
    return {t:v('act'),m:v('m'),tg:v('tg'),it:v('it'),ia:v('ia'),sw:v('sw'),pv:v('pv')};
  },
  arena,playTL,msg:showMsg,centro:paintCenter,inspector:renderInsp,
  clima(w){const e=$('w4b');if(e)e.value=w},
  iniciar(){const b=$('go4');if(b&&b.onclick)b.onclick()},
  actualizar(){arena(true);renderPreview()},
});
try{VEL=localStorage.getItem('rpg_vel')||'normal'}catch(e){}
try{STEP=localStorage.getItem('rpg_step')==='1'}catch(e){}
export {toast,arena,fillSet4,f4init,paintCenter,renderPreview,finDlg,renderInsp,playTL};

