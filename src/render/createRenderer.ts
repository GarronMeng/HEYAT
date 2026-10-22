import * as THREE from 'three';
import { viewportSize } from './viewport';

export interface SceneRenderer {
  resize(width: number, height: number, dpr: number): void;
  render(): void;
  dispose(): void;
}

export function createRenderer(canvas: HTMLCanvasElement): SceneRenderer {
  const context = canvas.getContext('webgl2', {
    antialias: true,
    alpha: false,
  });
  if (!context) {
    throw new Error(
      '当前浏览器无法创建 WebGL 2。请开启硬件加速或使用支持 WebGL 2 的浏览器后重试。',
    );
  }
  const renderer = new THREE.WebGLRenderer({ canvas, context });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0c1c2b');
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(6, 4.5, 7);
  camera.lookAt(0, 0.4, 0);
  scene.add(new THREE.HemisphereLight('#c9dff1', '#172430', 2));
  const light = new THREE.DirectionalLight('#ffdb9e', 4);
  light.position.set(-3, 6, 4);
  scene.add(light);

  // Original geometric render marker, deliberately not the HYA-002 hotel.
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const brass = new THREE.MeshStandardMaterial({
    color: '#c6a46b',
    metalness: 0.65,
    roughness: 0.35,
  });
  const stone = new THREE.MeshStandardMaterial({
    color: '#233d4c',
    roughness: 0.7,
  });
  const ivory = new THREE.MeshStandardMaterial({
    color: '#f2e6d2',
    roughness: 0.5,
  });
  const addBlock = (
    size: [number, number, number],
    position: [number, number, number],
    material: THREE.Material,
  ) => {
    const block = new THREE.Mesh(geometry, material);
    block.scale.set(...size);
    block.position.set(...position);
    scene.add(block);
  };
  addBlock([4, 0.22, 3.2], [0, -0.65, 0], stone);
  addBlock([2.3, 0.12, 1.8], [0, -0.48, 0], brass);
  addBlock([1.8, 1.9, 0.8], [-0.25, 0.52, -0.25], ivory);
  addBlock([0.35, 2.3, 0.35], [0.85, 0.72, 0.45], brass);
  addBlock([1.85, 0.12, 1.1], [0.1, 1.23, 0.1], brass);

  return {
    resize(width, height, dpr) {
      const size = viewportSize(width, height, dpr);
      renderer.setPixelRatio(size.pixelRatio);
      renderer.setSize(size.width, size.height, false);
      camera.aspect = size.width / size.height;
      camera.updateProjectionMatrix();
    },
    render: () => renderer.render(scene, camera),
    dispose() {
      geometry.dispose();
      brass.dispose();
      stone.dispose();
      ivory.dispose();
      renderer.dispose();
    },
  };
}
