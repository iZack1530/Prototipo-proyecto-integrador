/* Punto único de enlace entre el núcleo puro (motor.js) y los módulos de la interfaz. */
import './motor.js';

export const N = globalThis.__rpgNucleo;
export const PUENTES = {
  toast(){}, arena(){}, fillSet4(){}, f4init(){}, iniciar(){},
  renderList(){}, fillForm(){}, refresh(){}, saveRules(){},
  objRender(){}, rCons(){}, rOfen(){}, eqRefresh(){},
  retHTML(){}, defHTML(){}, retRefresh(){}, tIcon(){}, sumHTML(){},
  demo:null, music:null,
};

/* Accesores no enumerables: los módulos usan identificadores normales y el
   núcleo conserva la propiedad de su estado, sin verterlo en window. */
const exponer=(nombre,leer,escribir)=>Object.defineProperty(globalThis,nombre,{
  get:leer,set:escribir,configurable:true,
});
const estado={
  MAX_E:1,cur:1,sel:1,db:1,RNGs:1,M:1,RO:1,CO:1,drag:1,A:1,a3:1,cfg:1,S:1,
  LGMODE:1,AIX:1,VEL:1,pbSkip:1,STEP:1,H:1,h5:1,
};
Object.keys(N).forEach(nombre=>{
  if(nombre in estado)exponer(nombre,()=>N[nombre],v=>{N[nombre]=v});
  else if(typeof N[nombre]!=='function'&&nombre!=='UI')
    exponer(nombre,()=>N[nombre],v=>{N[nombre]=v});
  else if(!(nombre in globalThis))
    exponer(nombre,()=>N[nombre],v=>{N[nombre]=v});
});
const puentes={
  toast:'toast',arena:'arena',fillSet4:'fillSet4',f4init:'f4init',objRender:'objRender',
  renderList:'renderList',fillForm:'fillForm',refresh:'refresh',saveRules:'saveRules',
  rCons:'rCons',rOfen:'rOfen',eqRefresh:'eqRefresh',retHTML:'retHTML',
  defHTML:'defHTML',retRefresh:'retRefresh',tIcon:'tIcon',sumHTML:'sumHTML',
  rpgDemo:'demo',rpgMusic:'music',
};
Object.entries(puentes).forEach(([nombre,clave])=>
  exponer(nombre,()=>PUENTES[clave],v=>{PUENTES[clave]=v}));
export {exponer};
