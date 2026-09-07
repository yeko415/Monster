import * as THREE from "https://esm.sh/three@0.180.0";
import { GLTFLoader } from "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";

const MODEL_PATH = "./models./baatli.glb";

const STATES = [
  {
    eyebrow: "ENERGY DRINK",
    title: "POWER",
    sub: "YOUR DAY.",
    description: "Güçlü ve ferahlatıcı enerji deneyimi. Günün temposuna ayak uydurmak için tasarlandı.",
    x: 0.00, y: 0.55, z: 0.00, scale: 1.00, rotY: 0.0, cameraZ: 7.0
  },
  {
    eyebrow: "ORIGINAL FORMULA",
    title: "FEEL",
    sub: "THE ENERGY.",
    description: "Klasik enerji karakteri. Her okta kutu biraz yaklaşır ve yeni bir açıya geçer.",
    x: 0.62, y: 0.48, z: 0.25, scale: 1.10, rotY: 0.45, cameraZ: 6.5
  },
  {
    eyebrow: "500 ML POWER",
    title: "OWN",
    sub: "YOUR DAY.",
    description: "Daha yakından bak. Kutuyu büyüt, konumunu değiştir ve tasarımı farklı açıdan keşfet.",
    x: -0.55, y: 0.42, z: 0.55, scale: 1.22, rotY: -0.45, cameraZ: 6.0
  }
];

const container = document.getElementById("three-container");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const currentNumber = document.getElementById("currentNumber");
const totalNumber = document.getElementById("totalNumber");

const heroEyebrow = document.querySelector(".hero .eyebrow");
const heroTitle = document.querySelector(".hero h1");
const heroDescription = document.querySelector(".hero .hero-description");

if (!container) throw new Error("three-container bulunamadı.");

if (totalNumber) totalNumber.textContent = "03";

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  30,
  window.innerWidth / window.innerHeight,
  0.01,
  100
);
camera.position.set(0, 0.05, 7);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
container.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x111111, 2.5));

const key = new THREE.DirectionalLight(0xffffff, 5);
key.position.set(4, 5, 6);
scene.add(key);

const fill = new THREE.DirectionalLight(0xffffff, 2.5);
fill.position.set(-4, 2, 4);
scene.add(fill);

const rim = new THREE.PointLight(0xffffff, 7, 15);
rim.position.set(0, 3, -3);
scene.add(rim);

const loader = new GLTFLoader();
let model = null;
let stateIndex = 0;
let transitioning = false;

const target = {
  x: 0, y: 0.55, z: 0,
  scale: 1, rotY: 0, cameraZ: 7
};

const start = {
  x: 0, y: 0.55, z: 0,
  scale: 1, rotY: 0, cameraZ: 7
};

function showError(message) {
  console.error(message);
  const box = document.createElement("div");
  box.style.cssText =
    "position:absolute;inset:0;display:grid;place-items:center;" +
    "padding:30px;text-align:center;color:#fff;font:13px Inter,sans-serif;" +
    "line-height:1.6;z-index:999;pointer-events:none;";
  box.innerHTML = message;
  container.appendChild(box);
}

function prepareModel(root) {
  root.traverse((child) => {
    if (!child.isMesh) return;

    child.frustumCulled = false;

    const mats = Array.isArray(child.material)
      ? child.material
      : [child.material];

    mats.forEach((mat) => {
      if (!mat) return;
      mat.needsUpdate = true;

      if (mat.map) {
        mat.map.colorSpace = THREE.SRGBColorSpace;
        mat.map.needsUpdate = true;
      }

      // GLB'deki şeffaf logo/decal materyallerini koru.
      if (mat.transparent || mat.alphaTest > 0) {
        mat.transparent = true;
      }
    });
  });

  // Önce ölçekle, sonra yeniden merkezle.
  let box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);

  const maxSize = Math.max(size.x, size.y, size.z);
  if (maxSize > 0) root.scale.setScalar(4.0 / maxSize);

  box = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  box.getCenter(center);

  root.position.x -= center.x;
  root.position.y -= box.min.y;
  root.position.z -= center.z;
}

function updateText() {
  const s = STATES[stateIndex];

  if (heroEyebrow) heroEyebrow.textContent = s.eyebrow;
  if (heroTitle) heroTitle.innerHTML = `${s.title} <span>${s.sub}</span>`;
  if (heroDescription) heroDescription.textContent = s.description;
  if (currentNumber) currentNumber.textContent = String(stateIndex + 1).padStart(2, "0");
}

function setTarget(s) {
  target.x = s.x;
  target.y = s.y;
  target.z = s.z;
  target.scale = s.scale;
  target.rotY = s.rotY;
  target.cameraZ = s.cameraZ;
}

function goTo(index) {
  if (!model || transitioning) return;

  stateIndex = (index + STATES.length) % STATES.length;
  transitioning = true;

  updateText();
  setTarget(STATES[stateIndex]);

  window.setTimeout(() => {
    transitioning = false;
  }, 850);
}

prevButton?.addEventListener("click", () => goTo(stateIndex - 1));
nextButton?.addEventListener("click", () => goTo(stateIndex + 1));

let downX = 0;
let pointerDown = false;

container.addEventListener("pointerdown", (e) => {
  pointerDown = true;
  downX = e.clientX;
});

container.addEventListener("pointerup", (e) => {
  if (!pointerDown) return;
  pointerDown = false;

  const dx = e.clientX - downX;
  if (Math.abs(dx) > 35) {
    dx < 0 ? goTo(stateIndex + 1) : goTo(stateIndex - 1);
  }
});

container.addEventListener("pointercancel", () => {
  pointerDown = false;
});

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") goTo(stateIndex + 1);
  if (e.key === "ArrowLeft") goTo(stateIndex - 1);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
});

loader.load(
  MODEL_PATH,
  (gltf) => {
    model = gltf.scene;
    prepareModel(model);
    scene.add(model);

    updateText();
    setTarget(STATES[0]);

    console.log("3D tek kutu hazır:", MODEL_PATH);
  },
  undefined,
  (error) => {
    showError(
      "3D model yüklenemedi.<br>" +
      "<small>Yol: models./baatli.glb</small>"
    );
    console.error(error);
  }
);

let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);

  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (model) {
    // Yumuşak, kontrollü geçiş. Hızlı ileri-geri yok.
    const ease = 1 - Math.pow(0.001, dt);

    model.position.x += (target.x - model.position.x) * ease;
    model.position.y += (target.y - model.position.y) * ease;
    model.position.z += (target.z - model.position.z) * ease;

    const currentScale = model.scale.x;
    const nextScale = currentScale + (target.scale - currentScale) * ease;
    model.scale.setScalar(nextScale);

    // Açıyı en kısa yoldan değiştir.
    let angleDiff = target.rotY - model.rotation.y;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    model.rotation.y += angleDiff * ease;

    // Çok hafif canlılık.
    model.rotation.z = Math.sin(now * 0.00065) * 0.008;
  }

  camera.position.z += (target.cameraZ - camera.position.z) * ease;
  renderer.render(scene, camera);
}

animate(performance.now());
