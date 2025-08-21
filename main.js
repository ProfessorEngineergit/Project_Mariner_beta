import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/* --- Grundsetup --- */
const mainScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

renderer.domElement.addEventListener('dragstart', e => e.preventDefault());
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.id = 'label-container';
document.body.appendChild(labelRenderer.domElement);

const renderScene = new RenderPass(mainScene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.4, 0.9);
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

/* --- UI --- */
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const loadingTitle = document.getElementById('loading-title');
const loadingPercentage = document.getElementById('loading-percentage');
const infoElement = document.getElementById('info');
const joystickZone = document.getElementById('joystick-zone');
const bottomBar = document.getElementById('bottom-bar');
const muteButton = document.getElementById('mute-button');
const analyzeButton = document.getElementById('analyze-button');
const motionToggleButton = document.getElementById('motion-toggle-button');
const audio = document.getElementById('media-player');

const analysisWindow = document.getElementById('analysis-window');
const analysisTitle = document.getElementById('analysis-title');
const analysisTextContent = document.getElementById('analysis-text-content');
const closeAnalysisButton = document.getElementById('close-analysis-button');

/* --- Hyperspace Loading --- */
const loadingScene = new THREE.Scene();
const loadingCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
let hyperspaceParticles;
const HYPERSPACE_LENGTH = 800;
let loadingProgress = 0;

function createHyperspaceEffect() {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  for (let i = 0; i < 5000; i++) {
    vertices.push(
      (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * HYPERSPACE_LENGTH
    );
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, blending: THREE.AdditiveBlending });
  hyperspaceParticles = new THREE.Points(geometry, material);
  loadingScene.add(hyperspaceParticles);
}

/* --- Licht & Galaxy --- */
mainScene.add(new THREE.AmbientLight(0xffffff, 0.4));
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(10, 20, 15);
mainScene.add(directionalLight);

let galaxy;
function createGalaxy() {
  const parameters = {
    count: 150000, size: 0.15, radius: 100, arms: 3,
    spin: 0.7, randomness: 0.5, randomnessPower: 3,
    insideColor: '#ffac89', outsideColor: '#54a1ff'
  };
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(parameters.count * 3);
  const colors = new Float32Array(parameters.count * 3);
  const colorInside = new THREE.Color(parameters.insideColor);
  const colorOutside = new THREE.Color(parameters.outsideColor);

  for (let i = 0; i < parameters.count; i++) {
    const i3 = i * 3;
    const radius = Math.random() * parameters.radius;
    const spinAngle = radius * parameters.spin;
    const branchAngle = (i % parameters.arms) / parameters.arms * Math.PI * 2;

    const rnd = parameters.randomness;
    const pow = parameters.randomnessPower;

    const randomX = Math.pow(Math.random(), pow) * (Math.random() < 0.5 ? 1 : -1) * rnd * radius;
    const randomY = Math.pow(Math.random(), pow) * (Math.random() < 0.5 ? 1 : -1) * rnd * radius * 0.1;
    const randomZ = Math.pow(Math.random(), pow) * (Math.random() < 0.5 ? 1 : -1) * rnd * radius;

    positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
    positions[i3 + 1] = randomY;
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

    const mixedColor = colorInside.clone();
    mixedColor.lerp(colorOutside, radius / parameters.radius);
    colors[i3] = mixedColor.r; colors[i3 + 1] = mixedColor.g; colors[i3 + 2] = mixedColor.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.2, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.3)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
  const particleTexture = new THREE.CanvasTexture(canvas);

  const material = new THREE.PointsMaterial({
    size: parameters.size, sizeAttenuation: true, depthWrite: false,
    blending: THREE.AdditiveBlending, vertexColors: true, map: particleTexture, transparent: true
  });

  galaxy = new THREE.Points(geometry, material);
  mainScene.add(galaxy);
}
createGalaxy();

/* --- Black Hole + Lens --- */
const blackHoleCore = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
blackHoleCore.name = 'Project_Mariner (This Site)';
mainScene.add(blackHoleCore);

const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
const cubeCamera = new THREE.CubeCamera(1, 1000, cubeRenderTarget);
mainScene.add(cubeCamera);

