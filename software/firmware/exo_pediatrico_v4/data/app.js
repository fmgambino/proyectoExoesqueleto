/* EXO Pediátrico V4 - visor 3D + telemetría + ECG/EMG */
let ws, connected=false, demo=true, latest={};
const $=id=>document.getElementById(id);

function send(cmd){ if(ws && ws.readyState===1) ws.send(cmd); }
function connect(){
  const proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
  ws = new WebSocket(proto + location.host + '/ws');
  ws.onopen=()=>{connected=true; setConn(true);};
  ws.onclose=()=>{connected=false; setConn(false); setTimeout(connect,1200);};
  ws.onerror=()=>setConn(false);
  ws.onmessage=e=>{try{latest=JSON.parse(e.data); updateUi(latest); updateModel(latest); pushSignals(latest);}catch(err){console.warn(err)}};
}
function setConn(ok){ $('conn').textContent=ok?'Conectado':'Desconectado'; document.querySelector('.status').classList.toggle('ok',ok); }
function fmt(v,d=1){ return Number.isFinite(+v) ? (+v).toFixed(d) : '--'; }
function updateUi(t){
  $('state').textContent=t.state||'IDLE';
  $('bpm').textContent=fmt(t.bio?.bpm,0); $('spo2').textContent=fmt(t.bio?.spo2,1);
  $('bodyC').textContent=fmt(t.bio?.bodyC,1); $('ambientC').textContent=fmt(t.bio?.ambientC,1); $('cpuC').textContent=fmt(t.bio?.cpuC,1);
  $('ecgV').textContent=fmt(t.bio?.ecg,3); $('emgV').textContent=fmt(t.bio?.emg,3);
  const j=t.joints||{}; $('joints').textContent=`Cadera L: ${fmt(j.hipL)}°\nRodilla L: ${fmt(j.kneeL)}°\nCadera R: ${fmt(j.hipR)}°\nRodilla R: ${fmt(j.kneeR)}°`;
  if(t.demo!==undefined){demo=!!t.demo; $('demoBtn').classList.toggle('active',demo); $('realBtn').classList.toggle('active',!demo);}
}

// ======================= THREE.JS =======================
const viewport=$('viewport');
const scene=new THREE.Scene(); scene.fog=new THREE.Fog(0x07111d, 12, 36);
const camera=new THREE.PerspectiveCamera(45, viewport.clientWidth/viewport.clientHeight, .1, 100);
camera.position.set(5,4.2,7);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(viewport.clientWidth, viewport.clientHeight); renderer.shadowMap.enabled=true; viewport.appendChild(renderer.domElement);
const controls=new THREE.OrbitControls(camera, renderer.domElement); controls.enableDamping=true; controls.dampingFactor=.06; controls.target.set(0,1.6,0);
const hemi=new THREE.HemisphereLight(0xcde8ff,0x111820,1.5); scene.add(hemi);
const key=new THREE.DirectionalLight(0xffffff,2.7); key.position.set(4,8,4); key.castShadow=true; key.shadow.mapSize.set(2048,2048); scene.add(key);
const fill=new THREE.DirectionalLight(0x71c7ff,.6); fill.position.set(-6,3,-4); scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20), new THREE.MeshStandardMaterial({color:0x0e1b2a,roughness:.9,metalness:.05})); floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
const grid=new THREE.GridHelper(20,40,0x28425f,0x142338); grid.position.y=.002; scene.add(grid);

const matBlack=new THREE.MeshStandardMaterial({color:0x050607,roughness:.55,metalness:.25});
const matRail=new THREE.MeshStandardMaterial({color:0x0a0d11,roughness:.35,metalness:.65});
const matGray=new THREE.MeshStandardMaterial({color:0x8b949b,roughness:.62,metalness:.18});
const matDarkGray=new THREE.MeshStandardMaterial({color:0x4f5961,roughness:.68,metalness:.12});
const matMotor=new THREE.MeshStandardMaterial({color:0x20252b,roughness:.5,metalness:.45});
const matWireR=new THREE.MeshBasicMaterial({color:0xff315c}); const matWireB=new THREE.MeshBasicMaterial({color:0x1677ff});

