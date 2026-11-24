/* Laboratorio RPG — Flechas de navegación entre pestañas */
(function(){
const nav=document.getElementById('nav'),bs=[...nav.querySelectorAll('button')];
bs.forEach(b=>{const t=b.textContent.replace(/^\s*\d+\s*·\s*/,'').trim();b.textContent=t;b.title=t;b.setAttribute('aria-label',t)});
const w=document.createElement('div');w.id='xtabs';nav.parentNode.insertBefore(w,nav);
const mk=(id,tx,lb)=>{const x=document.createElement('button');x.id=id;x.type='button';x.className='xarr';x.textContent=tx;x.title=lb;x.setAttribute('aria-label',lb);return x};
const pv=mk('xprev','«','Pestaña anterior'),nx=mk('xnext','»','Pestaña siguiente');
w.append(pv,nav,nx);
const cur=()=>Math.max(0,bs.findIndex(b=>b.classList.contains('on')));
pv.onclick=()=>bs[(cur()+bs.length-1)%bs.length].click();nx.onclick=()=>bs[(cur()+1)%bs.length].click();
})();
