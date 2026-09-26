import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x080b10, 8, 24);

const camera = new THREE.PerspectiveCamera(55, 1, .1, 100);
camera.position.set(5.2, 3.2, 7.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = .055;
controls.enablePan = true;
controls.enableRotate = true;
controls.screenSpacePanning = true;
controls.minDistance = 2.2;
controls.maxDistance = 18;
controls.minPolarAngle = 0;       // sin bloqueo vertical
controls.maxPolarAngle = Math.PI; // órbita completa
controls.target.set(0, 1.55, 0);

const mat = {
  printed: new THREE.MeshStandardMaterial({color:0x8d9499, roughness:.72, metalness:.06}),
  black: new THREE.MeshStandardMaterial({color:0x050607, roughness:.45, metalness:.2}),
  metal: new THREE.MeshStandardMaterial({color:0xb8bec7, roughness:.28, metalness:.75}),
  darkMetal: new THREE.MeshStandardMaterial({color:0x20242b, roughness:.36, metalness:.55}),
  rubber: new THREE.MeshStandardMaterial({color:0x111318, roughness:.82, metalness:.02}),
  wireR: new THREE.MeshBasicMaterial({color:0xff315f}),
  wireB: new THREE.MeshBasicMaterial({color:0x2c70ff})
};

const world = new THREE.Group();
scene.add(world);
const exo = new THREE.Group();
world.add(exo);

function box(name, s, p, material=mat.printed, cast=true){
  const m = new THREE.Mesh(new THREE.BoxGeometry(...s), material); m.name=name; m.position.set(...p); m.castShadow=cast; m.receiveShadow=true; return m;
}
function cyl(name, r, d, p, rot=[0,0,0], material=mat.printed, seg=48){
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r,r,d,seg), material); m.name=name; m.position.set(...p); m.rotation.set(...rot); m.castShadow=true; m.receiveShadow=true; return m;
}
function wire(points, material){
  const curve = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 32, .008, 8, false), material);
}

// Piso y luces
scene.add(new THREE.HemisphereLight(0xc7e9ff, 0x101010, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 2.8); key.position.set(4,7,5); key.castShadow=true; key.shadow.mapSize.set(2048,2048); scene.add(key);
const rim = new THREE.PointLight(0x6ee7ff, 18, 9); rim.position.set(-3,3,2); scene.add(rim);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(18,18), new THREE.MeshStandardMaterial({color:0x121722, roughness:.8})); floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
const grid = new THREE.GridHelper(18,18,0x344055,0x202838); grid.material.transparent=true; grid.material.opacity=.35; scene.add(grid);
scene.add(new THREE.AxesHelper(1.35));

// Base superior tipo carrito
exo.add(box('back-pack', [1.7,.14,2.2], [0,2.95,-.22], mat.black));
exo.add(box('plate', [2.55,.14,.34], [0,2.18,-.05], mat.black));
exo.add(box('handle-l', [.16,1.2,.16], [-.55,3.25,-.08], mat.black));
exo.add(box('handle-r', [.16,1.2,.16], [.55,3.25,-.08], mat.black));
exo.add(box('handle-top', [1.25,.16,.16], [0,3.9,-.08], mat.black));
exo.add(cyl('caster-l', .15, .14, [-.35,2.02,.25], [Math.PI/2,0,0], mat.darkMetal));
exo.add(cyl('caster-r', .15, .14, [.35,2.02,.25], [Math.PI/2,0,0], mat.darkMetal));
exo.add(box('hip-bar', [3.2,.12,.12], [0,2.08,0], mat.black));

const joints = {};
function buildLeg(side){
  const sx = side === 'L' ? -1 : 1;
  const hip = new THREE.Group(); hip.position.set(sx*1.15,2.05,0); exo.add(hip); joints[side+'Hip']=hip;
  hip.add(cyl('hip-ring', .34, .26, [0,0,0], [Math.PI/2,0,0]));
  hip.add(box('hip-nema17',[.45,.45,.45],[sx*.38,0,0],mat.darkMetal));
  hip.add(box('hip-shaft',[.62,.18,.18],[sx*.26,0,0],mat.black));

  const thigh = new THREE.Group(); thigh.position.set(0,-.35,0); hip.add(thigh); joints[side+'KneeBase']=thigh;
  thigh.add(box('thigh-profile',[.16,1.25,.16],[0,-.42,0],mat.black));
  thigh.add(box('thigh-clamp-top',[.54,.18,.18],[0,-.15,0],mat.printed));
  thigh.add(box('thigh-clamp-low',[.48,.14,.14],[0,-.82,0],mat.printed));
  thigh.add(wire([[sx*.07,.05,.08],[sx*.12,-.45,.1],[sx*.05,-.95,.08]], mat.wireR));
  thigh.add(wire([[sx*.11,.05,.03],[sx*.16,-.42,.02],[sx*.08,-.95,.02]], mat.wireB));

  const knee = new THREE.Group(); knee.position.set(0,-1.14,0); thigh.add(knee); joints[side+'Knee']=knee;
  knee.add(cyl('knee-ring', .29, .24, [0,0,0], [Math.PI/2,0,0]));
  knee.add(box('knee-nema17',[.42,.42,.42],[sx*.38,0,0],mat.darkMetal));
  knee.add(box('knee-shaft',[.55,.16,.16],[sx*.24,0,0],mat.black));

  const shin = new THREE.Group(); shin.position.set(0,-.35,0); knee.add(shin); joints[side+'Shin']=shin;
  shin.add(box('shin-profile',[.15,1.02,.15],[0,-.36,0],mat.black));
  shin.add(box('shin-clamp',[.48,.14,.14],[0,-.68,0],mat.printed));
  shin.add(wire([[sx*.08,0,.08],[sx*.15,-.42,.08],[sx*.07,-.85,.05]], mat.wireR));
  shin.add(wire([[sx*.12,0,.02],[sx*.18,-.42,.02],[sx*.09,-.85,.02]], mat.wireB));

  const foot = new THREE.Group(); foot.position.set(0,-.95,.08); shin.add(foot); joints[side+'Foot']=foot;
  foot.add(box('ankle-block',[.52,.42,.42],[0,.16,-.02],mat.printed));
  foot.add(box('sole',[.58,.08,1.08],[0,-.18,.30],mat.printed));
  foot.add(box('toe',[.68,.08,.48],[0,-.18,.88],mat.printed));
  foot.add(box('heel',[.6,.08,.32],[0,-.18,-.24],mat.printed));
  foot.add(box('foot-wall-l',[.08,.28,.55],[-.27,-.02,.35],mat.printed));
  foot.add(box('foot-wall-r',[.08,.28,.55],[.27,-.02,.35],mat.printed));
}
buildLeg('L'); buildLeg('R');