function box(w,h,d,mat,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;return m;}
function cyl(r,h,mat,x=0,y=0,z=0,axis='z'){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,48),mat); if(axis==='x')m.rotation.z=Math.PI/2; if(axis==='z')m.rotation.x=Math.PI/2; m.position.set(x,y,z); m.castShadow=m.receiveShadow=true; return m;}
function roundedFoot(side){
  const g=new THREE.Group();
  const sole=box(.62,.08,1.28,matGray,0,.04,.12); g.add(sole);
  const toe=cyl(.31,.09,matGray,0,.05,.75,'y'); toe.scale.z=.55; g.add(toe);
  g.add(box(.54,.28,.09,matGray,0,.18,-.35));
  g.add(box(.1,.18,.35,matGray,.25,.20,.2)); g.add(box(.1,.18,.35,matGray,-.25,.20,.2));
  return g;
}
function nema(){
  const g=new THREE.Group();
  g.add(box(.55,.55,.55,matMotor));
  g.add(box(.61,.08,.61,matGray,0,0,.31));
  g.add(cyl(.11,.18,matGray,0,0,.43,'z'));
  return g;
}
function jointHousing(){
  const g=new THREE.Group();
  g.add(cyl(.43,.28,matGray,0,0,0,'x'));
  g.add(box(.62,.88,.25,matGray,0,.02,0));
  g.add(cyl(.28,.31,matDarkGray,0,0,.02,'x'));
  return g;
}
function rail(len){
  const g=new THREE.Group();
  g.add(box(.16,len,.16,matRail));
  g.add(box(.045,len+.03,.19,matBlack,.07,0,0));
  g.add(box(.045,len+.03,.19,matBlack,-.07,0,0));
  return g;
}
function wire(points,mat){const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))); return new THREE.Mesh(new THREE.TubeGeometry(c,40,.01,8,false),mat);}

const exo=new THREE.Group(); scene.add(exo);
// trolley superior realista: placa negra, manija, parales y rueditas traseras
const cart=new THREE.Group(); cart.position.set(0,3.55,-.18); exo.add(cart);
cart.add(box(3.5,.22,1.05,matBlack,0,0,0));
cart.add(box(1.25,1.65,.18,matBlack,0,.9,-.35));
cart.add(box(.15,1.72,.15,matDarkGray,-.58,.92,-.22)); cart.add(box(.15,1.72,.15,matDarkGray,.58,.92,-.22));
cart.add(box(1.35,.18,.18,matDarkGray,0,1.78,-.22));
cart.add(box(.92,.12,.18,matDarkGray,0,1.45,-.23));
cart.add(cyl(.18,.18,matDarkGray,-.38,-.22,.42,'x')); cart.add(cyl(.18,.18,matDarkGray,.38,-.22,.42,'x'));
cart.add(cyl(.16,.15,matBlack,-.38,-.35,.55,'x')); cart.add(cyl(.16,.15,matBlack,.38,-.35,.55,'x'));
// brazos superiores laterales de perfil aluminio
cart.add(box(1.25,.12,.14,matRail,-1.92,-.03,0)); cart.add(box(1.25,.12,.14,matRail,1.92,-.03,0));
cart.add(box(.12,.65,.14,matRail,-2.55,-.35,0)); cart.add(box(.12,.65,.14,matRail,2.55,-.35,0));

const legL=createLeg(-1.25); const legR=createLeg(1.25); exo.add(legL.root,legR.root);
function createLeg(x){
  const root=new THREE.Group(); root.position.x=x;
  const hipPivot=new THREE.Group(); hipPivot.position.set(0,3.05,0); root.add(hipPivot);
  const hipCase=jointHousing(); hipCase.rotation.y=Math.PI/2; hipPivot.add(hipCase);
  const hipMotor=nema(); hipMotor.position.set(x<0?-.58:.58,0,0); hipMotor.rotation.y=Math.PI/2; hipPivot.add(hipMotor);
  const thigh=new THREE.Group(); thigh.position.set(0,-.15,0); hipPivot.add(thigh);
  const thighRail=rail(1.45); thighRail.position.y=-.72; thigh.add(thighRail);
  thigh.add(box(.62,.16,.12,matGray,0,-.42,.02)); thigh.add(box(.62,.16,.12,matGray,0,-1.02,.02));
  const kneePivot=new THREE.Group(); kneePivot.position.set(0,-1.48,0); thigh.add(kneePivot);
  const kneeCase=jointHousing(); kneeCase.rotation.y=Math.PI/2; kneePivot.add(kneeCase);
  const kneeMotor=nema(); kneeMotor.position.set(x<0?-.58:.58,0,0); kneeMotor.rotation.y=Math.PI/2; kneePivot.add(kneeMotor);
  const shin=new THREE.Group(); shin.position.set(0,-.12,0); kneePivot.add(shin);
  const shinRail=rail(1.28); shinRail.position.y=-.64; shin.add(shinRail);
  shin.add(box(.58,.15,.12,matGray,0,-.35,.02)); shin.add(box(.58,.15,.12,matGray,0,-.95,.02));
  const ankle=new THREE.Group(); ankle.position.set(0,-1.28,0); shin.add(ankle);
  ankle.add(box(.62,.38,.5,matGray,0,.05,0)); ankle.add(cyl(.2,.58,matDarkGray,0,.13,.0,'x'));
  const foot=roundedFoot(x); foot.position.set(0,-.24,.27); ankle.add(foot);
  root.add(wire([[x<0?-.25:.25,3.05,.22],[x<0?-.18:.18,2.2,.18],[x<0?-.25:.25,1.55,.2],[x<0?-.12:.12,.8,.1]],matWireR));
  root.add(wire([[x<0?-.18:.18,3.05,.28],[x<0?-.09:.09,2.25,.25],[x<0?-.18:.18,1.5,.26],[x<0?-.06:.06,.65,.16]],matWireB));
  return {root,hipPivot,kneePivot,ankle};
}