const lensingSphere = new THREE.Mesh(
  new THREE.SphereGeometry(2.5, 64, 64),
  new THREE.MeshBasicMaterial({ envMap: cubeRenderTarget.texture, refractionRatio: 0.9, color: 0xffffff })
);
mainScene.add(lensingSphere);

function createAccretionDisk() {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 80, 128, 128, 128);
  g.addColorStop(0, 'rgba(255, 180, 80, 1)');
  g.addColorStop(0.7, 'rgba(255, 100, 20, 0.5)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  const geometry = new THREE.RingGeometry(2.5, 5, 64);
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending });
  const disk = new THREE.Mesh(geometry, material);
  disk.rotation.x = Math.PI / 2;
  mainScene.add(disk);
  return disk;
}
const accretionDisk = createAccretionDisk();

/* --- Labels --- */
function makeLabel(text) {
  const root = document.createElement('div');
  root.className = 'label';
  root.textContent = text;
  const lineDiv = document.createElement('div');
  lineDiv.className = 'label-line';
  root.appendChild(lineDiv);
  return root;
}
const blackHoleLabelDiv = makeLabel(blackHoleCore.name);
const blackHoleLabel = new CSS2DObject(blackHoleLabelDiv);
blackHoleLabel.position.set(0, 7, 0);
mainScene.add(blackHoleLabel);

/* --- Pacing Ring & Planeten --- */
const pacingCircleGeometry = new THREE.TorusGeometry(12, 0.1, 16, 100);
const pacingCircleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const pacingCircle = new THREE.Mesh(pacingCircleGeometry, pacingCircleMaterial);
pacingCircle.rotation.x = Math.PI / 2;
mainScene.add(pacingCircle);

const planets = [];
const planetData = [
  { name: 'Infos', radius: 1, orbit: 20, speed: 0.04 },
  { name: 'SURGE (The autonomous Robottaxi)', radius: 1.5, orbit: 35, speed: 0.025 },
  { name: 'OpenImageLabel (A website to label images for professional photography)', radius: 1.2, orbit: 50, speed: 0.015 },
  { name: 'Project Cablerack (A smarter way to cable-manage)', radius: 0.8, orbit: 65, speed: 0.03 },
  { name: 'Socials/Other Sites', radius: 2, orbit: 80, speed: 0.01 },
  { name: 'HA-Lightswitch (Making analog Lightswitches smart)', radius: 1.8, orbit: 95, speed: 0.012 },
  { name: 'My Creative Work (Filming, flying, photography)', radius: 1.4, orbit: 110, speed: 0.008 },
  { name: '3D-Printing (The ultimate engineering-tool)', radius: 1.6, orbit: 125, speed: 0.006 }
];

function createPlanetTexture(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = `hsl(${color}, 70%, 50%)`;
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 128; const y = Math.random() * 128; const r = Math.random() * 1.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${color + Math.random() * 40 - 20}, 70%, ${Math.random() * 50 + 25}%, 0.5)`;
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

function createPlanet(data, index) {
  const orbitPivot = new THREE.Object3D(); mainScene.add(orbitPivot);

  const texture = createPlanetTexture(Math.random() * 360);
  const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({ map: texture });
  const planetMesh = new THREE.Mesh(geometry, material);
  planetMesh.position.x = data.orbit;
  planetMesh.name = data.name;
  orbitPivot.add(planetMesh);

  const labelDiv = makeLabel(data.name);
  const planetLabel = new CSS2DObject(labelDiv);
  planetLabel.position.y = data.radius + 3;
  planetMesh.add(planetLabel);

  const boundaryRadius = data.radius + 6;
  const boundaryGeometry = new THREE.TorusGeometry(boundaryRadius, 0.1, 16, 100);
  const boundaryMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const boundaryCircle = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
  boundaryCircle.rotation.x = Math.PI / 2;
  planetMesh.add(boundaryCircle);

  const initialRotation = (index / planetData.length) * Math.PI * 2;
  orbitPivot.rotation.y = initialRotation;

  planets.push({ pivot: orbitPivot, mesh: planetMesh, labelDiv, boundaryCircle, isFrozen: false, initialRotation });
}
planetData.forEach(createPlanet);

const GLOBAL_ANGULAR_SPEED = 0.02;

/* --- Ship & Kamera --- */
let ship; let forcefield;
const cameraPivot = new THREE.Object3D();
const cameraHolder = new THREE.Object3D();

function createForcefield(radius) {
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const x = i * 18; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke();
    const y = i * 18; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, blending: THREE.AdditiveBlending, opacity: 0, side: THREE.DoubleSide
  });
  const ff = new THREE.Mesh(geometry, material);
  ff.visible = false;
  return ff;
}

/* --- Analyse-Inhalte --- */
const OBJECT_CONTENT = {
  'Project_Mariner (This Site)': {
    title: 'Project Mariner',
    html: `
