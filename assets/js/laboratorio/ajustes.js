/* Laboratorio RPG — Panel de ajustes, volumen, animaciones y pantalla completa */
(function(){
const $=id=>document.getElementById(id),ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
const set=$('xset'),scrim=$('xscrim'),menu=$('xmenu'),mus=$('xbgm');
let ret=null;
function open(){ret=document.activeElement;syncSet();set.classList.add('on');scrim.classList.add('on');menu.setAttribute('aria-expanded','true');setTimeout(()=>$('xsx').focus(),50)}
function close(){set.classList.remove('on');scrim.classList.remove('on');menu.setAttribute('aria-expanded','false');if(ret&&ret.focus)ret.focus()}
menu.onclick=()=>set.classList.contains('on')?close():open();
$('xsx').onclick=close;scrim.onclick=close;
document.addEventListener('keydown',e=>{
  if(!set.classList.contains('on'))return;
  if(e.key==='Escape'){close();return}
  if(e.key==='Tab'){const f=[...set.querySelectorAll('button:not([disabled]),input')],a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}});
/* volumen */
const vol=window.rpgVol||(window.rpgVol={mus:.45,sfx:.5});
const saveV=()=>ls.set('rpg_vol',JSON.stringify(vol));
$('xv_m').value=Math.round(vol.mus*100);$('xv_s').value=Math.round(vol.sfx*100);
$('xv_m').addEventListener('input',e=>{vol.mus=e.target.value/100;mus.volume=vol.mus;saveV();syncSet()});
$('xv_s').addEventListener('input',e=>{vol.sfx=e.target.value/100;saveV();syncSet()});
/* animaciones reducidas */
const setAnim=r=>{document.documentElement.classList.toggle('sin-anim',r);ls.set('rpg_anim',r?'off':'on');syncSet()};
if(ls.get('rpg_anim')==='off')document.documentElement.classList.add('sin-anim');
$('xan').onclick=()=>setAnim(!document.documentElement.classList.contains('sin-anim'));
/* pantalla completa */
const de=document.documentElement,fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement;
const fsOK=!!(document.fullscreenEnabled||document.webkitFullscreenEnabled);
$('xfs').onclick=async()=>{try{if(fsEl())await(document.exitFullscreen||document.webkitExitFullscreen).call(document);else await(de.requestFullscreen||de.webkitRequestFullscreen).call(de)}catch(e){toast('El navegador no permitió la pantalla completa en este contexto.')}};
['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,syncSet));
/* estado visible de cada ajuste */
function syncSet(){
  const dark=de.dataset.theme==='dark',pl=!mus.paused,sfx=window.rpgLab&&rpgLab.sfx?rpgLab.sfx().on:true,red=de.classList.contains('sin-anim');
  $('xz_t').textContent=dark?'Obsidiana (oscuro)':'Solar (claro)';
  $('xz_m').textContent=(pl?'Sonando':'Apagada')+' · volumen '+Math.round(vol.mus*100)+'%';
  $('xz_s').textContent=(sfx?'Activados':'Desactivados')+' · volumen '+Math.round(vol.sfx*100)+'%';
  $('xz_a').textContent=red?'Reducidas (más rápido)':'Normales';
  $('xan').classList.toggle('off',!red);$('xan').setAttribute('aria-pressed',red);
  $('xz_f').textContent=fsOK?(fsEl()?'Activada':'Desactivada'):'No disponible en este navegador';
  $('xfs').disabled=!fsOK;$('xfs').classList.toggle('off',!fsEl());$('xfs').setAttribute('aria-pressed',!!fsEl());
}
set.addEventListener('click',()=>setTimeout(syncSet,60));
['play','pause'].forEach(ev=>mus.addEventListener(ev,syncSet));
syncSet();
})();
