import * as THREE from "https://esm.sh/three@0.180.0";
import { GLTFLoader } from "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";
import { gsap } from "https://esm.sh/gsap@3.13.0";

// GitHub Pages'taki gerçek klasör adı noktali: models.
const MODEL_PATH = "./models./baatli.glb";

const STATES = [
  {
    eyebrow: "ENERGY DRINK",
    title: "POWER",
    sub: "YOUR DAY.",
    description: "Güçlü ve ferahlatıcı enerji deneyimi. Günün temposuna ayak uydurmak için tasarlandı.",
    position: { x: 0.00, y: 0.72, z: 0.00 },
    scale: 1.00,
    rotationY: 0.00,
    cameraZ: 7.00
  },
  {
    eyebrow: "ORIGINAL FORMULA",
    title: "FEEL",
    sub: "THE ENERGY.",
    description: "32 MG / 100 ML kafein. 500 ML kutu. Net, güçlü ve klasik enerji karakteri.",
    position: { x: 0.72, y: 0.56, z: 0.28 },
    scale: 1.12,
    rotationY: -0.20,
    cameraZ: 6.55
  },
  {
    eyebrow: "500 ML POWER",
    title: "OWN",
    sub: "YOUR DAY.",
    description: "Daha yakından bak. Her okta kutu yaklaşır, yön değiştirir ve yeni bir detay öne çıkar.",
    position: { x: -0.62, y: 0.52, z: 0.58 },
    scale: 1.30,
    rotationY: 0.30,
    cameraZ: 6.05
  }
];

const container = document.getElementById("three-container");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const currentNumber = document.getElementById("currentNumber");
const totalNumber = document.getElementById("totalNumber");
const bottomHint = document.getElementById("bottomHint");
const heroEyebrow = document.querySelector(".hero .eyebrow");
const heroTitle = document.querySelector(".hero h1");
const heroDescription = document.querySelector(".hero .hero-description");

if (totalNumber) totalNumber.textContent = "03";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.01, 100);
camera.position.set(0, 0.05, 7);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
container.appendChild(renderer.domElement);

// Daha belirgin ürün ışığı.
scene.add(new THREE.HemisphereLight(0xffffff, 0x080808, 2.4));
const key = new THREE.DirectionalLight(0xffffff, 5.0);
key.position.set(4, 5, 6);
scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 2.4);
fill.position.set(-4, 2, 4);
scene.add(fill);
const rim = new THREE.PointLight(0xffffff, 8, 14);
rim.position.set(0, 2.5, -3);
scene.add(rim);

const loader = new GLTFLoader();
let model = null;
let activeIndex = 0;
let busy = false;

function showError(message) {
  console.error(message);
  container.innerHTML = `
    <div style="position:absolute;inset:0;display:grid;place-items:center;color:rgba(255,255,255,.58);font:12px Inter,sans-serif;text-align:center;padding:28px;line-height:1.6">
      ${message}
    </div>`;
}

function prepareModel(root) {
  // GLB'nin içindeki tekstürlü decal/logo mesh'i kutunun arka tarafında.
  // Modeli 180° çevirerek gerçek tasarım yüzünü kameraya getiriyoruz.
  root.rotation.y = Math.PI;

  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((mat) => {
      if (!mat) return;
      mat.needsUpdate = true;
      if (mat.map) {
        mat.map.colorSpace = THREE.SRGBColorSpace;
        mat.map.needsUpdate = true;
      }
      // GLB içindeki logo materyali alpha kullanıyor.
      if (mat.name && mat.name.includes("WhatsApp Image")) {
        mat.transparent = true;
        mat.depthWrite = false;
        mat.side = THREE.DoubleSide;
      }
    });
  });

  // Önce gerçek boyutu bul, sonra ölçekle ve tekrar merkezle.
  let box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxSize = Math.max(size.x, size.y, size.z);
  if (maxSize > 0) root.scale.setScalar(4.0 / maxSize);

  box = new THREE.Box3().setFromObject(root);
  box.getCenter(center);
  root.position.x -= center.x;
  root.position.y -= box.min.y;
  root.position.z -= center.z;
}

