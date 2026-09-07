import * as THREE from "https://esm.sh/three@0.180.0";
import { GLTFLoader } from "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";
import { gsap } from "https://esm.sh/gsap@3.13.0";

const MODEL_PATH = "./models/baatli.glb";
const PRODUCTS = [
  { title:"ENERGY ORIGINAL", description:"Güçlü karakteri ve ferahlatıcı tadıyla günün her anına eşlik eden enerji içeceği.", energy:"32 MG / 100 ML", size:"500 ML", type:"ENERGY DRINK" },
  { title:"ENERGY ZERO", description:"Şekersiz içim deneyimiyle güçlü ve ferahlatıcı enerji.", energy:"32 MG / 100 ML", size:"500 ML", type:"ZERO SUGAR" },
  { title:"ENERGY MAX", description:"Daha güçlü karaktere sahip yoğun enerji deneyimi.", energy:"32 MG / 100 ML", size:"500 ML", type:"ENERGY DRINK" }
];

const container = document.getElementById("three-container");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const currentNumber = document.getElementById("currentNumber");
const totalNumber = document.getElementById("totalNumber");
const bottomHint = document.getElementById("bottomHint");
const productDetail = document.getElementById("productDetail");
const closeDetail = document.getElementById("closeDetail");
const productTitle = document.getElementById("productTitle");
const productDescription = document.getElementById("productDescription");
const productEnergy = document.getElementById("productEnergy");
const productSize = document.getElementById("productSize");
const productType = document.getElementById("productType");
const menuButton = document.getElementById("menuButton");
const closeMenu = document.getElementById("closeMenu");
const mobileMenu = document.getElementById("mobileMenu");

totalNumber.textContent = String(PRODUCTS.length).padStart(2,"0");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, innerWidth/innerHeight, 0.01, 100);
camera.position.set(0,0.05,7);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:"high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff,0x111111,2.2));
const keyLight = new THREE.DirectionalLight(0xffffff,4.5); keyLight.position.set(3,5,5); scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xffffff,2.0); fillLight.position.set(-4,2,2); scene.add(fillLight);
const rimLight = new THREE.PointLight(0xffffff,7,15); rimLight.position.set(0,2,-3); scene.add(rimLight);

const loader = new GLTFLoader();
let sourceModel = null, models = [], activeIndex = 0, isAnimating = false, detailOpen = false;
const SPACING = 2.55;

function prepareModel(object) {
  object.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material.needsUpdate = true;
        if (child.material.map) child.material.map.colorSpace = THREE.SRGBColorSpace;
      }
    }
  });

  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size); box.getCenter(center);
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box.min.y;

  const maxSize = Math.max(size.x,size.y,size.z);
  if (maxSize > 0) object.scale.setScalar(4.1/maxSize);
}

function createCarousel() {
  models = [];
  for (let i=0;i<PRODUCTS.length;i++) {
    const clone = sourceModel.clone(true);
    clone.userData.productIndex = i;
    scene.add(clone);
    models.push(clone);
  }
  layoutModels(true);
}

function getRelativePosition(index) {
  let diff = index-activeIndex;
  const length = models.length;
  if (diff > length/2) diff -= length;
  if (diff < -length/2) diff += length;
  return diff;
}

function layoutModels(immediate=false) {
  models.forEach((model,index) => {
    const relative = getRelativePosition(index);
    const abs = Math.abs(relative);
    const x = relative*SPACING;
    const scale = relative===0 ? 1 : Math.max(0.60,0.82-(abs-1)*0.08);
    const y = Math.min(abs,2)*-0.08;
    const z = relative===0 ? 0 : -0.9*abs;
    const rotationY = relative*-0.36;
    const rotationZ = relative*0.025;

    if (immediate) {
      model.position.set(x,y,z);
      model.rotation.set(0,rotationY,rotationZ);
      model.scale.setScalar(scale);
    } else {
      gsap.killTweensOf(model.position); gsap.killTweensOf(model.rotation); gsap.killTweensOf(model.scale);
      gsap.to(model.position,{x,y,z,duration:.75,ease:"power3.out"});
      gsap.to(model.rotation,{x:0,y:rotationY,z:rotationZ,duration:.75,ease:"power3.out"});
      gsap.to(model.scale,{x:scale,y:scale,z:scale,duration:.75,ease:"power3.out"});
    }
  });
}

function goTo(index) {
  if (isAnimating || detailOpen || !models.length) return;
  activeIndex = (index+models.length)%models.length;
  isAnimating = true;
  layoutModels(false); updateUI();
  setTimeout(()=>isAnimating=false,700);
}
const nextProduct=()=>goTo(activeIndex+1);
const previousProduct=()=>goTo(activeIndex-1);

