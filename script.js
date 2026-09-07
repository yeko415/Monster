import * as THREE from "https://esm.sh/three@0.180.0";
import { GLTFLoader } from "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";

const MODEL_PATH = new URL("models./baatli.glb", import.meta.url).href;
const STATES = [
  { eyebrow:"ENERGY DRINK", title:"POWER", sub:"YOUR DAY.", description:"Güçlü ve ferahlatıcı enerji deneyimi. Günün temposuna ayak uydurmak için tasarlandı.", x:0.75,y:0.18,z:0,scale:1,rotY:0,cameraZ:6.5 },
  { eyebrow:"ORIGINAL FORMULA", title:"FEEL", sub:"THE ENERGY.", description:"32 MG / 100 ML kafein. 500 ML kutu. Net, güçlü ve klasik enerji karakteri.", x:0.90,y:0.14,z:0.10,scale:1.08,rotY:-0.35,cameraZ:6.1 },
  { eyebrow:"500 ML POWER", title:"OWN", sub:"YOUR DAY.", description:"Biraz daha yakından bak. Kutu her adımda konumunu değiştirir ve daha güçlü görünür.", x:0.52,y:0.12,z:0.20,scale:1.18,rotY:0.35,cameraZ:5.7 }
];

const $=id=>document.getElementById(id);
const container=$("three-container"), loading=$("modelLoading");
const eyebrow=document.querySelector(".hero .eyebrow"), heroTitle=$("heroTitle"), description=$("heroDescription");
const current=$("currentNumber"), total=$("totalNumber"), prev=$("prevButton"), next=$("nextButton");
total.textContent="03";

function status(text){ loading.textContent=text; loading.classList.toggle("hidden",!text); }
function fatal(text){ console.error(text); loading.classList.remove("hidden"); loading.innerHTML=`<b>3D MODEL YÜKLENEMEDİ</b><br><small>${String(text).replace(/[<>&]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[c]))}</small>`; }

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,0.01,100);
camera.position.set(0,0.2,6.5);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.25;
container.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff,0x111111,2));
const key=new THREE.DirectionalLight(0xffffff,5); key.position.set(4,6,7); scene.add(key);
const fill=new THREE.DirectionalLight(0xffffff,2); fill.position.set(-4,2,5); scene.add(fill);
const rim=new THREE.DirectionalLight(0xffffff,3); rim.position.set(0,3,-6); scene.add(rim);

const rig=new THREE.Group(); scene.add(rig);
let model=null, active=0;
const cur={x:0,y:0,z:0,scale:1,rotY:0,cameraZ:6.5};
const target={...cur};

function updateText(){ const s=STATES[active]; eyebrow.textContent=s.eyebrow; heroTitle.innerHTML=`${s.title} <span>${s.sub}</span>`; description.textContent=s.description; current.textContent=String(active+1).padStart(2,"0"); }
function setTarget(){ const s=STATES[active], mobile=innerWidth<=900; Object.assign(target,s,{x:mobile?s.x*.35:s.x,y:mobile?s.y-.10:s.y,cameraZ:mobile?s.cameraZ+.7:s.cameraZ,scale:mobile?s.scale*.9:s.scale}); }
function go(delta){ active=(active+delta+STATES.length)%STATES.length; updateText(); setTarget(); }
prev.onclick=()=>go(-1); next.onclick=()=>go(1);

function prepare(raw){
  // First neutralize the GLB's own transform. The asset contains large translations/scales.
  raw.position.set(0,0,0); raw.rotation.set(0,Math.PI,0); raw.scale.setScalar(1); raw.updateMatrixWorld(true);
  let box=new THREE.Box3().setFromObject(raw), size=box.getSize(new THREE.Vector3());
  const max=Math.max(size.x,size.y,size.z);
  if(!Number.isFinite(max)||max<=0) throw new Error("GLB geometrisi boş.");
  raw.scale.setScalar(3.2/max); raw.updateMatrixWorld(true);
  box.setFromObject(raw);
  const center=box.getCenter(new THREE.Vector3());
  raw.position.sub(center); raw.updateMatrixWorld(true);

  raw.traverse(obj=>{
    if(!obj.isMesh) return;
    obj.frustumCulled=false;
    obj.renderOrder=1;
    const mats=Array.isArray(obj.material)?obj.material:[obj.material];
    for(const mat of mats){
      if(!mat) continue;
      if(mat.map){ mat.map.colorSpace=THREE.SRGBColorSpace; mat.map.needsUpdate=true; }
      mat.side=THREE.DoubleSide;
      // The supplied GLB contains a transparent logo/decal mesh sitting inside the can.
      // Render it on top so the logo cannot disappear behind the black body.
      if(mat.map || mat.transparent || /image|whatsapp/i.test(mat.name||"")){
        mat.transparent=true; mat.depthTest=false; mat.depthWrite=false; mat.opacity=1;
        obj.renderOrder=20;
      }
      mat.needsUpdate=true;
    }
  });
  model=raw; rig.add(model); rig.position.set(target.x,target.y,target.z); rig.scale.setScalar(target.scale);
}

async function loadModel(){
  status("3D MODEL YÜKLENİYOR");
  try{
    const response=await fetch(MODEL_PATH,{cache:"no-store"});
    if(!response.ok) throw new Error(`GLB HTTP ${response.status}`);
    const buffer=await response.arrayBuffer();
    status("3D MODEL HAZIRLANIYOR");
    const gltf=await new GLTFLoader().parseAsync(buffer,"");
    prepare(gltf.scene);
    status("");
    console.log("3D MODEL OK:",MODEL_PATH);
  }catch(err){ fatal(err?.message||"Bilinmeyen GLB hatası"); }
}

updateText(); setTarget(); loadModel();
let last=performance.now();
function animate(now){
  requestAnimationFrame(animate);
  const dt=Math.min((now-last)/1000,0.05); last=now;
  const k=1-Math.pow(0.0001,dt);
  for(const p of ["x","y","z","scale","rotY","cameraZ"]) cur[p]+=(target[p]-cur[p])*k;
  if(model){ rig.position.set(cur.x,cur.y,cur.z); rig.scale.setScalar(cur.scale); model.rotation.y=Math.PI+cur.rotY; model.rotation.z=Math.sin(now*0.0008)*0.015; }
  camera.position.z=cur.cameraZ;
  renderer.render(scene,camera);
}
requestAnimationFrame(animate);
addEventListener("resize",()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); setTarget(); });

let startX=null;
container.addEventListener("pointerdown",e=>{startX=e.clientX;container.classList.add("dragging")});
container.addEventListener("pointerup",e=>{container.classList.remove("dragging");if(startX===null)return;const dx=e.clientX-startX;startX=null;if(Math.abs(dx)>45)go(dx<0?1:-1)});
container.addEventListener("pointercancel",()=>{startX=null;container.classList.remove("dragging")});
addEventListener("keydown",e=>{if(e.key==="ArrowRight")go(1);if(e.key==="ArrowLeft")go(-1)});
