/* Laboratorio RPG — Límites de estadísticas base */
(function(){
const $=id=>document.getElementById(id);let last=0;
const aviso=()=>{const t=Date.now();if(t-last>1500){last=t;toast(`Las estadísticas base deben estar entre ${BMIN} y ${BMAX} (total base de ${BMIN*STATS.length} a ${(BMAX*STATS.length).toLocaleString('es-MX')}).`)}};
const clamp=v=>Math.min(BMAX,Math.max(BMIN,v));
document.addEventListener('input',e=>{
  const i=e.target;if(!i||!i.matches||!i.matches('[data-b]')||i.value==='')return;
  let v=Number(i.value);if(!isFinite(v)){i.value=BMIN;aviso();return}
  const r=Math.round(v);if(r<BMIN||r>BMAX){v=clamp(r);aviso()}else v=r;
  if(String(v)!==i.value)i.value=v},true);
document.addEventListener('change',e=>{
  const i=e.target;if(!i||!i.matches||!i.matches('[data-b]'))return;
  const v=Number(i.value);if(i.value===''||!isFinite(v)||v<BMIN||v>BMAX||v!==Math.round(v)){i.value=clamp(Math.round(isFinite(v)&&i.value!==''?v:BMIN));aviso();i.dispatchEvent(new Event('input',{bubbles:true}))}},true);
$('save').addEventListener('click',()=>{if(normBase([cur])){fillForm();refresh();aviso()}},true);
const n=normBase(db);if(n){persist();setTimeout(()=>toast(`Se ajustaron ${n} valores base de criaturas guardadas al rango ${BMIN}–${BMAX}.`),600)}
window.rpgLab.normBase=normBase;
})();
