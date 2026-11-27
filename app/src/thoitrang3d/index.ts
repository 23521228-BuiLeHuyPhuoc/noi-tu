/**
 * Cầu nối Three.js 0.170.0 cho bộ engine v4 của "Sàn Diễn Xóm Lầy" (`thoitrang`).
 * - 1 WebGLRenderer cho sân khấu chính (phòng thử đồ pastel + sàn diễn spotlight tối).
 * - 1 WebGLRenderer offscreen dùng chung cho ảnh chân dung bong bóng phòng & bảng công bố.
 */
import * as THREE from 'three';
import type { ThoiTrangOutfit, ThoiTrangPoseId } from '../../../shared/src/thoitrang';
import { BASE_OUTFIT, validateOutfit } from '../../../shared/src/thoitrang-catalog';
import { Doll, animate, toon } from './doll.js';

export type ThoiTrangStageMode = 'wardrobe' | 'runway';
export type ThoiTrangSnapshotFraming = 'portrait' | 'full';

export interface ThoiTrangEngineOptions {
  mode?: ThoiTrangStageMode;
  width?: number;
  height?: number;
  initialRotY?: number;
  viewOffset?: 'auto' | 'none';
}

export interface ThoiTrangEngine {
  setOutfit(outfit: ThoiTrangOutfit): void;
  setMode(mode: ThoiTrangStageMode): void;
  pose(poseId: ThoiTrangPoseId): void;
  catwalk(): void;
  orbit(deltaRad: number): void;
  zoom(delta: number): void;
  resize(width: number, height: number): void;
  snapshot(width?: number, height?: number, framing?: ThoiTrangSnapshotFraming): string;
  dispose(): void;
}

interface V4Doll {
  root: THREE.Group;
  Y?: { head: number };
  apply(o: Record<string, unknown>): void;
  setPoseExpression(expr: string | null): void;
}

const SOFTWARE_GL_RE = /swiftshader|llvmpipe|software|mesa offscreen/i;

function detectSoftwareGL(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const name = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '')
      : String(gl.getParameter(gl.RENDERER) ?? '');
    return SOFTWARE_GL_RE.test(name);
  } catch {
    return false;
  }
}

function makeGradientTex(top: string, bot: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d');
  if (g) {
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, top);
    gr.addColorStop(1, bot);
    g.fillStyle = gr;
    g.fillRect(0, 0, 4, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function toV4Outfit(raw: ThoiTrangOutfit): Record<string, unknown> {
  const { outfit } = validateOutfit(raw);
  return {
    type: outfit.body,
    skin: outfit.skin,
    height: outfit.height,
    face: outfit.face,
    hair: outfit.hair,
    top: outfit.slots.top ?? null,
    outer: outfit.slots.outer ?? null,
    bottom: outfit.slots.bottom ?? null,
    dress: outfit.slots.dress ?? null,
    shoes: outfit.slots.shoes ?? null,
    hat: outfit.slots.hat ?? null,
    glasses: outfit.slots.glasses ?? null,
    acc: outfit.acc,
  };
}

function buildWardrobeEnv(): THREE.Group {
  const room = new THREE.Group();
  const podium = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.66, 0.06, 48).translate(0, -0.03, 0),
    toon('#ffd3e2'),
  );
  podium.receiveShadow = true;
  room.add(podium);
  room.add(new THREE.Mesh(
    new THREE.TorusGeometry(0.64, 0.012, 8, 64).rotateX(Math.PI / 2),
    toon('#ffffff'),
  ));
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(8, 48).rotateX(-Math.PI / 2),
    new THREE.ShadowMaterial({ opacity: 0.12 }),
  );
  floor.position.y = -0.059;
  floor.receiveShadow = true;
  room.add(floor);

  const colors = ['#ffffff', '#ffd56b', '#ffb3c7'];
  for (let i = 0; i < 24; i++) {
    const s = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.02 + (i % 3) * 0.008),
      new THREE.MeshBasicMaterial({ color: colors[i % 3] }),
    );
    const a = (i / 24) * Math.PI * 2 + 0.3;
    const r = 1.2 + (i % 4) * 0.3;
    s.position.set(Math.cos(a) * r, 0.25 + (i % 7) * 0.25, -0.9 - (i % 5) * 0.3);
    room.add(s);
  }
  return room;
}

