import * as THREE from "https://esm.sh/three@0.180.0";
import { GLTFLoader } from "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";

// GitHub Pages'taki gerçek klasör adı noktalı: models.
const MODEL_PATH = "./models./baatli.glb?v=20260907";

// Tek kutu. Her okta sadece bu kutunun konumu, yaklaşması, açısı ve yazılar değişir.
const STATES = [
  {
    eyebrow: "ENERGY DRINK",
    title: "POWER",
    sub: "YOUR DAY.",
    description: "Güçlü ve ferahlatıcı enerji deneyimi. Günün temposuna ayak uydurmak için tasarlandı.",
    x: 0.95, y: 0.78, z: 0.00, scale: 1.00, rotY: 0.00, cameraZ: 7.10
  },
  {
    eyebrow: "ORIGINAL FORMULA",
    title: "FEEL",
    sub: "THE ENERGY.",
    description: "32 MG / 100 ML kafein. 500 ML kutu. Net, güçlü ve klasik enerji karakteri.",
    x: 1.18, y: 0.72, z: 0.12, scale: 1.10, rotY: -0.24, cameraZ: 6.65
  },
  {
    eyebrow: "500 ML POWER",
    title: "OWN",
    sub: "YOUR DAY.",
    description: "Biraz daha yakından bak. Kutu her adımda konumunu değiştirir ve daha güçlü görünür.",
    x: 0.62, y: 0.68, z: 0.34, scale: 1.24, rotY: 0.34, cameraZ: 6.15
  }
];

const container = document.getElementById("three-container");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const currentNumber = document.getElementById("currentNumber");
const totalNumber = document.getElementById("totalNumber");
const bottomHint = document.getElementById("bottomHint");
const loadingLabel = document.getElementById("modelLoading");
const heroEyebrow = document.querySelector(".hero .eyebrow");
const heroTitle = document.getElementById("heroTitle");
const heroDescription = document.getElementById("heroDescription");

if (!container) throw new Error("three-container bulunamadı.");
if (totalNumber) totalNumber.textContent = String(STATES.length).padStart(2, "0");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(0, 0.05, STATES[0].cameraZ);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
container.appendChild(renderer.domElement);

// Ürünü net gösteren yumuşak stüdyo ışığı.
scene.add(new THREE.HemisphereLight(0xffffff, 0x080808, 2.25));
const keyLight = new THREE.DirectionalLight(0xffffff, 4.8);
keyLight.position.set(4.5, 6, 6);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 2.3);
fillLight.position.set(-4, 2.5, 4);
scene.add(fillLight);
const rimLight = new THREE.PointLight(0xffffff, 6.5, 16);
rimLight.position.set(0, 3, -4);
scene.add(rimLight);

const loader = new GLTFLoader();
let model = null;
let activeIndex = 0;
let transitioning = false;

const current = {
  x: STATES[0].x,
  y: STATES[0].y,
  z: STATES[0].z,
  scale: STATES[0].scale,
  rotY: STATES[0].rotY,
  cameraZ: STATES[0].cameraZ
};
const target = { ...current };

function setLoading(visible) {
  if (!loadingLabel) return;
  loadingLabel.classList.toggle("hidden", !visible);
}

function showError(message) {
  console.error(message);
  setLoading(false);
  const errorBox = document.createElement("div");
  errorBox.className = "model-error";
  errorBox.innerHTML = message;
  container.appendChild(errorBox);
}

function smoothSetText() {
  const state = STATES[activeIndex];
  if (!heroEyebrow || !heroTitle || !heroDescription) return;

  [heroEyebrow, heroTitle, heroDescription].forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
  });

  window.setTimeout(() => {
    heroEyebrow.textContent = state.eyebrow;
    heroTitle.innerHTML = `${state.title} <span>${state.sub}</span>`;
    heroDescription.textContent = state.description;
    [heroEyebrow, heroTitle, heroDescription].forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
  }, 120);
}

function updateCounter() {
  if (currentNumber) currentNumber.textContent = String(activeIndex + 1).padStart(2, "0");
}

function prepareModel(root) {
  // GLB içinde logolu/şeffaf bir decal mesh'i var. Onu gövdenin üstünde gösteriyoruz.
  root.traverse((child) => {
    if (!child.isMesh) return;

    child.frustumCulled = false;
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

      if (mat.transparent || String(mat.name || "").includes("WhatsApp Image")) {
        mat.transparent = true;
        mat.opacity = 1;
        mat.depthTest = false;
        mat.depthWrite = false;
        mat.side = THREE.DoubleSide;
        if (mat.alphaTest < 0.01) mat.alphaTest = 0.01;
        child.renderOrder = 20;
      }
    });
  });

  // Modeli güvenli bir ölçüye getir ve tam ortaya al.
  let box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxSize = Math.max(size.x, size.y, size.z);
  if (!(maxSize > 0)) throw new Error("GLB geometri boyutu 0 bulundu.");

  root.scale.setScalar(2.75 / maxSize);

  box = new THREE.Box3().setFromObject(root);
  box.getCenter(center);
  root.position.sub(center);
  root.position.y = -0.18;

  // Logo yüzü kameraya baksın. Decal malzemesi DoubleSide olduğundan iki yüz de görünür.
  root.rotation.y = Math.PI;
}

function setTargetFromState(state) {
  const mobile = window.innerWidth <= 900;
  target.x = mobile ? state.x * 0.42 : state.x;
  target.y = mobile ? state.y - 0.34 : state.y;
  target.z = state.z;
  target.scale = state.scale;
  target.rotY = state.rotY;
  target.cameraZ = state.cameraZ;
}

