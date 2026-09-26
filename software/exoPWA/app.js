import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.querySelector('#scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(4.4, 3.4, 7.5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.7, 0);
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xffffff, 0x303030, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 2.3);
sun.position.set(4, 7, 5);
sun.castShadow = true;
scene.add(sun);

const matBlack = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: .35, roughness: .45 });
const matGrey = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: .1, roughness: .58 });
const matDarkGrey = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: .2, roughness: .55 });
const matMetal = new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: .75, roughness: .28 });
const matWireR = new THREE.MeshStandardMaterial({ color: 0xc73535, roughness: .4 });
const matWireB = new THREE.MeshStandardMaterial({ color: 0x2458d9, roughness: .4 });

function mesh(geo, mat, pos = [0,0,0], rot = [0,0,0]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos); m.rotation.set(...rot);
  m.castShadow = m.receiveShadow = true;
  return m;
}
function box(w,h,d, mat, pos) { return mesh(new THREE.BoxGeometry(w,h,d), mat, pos); }
function cyl(r,h, mat, pos, rot=[Math.PI/2,0,0]) { return mesh(new THREE.CylinderGeometry(r,r,h,48), mat, pos, rot); }

const robot = new THREE.Group();
scene.add(robot);

// Piso
const floor = mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ color: 0x242424, roughness: .8 }), [0,0,0], [-Math.PI/2,0,0]);
floor.receiveShadow = true; scene.add(floor);

// Carrito/soporte superior negro
const cart = new THREE.Group();
cart.add(box(1.65, 2.15, .16, matBlack, [0, 3.45, -0.2]));
cart.add(box(1.35, .12, .18, matDarkGrey, [0, 4.62, -0.07]));
cart.add(box(.12, 1.85, .16, matDarkGrey, [-.48, 3.65, 0.02]));
cart.add(box(.12, 1.85, .16, matDarkGrey, [.48, 3.65, 0.02]));
cart.add(box(2.6, .12, .12, matBlack, [0, 2.55, 0]));
cart.add(cyl(.13, .12, matDarkGrey, [-.42,2.35,.1]));
cart.add(cyl(.13, .12, matDarkGrey, [.42,2.35,.1]));
robot.add(cart);

const hips = [];
const knees = [];
const motors = [];

function addMotor(group, x, y, z, label=false) {
  const g = new THREE.Group();
  g.position.set(x,y,z);
  g.add(cyl(.34, .24, matGrey, [0,0,0]));
  g.add(box(.42,.42,.42, matBlack, [0,0,.36]));
  g.add(box(.44,.44,.08, matMetal, [0,0,.61]));
  const cap = cyl(.2, .06, matDarkGrey, [0,0,-.15]);
  g.add(cap);
  group.add(g);
  motors.push(g);
  return g;
}

function leg(side) {
  const s = side;
  const leg = new THREE.Group();
  robot.add(leg);

  const upper = new THREE.Group(); upper.position.set(s*.92, 2.12, 0); leg.add(upper); hips.push(upper);
  upper.add(box(.15, 1.28, .16, matBlack, [0, -.55, 0]));
  upper.add(box(.46, .32, .28, matGrey, [0, .12, 0]));
  upper.add(box(.46, .22, .24, matGrey, [0, -1.17, 0]));
  addMotor(upper, s*.23, .10, .03);
  upper.add(box(.42,.09,.07, matMetal, [s*.02,-.55,.13]));
  upper.add(box(.42,.09,.07, matMetal, [s*.02,-.9,.13]));

  const lower = new THREE.Group(); lower.position.set(0, -1.2, 0); upper.add(lower); knees.push(lower);
  lower.add(box(.15, 1.18, .16, matBlack, [0, -.48, 0]));
  lower.add(box(.44, .31, .25, matGrey, [0, .08, 0]));
  lower.add(box(.42, .34, .3, matGrey, [0, -1.1, 0]));
  addMotor(lower, s*.23, .07, .03);
  lower.add(box(.34,.09,.07, matMetal, [0,-.45,.13]));

  const foot = new THREE.Group(); foot.position.set(0, -1.28, .2); lower.add(foot);
  foot.add(box(.56,.18,.78, matGrey, [0,.08,.18]));
  foot.add(mesh(new THREE.CapsuleGeometry(.24,.5,10,20), matGrey, [0,.03,.65], [Math.PI/2,0,0]));
  foot.add(box(.12,.32,.18, matGrey, [-.23,.25,.05]));
  foot.add(box(.12,.32,.18, matGrey, [.23,.25,.05]));

  // Cable rojo/azul simplificado como curvas extruidas
  [[matWireR, s*.11], [matWireB, s*.16]].forEach(([mat, off]) => {
    const pts = [new THREE.Vector3(s*.92+off,2.35,.33), new THREE.Vector3(s*1.08,1.6,.28), new THREE.Vector3(s*.95,.8,.3), new THREE.Vector3(s*.96,.25,.35)];
    const curve = new THREE.CatmullRomCurve3(pts);
    const cable = mesh(new THREE.TubeGeometry(curve, 40, .012, 8, false), mat);
    robot.add(cable);
  });
}
leg(-1); leg(1);

// Brazos laterales del soporte superior
robot.add(box(.85, .11, .11, matBlack, [-1.15, 2.66, 0]));
robot.add(box(.85, .11, .11, matBlack, [1.15, 2.66, 0]));
robot.add(box(.2, .48, .16, matBlack, [-1.55, 2.35, 0]));
robot.add(box(.2, .48, .16, matBlack, [1.55, 2.35, 0]));

// Etiquetas visuales NEMA17
motors.forEach((m, i) => {
  const tag = box(.32,.12,.01, new THREE.MeshBasicMaterial({ color: 0xffffff }), [0, .32, .63]);
  m.add(tag);
});

let running = true;
let speed = .85;
document.querySelector('#speed').addEventListener('input', e => speed = Number(e.target.value));
document.querySelector('#toggleAnim').addEventListener('click', e => { running = !running; e.target.textContent = running ? 'Pausar marcha' : 'Reanudar marcha'; });
document.querySelector('#resetCam').addEventListener('click', () => { camera.position.set(4.4,3.4,7.5); controls.target.set(0,1.7,0); controls.update(); });

let t = 0;
function animate() {
  requestAnimationFrame(animate);
  if (running) t += 0.018 * speed;
  hips[0].rotation.x = Math.sin(t) * .22;
  hips[1].rotation.x = -Math.sin(t) * .22;
  knees[0].rotation.x = Math.max(0, -Math.sin(t)) * .34;
  knees[1].rotation.x = Math.max(0, Math.sin(t)) * .34;
  motors.forEach((m, idx) => m.rotation.z += (idx % 2 ? 1 : -1) * 0.01 * speed);
  robot.position.y = Math.sin(t*2) * .025;
  controls.update(); renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
});

// Intro animación con GSAP CDN
if (window.gsap) {
  gsap.from(robot.scale, { x: .75, y: .75, z: .75, duration: 1.2, ease: 'back.out(1.7)' });
  gsap.from(robot.rotation, { y: -0.35, duration: 1.4, ease: 'power3.out' });
}