function buildRunwayEnv(): { group: THREE.Group; spot: THREE.SpotLight } {
  const runway = new THREE.Group();
  const walk = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 9), toon('#2a1f3d'));
  walk.position.set(0, -0.04, -3.6);
  walk.receiveShadow = true;
  runway.add(walk);

  const glow = new THREE.MeshBasicMaterial({ color: '#ffe6a8' });
  const bulbGeo = new THREE.SphereGeometry(0.022, 8, 6);
  for (let i = 0; i < 26; i++) {
    for (const s of [1, -1]) {
      const b = new THREE.Mesh(bulbGeo, glow);
      b.position.set(s * 0.68, 0.02, 0.8 - i * 0.34);
      runway.add(b);
    }
  }
  const stripe = new THREE.Mesh(
    new THREE.PlaneGeometry(0.06, 9).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#ff5c8a' }),
  );
  stripe.position.set(0, 0.002, -3.6);
  runway.add(stripe);

  const crowdGeo = new THREE.CapsuleGeometry(0.12, 0.25, 4, 8);
  const crowdMat = new THREE.MeshBasicMaterial({ color: '#160f22' });
  for (let i = 0; i < 16; i++) {
    for (const s of [1, -1]) {
      const p = new THREE.Mesh(crowdGeo, crowdMat);
      p.position.set(s * (1.25 + (i % 3) * 0.35), 0.25, 0.6 - i * 0.5);
      runway.add(p);
    }
  }

  const spot = new THREE.SpotLight('#fff1fb', 30, 8, 0.38, 0.6);
  spot.position.set(0, 4, 2);
  spot.castShadow = true;
  runway.add(spot, spot.target);
  return { group: runway, spot };
}

