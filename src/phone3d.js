// The feedback face on the screen of a 3D phone (three.js). Feedback.jsx loads this file on demand, after it has
// a working WebGL context; nothing in the main bundle imports it, so the page never waits for three.js.
// Everything here is decorative: the SVG face stays in the page as the fallback.
import {
  BackSide, BufferGeometry, CanvasTexture, CapsuleGeometry, CircleGeometry, DirectionalLight, ExtrudeGeometry, Float32BufferAttribute,
  Group, HemisphereLight, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry,
  RingGeometry, Scene, ShaderMaterial, Shape, ShapeGeometry, SphereGeometry, SRGBColorSpace, TorusGeometry, WebGLRenderer, setConsoleFunction,
} from 'three';

const TAU = Math.PI * 2;
const RED = '#e60000', PAPER = '#f6f4ef', WATER = '#1f5f7a';
// World units: the phone is 2 tall. Its screen shows a 250-unit-wide window of the SVG face plane (viewBox 0 0 320 320),
// so every face coordinate below is the same number as in Feedback.jsx.
const PHONE = {w:1.09, h:2, r:.2, d:.15, fillet:.045};
const SCREEN = {w:1, h:1.91, r:.16};
const U = SCREEN.w / 250;
const VIEW = {x:35, y:182 - SCREEN.h / U / 2, w:250, h:SCREEN.h / U};
const FOV = 26;
// Resting pose (radians) and what each mood adds: pitch, roll, lift. Sad droops, happy leans back.
const REST = {yaw:.24, pitch:-.03, roll:.02};
const POSE = {idle:[0, 0, 0], 1:[.1, -.035, -.03], 2:[.05, -.02, -.012], 3:[0, 0, 0], 4:[-.03, .015, .008], 5:[-.06, .03, .02]};
const CLOUD = {x:.36, y:.96, z:.3, size:1.3};

// three reports its own trouble (lost context, a shader that will not link) through this hook: it becomes a warning
// plus the SVG fallback, never a console error.
let onThreeError = null;
setConsoleFunction((type, ...message) => {
  if (type !== 'error') { console[type](...message); return; }
  console.warn(...message);
  if (onThreeError) onThreeError();
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const clamp01 = value => clamp(value, 0, 1);
const approach = (value, target, step) => value < target ? Math.min(target, value + step) : Math.max(target, value - step);
// CSS cubic-bezier(), so the timings match the keyframes in style.css.
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return x => {
    let t = x;
    for (let i = 0; i < 6; i++) {
      const slope = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(slope) < 1e-6) break;
      t -= (((ax * t + bx) * t + cx) * t - x) / slope;
    }
    return ((ay * t + by) * t + cy) * t;
  };
}
const ease = bezier(.25, .1, .25, 1), easeOut = bezier(0, 0, .58, 1), easeInOut = bezier(.42, 0, .58, 1);
const drawEase = bezier(.5, 0, .2, 1), burstEase = bezier(.15, .7, .3, 1);
// The face morph's overshoot, reused for the cloud popping in.
const overshoot = t => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;

const spring = value => ({value, target:value, speed:0});
// Returns true while the spring is still moving.
function settle(s, dt, stiffness = 70, damping = 13) {
  s.speed += ((s.target - s.value) * stiffness - s.speed * damping) * dt;
  s.value += s.speed * dt;
  return Math.abs(s.target - s.value) > 4e-4 || Math.abs(s.speed) > 4e-3;
}

function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function roundedRect(w, h, r) {
  const shape = new Shape(), x = w / 2 - r, y = h / 2 - r;
  shape.absarc(x, y, r, 0, Math.PI / 2);
  shape.absarc(-x, y, r, Math.PI / 2, Math.PI);
  shape.absarc(-x, -y, r, Math.PI, Math.PI * 1.5);
  shape.absarc(x, -y, r, Math.PI * 1.5, TAU);
  return shape;
}

