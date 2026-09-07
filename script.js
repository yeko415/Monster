import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const MODEL_PATH = new URL("models./baatli.glb", import.meta.url).href;

const STATES = [
  { eyebrow:"ENERGY DRINK", title:"POWER", sub:"YOUR DAY.", description:"Güçlü ve ferahlatıcı enerji deneyimi. Günün temposuna ayak uydurmak için tasarlandı.", x:0.75, y:0.18, z:0.00, scale:1.00, rotY:0.00, cameraZ:6.5 },
  { eyebrow:"ORIGINAL FORMULA", title:"FEEL", sub:"THE ENERGY.", description:"32 MG / 100 ML kafein. 500 ML kutu. Net, güçlü ve klasik enerji karakteri.", x:0.90, y:0.14, z:0.10, scale:1.08, rotY:-0.35, cameraZ:6.1 },
  { eyebrow:"500 ML POWER", title:"OWN", sub:"YOUR DAY.", description:"Biraz daha yakından bak. Kutu her adımda konumunu değiştirir ve daha güçlü görünür.", x:0.52, y:0.12, z:0.20, scale:1.18, rotY:0.35, cameraZ:5.7 }
];

const container=document.getElementById('three-container');
const loading=document.getElementById('modelLoading');
const eyebrow=document.querySelector('.hero .eyebrow');
const heroTitle=document.getElementById('heroTitle');
const description=document.getElementById('heroDescription');
const current=document.getElementById('currentNumber');
const total=document.getElementById('totalNumber');
const prev=document.getElementById('prevButton');
const next=document.getElementById('nextButton');

total.textContent=String(STATES.length).padStart(2,'0');

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,0.01,100);
camera.position.set(0,0,6.5);

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.35;
container.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff,0x111111,2.2));
const key=new THREE.DirectionalLight(0xffffff,5); key.position.set(4,6,7); scene.add(key);
const fill=new THREE.DirectionalLight(0xffffff,2.5); fill.position.set(-4,2,5); scene.add(fill);
const rim=new THREE.DirectionalLight(0xffffff,3); rim.position.set(0,4,-6); scene.add(rim);

const loader=new GLTFLoader();
let rig=null;
let active=0;
const target={...STATES[0]};
const currentState={...STATES[0]};

function setLoading(t){loading.textContent=t;loading.classList.toggle('hidden',!t)}
function error(msg){console.error('[MODEL]',msg);setLoading('');const e=document.createElement('div');e.className='model-error';e.innerHTML='<b>3D MODEL HATASI</b><br><small>'+String(msg).replace(/[<>&]/g,'')+'</small>';container.appendChild(e)}

function updateText(){const s=STATES[active]; eyebrow.textContent=s.eyebrow;heroTitle.innerHTML=s.title+' <span>'+s.sub+'</span>';description.textContent=s.description;current.textContent=String(active+1).padStart(2,'0')}
function setTarget(){const s=STATES[active],mobile=innerWidth<=900;target.x=mobile?s.x*.25:s.x;target.y=mobile?s.y-.10:s.y;target.z=s.z;target.scale=mobile?s.scale*.9:s.scale;target.rotY=s.rotY;target.cameraZ=mobile?s.cameraZ+.7:s.cameraZ}
function go(i){if(!rig)return;active=(i+STATES.length)%STATES.length;updateText();setTarget();document.getElementById('bottomHint')?.classList.add('hidden')}
prev.onclick=()=>go(active-1);next.onclick=()=>go(active+1);

function prepare(raw){
  raw.updateMatrixWorld(true);
  let box=new THREE.Box3().setFromObject(raw);
  const size=box.getSize(new THREE.Vector3());
  const max=Math.max(size.x,size.y,size.z);
  if(!isFinite(max)||max<=0)throw new Error('GLB geometrisi boş');
  const baseScale=3.35/max;
  raw.scale.setScalar(baseScale);
  raw.updateMatrixWorld(true);
  box=new THREE.Box3().setFromObject(raw);
  const center=box.getCenter(new THREE.Vector3());
  raw.position.sub(center);
  raw.rotation.y=Math.PI;
  raw.updateMatrixWorld(true);
  raw.traverse(o=>{
    if(!o.isMesh)return;
    o.frustumCulled=false;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    mats.forEach(m=>{
      if(!m)return;
      if(m.map){m.map.colorSpace=THREE.SRGBColorSpace;m.map.needsUpdate=true}
      m.side=THREE.DoubleSide;
      m.needsUpdate=true;
      if(m.transparent||/WhatsApp|Image/i.test(m.name||'')){
        m.transparent=true;m.depthTest=false;m.depthWrite=false;m.opacity=1;
        o.renderOrder=50;
      }
    });
  });
  rig=new THREE.Group();
  rig.add(raw);
  scene.add(rig);
  rig.position.set(target.x,target.y,target.z);
  rig.scale.setScalar(target.scale);
}

function load(){
 setLoading('3D MODEL YÜKLENİYOR');
 loader.load(MODEL_PATH,(gltf)=>{
   try{prepare(gltf.scene);setTarget();setLoading('');console.log('MODEL OK',MODEL_PATH);}
   catch(e){error(e.message)}
 },(p)=>{
   if(p.total){setLoading('3D MODEL '+Math.round(p.loaded/p.total*100)+'%')}
 },(e)=>error(e?.message||'GLB yüklenemedi'));
}

let startX=null;
container.addEventListener('pointerdown',e=>startX=e.clientX);
container.addEventListener('pointerup',e=>{if(startX==null)return;const dx=e.clientX-startX;startX=null;if(Math.abs(dx)>35)go(dx<0?active+1:active-1)});
addEventListener('keydown',e=>{if(e.key==='ArrowRight')go(active+1);if(e.key==='ArrowLeft')go(active-1)});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);setTarget()});

updateText();setTarget();load();
let last=performance.now();
function frame(t){requestAnimationFrame(frame);const dt=Math.min((t-last)/1000,.05);last=t;const k=1-Math.pow(.0005,dt);if(rig){rig.position.x+= (target.x-rig.position.x)*k;rig.position.y+=(target.y-rig.position.y)*k;rig.position.z+=(target.z-rig.position.z)*k;const s=rig.scale.x+(target.scale-rig.scale.x)*k;rig.scale.setScalar(s);const desired=target.rotY;let d=desired-rig.rotation.y;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;rig.rotation.y+=d*k}camera.position.z+=(target.cameraZ-camera.position.z)*k;camera.lookAt(0,0.1,0);renderer.render(scene,camera)}
requestAnimationFrame(frame);