export function createThoiTrangEngine(
  canvas: HTMLCanvasElement,
  options: ThoiTrangEngineOptions = {},
): ThoiTrangEngine {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  const isSoft = detectSoftwareGL(renderer);
  renderer.setPixelRatio(isSoft ? 1 : Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = !isSoft;
  if (!isSoft) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  const roomBg = makeGradientTex('#fde4f1', '#e9dcff');
  const runwayBg = makeGradientTex('#0f0a1c', '#2b1740');

  const hemi = new THREE.HemisphereLight('#fff6fb', '#e7c9e6', 1.6);
  const key = new THREE.DirectionalLight('#ffffff', 1.7);
  key.position.set(1.5, 3, 2.5);
  key.castShadow = !isSoft;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 2.2, bottom: -0.5 });
  scene.add(hemi, key);

  const roomEnv = buildWardrobeEnv();
  const { group: runwayEnv, spot } = buildRunwayEnv();
  spot.castShadow = !isSoft;
  scene.add(roomEnv, runwayEnv);

  const doll = new Doll({ type: BASE_OUTFIT.body, skin: BASE_OUTFIT.skin }) as unknown as V4Doll;
  scene.add(doll.root);

  let currentOutfit: ThoiTrangOutfit = BASE_OUTFIT;
  doll.apply(toV4Outfit(currentOutfit));

  let mode: ThoiTrangStageMode = options.mode ?? 'wardrobe';
  const viewOffsetMode = options.viewOffset ?? 'auto';
  let activePose: ThoiTrangPoseId = mode === 'runway' ? 'catwalk' : 'idle';
  let rotY = options.initialRotY ?? 0.25;
  let zoomOffset = 0;
  let width = Math.max(1, options.width ?? (canvas.clientWidth || 400));
  let height = Math.max(1, options.height ?? (canvas.clientHeight || 560));
  let walkStartSec = 0;
  let disposed = false;
  let rafId = 0;
  let slowTimer = 0;

  const applyCameraProjection = () => {
    camera.aspect = width / Math.max(1, height);
    if (mode === 'wardrobe' && viewOffsetMode === 'auto') {
      if (width <= 760) {
        camera.setViewOffset(width, height, 0, Math.round(height * 0.2), width, height);
        camera.fov = 30;
      } else {
        camera.setViewOffset(width, height, Math.min(160, Math.round(width * 0.125)), 0, width, height);
        camera.fov = 26;
      }
    } else if (mode === 'wardrobe') {
      camera.clearViewOffset();
      camera.fov = 28;
    } else {
      camera.clearViewOffset();
      camera.fov = 32;
    }
    camera.updateProjectionMatrix();
  };

  const applyModeVisuals = () => {
    roomEnv.visible = mode === 'wardrobe';
    runwayEnv.visible = mode === 'runway';
    scene.background = mode === 'wardrobe' ? roomBg : runwayBg;
    hemi.intensity = mode === 'wardrobe' ? 1.6 : 0.6;
    key.intensity = mode === 'wardrobe' ? 1.7 : 0.45;
    if (mode === 'wardrobe') {
      activePose = 'idle';
      doll.setPoseExpression(null);
    } else {
      activePose = 'catwalk';
      walkStartSec = clock.getElapsedTime();
    }
    applyCameraProjection();
  };

  const clock = new THREE.Clock();
  renderer.setSize(width, height, false);
  applyModeVisuals();

  const renderFrame = () => {
    if (disposed) return;
    const t = clock.getElapsedTime();
    if (mode === 'wardrobe') {
      doll.root.position.z = 0;
      doll.root.rotation.y = rotY;
      animate(doll, 'idle', t);
      const baseDist = viewOffsetMode === 'auto' ? (width <= 760 ? 7.6 : 5.5) : 5.2;
      camera.position.set(0, 0.98, Math.max(2.6, Math.min(9.5, baseDist + zoomOffset)));
      camera.lookAt(0, 0.84, 0);
    } else {
      const elapsed = Math.max(0, t - walkStartSec);
      const u = Math.min(1, elapsed / 5.2);
      const isStrut = activePose === 'catwalk';
      const zPos = isStrut ? (-5.4 + u * 5.6) : 0.2;
      doll.root.position.z = zPos;
      doll.root.rotation.y = 0;
      animate(doll, isStrut ? (u >= 0.98 ? 'finale' : 'catwalk') : activePose, t);
      const isNarrow = width <= 760;
      camera.position.set(isNarrow ? 0.32 : 0.45, 0.96, zPos + (isNarrow ? 5.9 : 4.5));
      camera.lookAt(0, isNarrow ? 0.66 : 0.84, zPos);
      spot.target.position.set(0, 0.6, zPos);
      spot.position.set(0, 4, zPos + 1.5);
    }
    renderer.render(scene, camera);
  };

  const scheduleNext = (costMs: number) => {
    if (disposed) return;
    if (isSoft && costMs > 45) {
      slowTimer = window.setTimeout(() => {
        slowTimer = 0;
        if (!disposed) rafId = window.requestAnimationFrame(tick);
      }, 90);
    } else {
      rafId = window.requestAnimationFrame(tick);
    }
  };

  const tick = () => {
    if (disposed) return;
    const t0 = performance.now();
    renderFrame();
    scheduleNext(performance.now() - t0);
  };
  renderFrame();
  rafId = window.requestAnimationFrame(tick);

  return {
    setOutfit(outfit: ThoiTrangOutfit) {
      currentOutfit = outfit;
      doll.apply(toV4Outfit(outfit));
      if (mode === 'wardrobe') doll.setPoseExpression(null);
      renderFrame();
    },
    setMode(nextMode: ThoiTrangStageMode) {
      if (mode === nextMode) return;
      mode = nextMode;
      applyModeVisuals();
      renderFrame();
    },
    pose(poseId: ThoiTrangPoseId) {
      activePose = poseId;
      if (poseId === 'catwalk') walkStartSec = clock.getElapsedTime();
      renderFrame();
    },
    catwalk() {
      activePose = 'catwalk';
      walkStartSec = clock.getElapsedTime();
      renderFrame();
    },
    orbit(deltaRad: number) {
      if (mode === 'wardrobe') rotY += deltaRad;
    },
    zoom(delta: number) {
      if (mode === 'wardrobe') zoomOffset = Math.max(-2.0, Math.min(2.2, zoomOffset + delta));
    },
    resize(w: number, h: number) {
      const nw = Math.max(1, Math.round(w));
      const nh = Math.max(1, Math.round(h));
      if (nw === width && nh === height) return;
      width = nw;
      height = nh;
      renderer.setSize(width, height, false);
      applyCameraProjection();
      renderFrame();
    },
    snapshot(w = 192, h = 192, framing: ThoiTrangSnapshotFraming = 'portrait') {
      return snapshotThoiTrangOutfit(currentOutfit, w, h, framing);
    },
    dispose() {
      disposed = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      if (slowTimer) window.clearTimeout(slowTimer);
      roomBg.dispose();
      runwayBg.dispose();
      renderer.dispose();
    },
  };
}

