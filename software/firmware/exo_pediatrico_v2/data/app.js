'use strict';
const $ = (id)=>document.getElementById(id);
const DEG = Math.PI/180;
let scene,camera,renderer,controls,exo,parts={},ws=null,dataMode='demo',demoTimer=null,chartData=[];

function setLoad(msg,isError=false){const el=$('loading'); if(!el) return; el.textContent=msg; el.className=isError?'loading error':'loading'; if(!msg) el.style.display='none';}
function fmt(v,d=0){return Number.isFinite(+v)?(+v).toFixed(d):'--'}

function boot(){
  if(!window.THREE){setLoad('No se pudo cargar Three.js desde CDN. Verificá conexión a internet o copiá three.min.js local.',true);return;}
  try{init3D(); bindUI(); setDataMode('demo'); animate();}catch(e){console.error(e);setLoad('Error inicializando modelo 3D: '+e.message,true)}
}
window.addEventListener('load',boot);

const palette={
  black:0x050607, dark:0x161b22, rail:0x070a0f, gray:0x7d878d, light:0xb7c0c7,
  metal:0xd7dde4, red:0xff2458, blue:0x1683ff, rubber:0x0b0d10, grid:0x1d3348
};
let MAT={};
function makeMats(){
  MAT.black=new THREE.MeshStandardMaterial({color:palette.black,roughness:.62,metalness:.28});
  MAT.dark=new THREE.MeshStandardMaterial({color:palette.dark,roughness:.62,metalness:.35});
  MAT.rail=new THREE.MeshStandardMaterial({color:palette.rail,roughness:.42,metalness:.58});
  MAT.gray=new THREE.MeshStandardMaterial({color:palette.gray,roughness:.56,metalness:.14});
  MAT.light=new THREE.MeshStandardMaterial({color:palette.light,roughness:.42,metalness:.25});
  MAT.metal=new THREE.MeshStandardMaterial({color:palette.metal,roughness:.25,metalness:.82});
  MAT.red=new THREE.MeshStandardMaterial({color:palette.red,roughness:.48});
  MAT.blue=new THREE.MeshStandardMaterial({color:palette.blue,roughness:.48});
  MAT.rubber=new THREE.MeshStandardMaterial({color:palette.rubber,roughness:.86});
}
function mesh(geo,mat,name,pos=[0,0,0],rot=[0,0,0]){const o=new THREE.Mesh(geo,mat);o.name=name;o.position.set(...pos);o.rotation.set(...rot);o.castShadow=o.receiveShadow=true;return o;}
function box(name,s,p,m=MAT.gray,r=[0,0,0]){return mesh(new THREE.BoxGeometry(...s),m,name,p,r)}
function cyl(name,r,d,p,rot=[0,0,0],m=MAT.gray,seg=56){return mesh(new THREE.CylinderGeometry(r,r,d,seg),m,name,p,rot)}
function roundedPlate(name,w,h,d,p,m=MAT.gray){const g=new THREE.BoxGeometry(w,h,d);return mesh(g,m,name,p)}
function cable(name,pts,mat){const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));return mesh(new THREE.TubeGeometry(curve,48,.012,8),mat,name)}

function buildTrolleyTop(){
  const top=new THREE.Group(); top.name='carro_superior_fiel_fotos';
  // Base tipo plataforma/carrito
  top.add(box('placa_negra_trasera',[1.38,1.72,.14],[0,3.25,-.34],MAT.black));
  top.add(box('plataforma_horizontal',[3.12,.18,1.02],[0,2.27,.02],MAT.black));
  top.add(box('borde_frontal',[3.05,.14,.16],[0,2.15,.58],MAT.dark));
  top.add(box('perfil_izq',[.85,.11,.11],[-1.88,2.18,.48],MAT.rail));
  top.add(box('perfil_der',[.85,.11,.11],[1.88,2.18,.48],MAT.rail));
  top.add(box('perfil_lateral_izq',[.11,.11,.58],[-2.28,2.17,.22],MAT.rail));
  top.add(box('perfil_lateral_der',[.11,.11,.58],[2.28,2.17,.22],MAT.rail));
  // Manija real del carro: rectangular con dos columnas verticales y puente superior
  top.add(box('manija_columna_izq',[.16,1.22,.16],[-.52,3.70,-.50],MAT.dark));
  top.add(box('manija_columna_der',[.16,1.22,.16],[.52,3.70,-.50],MAT.dark));
  top.add(box('manija_superior',[1.22,.17,.16],[0,4.36,-.50],MAT.dark));
  top.add(box('asa_interna',[.82,.16,.10],[0,3.82,-.45],MAT.black));
  // Barras del trolley
  top.add(cyl('barra_trolley_izq',.035,1.65,[-.36,3.25,-.18],[0,0,0],MAT.metal,24));
  top.add(cyl('barra_trolley_der',.035,1.65,[.36,3.25,-.18],[0,0,0],MAT.metal,24));
  // Rueditas colgantes visibles
  [-.43,.43].forEach((x,i)=>{
    top.add(cyl('rueda_carrito_'+i,.16,.09,[x,2.02,.66],[Math.PI/2,0,0],MAT.rubber,40));
    top.add(cyl('eje_rueda_'+i,.035,.18,[x,2.02,.66],[Math.PI/2,0,0],MAT.metal,20));
  });
  // Tornillería
  [-.48,.48].forEach(x=>[2.08,2.42,3.8,4.25].forEach(y=>top.add(cyl('tornillo',.025,.012,[x,y,-.25],[Math.PI/2,0,0],MAT.metal,16))));
  return top;
}

