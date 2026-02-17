import * as THREE from "three";
import { OrbitControls } from "https://esm.run/three/examples/jsm/controls/OrbitControls";

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById("canvas-container").appendChild(renderer.domElement);

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(3, 2.5, 3);

// --- Cube ---
const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
const material = new THREE.MeshStandardMaterial({
  color: 0xcccccc,
  metalness: 0.15,
  roughness: 0.35,
});
const cube = new THREE.Mesh(geometry, material);
cube.position.y = 0.75;
cube.castShadow = true;
scene.add(cube);

// --- Ground ---
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// --- Lighting ---
const spotLight = new THREE.SpotLight(0xffffff, 50);
spotLight.position.set(3, 7, 3);
spotLight.angle = Math.PI / 5;
spotLight.penumbra = 0.6;
spotLight.decay = 1.5;
spotLight.castShadow = true;
spotLight.shadow.mapSize.set(2048, 2048);
spotLight.shadow.radius = 5;
spotLight.shadow.blurSamples = 12;
spotLight.shadow.bias = -0.0003;
spotLight.target = cube;
scene.add(spotLight);

const fillLight = new THREE.DirectionalLight(0x8ab4f8, 0.25);
fillLight.position.set(-3, 3, -2);
scene.add(fillLight);

const ambientLight = new THREE.AmbientLight(0x222233, 0.5);
scene.add(ambientLight);

// --- Orbit Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 2.5;
controls.maxDistance = 10;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.target.set(0, 0.75, 0);
controls.update();

// --- Render Loop ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// --- Resize ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

animate();
