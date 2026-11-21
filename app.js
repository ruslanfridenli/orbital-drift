const I18N = {
  en: {
    presets:"Presets", controls:"Controls", params:"Parameters",
    p_binary:"Binary star", p_solar:"Solar system", p_disc:"Accretion disc", p_swarm:"Random swarm",
    pause:"Pause", clear:"Clear", addbody:"+ Add body", timescale:"Time scale", trails:"Trails",
    collide:"Collisions", bodies:"bodies",
    hint:"Click on the canvas to launch a body · drag to give it velocity",
    paused:"▶ Resume", running:"⏸ Pause"
  },
  de: {
    presets:"Presets", controls:"Steuerung", params:"Parameter",
    p_binary:"Doppelstern", p_solar:"Sonnensystem", p_disc:"Akkretionsscheibe", p_swarm:"Zufallsschwarm",
    pause:"Pause", clear:"Leeren", addbody:"+ Körper hinzufügen", timescale:"Zeitstrahl", trails:"Spuren",
    collide:"Kollisionen", bodies:"Körper",
    hint:"Klick auf die Fläche startet einen Körper · Ziehen gibt ihm Geschwindigkeit",
    paused:"▶ Weiter", running:"⏸ Pause"
  }
};
let lang = localStorage.getItem('od-lang') || 'en';
const t = k => I18N[lang][k] || k;
function applyLang(){
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i]').forEach(el => el.textContent = t(el.dataset.i));
  document.querySelectorAll('.lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
  document.getElementById('btn-pause').textContent = paused ? t('paused') : t('running');
}
document.querySelectorAll('.lang button').forEach(b => b.onclick = () => {
  lang = b.dataset.lang; localStorage.setItem('od-lang', lang); applyLang();
});

const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
let W, H, bodies = [], paused = false, adding = false;
const G = () => parseFloat(document.getElementById('g').value) * 900;
const TS = () => parseFloat(document.getElementById('ts').value);
const TR = () => parseInt(document.getElementById('tr').value);
const COLLIDE = () => document.getElementById('collide').checked;
document.getElementById('g').oninput = e => document.getElementById('g-val').textContent = e.target.value;
document.getElementById('ts').oninput = e => document.getElementById('t-val').textContent = e.target.value;
document.getElementById('tr').oninput = e => document.getElementById('tr-val').textContent = e.target.value;

function resize(){ W = cv.width = cv.clientWidth * devicePixelRatio; H = cv.height = cv.clientHeight * devicePixelRatio; }
addEventListener('resize', resize); resize();

const rand = (a,b) => a + Math.random()*(b-a);
const hue = () => Math.floor(rand(180, 320));

function addBody(x, y, vx, vy, m, h) {
  bodies.push({ x, y, vx, vy, m, h: h ?? hue(), trail: [] });
  document.getElementById('count').textContent = bodies.length;
}

function preset(name){
  bodies = [];
  const cx = W/2/devicePixelRatio, cy = H/2/devicePixelRatio;
  const S = devicePixelRatio;
  if (name === 'binary') {
    const d = 140*S;
    addBody(cx-d, cy, 0, -0.9*S, 40000, 200);
    addBody(cx+d, cy, 0, 0.9*S, 40000, 30);
    for (let i=0;i<3;i++){
      const r = (260+i*70)*S, a = rand(0,Math.PI*2);
      addBody(cx+Math.cos(a)*r, cy+Math.sin(a)*r, -Math.sin(a)*0.55*S, Math.cos(a)*0.55*S, 800, rand(140,260));
    }
  } else if (name === 'solar') {
    addBody(cx, cy, 0, 0, 120000, 45);
    for (let i=0;i<8;i++){
      const r = (90+i*55)*S, a = rand(0,Math.PI*2), sp = 0.9/Math.sqrt(i+1)*S;
      addBody(cx+Math.cos(a)*r, cy+Math.sin(a)*r, -Math.sin(a)*sp, Math.cos(a)*sp, rand(200,900), rand(160,280));
    }
  } else if (name === 'disc') {
    addBody(cx, cy, 0, 0, 200000, 20);
    for (let i=0;i<350;i++){
      const r = Math.pow(Math.random(),0.6)*520*S+30*S, a = Math.random()*Math.PI*2;
      const sp = Math.sqrt(G()*200000*1000/r)/ (S*8);
      addBody(cx+Math.cos(a)*r, cy+Math.sin(a)*r, -Math.sin(a)*sp, Math.cos(a)*sp, rand(20,200), rand(30,55));
    }
  } else if (name === 'swarm') {
    for (let i=0;i<120;i++){
      const x=rand(0,W), y=rand(0,H);
      addBody(x,y,rand(-0.4,0.4)*S,rand(-0.4,0.4)*S,rand(100,5000),rand(0,360));
    }
  }
  document.getElementById('count').textContent = bodies.length;
}

