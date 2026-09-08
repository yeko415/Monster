import * as THREE from "https://esm.sh/three@0.180.0";
import { GLTFLoader } from "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";

// IMPORTANT: keep the working asset path exactly as-is.
const MODEL_PATH = new URL("models./baatli.glb", import.meta.url).href;

// Keep the existing 3-state system and x positions unchanged.
const STATES = [
  { eyebrow:"ENERGY DRINK", title:"POWER", sub:"YOUR DAY.", description:"Güçlü ve ferahlatıcı enerji deneyimi. Günün temposuna ayak uydurmak için tasarlandı.", x:0.25,y:0.18,z:0,scale:1,rotY:0,cameraZ:6.5 },
  { eyebrow:"ORIGINAL FORMULA", title:"FEEL", sub:"THE ENERGY.", description:"32 MG / 100 ML kafein. 500 ML kutu. Net, güçlü ve klasik enerji karakteri.", x:0.40,y:0.14,z:0.10,scale:1.08,rotY:-0.35,cameraZ:6.1 },
  { eyebrow:"500 ML POWER", title:"OWN", sub:"YOUR DAY.", description:"Biraz daha yakından bak. Kutu her adımda konumunu değiştirir ve daha güçlü görünür.", x:0.02,y:0.12,z:0.20,scale:1.18,rotY:0.35,cameraZ:5.7 }
];

const $ = (id) => document.getElementById(id);
const container = $("three-container");
const loading = $("modelLoading");
const eyebrow = document.querySelector(".hero .eyebrow");
const heroTitle = $("heroTitle");
const description = $("heroDescription");
const current = $("currentNumber");
const total = $("totalNumber");
const prev = $("prevButton");
const next = $("nextButton");
const bottomHint = $("bottomHint");
const app = $("app");
const menuButton = $("menuButton");
const mobileMenu = $("mobileMenu");
const closeMenu = $("closeMenu");

total.textContent = "03";

function status(text) {
  loading.textContent = text;
  loading.classList.toggle("hidden", !text);
}

function fatal(text) {
  console.error("3D model error:", text);
  loading.classList.remove("hidden");
  loading.innerHTML = `<b>3D MODEL YÜKLENEMEDİ</b><br><small>${String(text).replace(/[<>&]/g, c => ({"<":"&lt;", ">":"&gt;", "&":"&amp;"}[c]))}</small>`;
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.01, 100);
camera.position.set(0, 0.2, 6.5);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
container.appendChild(renderer.domElement);

// Keep the original lighting approach, but make the product separation a little richer.
const hemi = new THREE.HemisphereLight(0xffffff, 0x101510, 2.0);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffffff, 5.0);
key.position.set(4, 6, 7);
scene.add(key);
const fill = new THREE.DirectionalLight(0xdfffc8, 2.0);
fill.position.set(-4, 2, 5);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xffffff, 3.0);
rim.position.set(0, 3, -6);
scene.add(rim);
const greenRim = new THREE.PointLight(0x8dff00, 1.4, 8, 2);
greenRim.position.set(1.5, 1.2, 3.5);
scene.add(greenRim);

const rig = new THREE.Group();
scene.add(rig);

let model = null;
let active = 0;
let resizeRaf = 0;
let textTimer = 0;
let startX = null;
let pointerId = null;
let wheelLocked = false;
let lastPointerX = 0;

const cur = { x:0, y:0, z:0, scale:1, rotY:0, cameraZ:6.5 };
const target = { ...cur };
const pointer = { x:0, y:0, active:false };

function updateText() {
  const s = STATES[active];
  [eyebrow, heroTitle, description].forEach(el => el.classList.add("is-changing"));
  clearTimeout(textTimer);
  textTimer = setTimeout(() => {
    eyebrow.textContent = s.eyebrow;
    heroTitle.innerHTML = `${s.title} <span>${s.sub}</span>`;
    description.textContent = s.description;
    current.textContent = String(active + 1).padStart(2, "0");
    [eyebrow, heroTitle, description].forEach(el => el.classList.remove("is-changing"));
  }, 140);
}

function setTarget() {
  const s = STATES[active];
  const mobile = innerWidth <= 900;
  // Existing responsive 3D positioning preserved.
  Object.assign(target, s, {
    x: mobile ? s.x * 0.35 : s.x,
    y: mobile ? s.y - 0.10 : s.y,
    cameraZ: mobile ? s.cameraZ + 0.7 : s.cameraZ,
    scale: mobile ? s.scale * 0.9 : s.scale
  });
}

function go(delta) {
  if (!delta) return;
  active = (active + delta + STATES.length) % STATES.length;
  app.classList.remove("state-1", "state-2", "state-3");
  app.classList.add(`state-${active + 1}`);
  updateText();
  setTarget();
}

prev.onclick = () => go(-1);
next.onclick = () => go(1);