function goTo(nextIndex) {
  if (!model || transitioning) return;

  activeIndex = (nextIndex + STATES.length) % STATES.length;
  transitioning = true;
  updateCounter();
  smoothSetText();
  setTargetFromState(STATES[activeIndex]);
  bottomHint?.classList.add("hidden");

  window.setTimeout(() => {
    transitioning = false;
  }, 850);
}

function openDetail() {
  const detail = document.getElementById("productDetail");
  if (!detail || !model) return;
  document.body.classList.add("detail-open");
  detail.classList.add("open");
  detail.setAttribute("aria-hidden", "false");
  document.getElementById("productTitle").textContent = activeIndex === 1 ? "ENERGY ORIGINAL" : "ENERGY 500 ML";
  document.getElementById("productDescription").textContent = STATES[activeIndex].description;
}

function closeDetail() {
  const detail = document.getElementById("productDetail");
  if (!detail) return;
  detail.classList.remove("open");
  detail.setAttribute("aria-hidden", "true");
  document.body.classList.remove("detail-open");
}

// Butonlar sadece görünümü değiştirir.
prevButton?.addEventListener("click", () => goTo(activeIndex - 1));
nextButton?.addEventListener("click", () => goTo(activeIndex + 1));

document.getElementById("closeDetail")?.addEventListener("click", closeDetail);

// Mobil menü.
const mobileMenu = document.getElementById("mobileMenu");
document.getElementById("menuButton")?.addEventListener("click", () => {
  mobileMenu?.classList.add("open");
  mobileMenu?.setAttribute("aria-hidden", "false");
});
document.getElementById("closeMenu")?.addEventListener("click", () => {
  mobileMenu?.classList.remove("open");
  mobileMenu?.setAttribute("aria-hidden", "true");
});
mobileMenu?.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", () => {
    mobileMenu.classList.remove("open");
    mobileMenu.setAttribute("aria-hidden", "true");
  });
});

// Yatay swipe, tek hareket = tek state.
let pointerDown = false;
let downX = 0;
container.addEventListener("pointerdown", (event) => {
  pointerDown = true;
  downX = event.clientX;
  container.classList.add("dragging");
  try { container.setPointerCapture(event.pointerId); } catch {}
});
container.addEventListener("pointerup", (event) => {
  if (!pointerDown) return;
  pointerDown = false;
  container.classList.remove("dragging");
  const dx = event.clientX - downX;
  if (Math.abs(dx) >= 32) {
    dx < 0 ? goTo(activeIndex + 1) : goTo(activeIndex - 1);
    bottomHint?.classList.add("hidden");
  } else {
    openDetail();
  }
  try { container.releasePointerCapture(event.pointerId); } catch {}
});
container.addEventListener("pointercancel", () => {
  pointerDown = false;
  container.classList.remove("dragging");
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDetail();
  if (event.key === "ArrowRight") goTo(activeIndex + 1);
  if (event.key === "ArrowLeft") goTo(activeIndex - 1);
});

// Mouse tekerleği masaüstünde de state değiştirir.
let wheelLock = false;
container.addEventListener("wheel", (event) => {
  if (wheelLock || Math.abs(event.deltaY) < 8) return;
  event.preventDefault();
  wheelLock = true;
  event.deltaY > 0 ? goTo(activeIndex + 1) : goTo(activeIndex - 1);
  window.setTimeout(() => { wheelLock = false; }, 700);
}, { passive: false });

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if (model) setTargetFromState(STATES[activeIndex]);
});

async function loadModel() {
  setLoading(true);

  try {
    const response = await fetch(MODEL_PATH, { cache: "no-store" });
    if (!response.ok) throw new Error(`GLB HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();

    loader.parse(
      buffer,
      "./models./",
      (gltf) => {
        try {
          model = gltf.scene;
          prepareModel(model);
          scene.add(model);

          // Başlangıç state'i.
          model.position.x += STATES[0].x;
          model.position.y += STATES[0].y;
          model.position.z += STATES[0].z;
          model.scale.setScalar(STATES[0].scale);
          model.rotation.y += STATES[0].rotY;
          current.x = STATES[0].x;
          current.y = STATES[0].y;
          current.z = STATES[0].z;
          current.scale = STATES[0].scale;
          current.rotY = STATES[0].rotY;
          current.cameraZ = STATES[0].cameraZ;
          setTargetFromState(STATES[0]);

          updateCounter();
          smoothSetText();
          setLoading(false);
          console.log("3D model hazır:", MODEL_PATH);
        } catch (err) {
          showError(`3D model hazırlandı ama konumlandırılamadı.<br><small>${err.message}</small>`);
        }
      },
      (error) => {
        showError(`3D model okunamadı.<br><small>${error?.message || "GLB parse hatası"}</small>`);
      }
    );
  } catch (error) {
    showError(`3D model yüklenemedi.<br><small>${error.message}</small>`);
  }
}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);
  const ease = 1 - Math.pow(0.0005, dt);

  if (model) {
    current.x += (target.x - current.x) * ease;
    current.y += (target.y - current.y) * ease;
    current.z += (target.z - current.z) * ease;
    current.scale += (target.scale - current.scale) * ease;

    let angleDiff = target.rotY - current.rotY;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    current.rotY += angleDiff * ease;
    current.cameraZ += (target.cameraZ - current.cameraZ) * ease;

    model.position.x = current.x;
    model.position.y = current.y;
    model.position.z = current.z;
    model.scale.setScalar(current.scale);
    model.rotation.y = Math.PI + current.rotY;
    model.rotation.z = Math.sin(performance.now() * 0.0007) * 0.006;
  } else {
    current.cameraZ += (target.cameraZ - current.cameraZ) * ease;
  }

  camera.position.z += (current.cameraZ - camera.position.z) * ease;
  renderer.render(scene, camera);
}

updateCounter();
smoothSetText();
loadModel();
animate();
