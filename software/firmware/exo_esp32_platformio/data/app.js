const canvas=document.getElementById('view'), hud=document.getElementById('hud'), dataBox=document.getElementById('data');
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x10131a);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,100); camera.position.set(0,2.2,6);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true}); renderer.setSize(innerWidth,innerHeight); renderer.setPixelRatio(devicePixelRatio);
scene.add(new THREE.HemisphereLight(0xffffff,0x333344,1.8)); const dir=new THREE.DirectionalLight(0xffffff,1); dir.position.set(3,5,4); scene.add(dir);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(8,8),new THREE.MeshStandardMaterial({color:0x303746,roughness:.8})); floor.rotation.x=-Math.PI/2; scene.add(floor);
function box(w,h,d,c){return new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c,metalness:.15,roughness:.5}))}
function cyl(r,h,c){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,32),new THREE.MeshStandardMaterial({color:c,metalness:.25,roughness:.45}));m.rotation.z=Math.PI/2;return m}
const root=new THREE.Group(); scene.add(root); root.position.y=.1;
const torso=box(1.35,1.65,.16,0x111318); torso.position.y=2.65; root.add(torso);
const handle=box(.8,.22,.22,0x20242e); handle.position.y=3.55; root.add(handle);
const cartL=cyl(.14,.18,0x333946), cartR=cyl(.14,.18,0x333946); cartL.position.set(-.42,1.9,.05); cartR.position.set(.42,1.9,.05); root.add(cartL,cartR);
function makeLeg(x){const hip=new THREE.Group();hip.position.set(x,2.05,0);root.add(hip);const hipMotor=cyl(.28,.42,0x8b8f92);hip.add(hipMotor);const thigh=new THREE.Group();thigh.position.y=0;hip.add(thigh);const thighBar=box(.16,1.15,.14,0x050607);thighBar.position.y=-.58;thigh.add(thighBar);const knee=new THREE.Group();knee.position.y=-1.15;thigh.add(knee);const kneeMotor=cyl(.25,.40,0x8b8f92);knee.add(kneeMotor);const shin=new THREE.Group();knee.add(shin);const shinBar=box(.15,1.05,.13,0x050607);shinBar.position.y=-.52;shin.add(shinBar);const foot=box(.42,.12,.9,0x7f8587);foot.position.set(0,-1.08,.28);shin.add(foot);return{hip,thigh,knee,shin,foot}}
const left=makeLeg(-.55), right=makeLeg(.55);
const deg=Math.PI/180; let last={mode:'IDLE',angles:{hipL:0,kneeL:90,hipR:0,kneeR:90},imu:{}};
function apply(a){left.thigh.rotation.x=(a.hipL||0)*deg; left.shin.rotation.x=-(a.kneeL||0)*deg; right.thigh.rotation.x=(a.hipR||0)*deg; right.shin.rotation.x=-(a.kneeR||0)*deg;}
function render(){requestAnimationFrame(render); apply(last.angles||{}); renderer.render(scene,camera)} render();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
let ws; function connect(){ws=new WebSocket(`ws://${location.host}/ws`); ws.onopen=()=>hud.textContent='WebSocket conectado'; ws.onclose=()=>{hud.textContent='Desconectado, reintentando...'; setTimeout(connect,1500)}; ws.onmessage=e=>{last=JSON.parse(e.data); drawHud(last)}} connect();
function cmd(c){ if(ws&&ws.readyState===1) ws.send(c); }
function drawHud(t){dataBox.innerHTML=`<div class=row><b>Modo</b><span>${t.mode}</span></div><div class=row><b>Fase / rep</b><span>${t.phase} / ${t.rep}</span></div><div class=row><span>Hip L/R</span><span>${t.angles.hipL}° / ${t.angles.hipR}°</span></div><div class=row><span>Knee L/R</span><span>${t.angles.kneeL}° / ${t.angles.kneeR}°</span></div><div class=row><span>MPU Pitch L/R</span><span>${t.imu.leftPitch}° / ${t.imu.rightPitch}°</span></div><div class=row><span>MPU Roll L/R</span><span>${t.imu.leftRoll}° / ${t.imu.rightRoll}°</span></div><div class=fault>${t.fault||''}</div>`;}