<p>Hi, I’m Bahrian Novotny — a 15-year-old high school student with a deep fascination for science, technology, and the endless possibilities they open up.<br><br>
From exploring the mechanics of the universe to experimenting with creative coding and engineering, I’m constantly looking for new ways to learn, build, and share ideas.<br><br>
This website grew out of that passion. For over a year, I had planned to build a portfolio site — but I wanted something different. Something exciting. Something interactive.
Welcome to my universe.<br><br><br><br>
<b>Project Mariner: How This Site Was Born</b><br><br>
It all began with a simple HTML prototype. Instead of the ship you see now, there was a pyramid you could steer in the most basic way using a joystick, along with some very
early camera rotation controls.<br><br>
About a week later, I had refined both the design and the functionality. I realized that by limiting the controls, the site would feel more polished — so I made the camera
snap back to a fixed position and only allowed permanent zoom adjustments.<br><br>
Around that time, I replaced the pyramid with the USS Enterprise-D and introduced a loading screen.<br><br>
Next came the planets. The tricky part was making sure they stayed as far apart from each other as possible. Finally, I implemented a feature where,
when the ship enters a planet’s inner sphere to analyze it, the planet stops moving — and as soon as the ship leaves, it accelerates to catch up to the position it would have
reached had it never stopped.
</p>
`,
    images: []
  },
  'Infos': {
    title: 'Infos',
    html: `
<p>
THIS IS <b>MY_UNIVERSE V1.0</b><br><br>
UPCOMING: <b>V1.5 PRO</b> (minor fixes +)<br>
– Newsletter function<br>
– Overview function<br>
– Deep Space function<br>
– New Blender-crafted planets<br>
– More controls<br>
– Matte Glass 1.5 Pro material<br>
– Enhanced button animations<br>
– Smoother Quick Warp<br><br>
<b>V2.0</b> — scheduled for December 2025
</p>
`,
    images: []
  },
  'SURGE (The autonomous Robottaxi)': {
    title: 'SURGE – Autonomous Robottaxi',
    html: `<p><i>(SURGE: Smart Urban Robotic Guidance & Exploration-Pod)</i><br><br>
SURGE is my 8th-grade capstone project — an autonomous, electrically powered mini robotic taxi. It runs on an NVIDIA Jetson Nano, uses live camera input for navigation, and is built with modular 3D-printed parts. From design to AI control, I built and programmed everything myself.</p>`,
    images: ['SURGE 2.jpeg']
  },
  'OpenImageLabel (A website to label images for professional photography)': {
    title: 'OpenImageLabel',
    html: `<p>OpenImageLabel turns EXIF data into clean overlays you can tweak and batch-export — fast labeling for photographers across desktop and mobile.</p>`,
    images: []
  },
  'Project Cablerack (A smarter way to cable-manage)': {
    title: 'Project Cablerack',
    html: `<p>A custom sheet-metal rack for five laptops, one-cable desk setup, HDMI switching, ARGB cooling, and Apple Home integration.</p>`,
    images: ['Rack 2.png']
  },
  'Socials/Other Sites': {
    title: 'Socials & Links',
    html: `
