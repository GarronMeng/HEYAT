import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createAssets() {
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = woodCanvas.height = 128;
  const ctx = woodCanvas.getContext('2d')!;
  ctx.fillStyle = '#785139';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 100; i++) {
    ctx.strokeStyle = i % 2 ? '#ffffff08' : '#25160d18';
    ctx.beginPath();
    ctx.moveTo(0, i * 1.3);
    ctx.bezierCurveTo(35, i * 1.3 + 3, 90, i * 1.3 - 2, 128, i * 1.3);
    ctx.stroke();
  }
  const woodTexture = new T.CanvasTexture(woodCanvas);
  woodTexture.colorSpace = T.SRGBColorSpace;
  const geometries = {
    box: new T.BoxGeometry(1, 1, 1),
    soft: new RoundedBoxGeometry(1, 1, 1, 2, 0.06),
    cylinder: new T.CylinderGeometry(0.5, 0.5, 1, 12),
    sphere: new T.SphereGeometry(0.5, 10, 8),
    plane: new T.PlaneGeometry(1, 1),
  };
  const material = (color: string, roughness = 0.8, metalness = 0) =>
    new T.MeshStandardMaterial({ color, roughness, metalness });
  const materials = {
    wall: material('#d7cbb5'),
    stone: material('#344550'),
    dark: material('#172a38'),
    wood: new T.MeshStandardMaterial({ map: woodTexture, roughness: 0.75 }),
    brass: material('#b79452', 0.32, 0.65),
    white: material('#f5eee0', 0.9),
    sand: material('#bca88c'),
    teal: material('#386c6e'),
    slate: material('#536670'),
    green: material('#2d5747'),
    foliage: material('#5d7850'),
    black: material('#17222d'),
    cream: material('#c7b58a'),
    skin: material('#ca9d79'),
    navy: material('#29445e'),
    goldLight: new T.MeshBasicMaterial({ color: '#ffd997' }),
    occupied: new T.MeshBasicMaterial({ color: '#f0b95f' }),
    available: new T.MeshBasicMaterial({ color: '#68b89d' }),
    dirty: new T.MeshBasicMaterial({ color: '#d98972' }),
    cleaning: new T.MeshBasicMaterial({ color: '#82c7df' }),
    window: new T.MeshBasicMaterial({ color: '#3c627d' }),
    nightWindow: new T.MeshBasicMaterial({ color: '#d4b575' }),
    locked: material('#43505a'),
    glass: new T.MeshStandardMaterial({
      color: '#89b7c4',
      transparent: true,
      opacity: 0.2,
      roughness: 0.18,
      metalness: 0.35,
      depthWrite: false,
    }),
  };
  return {
    geometries,
    materials,
    dispose() {
      Object.values(geometries).forEach((item) => item.dispose());
      Object.values(materials).forEach((item) => item.dispose());
      woodTexture.dispose();
    },
  };
}
export type Assets = ReturnType<typeof createAssets>;
export type MaterialName = keyof Assets['materials'];
export type ShapeName = keyof Assets['geometries'];

/** Static module assembly becomes instanced batches, not one draw per furniture part. */
export class Batch {
  private items = new Map<
    string,
    { shape: ShapeName; material: MaterialName; matrices: T.Matrix4[] }
  >();
  constructor(private assets: Assets) {}
  add(
    shape: ShapeName,
    material: MaterialName,
    size: [number, number, number],
    position: [number, number, number],
    rotation = 0,
  ) {
    const key = `${shape}:${material}`;
    if (!this.items.has(key))
      this.items.set(key, { shape, material, matrices: [] });
    const matrix = new T.Matrix4().compose(
      new T.Vector3(...position),
      new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), rotation),
      new T.Vector3(...size),
    );
    this.items.get(key)!.matrices.push(matrix);
  }
  finish(): T.Group {
    const group = new T.Group();
    for (const entry of this.items.values()) {
      const mesh = new T.InstancedMesh(
        this.assets.geometries[entry.shape],
        this.assets.materials[entry.material],
        entry.matrices.length,
      );
      entry.matrices.forEach((matrix, index) =>
        mesh.setMatrixAt(index, matrix),
      );
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
    return group;
  }
}

export function textSprite(
  text: string,
  color = '#e5d2a7',
  width = 512,
  fontSize = 52,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${fontSize}px sans-serif`;
  ctx.fillText(text, width / 2, 64);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const sprite = new T.Sprite(
    new T.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  );
  sprite.scale.set(3, 0.75, 1);
  return sprite;
}

export function disposeGroup(group: T.Object3D) {
  group.traverse((object) => {
    if (object instanceof T.InstancedMesh) object.dispose();
    if (object instanceof T.Sprite) {
      object.material.map?.dispose();
      object.material.dispose();
    }
  });
}
