/* Laboratorio RPG — Música de fondo y botón de tema */
(function(){
const $=id=>document.getElementById(id),root=document.documentElement;
const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
const setT=t=>{root.dataset.theme=t;$('xtema').innerHTML=t==='dark'?'<i class="ic ic-sol"></i>':'<i class="ic ic-luna"></i>';$('xtema').title=t==='dark'?'Modo claro':'Modo oscuro (cálido)';$('xtema').setAttribute('aria-label',$('xtema').title)};
setT(root.dataset.theme||'light');
$('xtema').onclick=()=>{const t=root.dataset.theme==='dark'?'light':'dark';ls.set('rpg_tema',t);setT(t)};
const a=$('xbgm'),b=$('xmus');let vt;
a.src='assets/audio/musica-menu.mp3';
const IDS={menu:'assets/audio/musica-menu.mp3',combate:'assets/audio/musica-combate.mp3',ultimo:'assets/audio/musica-ultimo.mp3'};let curT='menu',swap=0;
const trk=k=>IDS[k]||'';
function setTrack(k){
  if(!IDS[k]||k===curT)return;curT=k;const id=++swap,was=!a.paused,pref=ls.get('rpg_musica')!=='off';
  const go=()=>{if(id!==swap)return;a.src=trk(k);a.currentTime=0;if(pref)play().catch(()=>{})};
  if(!was){go();return}
  clearInterval(vt);const st=setInterval(()=>{a.volume=Math.max(0,a.volume-.08);if(a.volume<=0){clearInterval(st);go()}},40);
}
window.rpgMusic={set:setTrack,get:()=>curT};
const ui=()=>{const on=!a.paused;b.classList.toggle('off',!on);b.setAttribute('aria-pressed',on);b.title=on?'Silenciar música':'Activar música';b.setAttribute('aria-label',b.title)};
const fade=()=>{clearInterval(vt);a.volume=0;vt=setInterval(()=>{const mv=window.rpgVol?rpgVol.mus:.45;a.volume=Math.min(mv,a.volume+.03);if(a.volume>=mv)clearInterval(vt)},80)};
const play=()=>{fade();const p=a.play&&a.play();if(!p||!p.then){ui();return Promise.resolve()}return p.then(ui).catch(()=>{a.volume=window.rpgVol?rpgVol.mus:.45;ui();return Promise.reject()})};
a.addEventListener('play',ui);a.addEventListener('pause',ui);
b.onclick=()=>{if(a.paused){ls.set('rpg_musica','on');play().catch(()=>{})}else{ls.set('rpg_musica','off');a.pause()}};
ui();
if(ls.get('rpg_musica')!=='off'){
  const EV=['pointerdown','mousedown','pointerup','click','keydown','touchend'];
  const off=()=>EV.forEach(e=>removeEventListener(e,kick,true));
  const kick=e=>{if(e.target.closest&&e.target.closest('#xmus')){off();return}play().then(off).catch(()=>{})};
  play().catch(()=>{EV.forEach(e=>addEventListener(e,kick,true));if(window.toast)toast('Haz clic en cualquier parte para activar la música')});
}
})();