<ul>
  <li><b>GitHub:</b> <a href="https://github.com/ProfessorEngineergit" target="_blank" rel="noopener">github.com/ProfessorEngineergit</a></li>
  <li><b>School GitHub:</b> <a href="https://github.com/makerLab314" target="_blank" rel="noopener">github.com/makerLab314</a></li>
  <li><b>YouTube:</b> <a href="https://www.youtube.com/@droneXplorer-t1n" target="_blank" rel="noopener">youtube.com/@droneXplorer-t1n</a></li>
  <li><b>Skypixel:</b> <a href="https://www.skypixel.com/users/till-bahrian" target="_blank" rel="noopener">skypixel.com/users/till-bahrian</a></li>
  <li><b>Book me (drone):</b> <a href="https://bahriannovotny.wixstudio.com/meinewebsite" target="_blank" rel="noopener">bahriannovotny.wixstudio.com/meinewebsite</a></li>
  <li><b>3D print services:</b> <a href="https://lorenzobaymueller.wixstudio.com/3d-print-hub" target="_blank" rel="noopener">lorenzobaymueller.wixstudio.com/3d-print-hub</a></li>
</ul>
`,
    images: []
  },
  'HA-Lightswitch (Making analog Lightswitches smart)': {
    title: 'HA-Lightswitch',
    html: `<p>3D-printed, servo-driven add-on to flip analog wall switches without modification. Controlled via Home Assistant + MQTT on an Arduino.<br>
