import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// GitHub'daki gerçek klasör adı: models. (sonunda nokta var)
const MODEL_PATH = new URL("models./baatli.glb", import.meta.url).href;
const LOAD_TIMEOUT = 15000;

const STATES = [
  { eyebrow: "ENERGY DRINK", title: "POWER", sub: "YOUR DAY.", description: "Güçlü ve ferahlatıcı enerji deneyimi. Günün temposuna ayak uydurmak için tasarlandı.", x: 0.78, y: 0.52, z: 0.00, scale: 0.98, rotY: 0.00, cameraZ: 6.9 },
  { eyebrow: "ORIGINAL FORMULA", title: "FEEL", sub: "THE ENERGY.", description: "32 MG / 100 ML kafein. 500 ML kutu. Net, güçlü ve klasik enerji karakteri.", x: 0.94, y: 0.48, z: 0.12, scale: 1.08, rotY: -0.30, cameraZ: 6.45 },
  { eyebrow: "500 ML POWER", title: "OWN", sub: "YOUR DAY.", description: "Biraz daha yakından bak. Kutu her adımda konumunu değiştirir ve daha güçlü görünür.", x: 0.52, y: 0.46, z: 0.30, scale: 1.20, rotY: 0.32, cameraZ: 6.0 }
];

const container = document.getElementById("three-container");
const loading = document.getElementById("modelLoading");
const heroEyebrow = document.querySelector(".hero .eyebrow");
const heroTitle = document.getElementById("heroTitle");
const heroDescription = document.getElementById("heroDescription");
const currentNumber = document.getElementById("currentNumber");
const totalNumber = document.getElementById("totalNumber");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const bottomHint = document.getElementById("bottomHint");

if (!container) throw new Error("#three-container bulunamadı.");
totalNumber.textContent = String(STATES.length).padStart(2, "0");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.01, 100);
camera.position.set(0, 0.1, STATES[0].cameraZ);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
container.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x111111, 2.0));
const key = new THREE.DirectionalLight(0xffffff, 5.0); key.position.set(4, 7, 7); scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 2.4); fill.position.set(-4, 2, 5); scene.add(fill);
const rim = new THREE.DirectionalLight(0xffffff, 3.4); rim.position.set(0, 4, -6); scene.add(rim);

const loader = new GLTFLoader();
let model = null;
let activeIndex = 0;
let lastTap = 0;
const nowState = { ...STATES[0] };
const targetState = { ...STATES[0] };

function setLoading(text) {
  if (!loading) return;
  loading.textContent = text;
  loading.classList.toggle("hidden", !text);
}

function fail(message) {
  console.error(message);
  setLoading("");
  const box = document.createElement("div");
  box.className = "model-error";
  box.innerHTML = `<b>3D MODEL YÜKLENEMEDİ</b><br><small>${message}</small>`;
  container.appendChild(box);
}

function showStateText() {
  const s = STATES[activeIndex];
  [heroEyebrow, heroTitle, heroDescription].forEach(el => { if (el) { el.style.opacity = "0"; el.style.transform = "translateY(8px)"; } });
  setTimeout(() => {
    heroEyebrow.textContent = s.eyebrow;
    heroTitle.innerHTML = `${s.title} <span>${s.sub}</span>`;
    heroDescription.textContent = s.description;
    [heroEyebrow, heroTitle, heroDescription].forEach(el => { if (el) { el.style.opacity = "1"; el.style.transform = "translateY(0)"; } });
  }, 90);
}

function applyState(s) {
  const mobile = innerWidth <= 900;
  targetState.x = mobile ? s.x * 0.30 : s.x;
  targetState.y = mobile ? s.y - 0.24 : s.y;
  targetState.z = s.z;
  targetState.scale = mobile ? s.scale * 0.94 : s.scale;
  targetState.rotY = s.rotY;
  targetState.cameraZ = mobile ? s.cameraZ + 0.65 : s.cameraZ;
}

function go(index) {
  if (!model) return;
  activeIndex = (index + STATES.length) % STATES.length;
  currentNumber.textContent = String(activeIndex + 1).padStart(2, "0");
  applyState(STATES[activeIndex]);
  showStateText();
  bottomHint?.classList.add("hidden");
}

