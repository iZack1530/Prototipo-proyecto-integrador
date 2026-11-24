/* Música: los objetos Audio se crean con new Audio(url) tras el primer clic. */
(function(){
const $=id=>document.getElementById(id),root=document.documentElement;
const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
const setT=t=>{root.dataset.theme=t;$('xtema').innerHTML=t==='dark'?'<i class="ic ic-sol"></i>':'<i class="ic ic-luna"></i>';$('xtema').title=t==='dark'?'Modo claro':'Modo oscuro (cálido)';$('xtema').setAttribute('aria-label',$('xtema').title)};
setT(root.dataset.theme||'light');
$('xtema').onclick=()=>{const t=root.dataset.theme==='dark'?'light':'dark';ls.set('rpg_tema',t);setT(t)};
const btn=$('xmus'),proxy=$('xbgm');
const URLS={menu:'../assets/audio/musica-menu.mp3',combate:'../assets/audio/musica-combate.mp3',ultimo:'../assets/audio/musica-ultimo.mp3'};
const audios={};let actual=null,pista='menu',arrancado=false;
proxy.volume=window.rpgVol?window.rpgVol.mus:.45;
proxy.addEventListener('volumechange',()=>{if(actual)actual.volume=proxy.volume});
const ui=()=>{const on=!!(actual&&!actual.paused);btn.classList.toggle('off',!on);btn.setAttribute('aria-pressed',on);btn.title=on?'Silenciar música':'Activar música';btn.setAttribute('aria-label',btn.title);proxy.dispatchEvent(new Event(on?'play':'pause'))};
function audioDe(k){if(!audios[k]){const a=new Audio(URLS[k]);a.loop=true;a.preload='auto';a.volume=proxy.volume;['play','pause'].forEach(ev=>a.addEventListener(ev,()=>{if(a===actual)ui()}));audios[k]=a}return audios[k]}
function sonar(k){const a=audioDe(k);if(actual&&actual!==a)actual.pause();actual=a;actual.volume=proxy.volume;try{actual.currentTime=0}catch(e){}const p=actual.play&&actual.play();if(!p||!p.then){ui();return Promise.resolve()}return p.then(ui).catch(()=>{ui();return Promise.reject()})}
function setTrack(k){if(!URLS[k]||(k===pista&&actual))return;pista=k;if(!arrancado){ui();return}return sonar(pista)}
window.rpgMusic={set:setTrack,get:()=>pista};
btn.onclick=e=>{e.stopPropagation();arrancado=true;if(actual&&!actual.paused){ls.set('rpg_musica','off');actual.pause();ui();return}ls.set('rpg_musica','on');sonar(pista).catch(()=>{})};
ui();
if(ls.get('rpg_musica')!=='off'){
  const EV=['pointerdown','mousedown','pointerup','click','keydown','touchend'];
  const quitar=()=>EV.forEach(ev=>window.removeEventListener(ev,arrancar,true));
  const arrancar=e=>{
    if(ls.get('rpg_musica')==='off'){quitar();return}
    if(e.target&&e.target.closest&&e.target.closest('#xmus'))return;
    quitar();arrancado=true;sonar(pista).catch(()=>{});
  };
  EV.forEach(ev=>window.addEventListener(ev,arrancar,true));
  if(window.toast)toast('Haz clic en cualquier parte para activar la música');
}
})();