function deg(v){return (v||0)*Math.PI/180;}
let demoPhase=0;
function updateModel(t){
  const j=t.joints||{};
  legL.hipPivot.rotation.x=deg(-(j.hipL||8)); legL.kneePivot.rotation.x=deg(j.kneeL||5);
  legR.hipPivot.rotation.x=deg(-(j.hipR||8)); legR.kneePivot.rotation.x=deg(j.kneeR||5);
  exo.rotation.x=deg(+$('rx').value); exo.rotation.y=deg(+$('ry').value); exo.rotation.z=deg(+$('rz').value);
}
['rx','ry','rz'].forEach(id=>$(id).addEventListener('input',()=>updateModel(latest)));
renderer.domElement.addEventListener('wheel',e=>{
  if(!$('wheelZ').checked) return;
  e.preventDefault();
  const target=e.altKey?'rx':(e.shiftKey?'ry':'rz');
  $(target).value=Math.max(-180,Math.min(180,+$(target).value + Math.sign(e.deltaY)*3));
  updateModel(latest);
},{passive:false});
function resize(){camera.aspect=viewport.clientWidth/viewport.clientHeight;camera.updateProjectionMatrix();renderer.setSize(viewport.clientWidth,viewport.clientHeight);} addEventListener('resize',resize);
function animate(){requestAnimationFrame(animate); controls.update(); if(!connected){ demoPhase+=.02; updateModel({joints:{hipL:8+8*Math.sin(demoPhase),kneeL:5+5*Math.sin(demoPhase+.5),hipR:8+8*Math.sin(demoPhase+Math.PI),kneeR:5+5*Math.sin(demoPhase+3.6)}});} renderer.render(scene,camera);} animate();

// ======================= CHART ECG/EMG =======================
let chart, buf=[], t0=Date.now();
function filtered(v,kind){
  if($('filterMode').value==='raw') return v;
  const arr=buf.slice(-8).map(x=>x[kind]);
  if($('filterMode').value==='smooth') return arr.reduce((a,b)=>a+b,0)/Math.max(1,arr.length);
  const mean=arr.reduce((a,b)=>a+b,0)/Math.max(1,arr.length); return Math.abs(v-mean)*2;
}
function ensureChart(){
  if(chart) return;
  const ctx=$('bioChart');
  chart=new Chart(ctx,{type:'line',data:{labels:[],datasets:[{label:'ECG',data:[],borderWidth:2,pointRadius:0,tension:.25},{label:'EMG',data:[],borderWidth:2,pointRadius:0,tension:.15}]},options:{responsive:true,maintainAspectRatio:false,animation:false,scales:{x:{ticks:{color:'#9fb7d2'},grid:{color:'#1f3348'}},y:{min:0,max:1.2,ticks:{color:'#9fb7d2'},grid:{color:'#1f3348'}}},plugins:{legend:{labels:{color:'#eaf4ff'}}}}});
}
function pushSignals(t){
  const now=((Date.now()-t0)/1000).toFixed(1); const raw={ecg:+(t.bio?.ecg||0),emg:+(t.bio?.emg||0)}; buf.push(raw); if(buf.length>500) buf.shift();
  if(!chart) return;
  chart.data.labels.push(now); chart.data.datasets[0].data.push(filtered(raw.ecg,'ecg')); chart.data.datasets[1].data.push(filtered(raw.emg,'emg'));
  chart.data.datasets[0].hidden=!$('showECG').checked; chart.data.datasets[1].hidden=!$('showEMG').checked;
  while(chart.data.labels.length>250){chart.data.labels.shift();chart.data.datasets.forEach(d=>d.data.shift());}
  chart.update('none');
}
$('signalsBtn').onclick=()=>{$('modal').classList.remove('hidden'); ensureChart();}; $('closeModal').onclick=()=>$('modal').classList.add('hidden');
['showECG','showEMG','filterMode'].forEach(id=>$(id).addEventListener('change',()=>{if(chart){chart.data.datasets[0].hidden=!$('showECG').checked;chart.data.datasets[1].hidden=!$('showEMG').checked;chart.update();}}));

$('startBtn').onclick=()=>send('start'); $('stopBtn').onclick=()=>send('stop'); $('seatBtn').onclick=()=>send('seat');
$('demoBtn').onclick=()=>send('demo:on'); $('realBtn').onclick=()=>send('demo:off');
connect(); updateModel({joints:{hipL:90,kneeL:90,hipR:90,kneeR:90}});