function prepareModel(root) {
  // Önce modelin gerçek sınırlarını bul.
  let box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(maxSize) || maxSize <= 0) throw new Error("GLB geometrisi boş.");

  // Boyutlandır ve geometrinin merkezini dünya merkezine taşı.
  root.scale.setScalar(2.9 / maxSize);
  box = new THREE.Box3().setFromObject(root);
  const scaledCenter = box.getCenter(new THREE.Vector3());
  root.position.sub(scaledCenter);
  root.position.y = -0.35;

  root.traverse(obj => {
    if (!obj.isMesh) return;
    obj.frustumCulled = false;
    obj.castShadow = true;
    obj.receiveShadow = true;
    obj.renderOrder = 1;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach(mat => {
      if (!mat) return;
      if (mat.map) {
        mat.map.colorSpace = THREE.SRGBColorSpace;
        mat.map.needsUpdate = true;
      }
      const name = String(mat.name || "");
      // GLB'deki Monster logo/decal meshini gövdenin üstünde zorla göster.
      if (mat.transparent || /WhatsApp|Image|texture|decal/i.test(name)) {
        mat.transparent = true;
        mat.side = THREE.DoubleSide;
        mat.depthTest = false;
        mat.depthWrite = false;
        mat.opacity = 1;
        obj.renderOrder = 20;
      }
      mat.needsUpdate = true;
    });
  });

  // GLB'deki logo yüzünü kameraya getir.
  root.rotation.y = Math.PI;
}

async function loadModel() {
  setLoading("3D MODEL YÜKLENİYOR");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOAD_TIMEOUT);

  try {
    const response = await fetch(MODEL_PATH, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 100) throw new Error(`Dosya çok küçük (${buffer.byteLength} byte)`);

    setLoading("3D MODEL HAZIRLANIYOR");
    loader.parse(buffer, "", gltf => {
      try {
        model = gltf.scene;
        if (!model) throw new Error("GLB scene bulunamadı.");
        prepareModel(model);
        scene.add(model);
        applyState(STATES[0]);
        setLoading("");
        console.log("3D MODEL OK:", MODEL_PATH, buffer.byteLength, "bytes");
      } catch (e) {
        fail(e?.message || String(e));
      }
    }, error => {
      fail(error?.message || "GLTF parse hatası");
    });
  } catch (e) {
    if (e?.name === "AbortError") fail("15 saniye içinde yanıt alınamadı. GitHub Pages model bağlantısını kontrol et.");
    else fail(e?.message || String(e));
  } finally {
    clearTimeout(timeout);
  }
}

prevButton?.addEventListener("click", () => go(activeIndex - 1));
nextButton?.addEventListener("click", () => go(activeIndex + 1));

let pointerStartX = null;
container.addEventListener("pointerdown", e => { pointerStartX = e.clientX; container.classList.add("dragging"); });
container.addEventListener("pointerup", e => {
  if (pointerStartX === null) return;
  const dx = e.clientX - pointerStartX;
  pointerStartX = null;
  container.classList.remove("dragging");
  if (Math.abs(dx) > 32) { dx < 0 ? go(activeIndex + 1) : go(activeIndex - 1); }
  else if (performance.now() - lastTap > 250) { lastTap = performance.now(); }
});
container.addEventListener("pointercancel", () => { pointerStartX = null; container.classList.remove("dragging"); });
window.addEventListener("keydown", e => { if (e.key === "ArrowRight") go(activeIndex + 1); if (e.key === "ArrowLeft") go(activeIndex - 1); });

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.8));
  applyState(STATES[activeIndex]);
});

let previous = performance.now();
function animate(t) {
  requestAnimationFrame(animate);
  const dt = Math.min((t - previous) / 1000, 0.05); previous = t;
  const k = 1 - Math.pow(0.0004, dt);

  if (model) {
    model.position.x += (targetState.x - model.position.x) * k;
    model.position.y += (targetState.y - model.position.y) * k;
    model.position.z += (targetState.z - model.position.z) * k;
    const nextScale = model.scale.x + (targetState.scale - model.scale.x) * k;
    model.scale.setScalar(nextScale);

    let desiredRot = Math.PI + targetState.rotY;
    let currentRot = model.rotation.y;
    while (desiredRot - currentRot > Math.PI) desiredRot -= Math.PI * 2;
    while (desiredRot - currentRot < -Math.PI) desiredRot += Math.PI * 2;
    model.rotation.y += (desiredRot - currentRot) * k;
  }

  camera.position.z += (targetState.cameraZ - camera.position.z) * k;
  camera.lookAt(0, 0.15, 0);
  renderer.render(scene, camera);
}

showStateText();
loadModel();
requestAnimationFrame(animate);