document.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => preset(b.dataset.preset));
document.getElementById('btn-clear').onclick = () => { bodies=[]; document.getElementById('count').textContent=0; };
document.getElementById('btn-pause').onclick = () => { paused=!paused; applyLang(); };
document.getElementById('btn-body').onclick = () => { adding=!adding; document.getElementById('btn-body').style.borderColor = adding?'var(--acc)':''; };

let drag = null;
cv.addEventListener('pointerdown', e => {
  const r = cv.getBoundingClientRect();
  const x=(e.clientX-r.left)*devicePixelRatio, y=(e.clientY-r.top)*devicePixelRatio;
  if (adding) { addBody(x,y,0,0,rand(500,3000)); adding=false; document.getElementById('btn-body').style.borderColor=''; return; }
  drag = {x0:x,y0:y,x1:x,y1:y};
});
cv.addEventListener('pointermove', e => {
  if (!drag) return;
  const r = cv.getBoundingClientRect();
  drag.x1=(e.clientX-r.left)*devicePixelRatio; drag.y1=(e.clientY-r.top)*devicePixelRatio;
});
cv.addEventListener('pointerup', e => {
  if (!drag) return;
  const dx=(drag.x1-drag.x0)*0.08, dy=(drag.y1-drag.y0)*0.08;
  if (Math.hypot(dx,dy) < 2) { addBody(drag.x0,drag.y0,0,0,rand(500,3000)); }
  else addBody(drag.x0,drag.y0,dx,dy,rand(500,3000));
  drag=null;
});

function step(){
  const g=G(), ts=TS(), eps2=2500;
  const n=bodies.length;
  for (let i=0;i<n;i++){
    const a=bodies[i]; a.ax=0; a.ay=0;
    for (let j=0;j<n;j++){
      if (i===j) continue;
      const b=bodies[j];
      let dx=b.x-a.x, dy=b.y-a.y;
      // wrap? no — bounce off edges softly by damping
      let d2=dx*dx+dy*dy+eps2, d=Math.sqrt(d2);
      const f=g*b.m/(d2*d);
      a.ax+=dx*f; a.ay+=dy*f;
    }
  }
  for (const b of bodies){
    b.vx+=b.ax*ts; b.vy+=b.ay*ts;
    b.x+=b.vx*ts; b.y+=b.vy*ts;
    b.trail.push([b.x,b.y]);
    if (b.trail.length>TR()) b.trail.shift();
  }
  // collisions: merge
  if (COLLIDE()){
    for (let i=0;i<bodies.length;i++) for (let j=i+1;j<bodies.length;j++){
      const a=bodies[i],b=bodies[j];
      const dx=b.x-a.x,dy=b.y-a.y,rr=(a.m+b.m)/9000+8;
      if (dx*dx+dy*dy<rr*rr){
        const m=a.m+b.m;
        a.vx=(a.vx*a.m+b.vx*b.m)/m; a.vy=(a.vy*a.m+b.vy*b.m)/m;
        a.x=(a.x*a.m+b.x*b.m)/m; a.y=(a.y*a.m+b.y*b.m)/m;
        a.m=m; a.h=(a.h+b.h)/2;
        bodies.splice(j,1); i--; break;
      }
    }
  }
}

function draw(){
  ctx.fillStyle='rgba(5,7,13,0.28)'; ctx.fillRect(0,0,W,H);
  for (const b of bodies){
    const r=Math.cbrt(b.m)*2.2+1.5;
    if (b.trail.length>1){
      ctx.beginPath();
      ctx.moveTo(b.trail[0][0],b.trail[0][1]);
      for (const p of b.trail) ctx.lineTo(p[0],p[1]);
      ctx.strokeStyle=`hsla(${b.h},80%,65%,0.35)`; ctx.lineWidth=1; ctx.stroke();
    }
    const grad=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,r*4);
    grad.addColorStop(0,`hsla(${b.h},90%,75%,0.9)`); grad.addColorStop(1,`hsla(${b.h},90%,60%,0)`);
    ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(b.x,b.y,r*4,0,7); ctx.fill();
    ctx.fillStyle=`hsl(${b.h},90%,80%)`; ctx.beginPath(); ctx.arc(b.x,b.y,r,0,7); ctx.fill();
  }
  if (drag){
    ctx.strokeStyle='rgba(124,199,255,.6)'; ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(drag.x0,drag.y0); ctx.lineTo(drag.x1,drag.y1); ctx.stroke(); ctx.setLineDash([]);
  }
}

function loop(){ step(); draw(); requestAnimationFrame(loop); }
preset('binary');
applyLang();
loop();