Code & files: <a href="https://github.com/makerLab314/OpenLightswitch-HA" target="_blank" rel="noopener">github.com/makerLab314/OpenLightswitch-HA</a></p>`,
    images: []
  },
  'My Creative Work (Filming, flying, photography)': {
    title: 'Creative Work',
    html: `<p>Drone storytelling with a DJI Mini 2 — cinematic shots that make people want to watch. Projects for clients and personal explorations.</p>`,
    images: []
  },
  '3D-Printing (The ultimate engineering-tool)': {
    title: '3D-Printing',
    html: `<p>From kindergarten rocket ideas to CAD and a home 3D-printer — additive manufacturing became my go-to tool to turn concepts into reality.</p>`,
    images: []
  }
};

/* --- State --- */
let appState = 'loading';
let isAnalyzeButtonVisible = false;
let currentlyAnalyzedObject = null;

createHyperspaceEffect();
animate();

const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
loader.setDRACOLoader(dracoLoader);

const modelURL = 'https://professorengineergit.github.io/Bahrian_Novotny_My_Universe/enterprise-V2.0.glb';

/* --- Gyro --- */
let gyroControlActive = false;
const gyroBaseline = { beta: null, gamma: null };
const gyroInput = { forward: 0, turn: 0 };
const GYRO_FORWARD_FACTOR = 0.015;
const GYRO_TURN_FACTOR    = 0.003;
const GYRO_MAX_FORWARD    = 0.35;
const GYRO_MAX_TURN       = 0.06;
const GYRO_SMOOTHING      = 0.12;

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

function onDeviceOrientation(e) {
  const beta = (typeof e.beta === 'number') ? e.beta : 0;
  const gamma = (typeof e.gamma === 'number') ? e.gamma : 0;

  if (gyroBaseline.beta === null || gyroBaseline.gamma === null) {
    gyroBaseline.beta = beta;
    gyroBaseline.gamma = gamma;
  }

  const dBeta = beta - gyroBaseline.beta;
  const dGamma = gamma - gyroBaseline.gamma;

  const targetForward = clamp(-dBeta * GYRO_FORWARD_FACTOR, -GYRO_MAX_FORWARD, GYRO_MAX_FORWARD);
  const targetTurn    = clamp(-dGamma * GYRO_TURN_FACTOR,  -GYRO_MAX_TURN,    GYRO_MAX_TURN);

  gyroInput.forward = lerp(gyroInput.forward, targetForward, GYRO_SMOOTHING);
  gyroInput.turn    = lerp(gyroInput.turn,    targetTurn,    GYRO_SMOOTHING);
}

async function enableGyro() {
  if (gyroControlActive) return;
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      const state = await DeviceOrientationEvent.requestPermission();
      if (state !== 'granted') return;
    }
    window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true });
    gyroControlActive = true;
  } catch (err) {
    console.warn('Gyro not available or permission denied:', err);
  }
}
function disableGyro() {
  if (!gyroControlActive) return;
  window.removeEventListener('deviceorientation', onDeviceOrientation);
  gyroControlActive = false;
  gyroBaseline.beta = null; gyroBaseline.gamma = null;
  gyroInput.forward = 0; gyroInput.turn = 0;
}

/* --- Load Model --- */
loader.load(
  modelURL,
  (gltf) => {
    loadingProgress = 1;
    progressBar.style.width = '100%';
    loadingPercentage.textContent = '100%';
    loadingTitle.textContent = 'Tap to drop out of warp speed';
    loadingScreen.classList.add('clickable');

    let shipLoaded = gltf.scene;
    shipLoaded.rotation.y = Math.PI;
    mainScene.add(shipLoaded);
    shipLoaded.position.set(0, 0, 30);
    ship = shipLoaded;

    forcefield = createForcefield(5.1);
    ship.add(forcefield);
    ship.add(cameraPivot); cameraPivot.add(cameraHolder); cameraHolder.add(camera);
    camera.position.set(0, 4, -15); camera.lookAt(cameraHolder.position);
    cameraPivot.rotation.y = Math.PI;

    loadingScreen.addEventListener('click', async () => {
      loadingScreen.style.opacity = '0';
      setTimeout(() => loadingScreen.style.display = 'none', 500);
      if (audio) { audio.play().catch(() => {}); }

      cameraPivot.rotation.y = Math.PI / 2;
      appState = 'playing';

      infoElement.classList.add('ui-visible');
      bottomBar.classList.add('ui-visible');
      joystickZone.classList.add('ui-visible');

      // Motion-Button einblendbar
      motionToggleButton.classList.add('ui-visible');
    }, { once: true });
  },
  (xhr) => {
    if (xhr.lengthComputable) {
      loadingProgress = Math.min(1, xhr.loaded / xhr.total);
      const percent = Math.round(loadingProgress * 100);
      progressBar.style.width = percent + '%';
      loadingPercentage.textContent = percent + '%';
    }
  },
  (error) => { console.error('Ladefehler:', error); loadingTitle.textContent = 'Fehler!'; }
);

/* --- Steuerung --- */
const keyboard = {};
let joystickMove = { forward: 0, turn: 0 };
const ROTATION_LIMIT = Math.PI * 0.33;
let zoomDistance = 15;
const minZoom = 8, maxZoom = 25;
let cameraVelocity = new THREE.Vector2(0, 0), zoomVelocity = 0;
const SPRING_STIFFNESS = 0.03, LERP_FACTOR = 0.05;

let cameraFingerId = null;
let isDraggingMouse = false;
let initialPinchDistance = 0;
let previousTouch = { x: 0, y: 0 };

muteButton.addEventListener('click', () => {
  if (!audio) return;
  audio.muted = !audio.muted;
  muteButton.classList.toggle('muted');
});

window.addEventListener('keydown', (e) => {
  keyboard[e.key.toLowerCase()] = true;
  if ((e.key === '=' || e.key === '-' || e.key === '+') && (e.ctrlKey || e.metaKey)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keyboard[e.key.toLowerCase()] = false; });

/* nipplejs */
nipplejs.create({
  zone: document.getElementById('joystick-zone'),
  mode: 'static',
  position: { left: '50%', top: '50%' },
  color: 'white',
  size: 120
})
.on('move', (evt, data) => {
  if (data.vector && ship) {
    joystickMove.forward = data.vector.y * 0.3;
    joystickMove.turn = -data.vector.x * 0.05;
  }
})
.on('end', () => joystickMove = { forward: 0, turn: 0 });

/* Touch/Mouse Kamera */
renderer.domElement.addEventListener('touchstart', (e) => {
  const joystickTouch = Array.from(e.changedTouches).some(t => t.target.closest('#joystick-zone'));
  if (joystickTouch) return;
  e.preventDefault();
  for (const touch of e.changedTouches) {
    if (cameraFingerId === null) {
      cameraFingerId = touch.identifier;
      cameraVelocity.set(0, 0);
      previousTouch.x = touch.clientX; previousTouch.y = touch.clientY;
    }
  }
  if (e.touches.length >= 2) { initialPinchDistance = getPinchDistance(e); zoomVelocity = 0; }
}, { passive: false });

renderer.domElement.addEventListener('touchmove', (e) => {
  const joystickTouch = Array.from(e.changedTouches).some(t => t.target.closest('#joystick-zone'));
  if (joystickTouch) return;
  e.preventDefault();
  for (const touch of e.changedTouches) {
    if (touch.identifier === cameraFingerId) {
      const dx = touch.clientX - previousTouch.x; const dy = touch.clientY - previousTouch.y;
      cameraVelocity.x += dy * 0.0002; cameraVelocity.y -= dx * 0.0002;
      previousTouch.x = touch.clientX; previousTouch.y = touch.clientY;
    }
  }
  if (e.touches.length >= 2) {
    const current = getPinchDistance(e);
    zoomVelocity -= (current - initialPinchDistance) * 0.03;
    initialPinchDistance = current;
  }
}, { passive: false });

renderer.domElement.addEventListener('touchend', (e) => {
  for (const touch of e.changedTouches)
    if (touch.identifier === cameraFingerId) cameraFingerId = null;
  if (e.touches.length < 2) initialPinchDistance = 0;
});

renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.target.closest('#joystick-zone')) return;
  isDraggingMouse = true; cameraVelocity.set(0, 0);
  previousTouch.x = e.clientX; previousTouch.y = e.clientY;
});
window.addEventListener('mousemove', (e) => {
  if (isDraggingMouse) {
    const dx = e.clientX - previousTouch.x; const dy = e.clientY - previousTouch.y;
    cameraVelocity.x += dy * 0.0002; cameraVelocity.y -= dx * 0.0002;
    previousTouch.x = e.clientX; previousTouch.y = e.clientY;
  }
});
window.addEventListener('mouseup', () => { isDraggingMouse = false; });

renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoomVelocity += e.deltaY * (e.ctrlKey ? 0.01 : 0.05);
}, { passive: false });

function getPinchDistance(e) {
  if (e.touches.length < 2) return 0;
  const t1 = e.touches[0], t2 = e.touches[1];
  const dx = t1.clientX - t2.clientX; const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx*dx + dy*dy);
}

/* Analyse-Fenster */
analyzeButton.addEventListener('click', () => {
  if (!currentlyAnalyzedObject) return;

  const objName = currentlyAnalyzedObject.name;
  const content = OBJECT_CONTENT[objName];

  analysisTitle.textContent = (content && content.title) ? content.title : objName;

  if (content && (content.html || (content.images && content.images.length))) {
    let html = content.html ? content.html : '';
    if (content.images && content.images.length) {
      const imgs = content.images.map(src => `<img src="${encodeURI(src)}" loading="lazy" alt="">`).join('');
      html += `<div class="analysis-gallery">${imgs}</div>`;
    }
    analysisTextContent.innerHTML = html;
  } else {
    analysisTextContent.innerHTML = `<p>Für <em>${objName}</em> ist noch kein Text/Bild hinterlegt. Trage Inhalte im <code>OBJECT_CONTENT</code>-Block ein.</p>`;
  }

  analyzeButton.classList.remove('btn-outline-glow');
  analysisWindow.classList.add('visible');
  analysisWindow.setAttribute('aria-hidden', 'false');
  appState = 'paused';
});
closeAnalysisButton.addEventListener('click', () => {
  analysisWindow.classList.remove('visible');
  analysisWindow.setAttribute('aria-hidden', 'true');
  appState = 'playing';
});

/* Motion Toggle */
motionToggleButton.addEventListener('click', async () => {
  const willEnable = !gyroControlActive;

  if (willEnable) {
    await enableGyro();
    if (gyroControlActive) {
      motionToggleButton.classList.add('active');
      motionToggleButton.setAttribute('aria-pressed', 'true');
    }
  } else {
    disableGyro();
    motionToggleButton.classList.remove('active');
    motionToggleButton.setAttribute('aria-pressed', 'false');
  }
});

/* --- Animation --- */
const clock = new THREE.Clock();
const worldPosition = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);

  if (appState === 'loading') {
    if (hyperspaceParticles) {
      hyperspaceParticles.position.z += (loadingProgress * 0.05 + 0.01) * 20;
      if (hyperspaceParticles.position.z > HYPERSPACE_LENGTH / 2) hyperspaceParticles.position.z = -HYPERSPACE_LENGTH / 2;
    }
    renderer.render(loadingScene, loadingCamera);
    return;
  }
  if (appState === 'paused') return;

  const elapsedTime = clock.getElapsedTime();
  const pulse = Math.sin(elapsedTime * 0.8) * 0.5 + 0.5;
  pacingCircle.scale.set(1 + pulse * 0.1, 1 + pulse * 0.1, 1);
  pacingCircle.material.opacity = 0.3 + pulse * 0.4;

  planets.forEach(planet => {
    planet.boundaryCircle.scale.set(1 + pulse * 0.1, 1 + pulse * 0.1, 1);
    planet.boundaryCircle.material.opacity = 0.3 + pulse * 0.4;

    const targetRotation = planet.initialRotation + elapsedTime * GLOBAL_ANGULAR_SPEED;
    if (!planet.isFrozen) planet.pivot.rotation.y = THREE.MathUtils.lerp(planet.pivot.rotation.y, targetRotation, 0.02);
  });

  if (ship) {
    const keyForward = (keyboard['w'] ? 0.3 : 0) + (keyboard['s'] ? -0.3 : 0);
    const keyTurn    = (keyboard['a'] ? 0.05 : 0) + (keyboard['d'] ? -0.05 : 0);

    const finalForward = joystickMove.forward + keyForward + (gyroControlActive ? gyroInput.forward : 0);
    const finalTurn    = joystickMove.turn    + keyTurn    + (gyroControlActive ? gyroInput.turn    : 0);

    const shipRadius = 5;
    const previousPosition = ship.position.clone();
    ship.translateZ(finalForward);
    ship.rotateY(finalTurn);

    const blackHoleRadius = blackHoleCore.geometry.parameters.radius;
    const collisionThreshold = shipRadius + blackHoleRadius;
    if (ship.position.distanceTo(blackHoleCore.position) < collisionThreshold) {
      ship.position.copy(previousPosition);
      if (forcefield) { forcefield.visible = true; forcefield.material.opacity = 1.0; }
    }

    let activeObject = null;
    const distanceToCenterSq = ship.position.lengthSq();
    const circleCurrentRadius = pacingCircle.geometry.parameters.radius * pacingCircle.scale.x;
    if (distanceToCenterSq < circleCurrentRadius * circleCurrentRadius) {
      activeObject = blackHoleCore;
    }
    for (const planet of planets) {
      planet.mesh.getWorldPosition(worldPosition);
      const distanceToPlanetSq = ship.position.distanceToSquared(worldPosition);
      const planetBoundaryRadius = planet.boundaryCircle.geometry.parameters.radius * planet.boundaryCircle.scale.x;
      if (distanceToPlanetSq < planetBoundaryRadius * planetBoundaryRadius) { activeObject = planet.mesh; break; }
    }
    planets.forEach(p => p.isFrozen = (activeObject === p.mesh));
    currentlyAnalyzedObject = activeObject;

    if (activeObject && !isAnalyzeButtonVisible) {
      analyzeButton.classList.add('ui-visible', 'btn-outline-glow');
      isAnalyzeButtonVisible = true;
    } else if (!activeObject && isAnalyzeButtonVisible) {
      analyzeButton.classList.remove('ui-visible', 'btn-outline-glow');
      isAnalyzeButtonVisible = false;
    }
  }

  if (ship) {
    if (cameraFingerId === null && !isDraggingMouse) {
      cameraHolder.rotation.x = THREE.MathUtils.lerp(cameraHolder.rotation.x, 0, LERP_FACTOR);
      cameraPivot.rotation.y = THREE.MathUtils.lerp(cameraPivot.rotation.y, 0, LERP_FACTOR);
    }
    if (cameraHolder.rotation.x > ROTATION_LIMIT) cameraVelocity.x -= (cameraHolder.rotation.x - ROTATION_LIMIT) * 0.03;
    else if (cameraHolder.rotation.x < -ROTATION_LIMIT) cameraVelocity.x -= (cameraHolder.rotation.x + ROTATION_LIMIT) * 0.03;
    if (cameraPivot.rotation.y > ROTATION_LIMIT) cameraVelocity.y -= (cameraPivot.rotation.y - ROTATION_LIMIT) * 0.03;
    else if (cameraPivot.rotation.y < -ROTATION_LIMIT) cameraVelocity.y -= (cameraPivot.rotation.y + ROTATION_LIMIT) * 0.03;
    cameraHolder.rotation.x += cameraVelocity.x;
    cameraPivot.rotation.y += cameraVelocity.y;
  }

  cameraVelocity.multiplyScalar(0.90);
  zoomDistance += zoomVelocity;
  zoomVelocity *= 0.90;
  zoomDistance = THREE.MathUtils.clamp(zoomDistance, minZoom, maxZoom);
  if (zoomDistance === minZoom || zoomDistance === maxZoom) zoomVelocity = 0;
  if (camera) camera.position.normalize().multiplyScalar(zoomDistance);

  accretionDisk.rotation.z += 0.005;

  lensingSphere.visible = false; blackHoleCore.visible = false; accretionDisk.visible = false;
  cubeCamera.update(renderer, mainScene);
  lensingSphere.visible = true; blackHoleCore.visible = true; accretionDisk.visible = true;

  composer.render();
  labelRenderer.render(mainScene, camera);
}

/* Resize */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  loadingCamera.aspect = window.innerWidth / window.innerHeight;
  loadingCamera.updateProjectionMatrix();
});

/* Pointer Glow */
function addPointerGlow(el) {
  if (!el) return;
  el.classList.add('pointer-glow');
  const setPos = (x, y) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--glow-x', `${x - r.left}px`);
    el.style.setProperty('--glow-y', `${y - r.top}px`);
  };
  el.addEventListener('pointerenter', e => { setPos(e.clientX, e.clientY); el.classList.add('hover-active'); if (e.pointerType !== 'mouse') el.classList.add('touch-hover'); }, { passive: true });
  el.addEventListener('pointermove',  e => { setPos(e.clientX, e.clientY); if (e.pointerType !== 'mouse') el.classList.add('touch-hover', 'hover-active'); }, { passive: true });
  el.addEventListener('pointerleave', () => { el.classList.remove('hover-active', 'touch-hover'); el.style.setProperty('--glow-x', `-220px`); el.style.setProperty('--glow-y', `-220px`); }, { passive: true });
  el.addEventListener('pointerup',    () => el.classList.remove('touch-hover'), { passive: true });
  el.addEventListener('pointercancel',() => el.classList.remove('hover-active', 'touch-hover'), { passive: true });
}
[analyzeButton, muteButton, motionToggleButton, closeAnalysisButton].forEach(addPointerGlow);

/* --- Tab verlassen: Audio stoppen + hartes Reload beim Zurückkehren --- */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Tab verlassen
    if (audio && !audio.paused) { try { audio.pause(); } catch {} }
    // Markiere, dass wir die Seite verlassen haben
    try { sessionStorage.setItem('leftPage', '1'); } catch {}
  } else {
    // Tab wieder sichtbar -> wenn zuvor verlassen, dann hart neu laden
    try {
      if (sessionStorage.getItem('leftPage') === '1') {
        sessionStorage.removeItem('leftPage');
        window.location.reload();
      }
    } catch {}
  }
});

// bfcache-Fall (Safari/Firefox Zurück/Vor) -> immer neu laden
window.addEventListener('pageshow', (e) => {
  if (e.persisted) window.location.reload();
});

// Für Sicherheit auch beim pagehide markieren
window.addEventListener('pagehide', () => {
  try { sessionStorage.setItem('leftPage', '1'); } catch {}
});
