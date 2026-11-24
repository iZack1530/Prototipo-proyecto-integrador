/* Efectos: el MP3 se descarga una vez con fetch(url).arrayBuffer(). */
(function(){
const $=id=>document.getElementById(id),ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
let ctx=null,buf=null,on=ls.get('rpg_sfx')!=='off',voices=[],last=0;const btn=$('xsfx');
const ui=()=>{btn.classList.toggle('off',!on);btn.setAttribute('aria-pressed',on);btn.title=on?'Silenciar efectos de sonido':'Activar efectos de sonido';btn.setAttribute('aria-label',btn.title)};
async function init(){if(ctx)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;ctx=new AC();const r=await fetch('../assets/audio/efectos.mp3'),ab=await r.arrayBuffer();ctx.decodeAudioData(ab,b=>{buf=b;window.rpgLab.sfxListo=true},()=>{})}catch(e){}}
function play(){if(!on||!ctx||!buf)return;if(ctx.state==='suspended')ctx.resume();const t=performance.now();if(t-last<70)return;last=t;const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buf;g.gain.value=window.rpgVol?rpgVol.sfx:.5;s.connect(g);g.connect(ctx.destination);s.start();voices.push(s);s.onended=()=>{voices=voices.filter(v=>v!==s)};while(voices.length>3){try{voices.shift().stop()}catch(e){}}}
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#xsfx'))return;play()},true);
document.addEventListener('change',e=>{if(e.target&&e.target.tagName==='SELECT')play()},true);
btn.onclick=()=>{on=!on;ls.set('rpg_sfx',on?'on':'off');ui();if(on)play()};
ui();init();window.rpgLab.sfx=()=>({on,listo:!!buf});
})();