// The phone body: a rounded slab whose front and back edges are filleted. Built by hand so the normals are exact
// and the bevel catches the light as one smooth band instead of facets.
function bodyGeometry({w, h, r, d, fillet}, cornerSteps = 14, filletSteps = 6) {
  const outline = [], profile = [], position = [], normal = [], index = [];
  [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([sx, sy], corner) => {
    for (let i = 0; i <= cornerSteps; i++) {
      const a = (corner + i / cornerSteps) * Math.PI / 2, nx = Math.cos(a), ny = Math.sin(a);
      outline.push([sx * (w / 2 - r) + nx * (r - fillet), sy * (h / 2 - r) + ny * (r - fillet), nx, ny]);
    }
  });
  for (const side of [1, -1]) for (let i = 0; i <= filletSteps; i++) {
    const phi = (side > 0 ? 1 - i / filletSteps : -i / filletSteps) * Math.PI / 2;
    profile.push([fillet * Math.cos(phi), side * (d / 2 - fillet) + fillet * Math.sin(phi), Math.cos(phi), Math.sin(phi)]);
  }
  for (const [out, z, nr, nz] of profile) for (const [x, y, nx, ny] of outline) {
    position.push(x + nx * out, y + ny * out, z);
    normal.push(nx * nr, ny * nr, nz);
  }
  const n = outline.length, rows = profile.length;
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < n; i++) {
    const a = j * n + i, b = j * n + (i + 1) % n;
    index.push(a, a + n, b, b, a + n, b + n);
  }
  const front = position.length / 3, back = front + 1, last = (rows - 1) * n;
  position.push(0, 0, d / 2, 0, 0, -d / 2);
  normal.push(0, 0, 1, 0, 0, -1);
  for (let i = 0; i < n; i++) index.push(front, i, (i + 1) % n, back, last + (i + 1) % n, last + i);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normal, 3));
  geometry.setIndex(index);
  return geometry;
}

function screenGeometry() {
  const geometry = new ShapeGeometry(roundedRect(SCREEN.w, SCREEN.h, SCREEN.r), 14);
  const position = geometry.attributes.position, uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, position.getX(i) / SCREEN.w + .5, position.getY(i) / SCREEN.h + .5);
  return geometry;
}

// The heart of Feedback.jsx (HEART path), puffed up.
function heartGeometry() {
  const k = .0088, x = v => v * k, y = v => (7 - v) * k, shape = new Shape();
  shape.moveTo(x(0), y(4));
  shape.bezierCurveTo(x(0), y(-2), x(-9), y(-2), x(-9), y(4));
  shape.bezierCurveTo(x(-9), y(9), x(0), y(13), x(0), y(16));
  shape.bezierCurveTo(x(0), y(13), x(9), y(9), x(9), y(4));
  shape.bezierCurveTo(x(9), y(-2), x(0), y(-2), x(0), y(4));
  const geometry = new ExtrudeGeometry(shape, {depth:.016, bevelEnabled:true, bevelThickness:.022, bevelSize:.016, bevelSegments:4, curveSegments:12});
  geometry.center();
  return geometry;
}

function puff(o, x, y, r, alpha) {
  const gradient = o.createRadialGradient(x, y, 0, x, y, r);
  gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  o.fillStyle = gradient;
  o.beginPath();
  o.arc(x, y, r, 0, TAU);
  o.fill();
}