function makeFoot(side){const sx=side==='L'?-1:1, g=new THREE.Group();
  g.add(box('talon',[.52,.13,.34],[0,-.10,-.20],MAT.gray));
  g.add(box('plantilla_base',[.52,.09,.88],[0,-.16,.30],MAT.gray));
  g.add(cyl('punta_redondeada',.26,.10,[0,-.16,.78],[Math.PI/2,0,0],MAT.gray,48));
  g.add(box('pared_lateral_ext',[.08,.22,.38],[sx*.30,-.02,.28],MAT.gray));
  g.add(box('pared_lateral_int',[.08,.18,.25],[-sx*.22,-.04,.18],MAT.gray));
  g.add(box('tope_empeine',[.40,.13,.08],[0,.02,.54],MAT.gray));
  return g;
}

function leg(side){
  const sx=side==='L'?-1:1; const root=new THREE.Group(); root.name='pierna_'+side;
  const hip=new THREE.Group(), knee=new THREE.Group(), ankle=new THREE.Group();
  hip.position.set(sx*1.18,2.04,.22); knee.position.set(0,-1.05,0); ankle.position.set(0,-.98,.10);
  hip.add(cyl('copa_cadera',.31,.24,[0,0,0],[Math.PI/2,0,0],MAT.gray));
  hip.add(cyl('tapa_cadera',.24,.255,[0,.005,0],[Math.PI/2,0,0],MAT.light));
  hip.add(box('motor_cadera_nema17',[.42,.42,.50],[sx*.43,0,0],MAT.dark));
  hip.add(box('frente_motor_cadera',[.44,.44,.035],[sx*.70,0,0],MAT.metal));
  hip.add(box('soporte_superior',[.34,.22,.18],[0,.03,-.20],MAT.gray));
  hip.add(box('perfil_muslo',[.13,1.10,.13],[0,-.55,0],MAT.rail));
  hip.add(box('abrazadera_muslo_1',[.56,.12,.09],[0,-.44,.15],MAT.light));
  hip.add(box('abrazadera_muslo_2',[.50,.12,.09],[0,-.74,.15],MAT.light));
  hip.add(knee);
  knee.add(cyl('copa_rodilla',.27,.22,[0,0,0],[Math.PI/2,0,0],MAT.gray));
  knee.add(cyl('tapa_rodilla',.22,.235,[0,.005,0],[Math.PI/2,0,0],MAT.light));
  knee.add(box('motor_rodilla_nema17',[.42,.42,.48],[sx*.40,0,0],MAT.dark));
  knee.add(box('frente_motor_rodilla',[.44,.44,.035],[sx*.66,0,0],MAT.metal));
  knee.add(box('perfil_pantorrilla',[.13,.96,.13],[0,-.52,.06],MAT.rail));
  knee.add(box('abrazadera_pierna_1',[.52,.12,.09],[0,-.36,.18],MAT.light));
  knee.add(box('abrazadera_pierna_2',[.46,.12,.09],[0,-.70,.18],MAT.light));
  knee.add(ankle);
  ankle.add(cyl('bisagra_tobillo',.19,.36,[0,0,0],[Math.PI/2,0,0],MAT.gray));
  ankle.add(box('bloque_tobillo',[.48,.44,.34],[0,-.04,0],MAT.gray));
  const foot=makeFoot(side); foot.position.y=-.23; ankle.add(foot);
  root.add(hip);
  root.add(cable('cable_rojo_'+side,[[sx*1.18,2.16,.36],[sx*1.08,1.35,.43],[sx*1.03,.50,.38],[sx*1.04,.05,.47]],MAT.red));
  root.add(cable('cable_azul_'+side,[[sx*1.14,2.12,.40],[sx*1.04,1.30,.45],[sx*1.00,.48,.40],[sx*1.00,.06,.50]],MAT.blue));
  root.userData={hip,knee,ankle}; parts[side]=root.userData;
  return root;
}