// Pose inicial más estable/sentado
joints.LHip.rotation.x = -.18; joints.RHip.rotation.x = -.18;
joints.LKnee.rotation.x = .35; joints.RKnee.rotation.x = .35;

let walking = true, seated = false, speed = .85, clock = new THREE.Clock();
function updateGait(t){
  if(!walking) return;
  const a = Math.sin(t*2.4*speed), b = Math.sin(t*2.4*speed + Math.PI);
  joints.LHip.rotation.x = -.10 + a*.32; joints.RHip.rotation.x = -.10 + b*.32;
  joints.LKnee.rotation.x = .28 + Math.max(0,-a)*.65; joints.RKnee.rotation.x = .28 + Math.max(0,-b)*.65;
  joints.LFoot.rotation.x = -.08 + Math.max(0,a)*.18; joints.RFoot.rotation.x = -.08 + Math.max(0,b)*.18;
  exo.position.y = Math.abs(Math.sin(t*4.8*speed))*.035;
}

// WebSocket opcional ESP32: ws://IP:81 con payload {lh,rh,lk,rk,rotZ}
function connectTelemetry(){
  const state = document.querySelector('#wsState');
  const host = location.hostname;
  if(!host || host === 'localhost' || host === '127.0.0.1') return;
  try{
    const ws = new WebSocket(`ws://${host}:81/`);
    ws.onopen=()=>state.textContent='conectado';
    ws.onclose=()=>state.textContent='offline demo';
    ws.onerror=()=>state.textContent='error';
    ws.onmessage=e=>{
      try{ const d=JSON.parse(e.data); walking=false;
        if(Number.isFinite(d.lh)) joints.LHip.rotation.x=THREE.MathUtils.degToRad(d.lh);
        if(Number.isFinite(d.rh)) joints.RHip.rotation.x=THREE.MathUtils.degToRad(d.rh);
        if(Number.isFinite(d.lk)) joints.LKnee.rotation.x=THREE.MathUtils.degToRad(d.lk);
        if(Number.isFinite(d.rk)) joints.RKnee.rotation.x=THREE.MathUtils.degToRad(d.rk);
        if(Number.isFinite(d.rotZ)) world.rotation.z=THREE.MathUtils.degToRad(d.rotZ);
      }catch{}
    };
  }catch{}
}
connectTelemetry();

const $ = s => document.querySelector(s);
$('#rotZ').addEventListener('input', e=>{ const v=+e.target.value; $('#rotZOut').textContent=v+'°'; world.rotation.z=THREE.MathUtils.degToRad(v); });
$('#zoom').addEventListener('input', e=>{ const v=+e.target.value; $('#zoomOut').textContent=v+'°'; camera.fov=v; camera.updateProjectionMatrix(); });
$('#speed').addEventListener('input', e=>{ speed=+e.target.value; $('#speedOut').textContent=speed.toFixed(2)+'x'; });
$('#btnWalk').onclick=()=>{ walking=!walking; $('#btnWalk').textContent=walking?'Marcha ON':'Marcha OFF'; };
$('#btnReset').onclick=()=>{ camera.position.set(5.2,3.2,7.2); controls.target.set(0,1.55,0); world.rotation.set(0,0,0); $('#rotZ').value=0; $('#rotZOut').textContent='0°'; controls.update(); };
$('#btnFit').onclick=()=>{ controls.target.set(0,1.55,0); camera.position.set(4.5,2.6,6); controls.update(); };
$('#btnSitStand').onclick=()=>{
  seated=!seated; walking=false; $('#btnWalk').textContent='Marcha OFF';
  const pose = seated ? {hip:-72,knee:86,y:.18} : {hip:-8,knee:20,y:0};
  gsap.to([joints.LHip.rotation,joints.RHip.rotation], {x:THREE.MathUtils.degToRad(pose.hip), duration:1.1, ease:'power2.inOut'});
  gsap.to([joints.LKnee.rotation,joints.RKnee.rotation], {x:THREE.MathUtils.degToRad(pose.knee), duration:1.1, ease:'power2.inOut'});
  gsap.to(exo.position, {y:pose.y, duration:1.1, ease:'power2.inOut'});
};

function resize(){
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if(canvas.width !== Math.floor(w*devicePixelRatio) || canvas.height !== Math.floor(h*devicePixelRatio)){
    renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix();
  }
}
function animate(){
  requestAnimationFrame(animate); resize(); updateGait(clock.getElapsedTime()); controls.update(); renderer.render(scene,camera);
}
animate();