// The screen's wallpaper: paper white with a low cloud bank in newsprint dots (the print of src/halftone.js) and a
// faint grain. Painted once per size; the face is drawn over a copy of it.
function paintPaper(canvas) {
  const w = canvas.width, h = canvas.height, c = canvas.getContext('2d'), random = rng(11);
  c.fillStyle = PAPER;
  c.fillRect(0, 0, w, h);
  const q = 4, ow = Math.ceil(w / q), oh = Math.ceil(h / q), off = document.createElement('canvas');
  off.width = ow;
  off.height = oh;
  const o = off.getContext('2d', {willReadFrequently:true});
  o.fillStyle = '#000';
  o.fillRect(0, 0, ow, oh);
  o.globalCompositeOperation = 'lighter';
  const band = o.createLinearGradient(0, oh * .8, 0, oh);
  band.addColorStop(0, 'rgba(255,255,255,0)');
  band.addColorStop(1, 'rgba(255,255,255,.34)');
  o.fillStyle = band;
  o.fillRect(0, 0, ow, oh);
  for (let i = 0; i < 6; i++) puff(o, (i + .15 + random() * .7) / 6 * ow, oh * (.9 + random() * .09), ow * (.15 + random() * .13), .2 + random() * .16);
  const light = o.getImageData(0, 0, ow, oh).data, cell = w / VIEW.w * 5.2, radius = cell * .58;
  c.fillStyle = 'rgba(230,0,0,.5)';
  c.beginPath();
  for (let y = cell / 2, row = 0; y < h + cell; y += cell * .866, row++) for (let x = (row % 2) * cell / 2; x < w + cell; x += cell) {
    const value = Math.min(.62, light[(Math.min(oh - 1, Math.round(y / q)) * ow + Math.min(ow - 1, Math.round(x / q))) * 4] / 255);
    if (value < .05) continue;
    const r = radius * Math.sqrt(value);
    c.moveTo(x + r, y);
    c.arc(x, y, r, 0, TAU);
  }
  c.fill();
  // Grain: one speck per two texture pixels, barely there.
  off.width = Math.ceil(w / 2);
  off.height = Math.ceil(h / 2);
  const grain = o.createImageData(off.width, off.height);
  for (let i = 0; i < grain.data.length; i += 4) { grain.data[i] = 70; grain.data[i + 1] = 40; grain.data[i + 2] = 30; grain.data[i + 3] = random() * 20; }
  o.putImageData(grain, 0, 0);
  c.drawImage(off, 0, 0, w, h);
}