function buildExo(){
  exo=new THREE.Group(); exo.name='EXO_PEDIATRICO'; exo.position.y=-.05;
  exo.add(buildTrolleyTop()); exo.add(leg('L')); exo.add(leg('R'));
  scene.add(exo);
}

function init3D(){
  makeMats();
  const el=$('scene');
  scene=new THREE.Scene(); scene.background=new THREE.Color(0x0a121d);
  camera=new THREE.PerspectiveCamera(50,Math.max(1,el.clientWidth)/Math.max(1,el.clientHeight),.1,120); camera.position.set(3.8,2.8,5.4);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(el.clientWidth||800,el.clientHeight||600); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; el.appendChild(renderer.domElement);
  controls=new THREE.OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.dampingFactor=.08; controls.target.set(0,1.7,.15); controls.minDistance=2.2; controls.maxDistance=11;
  scene.add(new THREE.HemisphereLight(0xcfe7ff,0x17202c,1.2));
  const key=new THREE.DirectionalLight(0xffffff,2.6); key.position.set(4,7,5); key.castShadow=true; key.shadow.mapSize.set(2048,2048); scene.add(key);
  const rim=new THREE.DirectionalLight(0x61b9ff,.85); rim.position.set(-4,3,-5); scene.add(rim);
  const floor=box('piso',[10,.05,10],[0,-.55,0],new THREE.MeshStandardMaterial({color:0x111d2b,roughness:.86})); floor.receiveShadow=true; scene.add(floor);
  const grid=new THREE.GridHelper(10,20,0x2a4b68,0x1b3047); grid.position.y=-.515; scene.add(grid);
  const axes=new THREE.AxesHelper(.8); axes.position.set(0,-.48,0); scene.add(axes);
  buildExo(); setLoad(''); onResize();
}
function onResize(){if(!renderer)return; const el=$('scene'); const w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight); camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h)}
window.addEventListener('resize',onResize);

function bindUI(){
  ['rx','ry','rz'].forEach(id=>$(id).addEventListener('input',applyRot));
  renderer.domElement.addEventListener('wheel',wheelControl,{passive:false});
  $('demoBtn').onclick=()=>setDataMode('demo'); $('realBtn').onclick=()=>setDataMode('real');
  $('start').onclick=()=>{ if(dataMode==='real') send({cmd:'start'}); startDemoSequence(); };
  $('stop').onclick=()=>{ if(dataMode==='real') send({cmd:'stop'}); updateTelemetry({mode:'STOPPED',joints:{lh:0,lk:0,rh:0,rk:0}}); };
}
function applyRot(){exo.rotation.x=+$('rx').value*DEG; exo.rotation.y=+$('ry').value*DEG; exo.rotation.z=+$('rz').value*DEG; ['rx','ry','rz'].forEach(id=>$(id+'Out').textContent=$(id).value+'°')}
function syncSliders(){['x','y','z'].forEach(a=>{let v=Math.round(exo.rotation[a]/DEG); v=((v+180)%360+360)%360-180; $(a==='x'?'rx':a==='y'?'ry':'rz').value=v; $(a==='x'?'rxOut':a==='y'?'ryOut':'rzOut').textContent=v+'°';});}
function wheelControl(e){
  const mode=$('wheelMode').value; if(mode==='zoom' && !e.shiftKey && !e.altKey) return;
  e.preventDefault(); const d=e.deltaY*.0016;
  if(e.altKey || mode==='x') exo.rotation.x+=d; else if(e.shiftKey || mode==='y') exo.rotation.y+=d; else exo.rotation.z+=d;
  syncSliders();
}
function animate(){requestAnimationFrame(animate); if(controls)controls.update(); if(renderer)renderer.render(scene,camera); drawChart();}

function setDataMode(m){
  dataMode=m; document.body.classList.toggle('demo',m==='demo'); document.body.classList.toggle('connected',false);
  $('demoBtn').classList.toggle('active',m==='demo'); $('realBtn').classList.toggle('active',m==='real');
  $('sourceText').textContent=m==='demo'?'Modo DEMO: telemetría simulada para probar sin hardware.':'Modo REAL: conecta al WebSocket del ESP32 y usa sensores reales.';
  if(ws){try{ws.close()}catch{} ws=null} if(demoTimer){clearInterval(demoTimer); demoTimer=null}
  if(m==='demo'){ $('conn').textContent='DEMO activo'; demoTimer=setInterval(demoTick,80); demoTick(); }
  else connectWS();
}
function connectWS(){
  const host=location.host || '192.168.4.1'; ws=new WebSocket(`ws://${host}/ws`);
  ws.onopen=()=>{document.body.classList.add('connected');$('conn').textContent='ESP32 conectado'};
  ws.onclose=()=>{document.body.classList.remove('connected');$('conn').textContent='Reconectando ESP32…'; if(dataMode==='real')setTimeout(connectWS,1200)};
  ws.onerror=()=>{$('conn').textContent='Error WebSocket'};
  ws.onmessage=(ev)=>{try{updateTelemetry(JSON.parse(ev.data))}catch(e){console.warn(e)}};
}
function send(o){if(ws&&ws.readyState===1)ws.send(JSON.stringify(o))}