function updateUI() {
  currentNumber.textContent = String(activeIndex+1).padStart(2,"0");
  const p = PRODUCTS[activeIndex];
  if (!p) return;
  productTitle.textContent=p.title;
  productDescription.textContent=p.description;
  productEnergy.textContent=p.energy;
  productSize.textContent=p.size;
  productType.textContent=p.type;
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
function pointerToNDC(event) {
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.x=((event.clientX-rect.left)/rect.width)*2-1;
  pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;
}

function handleModelClick(event) {
  if (detailOpen) return;
  pointerToNDC(event);
  raycaster.setFromCamera(pointer,camera);
  const visible=models.filter((_,index)=>{ const r=getRelativePosition(index); return r>=-1&&r<=1; });
  const hits=raycaster.intersectObjects(visible,true);
  if (!hits.length) return;

  let selected=hits[0].object;
  while (selected.parent && !models.includes(selected)) selected=selected.parent;
  const clickedIndex=models.indexOf(selected);
  if (clickedIndex===-1) return;

  const relative=getRelativePosition(clickedIndex);
  if (relative!==0) { goTo(clickedIndex); return; }
  openDetail();
}

function openDetail() {
  if (detailOpen || !models[activeIndex]) return;
  detailOpen=true;
  document.body.classList.add("detail-open");
  bottomHint.classList.add("hidden");
  productDetail.classList.add("open");
  productDetail.setAttribute("aria-hidden","false");

  const selected=models[activeIndex];
  models.forEach((model,index)=>{
    if (index!==activeIndex) {
      gsap.to(model.position,{x:model.position.x*2.4,duration:.8,ease:"power3.inOut"});
      gsap.to(model.scale,{x:.25,y:.25,z:.25,duration:.8,ease:"power3.inOut"});
    }
  });

  gsap.timeline()
    .to(selected.rotation,{y:selected.rotation.y+Math.PI*.22,duration:.6,ease:"power2.inOut"})
    .to(selected.position,{x:-1.65,y:.1,z:2,duration:1.05,ease:"power3.inOut"},.1)
    .to(selected.scale,{x:1.75,y:1.75,z:1.75,duration:1.1,ease:"power4.inOut"},.1)
    .to(camera.position,{x:0,y:.1,z:5.2,duration:1.1,ease:"power3.inOut"},0);
}

function closeProductDetail() {
  if (!detailOpen) return;
  detailOpen=false;
  productDetail.classList.remove("open");
  productDetail.setAttribute("aria-hidden","true");
  document.body.classList.remove("detail-open");
  gsap.to(camera.position,{x:0,y:.05,z:7,duration:.9,ease:"power3.inOut"});
  layoutModels(false);
  setTimeout(()=>bottomHint.classList.remove("hidden"),450);
}

let pointerDown=false,startX=0,currentX=0,hasDragged=false;
container.addEventListener("pointerdown",event=>{
  if(detailOpen) return;
  pointerDown=true; hasDragged=false; startX=currentX=event.clientX;
  container.classList.add("dragging");
  try{container.setPointerCapture(event.pointerId);}catch{}
});
container.addEventListener("pointermove",event=>{
  if(!pointerDown||detailOpen) return;
  currentX=event.clientX;
  if(Math.abs(currentX-startX)>8) hasDragged=true;
});
container.addEventListener("pointerup",event=>{
  if(!pointerDown) return;
  pointerDown=false; container.classList.remove("dragging");
  const delta=currentX-startX;
  if(!hasDragged || Math.abs(delta)<35) handleModelClick(event);
  else { delta<0 ? nextProduct() : previousProduct(); bottomHint.classList.add("hidden"); }
  try{container.releasePointerCapture(event.pointerId);}catch{}
});
container.addEventListener("pointercancel",()=>{pointerDown=false;container.classList.remove("dragging");});

let wheelLocked=false;
container.addEventListener("wheel",event=>{
  if(detailOpen||wheelLocked||Math.abs(event.deltaY)<8) return;
  event.preventDefault(); wheelLocked=true;
  event.deltaY>0?nextProduct():previousProduct();
  bottomHint.classList.add("hidden");
  setTimeout(()=>wheelLocked=false,650);
},{passive:false});

window.addEventListener("keydown",event=>{
  if(detailOpen){if(event.key==="Escape")closeProductDetail();return;}
  if(event.key==="ArrowRight")nextProduct();
  if(event.key==="ArrowLeft")previousProduct();
});
prevButton.addEventListener("click",previousProduct);
nextButton.addEventListener("click",nextProduct);
closeDetail.addEventListener("click",closeProductDetail);
menuButton.addEventListener("click",()=>{mobileMenu.classList.add("open");mobileMenu.setAttribute("aria-hidden","false");});
closeMenu.addEventListener("click",()=>{mobileMenu.classList.remove("open");mobileMenu.setAttribute("aria-hidden","true");});
mobileMenu.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{mobileMenu.classList.remove("open");mobileMenu.setAttribute("aria-hidden","true");}));

addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
});

let modelLoadDone=false;
loader.load(MODEL_PATH,gltf=>{
  sourceModel=gltf.scene;
  prepareModel(sourceModel);
  createCarousel();
  updateUI();
  modelLoadDone=true;
},undefined,error=>{
  console.error("3D model yüklenemedi:",error);
  container.innerHTML=`<div style="position:absolute;inset:0;display:grid;place-items:center;color:rgba(255,255,255,.5);font:12px Inter,sans-serif;text-align:center;padding:30px">3D model yüklenemedi.<br>models/baatli.glb yolunu ve dosya adını kontrol et.</div>`;
});

const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const t=clock.getElapsedTime();
  if(modelLoadDone){
    models.forEach((model,index)=>{
      const relative=getRelativePosition(index);
      if(relative===0&&!detailOpen){
        model.position.y += Math.sin(t*1.15)*.0007;
        model.rotation.z = Math.sin(t*.7)*.008;
      }
    });
  }
  renderer.render(scene,camera);
}
animate();
