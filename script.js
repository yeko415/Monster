import * as THREE from "three";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";

const MODEL_PATH = "./models./baatli.glb";
const container = document.getElementById("three-container");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const currentNumber = document.getElementById("currentNumber");
const totalNumber = document.getElementById("totalNumber");

const products = [
  { title:"ENERGY ORIGINAL", description:"Güçlü karakteri ve ferahlatıcı tadıyla günün her anına eşlik eden enerji içeceği.", energy:"32 MG / 100 ML", size:"500 ML", type:"ENERGY DRINK" },
  { title:"ENERGY ZERO", description:"Şekersiz içim deneyimiyle güçlü ve ferahlatıcı enerji.", energy:"32 MG / 100 ML", size:"500 ML", type:"ZERO SUGAR" },
  { title:"ENERGY MAX", description:"Daha güçlü karaktere sahip yoğun enerji deneyimi.", energy:"32 MG / 100 ML", size:"500 ML", type:"ENERGY DRINK" }
];

totalNumber.textContent = String(products.length).padStart(2,"0");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.01, 100);
camera.position.set(0, 0.8, 7.5);

const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true, powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
container.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 1.8));
const key = new THREE.DirectionalLight(0xffffff, 4.5);
key.position.set(4, 6, 6);
scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 2.5);
fill.position.set(-4, 3, 4);
scene.add(fill);
const rim = new THREE.PointLight(0xffffff, 8, 20);
rim.position.set(0, 2, -3);
scene.add(rim);

const loader = new GLTFLoader();
let models = [];
let active = 0;
let targetX = 0;
let dragging = false;
let startX = 0;

function showError(message) {
  console.error(message);
  const box = document.createElement("div");
  box.style.cssText = "position:absolute;left:20px;right:20px;top:45%;z-index:999;color:#fff;background:rgba(180,0,0,.8);padding:16px;border-radius:12px;font:13px Arial;text-align:center";
  box.textContent = message;
  container.appendChild(box);
}

function normalize(object) {
  object.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const max = Math.max(size.x, size.y, size.z);
  if (!max || !isFinite(max)) throw new Error("GLB boyutu okunamadı");

  object.scale.setScalar(3.7 / max);
  object.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  box.getCenter(center);
  object.position.x -= center.x;
  object.position.y -= box.min.y;
  object.position.z -= center.z;
  object.updateMatrixWorld(true);
}

function cloneModel(source) {
  const m = source.clone(true);
  m.traverse(child => {
    if (child.isMesh) {
      child.frustumCulled = false;
      if (child.material) child.material.needsUpdate = true;
    }
  });
  return m;
}

function layout(animated = false) {
  models.forEach((m, i) => {
    let diff = i - active;
    if (diff > 1) diff -= models.length;
    if (diff < -1) diff += models.length;
    const tx = diff * 2.35;
    const tz = diff === 0 ? 0 : -1.2;
    const s = diff === 0 ? 1 : 0.72;
    const ry = -diff * 0.28;
    if (!animated) {
      m.position.x = tx; m.position.z = tz; m.scale.setScalar(s); m.rotation.y = ry;
    } else {
      m.userData.tx = tx; m.userData.tz = tz; m.userData.s = s; m.userData.ry = ry;
    }
  });
  currentNumber.textContent = String(active + 1).padStart(2,"0");
}

function next() { active = (active + 1) % models.length; layout(true); }
function prev() { active = (active - 1 + models.length) % models.length; layout(true); }

prevButton?.addEventListener("click", prev);
nextButton?.addEventListener("click", next);

container.addEventListener("pointerdown", e => { dragging = true; startX = e.clientX; });
window.addEventListener("pointerup", e => {
  if (!dragging) return;
  dragging = false;
  const dx = e.clientX - startX;
  if (Math.abs(dx) > 45) dx < 0 ? next() : prev();
});

loader.load(MODEL_PATH, gltf => {
  try {
    const source = gltf.scene;
    normalize(source);
    for (let i = 0; i < products.length; i++) {
      const m = cloneModel(source);
      m.userData.tx = i === 0 ? 0 : (i === 1 ? 2.35 : -2.35);
      m.userData.tz = i === 0 ? 0 : -1.2;
      m.userData.s = i === 0 ? 1 : 0.72;
      m.userData.ry = i === 0 ? 0 : (i === 1 ? -0.28 : 0.28);
      scene.add(m);
      models.push(m);
    }
    layout(false);
    console.log("3D model başarıyla yüklendi", MODEL_PATH);
  } catch (err) {
    showError("3D model hazırlanırken hata oluştu: " + err.message);
  }
}, undefined, err => {
  showError("3D model yüklenemedi. models/baatli.glb dosyasını kontrol et.");
  console.error(err);
});

function animate() {
  requestAnimationFrame(animate);
  for (const m of models) {
    if (m.userData.tx !== undefined) {
      m.position.x += (m.userData.tx - m.position.x) * 0.12;
      m.position.z += (m.userData.tz - m.position.z) * 0.12;
      const currentScale = m.scale.x;
      const ns = currentScale + (m.userData.s - currentScale) * 0.12;
      m.scale.setScalar(ns);
      m.rotation.y += (m.userData.ry - m.rotation.y) * 0.12;
    }
  }
  renderer.render(scene, camera);
}
animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});