let demoStart=performance.now(), manualDemo=false;
function startDemoSequence(){demoStart=performance.now(); manualDemo=true;}
function demoTick(){
  const t=(performance.now()-demoStart)/1000; const phase=t%14; let mode='DEMO_IDLE'; let j={lh:0,lk:0,rh:0,rk:0};
  if(manualDemo||phase>1){
    if(phase<4){mode='SIT_TO_STAND'; const k=Math.min(1,phase/3); j={lh:70*(1-k),lk:85*(1-k),rh:70*(1-k),rk:85*(1-k)}}
    else if(phase<7){mode='3 PASOS ADELANTE'; const s=Math.sin((phase-4)*Math.PI*2); j={lh:14*s,lk:22*Math.max(0,-s),rh:-14*s,rk:22*Math.max(0,s)}}
    else if(phase<10){mode='3 PASOS ATRAS'; const s=Math.sin((phase-7)*Math.PI*2); j={lh:-12*s,lk:18*Math.max(0,-s),rh:12*s,rk:18*Math.max(0,s)}}
    else if(phase<12){mode='3 DERECHA'; const s=Math.sin((phase-10)*Math.PI*3); j={lh:8*s,lk:16*Math.max(0,s),rh:-8*s,rk:10*Math.max(0,-s)}}
    else {mode='3 IZQUIERDA'; const s=Math.sin((phase-12)*Math.PI*3); j={lh:-8*s,lk:16*Math.max(0,s),rh:8*s,rk:10*Math.max(0,-s)}}
  }
  updateTelemetry({mode,imuL:{pitch:1.5*Math.sin(t),roll:2*Math.cos(t*.8)},imuR:{pitch:1.2*Math.sin(t+.6),roll:2.2*Math.cos(t*.9)},joints:j,bio:{bpm:82+7*Math.sin(t*1.8),spo2:97+1*Math.sin(t*.4),bodyC:36.6+.15*Math.sin(t*.2),ambientC:24.2+1.2*Math.sin(t*.1),cpuC:42+3*Math.sin(t*.35),emg:1550+620*Math.max(0,Math.sin(t*8)),ecg:1900+520*Math.sin(t*7)}});
}
function updateTelemetry(d){
  if(d.mode)$('mode').textContent=d.mode;
  const b=d.bio||{}; $('bpm').textContent=fmt(b.bpm,0); $('spo2').textContent=fmt(b.spo2,0); $('body').textContent=fmt(b.bodyC,1); $('amb').textContent=fmt(b.ambientC,1); $('cpu').textContent=fmt(b.cpuC,1); $('emg').textContent=fmt(b.emg,0); $('ecg').textContent=fmt(b.ecg,0);
  const il=d.imuL||{}, ir=d.imuR||{}; $('imu').textContent=`${fmt(il.pitch,0)}/${fmt(ir.roll,0)}°`;
  if(d.joints){$('joints').textContent=JSON.stringify(d.joints,null,2); applyJoints(d.joints)}
  chartData.push({ecg:+b.ecg||0,emg:+b.emg||0}); if(chartData.length>180)chartData.shift();
}
function applyJoints(j){
  if(!parts.L||!parts.R)return;
  parts.L.hip.rotation.x=(+j.lh||0)*DEG; parts.L.knee.rotation.x=-(+j.lk||0)*DEG;
  parts.R.hip.rotation.x=(+j.rh||0)*DEG; parts.R.knee.rotation.x=-(+j.rk||0)*DEG;
}
function drawChart(){
  const c=$('bioChart'); if(!c)return; const ctx=c.getContext('2d'); const w=c.width=c.clientWidth*devicePixelRatio, h=c.height=c.clientHeight*devicePixelRatio; ctx.clearRect(0,0,w,h); ctx.lineWidth=1.6*devicePixelRatio; ctx.globalAlpha=.9;
  const draw=(key,color)=>{ctx.strokeStyle=color; ctx.beginPath(); chartData.forEach((p,i)=>{const x=i/(179)*w; const val=(p[key]||0)/4095; const y=h-(val*h); i?ctx.lineTo(x,y):ctx.moveTo(x,y)}); ctx.stroke();};
  ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=1; for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(0,h*i/4);ctx.lineTo(w,h*i/4);ctx.stroke();}
  draw('ecg','#28d8ff'); draw('emg','#ff3656');
}
