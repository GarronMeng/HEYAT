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
import { FrameMetrics, QUALITY, type Quality, type RenderStats } from './perf';

export interface SceneRenderer {
  resize(width: number, height: number, dpr: number): void;
  render(): void;
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
    people = createPeople(assets);
  // Start iPhone/Android in the cheapest tier rather than waiting for a
  // sustained low-FPS trigger during shader compilation.
  let quality: Quality = /iPhone|iPad|Android/i.test(navigator.userAgent)
    ? 'low'
    : 'medium';
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
      scene.environmentIntensity = 0.45;
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
  camera.position.set(13, 10, 17);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 2.6, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minAzimuthAngle = 0.34;
  controls.maxAzimuthAngle = 0.85;
  controls.minPolarAngle = 0.8;
  controls.maxPolarAngle = 1.15;
  controls.minZoom = 0.65;
  controls.maxZoom = 2.1;
  controls.rotateSpeed = 0.45;
  controls.zoomSpeed = 0.7;
  scene.add(new T.HemisphereLight('#7e9bbf', '#67513b', 0.65));
  const moon = new T.DirectionalLight('#b5c9eb', 1.1);
  moon.position.set(-5, 10, 8);
  scene.add(moon);
  const warm = new T.DirectionalLight('#ffd39b', 1.6);
  warm.position.set(4, 6, 4);
  scene.add(warm);
  // Repeated city silhouettes and illuminated windows share instanced draws.
  const city = new T.InstancedMesh(
    assets.geometries.box,
    assets.materials.dark,
    24,
  );
  const windows = new T.InstancedMesh(
    assets.geometries.box,
    assets.materials.window,
    240,
  );
  const lit = new T.InstancedMesh(
    assets.geometries.box,
    assets.materials.nightWindow,
    100,
  );
  const matrix = new T.Matrix4(),
    v = new T.Vector3(),
    q = new T.Quaternion();
  let wi = 0,
    li = 0;
  for (let i = 0; i < 24; i++) {
    const x = ((i % 12) - 5.5) * 2.5,
      z = -8 - Math.floor(i / 12) * 5,
      h = 3 + ((i * 7) % 11) * 0.5;
    matrix.compose(v.set(x, h / 2 - 0.2, z), q, new T.Vector3(1.8, h, 1.9));
    city.setMatrixAt(i, matrix);
    for (let row = 0; row < Math.floor(h / 0.6); row++)
      for (let col = 0; col < 2; col++) {
        matrix.compose(
          v.set(x + col * 0.65 - 0.32, 0.5 + row * 0.6, z + 1),
          q,
          new T.Vector3(0.26, 0.22, 0.03),
        );
        if ((row + i + col) % 4 === 0 && li < 100)
          lit.setMatrixAt(li++, matrix);
        else if (wi < 240) windows.setMatrixAt(wi++, matrix);
      }
  }
  city.instanceMatrix.needsUpdate = true;
  windows.count = wi;
  lit.count = li;
  windows.instanceMatrix.needsUpdate = true;
  lit.instanceMatrix.needsUpdate = true;
  scene.add(city, windows, lit, people.group);
  let state = initialHotel(),
    hotel = createHotel(assets, state),
    previousKey = '',
    width = 1,
    height = 1,
    dpr = 1;
  assets.applyQuality(hotel.group, quality);
  assets.applyQuality(people.group, quality);
  assets.applyQuality(city, quality);
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
        (aspect < 0.85 ? 14.8 : 18) / aspect,
      );
    camera.left = (-span * aspect) / 2;
    camera.right = (span * aspect) / 2;
    camera.top = span / 2;
    camera.bottom = -span / 2;
    camera.updateProjectionMatrix();
    city.count = QUALITY[quality].city;
    windows.count = Math.round((wi * QUALITY[quality].city) / 24);
    lit.count = Math.round((li * QUALITY[quality].city) / 24);
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
      assets.applyQuality(city, quality);
    }
    applySize();
  };
  const resetCamera = () => {
    camera.position.set(13, 10, 17);
    controls.target.set(0, 2.2 + floorCount(state) * 0.8, 0);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    controls.update();
  };
  const raycaster = new T.Raycaster(),
    pointer = new T.Vector2();
  let down = { x: 0, y: 0 };
  const pointerDown = (event: PointerEvent) => {
    down = { x: event.clientX, y: event.clientY };
  };
  const pointerUp = (event: PointerEvent) => {
    if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 7) return;
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
    render() {
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
      ].join(':');
      if (key !== previousKey) {
        scene.remove(hotel.group);
        disposeGroup(hotel.group);
        hotel.proxyMaterial.dispose();
        hotel = createHotel(assets, state);
        assets.applyQuality(hotel.group, quality);
        scene.add(hotel.group);
        previousKey = key;
        controls.target.y = 2.2 + floorCount(state) * 0.8;
        applySize();
      }
      hotel.update(state);
      people.update(state, now / 1000, QUALITY[quality].people);
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
      disposeGroup(hotel.group);
      hotel.proxyMaterial.dispose();
      city.dispose();
      windows.dispose();
      lit.dispose();
      people.dispose();
      canvas.removeEventListener('webglcontextrestored', restoreEnvironment);
      environment?.dispose();
      assets.dispose();
      renderer.dispose();
    },
  };
}