function prepare(raw) {
  // Neutralize the GLB's internal transform, then recenter it.
  // The 180° Y orientation is preserved because it reveals the textured face of this asset.
  raw.position.set(0, 0, 0);
  raw.rotation.set(0, Math.PI, 0);
  raw.scale.setScalar(1);
  raw.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(raw);
  const size = box.getSize(new THREE.Vector3());
  const max = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(max) || max <= 0) throw new Error("GLB geometrisi boş.");

  // Preserve the current 60% smaller product scale.
  raw.scale.setScalar(1.28 / max);
  raw.updateMatrixWorld(true);
  box.setFromObject(raw);
  const center = box.getCenter(new THREE.Vector3());
  raw.position.sub(center);
  raw.updateMatrixWorld(true);

  raw.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.frustumCulled = false;
    obj.renderOrder = 1;

    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat) continue;
      if (mat.map) {
        mat.map.colorSpace = THREE.SRGBColorSpace;
        mat.map.needsUpdate = true;
      }
      mat.side = THREE.DoubleSide;

      // Preserve the decal visibility fix from the working version.
      if (mat.map || mat.transparent || /image|whatsapp/i.test(mat.name || "")) {
        mat.transparent = true;
        mat.depthTest = false;
        mat.depthWrite = false;
        mat.opacity = 1;
        obj.renderOrder = 20;
      }
      mat.needsUpdate = true;
    }
  });

  model = raw;
  rig.add(model);
  rig.position.set(target.x, target.y, target.z);
  rig.scale.setScalar(target.scale);
}

async function loadModel() {
  status("3D MODEL YÜKLENİYOR");
  try {
    const response = await fetch(MODEL_PATH, { cache: "no-store" });
    if (!response.ok) throw new Error(`GLB HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    status("3D MODEL HAZIRLANIYOR");
    const gltf = await new GLTFLoader().parseAsync(buffer, "");
    prepare(gltf.scene);
    status("");
    bottomHint.classList.add("ready");
    console.log("3D MODEL OK:", MODEL_PATH);
  } catch (err) {
    fatal(err?.message || "Bilinmeyen GLB hatası");
  }
}

function openMobileMenu() {
  mobileMenu.classList.add("open");
  mobileMenu.setAttribute("aria-hidden", "false");
  menuButton.setAttribute("aria-expanded", "true");
}
function closeMobileMenu() {
  mobileMenu.classList.remove("open");
  mobileMenu.setAttribute("aria-hidden", "true");
  menuButton.setAttribute("aria-expanded", "false");
}
menuButton?.addEventListener("click", openMobileMenu);
closeMenu?.addEventListener("click", closeMobileMenu);
mobileMenu?.querySelectorAll("a").forEach(a => a.addEventListener("click", closeMobileMenu));

updateText();
setTarget();
app.classList.add("state-1");
loadModel();

let last = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  const k = 1 - Math.pow(0.0001, dt);

  for (const p of ["x","y","z","scale","rotY","cameraZ"]) {
    cur[p] += (target[p] - cur[p]) * k;
  }

  if (model) {
    // Existing target values remain authoritative; these are only subtle presentation movements.
    const breath = Math.sin(now * 0.0010) * 0.012;
    const driftX = pointer.active && innerWidth > 900 ? pointer.x * 0.018 : 0;
    const driftY = pointer.active && innerWidth > 900 ? pointer.y * 0.012 : 0;

    rig.position.set(cur.x + driftX, cur.y + breath - driftY, cur.z);
    rig.scale.setScalar(cur.scale);
    model.rotation.y = Math.PI + cur.rotY;
    model.rotation.z = Math.sin(now * 0.0008) * 0.012;
    model.rotation.x = Math.sin(now * 0.00065) * 0.004;
  }

  camera.position.z = cur.cameraZ;
  camera.position.x += ((pointer.active && innerWidth > 900 ? pointer.x * 0.035 : 0) - camera.position.x) * 0.035;
  camera.position.y += (0.2 + (pointer.active && innerWidth > 900 ? pointer.y * -0.015 : 0) - camera.position.y) * 0.035;
  camera.lookAt(0, 0.2, 0);

  greenRim.position.x += ((1.5 + (pointer.active ? pointer.x * 0.8 : 0)) - greenRim.position.x) * 0.03;
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

addEventListener("resize", () => {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    setTarget();
  });
}, { passive:true });

// Pointer parallax is presentation-only; it never changes the state x values.
container.addEventListener("pointermove", (e) => {
  const rect = container.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
  pointer.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  pointer.active = true;
  lastPointerX = e.clientX;
}, { passive:true });
container.addEventListener("pointerleave", () => {
  pointer.active = false;
  pointer.x = 0;
  pointer.y = 0;
}, { passive:true });

container.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  startX = e.clientX;
  lastPointerX = e.clientX;
  pointerId = e.pointerId;
  container.classList.add("dragging");
  try { container.setPointerCapture(e.pointerId); } catch (_) {}
});

container.addEventListener("pointerup", (e) => {
  container.classList.remove("dragging");
  if (startX === null) return;
  const dx = e.clientX - startX;
  startX = null;
  if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
  try { container.releasePointerCapture(pointerId); } catch (_) {}
  pointerId = null;
});

container.addEventListener("pointercancel", () => {
  startX = null;
  pointerId = null;
  container.classList.remove("dragging");
});

// One wheel/trackpad gesture = one state change.
container.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (wheelLocked || Math.abs(e.deltaY) < 8) return;
  wheelLocked = true;
  go(e.deltaY > 0 ? 1 : -1);
  setTimeout(() => { wheelLocked = false; }, 520);
}, { passive:false });

addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
  if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
}, { passive:false });
