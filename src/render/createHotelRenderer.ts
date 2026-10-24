import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  initialHotel,
  floorCount,
  roomCount,
  type HotelState,
} from '../core/model';
import { createAssets, disposeGroup } from './assets';
import { createHotel } from './hotel';
import { createPeople } from './people';
import { createNightSkyline } from './skyline';
import {
  AUTO_QUALITY,
  FrameMetrics,
  QUALITY,
  type Quality,
  type RenderStats,
} from './perf';

export interface SceneRenderer {
  resize(width: number, height: number, dpr: number): void;
  render(active?: boolean): void;
  dispose(): void;
  setState(state: HotelState): void;
  setQuality(quality: Quality, automatic?: boolean): void;
  resetCamera(): void;
  resetTiming(): void;
  metrics(): RenderStats;
  report(): unknown;
}
export function createRenderer(
  canvas: HTMLCanvasElement,
  onRoom?: (id: number) => void,
): SceneRenderer {
  const context = canvas.getContext('webgl2', {
    antialias: true,
    alpha: false,
  });
  if (!context)
    throw new Error(
      '当前浏览器无法创建 WebGL 2。请开启硬件加速或使用支持 WebGL 2 的浏览器后重试。',
    );
  const renderer = new T.WebGLRenderer({ canvas, context });
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  const scene = new T.Scene();
  scene.background = new T.Color('#091a2a');
  scene.fog = new T.Fog('#091a2a', 26, 65);
  const assets = createAssets(),
    people = createPeople();
  // Mobile begins with the upgraded baked-material presentation. Sustained
  // low frame rate can still downgrade rendering without changing game state.
  let quality: Quality = AUTO_QUALITY;
  // Prefilter once at startup. No live reflection camera, per-room lights or shadows.
  const bakeEnvironment = () => {
    const environmentScene = new RoomEnvironment();
    const pmrem = new T.PMREMGenerator(renderer);
    try {
      return pmrem.fromScene(environmentScene, 0.06);
    } finally {
      environmentScene.dispose();
      pmrem.dispose();
    }
  };
  // PMREM is a one-time High-only cost. Low and Medium use the existing
  // baked-looking emissive details without per-fragment environment reflection.
  let environment: T.WebGLRenderTarget | null = null;
  const syncEnvironment = () => {
    if (quality === 'high') {
      if (!environment) environment = bakeEnvironment();
      scene.environment = environment.texture;
      scene.environmentIntensity = 0.3;
    } else {
      scene.environment = null;
      scene.environmentIntensity = 0;
      environment?.dispose();
      environment = null;
    }
  };
  const restoreEnvironment = () => {
    environment?.dispose();
    environment = null;
    // Recreate only if the chosen tier needs PMREM after context restoration.
    syncEnvironment();
  };
  canvas.addEventListener('webglcontextrestored', restoreEnvironment);
  const camera = new T.OrthographicCamera(-9, 9, 6, -6, 0.1, 100);
  camera.position.set(9.5, 8.5, 18);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 2.6, 0);
  controls.enableDamping = true;
  controls.enablePan = true;
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.minZoom = 0.35;
  controls.maxZoom = 4;
  controls.rotateSpeed = 0.45;
  controls.zoomSpeed = 0.7;
  scene.add(new T.HemisphereLight('#7e9bbf', '#433628', 0.6));
  const moon = new T.DirectionalLight('#a9c3eb', 0.7);
  moon.position.set(-5, 10, 8);
  scene.add(moon);
  const warm = new T.DirectionalLight('#ffd39b', 1.55);
  warm.position.set(4, 6, 4);
  scene.add(warm);
  // The background is a single procedural texture with no per-frame city draws.
  const skyline = createNightSkyline();
  scene.background = skyline;
  scene.backgroundIntensity = 0.62;
  scene.add(people.group);
  let state = initialHotel(),
    hotel = createHotel(assets, state),
    previousKey = '',
    width = 1,
    height = 1,
    dpr = 1;
  assets.applyQuality(hotel.group, quality);
  assets.applyQuality(people.group, quality);

  scene.add(hotel.group);
  let automatic = true,
    slowSince = 0,
    lastTime = 0;
  const metrics = new FrameMetrics();
  let stats: RenderStats = {
    fps: 0,
    p50: 0,
    p95: 0,
    calls: 0,
    triangles: 0,
    geometries: 0,
    width: 1,
    height: 1,
    quality,
  };
  const applySize = () => {
    const pixelRatio = Math.min(dpr, QUALITY[quality].dpr);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    const aspect = width / height,
      span = Math.max(
        10 + 2.3 * (floorCount(state) - 1),
        (aspect < 0.85 ? 14.8 : 16.6) / aspect,
      );
    camera.left = (-span * aspect) / 2;
    camera.right = (span * aspect) / 2;
    camera.top = span / 2;
    camera.bottom = -span / 2;
    camera.updateProjectionMatrix();
  };
  const setQuality = (next: Quality, auto = false) => {
    const changed = quality !== next;
    quality = next;
    automatic = auto;
    slowSince = 0;
    if (changed) {
      syncEnvironment();
      assets.applyQuality(hotel.group, quality);
      assets.applyQuality(people.group, quality);
    }
    applySize();
  };
  const resetCamera = () => {
    // Flush residual damping before restoring an exact, reproducible view.
    controls.enableDamping = false;
    controls.update();
    camera.position.set(9.5, 8.5, 18);
    controls.target.set(0, 2.2 + floorCount(state) * 0.8, 0);
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new T.Spherical().setFromVector3(offset);
    spherical.phi = 1.15;
    camera.position
      .copy(controls.target)
      .add(offset.setFromSpherical(spherical));
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    controls.update();
    controls.enableDamping = true;
  };
  const raycaster = new T.Raycaster(),
    pointer = new T.Vector2();
  let down: { x: number; y: number } | null = null;
  const activePointers = new Set<number>();
  let gesture = false;
  const pointerDown = (event: PointerEvent) => {
    activePointers.add(event.pointerId);
    if (activePointers.size > 1) gesture = true;
    if (event.button === 0) down = { x: event.clientX, y: event.clientY };
  };
  const pointerCancel = (event: PointerEvent) => {
    activePointers.delete(event.pointerId);
    down = null;
    gesture = activePointers.size > 0;
  };
  const pointerUp = (event: PointerEvent) => {
    activePointers.delete(event.pointerId);
    if (gesture || event.button !== 0) {
      if (!activePointers.size) {
        gesture = false;
        down = null;
      }
      return;
    }
    const start = down;
    down = null;
    if (
      !start ||
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7
    )
      return;
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(hotel.proxies)[0];
    if (hit) onRoom?.(hit.object.userData.roomId as number);
  };
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  return {
    resize(w, h, pixelRatio) {
      width = Math.max(1, Math.floor(w));
      height = Math.max(1, Math.floor(h));
      dpr = pixelRatio;
      applySize();
    },
    setState(next) {
      state = next;
    },
    setQuality,
    resetCamera,
    resetTiming() {
      lastTime = 0;
    },
    metrics: () => stats,
    report: () => ({
      version: 1,
      device: navigator.userAgent,
      viewport: { width, height, dpr },
      mobileStatus: 'MOBILE_PERF_UNVERIFIED',
      camera: {
        position: camera.position.toArray(),
        target: controls.target.toArray(),
        zoom: camera.zoom,
        fullOrbit: true,
        pan: controls.enablePan,
      },
      visualTier: {
        quality,
        shader: quality === 'low' ? 'Lambert' : 'Standard',
        normalMaps: quality === 'high',
        environmentReflection: !!environment,
        decorativeOverlays: quality !== 'low',
      },
      renderer: context.getParameter(context.RENDERER),
      gpu: context.getExtension('WEBGL_debug_renderer_info')
        ? context.getParameter(
            context.getExtension('WEBGL_debug_renderer_info')!
              .UNMASKED_RENDERER_WEBGL,
          )
        : 'unavailable',
      surfaceBakes: { ...assets.bakeStatus },
      facilities: hotel.group.userData.facilities ?? [],
      characters: {
        pool: 6,
        jointsPerActor: 11,
        representation: 'shared skinned / merged / sprite',
        motion: people.report(),
        identities: people.identities(),
        simplified: people.group.userData.simple === true,
      },
      resources: {
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        surfaceTextureBytesEstimate: Math.round(assets.textureBytesEstimate),
        heapBytes:
          (performance as Performance & { memory?: { usedJSHeapSize: number } })
            .memory?.usedJSHeapSize ?? null,
        note: 'Texture bytes are a conservative RGBA+mipmap estimate; GPU/VRAM bytes are not exposed by WebGL. Heap is browser-dependent.',
      },
      samples: metrics.samples,
    }),
    render(active = true) {
      const now = performance.now(),
        delta = lastTime ? now - lastTime : 16.67;
      lastTime = now;
      const key = [
        floorCount(state),
        roomCount(state),
        state.levels.bed,
        state.levels.luxury,
        state.levels.brand,
        state.levels.autodesk,
        state.levels.breakfast,
        state.levels.gym,
        state.levels.lounge,
        state.levels.rooftop,
      ].join(':');
      if (key !== previousKey) {
        scene.remove(hotel.group);
        disposeGroup(hotel.group);
        hotel.proxyMaterial.dispose();
        hotel = createHotel(assets, state);
        assets.applyQuality(hotel.group, quality);
        scene.add(hotel.group);
        const firstAssembly = previousKey === '';
        previousKey = key;
        controls.target.y = 2.2 + floorCount(state) * 0.8;
        applySize();
        if (firstAssembly) resetCamera();
      }
      hotel.update(state);
      if (camera.zoom < 0.7) people.group.userData.simple = true;
      else if (camera.zoom > 0.85) people.group.userData.simple = false;
      people.update(state, delta / 1000, active);
      controls.update();
      renderer.render(scene, camera);
      stats = metrics.add(delta, now, {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        width: canvas.width,
        height: canvas.height,
        quality,
      });
      if (automatic && stats.fps > 0 && stats.fps < 27) {
        if (!slowSince) slowSince = now;
        if (now - slowSince > 5000 && quality !== 'low')
          setQuality(quality === 'high' ? 'medium' : 'low', true);
      } else slowSince = 0;
    },
    dispose() {
      controls.dispose();
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerCancel);
      disposeGroup(hotel.group);
      hotel.proxyMaterial.dispose();
      skyline.dispose();
      people.dispose();
      canvas.removeEventListener('webglcontextrestored', restoreEnvironment);
      environment?.dispose();
      assets.dispose();
      renderer.dispose();
    },
  };
}