function updateText(instant = false) {
  const state = STATES[activeIndex];
  if (!heroEyebrow || !heroTitle || !heroDescription) return;

  if (instant) {
    heroEyebrow.textContent = state.eyebrow;
    heroTitle.innerHTML = `${state.title} <span>${state.sub}</span>`;
    heroDescription.textContent = state.description;
    return;
  }

  const items = [heroEyebrow, heroTitle, heroDescription].filter(Boolean);
  gsap.to(items, {
    opacity: 0,
    y: 10,
    duration: 0.18,
    ease: "power2.in",
    onComplete: () => {
      heroEyebrow.textContent = state.eyebrow;
      heroTitle.innerHTML = `${state.title} <span>${state.sub}</span>`;
      heroDescription.textContent = state.description;
      gsap.to(items, { opacity: 1, y: 0, duration: 0.42, stagger: 0.035, ease: "power3.out" });
    }
  });
}

function applyState(instant = false) {
  if (!model) return;
  const state = STATES[activeIndex];

  gsap.killTweensOf(model.position);
  gsap.killTweensOf(model.rotation);
  gsap.killTweensOf(model.scale);
  gsap.killTweensOf(camera.position);

  if (instant) {
    model.position.set(state.position.x, state.position.y, state.position.z);
    model.rotation.set(0, state.rotationY, 0);
    model.scale.setScalar(state.scale);
    camera.position.z = state.cameraZ;
    camera.updateProjectionMatrix();
    return;
  }

  gsap.to(model.position, {
    x: state.position.x,
    y: state.position.y,
    z: state.position.z,
    duration: 0.9,
    ease: "power3.inOut"
  });

  gsap.to(model.rotation, {
    x: 0,
    y: state.rotationY,
    z: 0,
    duration: 0.9,
    ease: "power3.inOut"
  });

  gsap.to(model.scale, {
    x: state.scale,
    y: state.scale,
    z: state.scale,
    duration: 0.95,
    ease: "power3.inOut"
  });

  gsap.to(camera.position, {
    z: state.cameraZ,
    duration: 1.0,
    ease: "power3.inOut"
  });
}

function updateCounter() {
  if (currentNumber) currentNumber.textContent = String(activeIndex + 1).padStart(2, "0");
}

function goTo(nextIndex) {
  if (!model || busy) return;
  activeIndex = (nextIndex + STATES.length) % STATES.length;
  busy = true;
  updateCounter();
  if (bottomHint) bottomHint.classList.add("hidden");
  updateText(false);
  applyState(false);
  window.setTimeout(() => { busy = false; }, 900);
}

prevButton?.addEventListener("click", () => goTo(activeIndex - 1));
nextButton?.addEventListener("click", () => goTo(activeIndex + 1));

let downX = 0;
let tracking = false;
container.addEventListener("pointerdown", (event) => {
  tracking = true;
  downX = event.clientX;
});
container.addEventListener("pointerup", (event) => {
  if (!tracking) return;
  tracking = false;
  const delta = event.clientX - downX;
  if (Math.abs(delta) < 22) return;
  delta < 0 ? goTo(activeIndex + 1) : goTo(activeIndex - 1);
});
container.addEventListener("pointercancel", () => { tracking = false; });

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") goTo(activeIndex + 1);
  if (event.key === "ArrowLeft") goTo(activeIndex - 1);
});

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});

loader.load(
  MODEL_PATH,
  (gltf) => {
    model = gltf.scene;
    prepareModel(model);
    scene.add(model);
    updateCounter();
    updateText(true);
    applyState(true);
    console.log("3D tek kutu hazır:", MODEL_PATH);
  },
  (progress) => {
    if (progress.total) console.log(`GLB %${Math.round(progress.loaded / progress.total * 100)}`);
  },
  (error) => {
    showError("3D model yüklenemedi.<br>Dosya yolu: models./baatli.glb");
    console.error("GLB yükleme hatası:", error);
  }
);

function animate() {
  requestAnimationFrame(animate);
  if (model) {
    // Çok hafif canlılık; hızlı ileri-geri hareket yok.
    model.rotation.z = Math.sin(performance.now() * 0.0007) * 0.012;
  }
  renderer.render(scene, camera);
}
animate();