// ---------- Shared offscreen snapshot renderer (1 WebGL context total) ----------
let offRenderer: THREE.WebGLRenderer | null = null;
let offScene: THREE.Scene | null = null;
let offCam: THREE.PerspectiveCamera | null = null;
let offDoll: V4Doll | null = null;
let offBg: THREE.CanvasTexture | null = null;
let offDisposeTimer = 0;

function ensureOffscreen() {
  if (offDisposeTimer) {
    window.clearTimeout(offDisposeTimer);
    offDisposeTimer = 0;
  }
  if (!offRenderer) {
    offRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    offRenderer.outputColorSpace = THREE.SRGBColorSpace;
    offScene = new THREE.Scene();
    offBg = makeGradientTex('#fde4f1', '#efe4ff');
    offScene.background = offBg;
    offScene.add(new THREE.HemisphereLight('#ffffff', '#e8d3e6', 2.0));
    const k = new THREE.DirectionalLight('#ffffff', 1.6);
    k.position.set(1.2, 2.4, 3.0);
    offScene.add(k);
    offCam = new THREE.PerspectiveCamera(30, 1, 0.05, 25);
    const d = new Doll({ type: BASE_OUTFIT.body, skin: BASE_OUTFIT.skin }) as unknown as V4Doll;
    offDoll = d;
    offScene.add(d.root);
  }
  return { renderer: offRenderer, scene: offScene!, cam: offCam!, doll: offDoll! };
}

function scheduleOffscreenCleanup() {
  if (offDisposeTimer) window.clearTimeout(offDisposeTimer);
  offDisposeTimer = window.setTimeout(() => {
    offDisposeTimer = 0;
    offBg?.dispose();
    offRenderer?.dispose();
    offBg = null;
    offRenderer = null;
    offScene = null;
    offCam = null;
    offDoll = null;
  }, 4000);
}

export function snapshotThoiTrangOutfit(
  outfit: ThoiTrangOutfit,
  width = 160,
  height = 160,
  framing: ThoiTrangSnapshotFraming = 'portrait',
): string {
  if (typeof document === 'undefined') return '';
  try {
    const { renderer, scene, cam, doll } = ensureOffscreen();
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    cam.aspect = width / Math.max(1, height);
    cam.updateProjectionMatrix();

    doll.setPoseExpression(null);
    doll.apply(toV4Outfit(outfit));
    animate(doll, 'idle', 0);

    if (framing === 'portrait') {
      doll.root.rotation.y = 0.28;
      const hy = doll.Y?.head ?? 1.35;
      cam.position.set(0, hy + 0.02, 0.85);
      cam.lookAt(0, hy - 0.01, 0);
    } else {
      doll.root.rotation.y = 0.24;
      cam.position.set(0, 0.92, 3.65);
      cam.lookAt(0, 0.82, 0);
    }

    renderer.render(scene, cam);
    const url = renderer.domElement.toDataURL('image/webp', 0.84);
    scheduleOffscreenCleanup();
    return url;
  } catch {
    return '';
  }
}