// A drop shadow printed in halftone dots on the "wall" behind the phone.
const shadowVertex = 'varying vec2 vPlace; void main() { vPlace = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const shadowFragment = `
uniform vec2 uCentre; uniform vec2 uHalf; uniform float uRound; uniform float uBlur; uniform float uCell; uniform float uPixel; uniform vec3 uInk; uniform float uAlpha;
varying vec2 vPlace;
float shade(vec2 p) {
  vec2 q = abs(p - uCentre) - uHalf + uRound;
  return 1.0 - smoothstep(-uBlur, uBlur, length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRound);
}
void main() {
  vec2 g = vPlace / uCell;
  float row = floor(g.y / 0.866), cover = 0.0;
  for (int j = -1; j <= 2; j++) {
    float r = row + float(j), shift = mod(r, 2.0) * 0.5, column = floor(g.x - shift);
    for (int i = -1; i <= 2; i++) {
      vec2 spot = vec2(column + float(i) + shift, r * 0.866);
      float light = shade(spot * uCell), radius = 0.6 * sqrt(light);
      cover = max(cover, step(0.05, light) * (1.0 - smoothstep(radius - uPixel, radius + uPixel, distance(g, spot))));
    }
  }
  gl_FragColor = vec4(uInk, uAlpha * cover);
}`;

export function createPhone({canvas, gl, host, faces, props:initial, onReady, onFail}) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)'), hover = matchMedia('(hover: hover)');
  const trash = [], keep = thing => { trash.push(thing); return thing; };
  let props = {...initial};
  let dead = false, ready = false, broken = false, dirty = true, raf = 0, last = 0, clock = 0, scale = 100;
  const centre = {x:0, y:0};

  const renderer = new WebGLRenderer({canvas, context:gl, antialias:true, alpha:true});
  renderer.setClearColor(0x000000, 0);
  renderer.debug.onShaderError = () => { broken = true; };
  onThreeError = () => { broken = true; };

  const scene = new Scene(), camera = new PerspectiveCamera(FOV, 1, 1, 10);
  scene.add(new HemisphereLight(0xffffff, 0xd9cbb8, 1.5));
  const key = new DirectionalLight(0xffffff, 3.4), side = new DirectionalLight(0xfff1e8, 1.3);
  key.position.set(-3, 4, 5);
  side.position.set(4, 1.5, 2.5);
  scene.add(key, side);

  // Phone: body, lit screen, camera notch, side buttons.
  const phone = new Group();
  scene.add(phone);
  const dark = keep(new MeshStandardMaterial({color:0x17171a, roughness:.36, metalness:.45}));
  phone.add(new Mesh(keep(bodyGeometry(PHONE)), dark));
  const face = {canvas:document.createElement('canvas'), paper:document.createElement('canvas'), key:''};
  const pen = face.canvas.getContext('2d');
  const texture = keep(new CanvasTexture(face.canvas));
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const glass = new Mesh(keep(screenGeometry()), keep(new MeshBasicMaterial({map:texture})));
  glass.position.z = PHONE.d / 2 + .002;
  const black = keep(new MeshBasicMaterial({color:0x0a0a0c}));
  const notch = new Mesh(keep(new ShapeGeometry(roundedRect(.25, .07, .035), 8)), black);
  notch.position.set(0, SCREEN.h / 2 - .075, PHONE.d / 2 + .004);
  const lens = new Mesh(keep(new CircleGeometry(.016, 20)), keep(new MeshBasicMaterial({color:0x2c3a4a})));
  lens.position.set(.07, SCREEN.h / 2 - .075, PHONE.d / 2 + .005);
  const glint = new Mesh(keep(new CircleGeometry(.005, 12)), keep(new MeshBasicMaterial({color:0x9db4c8})));
  glint.position.set(.066, SCREEN.h / 2 - .071, PHONE.d / 2 + .006);
  phone.add(glass, notch, lens, glint);
  const button = keep(new CapsuleGeometry(.019, 1, 4, 10)), redButton = keep(new MeshStandardMaterial({color:RED, roughness:.45, metalness:.1}));
  [[.42, .13, redButton], [.14, .2, dark], [-.12, .2, dark]].forEach(([y, length, material]) => {
    const mesh = new Mesh(button, material);
    mesh.position.set(-PHONE.w / 2 - .001, y, 0);
    mesh.scale.set(.6, length, 1);
    phone.add(mesh);
  });

  // Pulsing rings (moods 4 and 5) leave the screen toward the viewer.
  const rings = new Group();
  rings.position.z = PHONE.d / 2 + .01;
  rings.visible = false;
  const ringShape = keep(new RingGeometry(106 * U - .008, 106 * U + .008, 72));
  for (let k = 0; k < 3; k++) rings.add(new Mesh(ringShape, keep(new MeshBasicMaterial({color:RED, transparent:true, depthWrite:false, opacity:0}))));
  phone.add(rings);

  // Rain cloud (moods 1 and 2): white puffs with an ink outline (back faces of slightly larger shapes), drops for mood 1.
  const cloud = new Group();
  cloud.visible = false;
  scene.add(cloud);
  const white = keep(new MeshStandardMaterial({color:0xffffff, roughness:1, metalness:0})), outline = keep(new MeshBasicMaterial({color:0x000000, side:BackSide}));
  const ball = keep(new SphereGeometry(1, 28, 18));
  for (const [x, y, r] of [[-.125, 0, .084], [.005, .056, .11], [.138, .004, .078]]) for (const [material, grow] of [[white, 0], [outline, .022]]) {
    const mesh = new Mesh(ball, material);
    mesh.position.set(x, y, 0);
    mesh.scale.setScalar(r + grow);
    cloud.add(mesh);
  }
  for (const [material, radius] of [[white, .052], [outline, .074]]) {
    const base = new Mesh(keep(new CapsuleGeometry(radius, .21, 6, 16)), material);
    base.rotation.z = Math.PI / 2;
    base.position.set(.005, -.034, 0);
    cloud.add(base);
  }
  const dropShape = keep(new CapsuleGeometry(.012, .05, 3, 8));
  const drops = [-.15, -.065, .02, .105].map((x, k) => {
    const drop = new Mesh(dropShape, keep(new MeshBasicMaterial({color:WATER, transparent:true, depthWrite:false, opacity:0})));
    drop.position.set(x, 0, (k % 2 ? .03 : -.03));
    drop.rotation.z = -.32;
    cloud.add(drop);
    return drop;
  });

  // Confetti for a five: dashes, dots and rings thrown out of the screen toward the viewer.
  const fx = new Group();
  fx.visible = false;
  scene.add(fx);
  const confetti = [
    [keep(new CapsuleGeometry(.017, .062, 3, 8)), keep(new MeshBasicMaterial({color:RED, transparent:true}))],
    [keep(new SphereGeometry(.027, 14, 10)), keep(new MeshBasicMaterial({color:0x000000, transparent:true}))],
    [keep(new TorusGeometry(.032, .0095, 6, 22)), keep(new MeshBasicMaterial({color:RED, transparent:true}))],
  ];
  confetti[0][0].rotateZ(Math.PI / 2);
  const pieces = Array.from({length:24}, (_, i) => {
    const angle = i / 24 * TAU + (i % 3) * .12, reach = (128 + (i % 4) * 16) * U, mesh = new Mesh(...confetti[i % 3]);
    fx.add(mesh);
    return {mesh, x:Math.cos(angle) * reach, y:Math.sin(angle) * reach, z:.3 + (i * 7 % 5) * .21, turn:(i % 2 ? 1 : -1) * (2.1 + i * .3), tumble:1.5 + (i * 5 % 7) * .5};
  });

  // Hearts after a good rating: they rise off the phone and drift toward the viewer.
  const hearts = new Group();
  hearts.visible = false;
  scene.add(hearts);
  const heartShape = keep(heartGeometry());
  [-42, 0, 42].forEach(x => {
    const heart = new Mesh(heartShape, keep(new MeshStandardMaterial({color:RED, roughness:.4, metalness:0, emissive:RED, emissiveIntensity:.35, transparent:true, opacity:0})));
    heart.userData.x = x * U;
    heart.userData.y = (x ? 108 : 124) * U;
    heart.visible = false;
    hearts.add(heart);
  });

  const shadowMaterial = keep(new ShaderMaterial({transparent:true, depthWrite:false, vertexShader:shadowVertex, fragmentShader:shadowFragment, uniforms:{
    uCentre:{value:[.13, -.12]}, uHalf:{value:[PHONE.w / 2, PHONE.h / 2]}, uRound:{value:PHONE.r}, uBlur:{value:.17}, uCell:{value:.02}, uPixel:{value:.1}, uInk:{value:[.114, .024, .024]}, uAlpha:{value:.2},
  }}));
  const shadow = new Mesh(keep(new PlaneGeometry(3.4, 3.6)), shadowMaterial);
  shadow.position.z = -.5;
  shadow.renderOrder = -1;
  scene.add(shadow);

  // Animated state. Times are on a clock that only runs while the phone is on screen.
  let shape = faces[props.mood].slice(), morph = null;
  let wakeAt = null, winkAt = null, burstAt = null, heartsAt = null, ringLevel = 0, ringPhase = 0, cloudLevel = 0, rainLevel = 0;
  const look = {x:0, y:0, toX:0, toY:0}, tilt = {x:0, y:0}, pointer = {x:0, y:0, fresh:false};
  const yaw = spring(REST.yaw - .75), pitch = spring(REST.pitch), roll = spring(REST.roll), lift = spring(-.12);

  function paintFace(v) {
    const f = v.shape, id = `${f.map(n => n.toFixed(2))},${v.wake.toFixed(3)},${v.draw.toFixed(3)},${v.feat.toFixed(3)},${v.left.toFixed(2)},${v.right.toFixed(2)},${v.x.toFixed(1)},${v.y.toFixed(1)}`;
    if (id === face.key) return;
    face.key = id;
    const c = pen, k = face.canvas.width / VIEW.w;
    const base = () => {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(face.paper, 0, 0);
      c.setTransform(k, 0, 0, k, -VIEW.x * k, -VIEW.y * k);
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(160, 182, 106, 0, TAU); c.fill();
      if (v.draw <= 0) return;
      // The outline draws itself in from the left, over the top: the SVG's stroke-dashoffset.
      c.strokeStyle = '#000'; c.lineWidth = 12; c.lineCap = 'butt';
      c.beginPath(); c.arc(160, 182, 106, Math.PI, Math.PI + TAU * Math.min(1, v.draw));
      if (v.draw >= 1) c.closePath();
      c.stroke();
    };
    c.globalAlpha = 1;
    base();
    if (v.feat > 0) {
      c.fillStyle = RED;
      c.globalAlpha = clamp01(f[14]);
      for (const x of [98, 222]) { c.beginPath(); c.arc(x, 208, 14, 0, TAU); c.fill(); }
      c.globalAlpha = 1;
      c.strokeStyle = '#000'; c.lineWidth = 9; c.lineCap = 'round';
      c.beginPath();
      for (const mirror of [false, true]) {
        const x = n => mirror ? 320 - n : n;
        c.moveTo(x(f[7]), f[8]);
        c.quadraticCurveTo(x(f[9]), f[10], x(f[11]), f[12]);
      }
      c.stroke();
      c.fillStyle = '#000';
      for (const [x, lid] of [[124, v.left], [196, v.right]]) { c.beginPath(); c.ellipse(x + v.x, 166 + v.y, 11, Math.max(2, f[13]) * lid, 0, 0, TAU); c.fill(); }
      c.fillStyle = c.strokeStyle = RED; c.lineWidth = 12; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(f[0], f[1]); c.quadraticCurveTo(f[2], f[3], f[4], f[5]); c.quadraticCurveTo(f[2], f[6], f[0], f[1]); c.closePath();
      c.fill(); c.stroke();
      // Fading the features in as one layer: the bare head is laid back over them.
      if (v.feat < 1) { c.globalAlpha = 1 - v.feat; base(); }
    }
    if (v.wake < 1) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 1 - v.wake;
      c.fillStyle = '#0c0c0e';
      c.fillRect(0, 0, face.canvas.width, face.canvas.height);
    }
    texture.needsUpdate = true;
    dirty = true;
  }

  // Advances everything by dt seconds and reports whether something is still moving.
  // With reduced motion every timeline sits at its end: one still frame for the current mood.
  function step(dt) {
    const still = motion.matches, mood = props.mood;
    let busy = false;
    clock += dt;
    if (wakeAt === null && props.revealed && !still) wakeAt = clock;
    const since = still ? 9 : wakeAt === null ? -1 : clock - wakeAt, awake = since >= 0;
    if (awake && since < 1.5) busy = true;

    if (morph) {
      const t = still ? 1 : clamp01((clock - morph.at) / .52), eased = overshoot(t);
      shape = t === 1 ? morph.to.slice() : morph.from.map((value, i) => value + (morph.to[i] - value) * eased);
      if (t === 1) morph = null; else busy = true;
    }

    if (pointer.fresh) {
      pointer.fresh = false;
      const box = canvas.getBoundingClientRect(), dx = pointer.x - box.left - centre.x, dy = pointer.y - box.top - centre.y;
      const distance = Math.hypot(dx, dy) || 1, reach = Math.min(7, distance * VIEW.w / (SCREEN.w * scale) / 40);
      look.toX = dx / distance * reach;
      look.toY = dy / distance * reach;
      tilt.x = clamp(dx / (innerWidth * .5), -1, 1);
      tilt.y = clamp(dy / (innerHeight * .5), -1, 1);
    }
    const follow = still ? 1 : 1 - Math.exp(-dt * 16);
    look.x += ((still ? 0 : look.toX) - look.x) * follow;
    look.y += ((still ? 0 : look.toY) - look.y) * follow;

    // Blink every 5.4 s (eye-blink keyframes); the left eye winks once after a good rating is sent.
    const phase = clock % 5.4 / 5.4;
    const right = still || phase < .92 ? 1 : phase < .95 ? 1 - .9 * easeInOut((phase - .92) / .03) : .1 + .9 * easeInOut((phase - .95) / .05);
    let left = right;
    if (winkAt !== null && !still) {
      const t = (clock - winkAt - .5) / 1.1;
      if (t >= 1) winkAt = null; else left = t < 0 ? 1 : t < .25 ? 1 - .9 * ease(t / .25) : t < .7 ? .1 : .1 + .9 * ease((t - .7) / .3);
    }
    paintFace({shape, wake:awake ? easeOut(clamp01(since / .45)) : 0, draw:awake ? drawEase(clamp01((since - .2) / 1.1)) : 0, feat:awake ? ease(clamp01((since - .95) / .5)) : 0, left, right, x:look.x, y:look.y});

    // Pose: the phone swings round to face the visitor when it wakes, leans a little toward the pointer and with the mood.
    const pose = POSE[mood] || POSE.idle, lean = still ? 0 : 1;
    yaw.target = REST.yaw + (awake ? tilt.x * .17 * lean : -.75);
    pitch.target = REST.pitch + pose[0] + tilt.y * .1 * lean;
    roll.target = REST.roll + pose[1];
    lift.target = pose[2] + (awake ? 0 : -.12);
    for (const s of [yaw, pitch, roll, lift]) {
      if (still) { s.value = s.target; s.speed = 0; } else if (settle(s, dt)) busy = true;
    }
    phone.rotation.set(pitch.value, yaw.value, roll.value);
    phone.position.y = lift.value;
    shadowMaterial.uniforms.uCentre.value[0] = .13 + (yaw.value - REST.yaw) * .32;
    shadowMaterial.uniforms.uCentre.value[1] = -.12 - (pitch.value - REST.pitch) * .32 + lift.value * .5;

    const ringsOn = !still && awake && (mood === 4 || mood === 5);
    ringLevel = approach(ringLevel, ringsOn ? 1 : 0, dt / .25);
    if (ringsOn) ringPhase += dt / (mood === 5 ? 2.1 : 3.6);
    rings.visible = ringLevel > 0;
    if (rings.visible) {
      busy = true;
      rings.children.forEach((ring, k) => {
        const p = (ringPhase + k / 3) % 1, e = easeOut(p);
        // Starts just outside the head's outline, where the SVG ring first shows from behind the head.
        ring.scale.setScalar(1.05 + .4 * e);
        ring.position.z = .42 * e;
        ring.material.opacity = .6 * (1 - e) * ringLevel * Math.min(1, p / .06);
      });
    }

    const cloudOn = mood === 1 || mood === 2, rainOn = mood === 1;
    cloudLevel = still ? +cloudOn : approach(cloudLevel, +cloudOn, dt / .5);
    rainLevel = still ? +rainOn : approach(rainLevel, +rainOn, dt / .25);
    cloud.visible = cloudLevel > 0;
    if (cloud.visible) {
      if (!still) busy = true;
      cloud.scale.setScalar(Math.max(.001, overshoot(cloudLevel)) * CLOUD.size);
      cloud.position.set(CLOUD.x + (still ? 0 : Math.sin(clock * TAU / 7.2) * .024), CLOUD.y + (1 - ease(cloudLevel)) * .12, CLOUD.z);
      drops.forEach((drop, k) => {
        const p = still ? .28 + k * .14 : (clock / .9 + k * .26) % 1;
        drop.position.y = -.1 - p * .24;
        drop.material.opacity = rainLevel * (still ? 1 : p < .25 ? p / .25 : 1 - (p - .25) / .75);
        drop.visible = drop.material.opacity > .01;
      });
    }

    const flight = burstAt !== null && !still ? (clock - burstAt) / 1.2 : 1;
    fx.visible = flight < 1;
    if (fx.visible) {
      busy = true;
      const e = burstEase(flight), fade = flight < .75 ? 1 : 1 - (flight - .75) / .25;
      for (const [, material] of confetti) material.opacity = fade;
      for (const piece of pieces) {
        piece.mesh.position.set(piece.x * e, piece.y * e - .16 * flight * flight, PHONE.d / 2 + .02 + piece.z * e);
        piece.mesh.rotation.set(piece.tumble * e, piece.tumble * .7 * e, piece.turn * e);
        piece.mesh.scale.setScalar(.3 + .7 * e);
      }
    } else burstAt = null;

    hearts.visible = false;
    if (heartsAt !== null && !still) {
      hearts.children.forEach((heart, k) => {
        const t = (clock - heartsAt - .4 - k * .25) / 2.4;
        heart.visible = t > 0 && t < 1;
        if (!heart.visible) return;
        hearts.visible = true;
        const e = easeOut(t);
        heart.position.set(heart.userData.x * (1 + .5 * e), heart.userData.y + (-12 + 150 * e) * U, PHONE.d / 2 + .08 + .6 * e);
        heart.rotation.set(-.15, Math.sin(clock * 2.2 + k * 2) * .5, (k - 1) * -.12);
        heart.scale.setScalar(.4 + .7 * e);
        heart.material.opacity = t < .2 ? easeOut(t / .2) : 1 - easeOut((t - .2) / .8);
      });
      if (clock - heartsAt < 3.4) busy = true; else heartsAt = null;
    }
    return busy;
  }

  function draw(dt = 0) {
    if (dead || !ready) return;
    const busy = step(dt);
    if (!busy && !dirty) return;
    dirty = false;
    renderer.render(scene, camera);
    if (broken) fail();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
    last = now;
    draw(dt);
  }

  // Frames the phone inside the host box; the canvas itself is larger so confetti, hearts and the cloud have room.
  function layout() {
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (dead || !cw || !ch) return;
    const box = canvas.getBoundingClientRect(), stage = host.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(cw, ch, false);
    scale = Math.min(stage.height * .9, stage.width * 1.1) / PHONE.h;
    centre.x = stage.left - box.left + stage.width * .44;
    centre.y = stage.top - box.top + stage.height * .535;
    const distance = ch / scale / (2 * Math.tan(FOV * Math.PI / 360));
    camera.aspect = cw / ch;
    camera.position.z = distance;
    camera.near = Math.max(.5, distance - 3);
    camera.far = distance + 3;
    camera.setViewOffset(cw, ch, cw / 2 - centre.x, ch / 2 - centre.y, cw, ch);
    const cell = 4.2 / scale;
    shadowMaterial.uniforms.uCell.value = cell;
    shadowMaterial.uniforms.uPixel.value = .75 / (scale * dpr) / cell;
    // The face texture has twice the screen's device pixels, so it stays crisp when the phone turns.
    const width = clamp(Math.ceil(SCREEN.w * scale * dpr * 2 / 64) * 64, 256, 1024);
    if (width !== face.canvas.width) {
      texture.dispose();
      face.canvas.width = face.paper.width = width;
      face.canvas.height = face.paper.height = Math.round(width * SCREEN.h / SCREEN.w);
      paintPaper(face.paper);
      face.key = '';
    }
    dirty = true;
  }

  const onMove = event => { if (hover.matches) { pointer.x = event.clientX; pointer.y = event.clientY; pointer.fresh = true; } };
  const onLeave = () => { tilt.x = tilt.y = 0; };
  // Runs the loop only while the phone is on screen and motion is welcome; otherwise a single still frame.
  function sync() {
    if (dead || !ready) return;
    const run = props.onScreen && !motion.matches;
    if (run && !raf) {
      last = 0;
      raf = requestAnimationFrame(frame);
      addEventListener('pointermove', onMove, {passive:true});
      document.documentElement.addEventListener('pointerleave', onLeave);
    } else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    }
    if (!run) draw();
  }

  function update(next) {
    const before = props;
    props = {...next};
    if (dead) return;
    const still = motion.matches;
    if (next.mood !== before.mood) {
      morph = {from:shape, to:faces[next.mood], at:clock};
      if (!still) pitch.speed += next.mood === 1 || next.mood === 2 ? .35 : -.3;
    }
    if (next.burst > before.burst && !still) {
      burstAt = clock;
      fx.position.copy(phone.position);
      fx.quaternion.copy(phone.quaternion);
      lift.speed += 1;
      roll.speed += .5;
    }
    if (next.wink && !before.wink) winkAt = clock;
    if (next.hearts !== before.hearts) heartsAt = next.hearts ? clock : null;
    dirty = true;
    sync();
  }

  function dispose() {
    if (dead) return;
    dead = true;
    cancelAnimationFrame(raf);
    removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    motion.removeEventListener('change', sync);
    canvas.removeEventListener('webglcontextlost', fail);
    observer.disconnect();
    onThreeError = null;
    for (const thing of trash) thing.dispose();
    renderer.dispose();
    if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  function fail() {
    if (dead) return;
    dispose();
    onFail();
  }

  motion.addEventListener('change', sync);
  canvas.addEventListener('webglcontextlost', fail);
  const observer = new ResizeObserver(() => { layout(); dirty = true; draw(); });
  observer.observe(canvas);
  observer.observe(host);
  try {
    layout();
    step(0);
    // Shaders are compiled off the main thread where the browser allows; the phone is shown once its first frame exists.
    const compiled = gl.getExtension('KHR_parallel_shader_compile') ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera));
    compiled.then(() => {
      if (dead) return;
      if (broken) { fail(); return; }
      ready = true;
      dirty = true;
      draw();
      if (dead) return;
      onReady();
      sync();
    }).catch(fail);
  } catch (error) {
    // Nothing half-built is left listening; the caller falls back to the SVG face.
    dispose();
    throw error;
  }

  return {update, dispose};
}
