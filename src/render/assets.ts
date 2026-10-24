import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createSurfaces } from './surfaces';
import type { Quality } from './perf';

export function createAssets() {
  const surfaces = createSurfaces();
  const curtain = new T.PlaneGeometry(1, 1, 24, 1);
  const vertices = curtain.getAttribute('position');
  for (let i = 0; i < vertices.count; i++)
    vertices.setZ(i, Math.cos(vertices.getX(i) * Math.PI * 24) * 0.028);
  curtain.computeVertexNormals();
  const plane = new T.PlaneGeometry(1, 1);
  plane.setAttribute('uv1', plane.getAttribute('uv').clone());
  const geometries = {
    box: new T.BoxGeometry(1, 1, 1),
    soft: new RoundedBoxGeometry(1, 1, 1, 2, 0.06),
    cylinder: new T.CylinderGeometry(0.5, 0.5, 1, 16),
    sphere: new T.SphereGeometry(0.5, 12, 8),
    plane,
    curtain,
    ring: new T.TorusGeometry(0.5, 0.025, 5, 32),
    arch: new T.TorusGeometry(0.5, 0.025, 5, 24, Math.PI),
  };
  const material = (color: string, roughness = 0.75, metalness = 0) =>
    new T.MeshStandardMaterial({ color, roughness, metalness });
  const textile = (color: string) =>
    new T.MeshStandardMaterial({
      color,
      map: surfaces.fabric.map,
      normalMap: surfaces.fabric.normal,
      roughnessMap: surfaces.fabric.roughness,
      normalScale: new T.Vector2(0.3, 0.3),
      roughness: 0.96,
    });
  const stone = (color: string, roughness = 0.4) =>
    new T.MeshStandardMaterial({
      color,
      map: surfaces.marble.map,
      normalMap: surfaces.marble.normal,
      roughnessMap: surfaces.marble.roughness,
      normalScale: new T.Vector2(0.12, 0.12),
      roughness: Math.min(1, roughness * 2.5),
    });
  const materials = {
    wall: material('#b6a895'),
    stone: stone('#727b7d', 0.5),
    dark: material('#172635', 0.62),
    wood: new T.MeshStandardMaterial({
      map: surfaces.oak.map,
      normalMap: surfaces.oak.normal,
      roughnessMap: surfaces.oak.roughness,
      normalScale: new T.Vector2(0.35, 0.35),
      roughness: 0.86,
    }),
    brass: material('#c0a06a', 0.34, 0.8),
    white: textile('#fff7e9'),
    sand: textile('#cab497'),
    teal: textile('#53857e'),
    slate: textile('#566575'),
    green: material('#294932'),
    foliage: material('#48693d'),
    black: material('#101a22', 0.4),
    cream: textile('#e1ceb3'),
    skin: material('#ca9d79'),
    navy: material('#29445e'),
    marble: stone('#f3e5d0', 0.28),
    rug: textile('#7b6450'),
    curtain: textile('#dbc7a3'),
    glass: new T.MeshStandardMaterial({
      color: '#9dbbc2',
      transparent: true,
      opacity: 0.12,
      roughness: 0.12,
      metalness: 0.15,
      depthWrite: false,
      side: T.DoubleSide,
    }),
    nightGlass: material('#182e3e', 0.23, 0.48),
    goldLight: new T.MeshStandardMaterial({
      color: '#ffe0a1',
      emissive: '#ffbc61',
      emissiveIntensity: 2.5,
      roughness: 0.35,
    }),
    floorLight: new T.MeshStandardMaterial({
      color: '#cfb98f',
      map: surfaces.oak.map,
      normalMap: surfaces.oak.normal,
      roughnessMap: surfaces.oak.roughness,
      normalScale: new T.Vector2(0.15, 0.15),
      lightMap: surfaces.floorLight,
      lightMapIntensity: 0.65,
      aoMap: surfaces.floorAO,
      aoMapIntensity: 0.6,
      roughness: 0.9,
    }),
    art: new T.MeshBasicMaterial({ map: surfaces.art }),
    halo: new T.MeshBasicMaterial({
      map: surfaces.glow,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      opacity: 0.65,
      side: T.DoubleSide,
    }),
    contact: new T.MeshBasicMaterial({
      map: surfaces.contact,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      opacity: 0.8,
    }),
    occupied: new T.MeshBasicMaterial({ color: '#f0b95f' }),
    available: new T.MeshBasicMaterial({ color: '#68b89d' }),
    dirty: new T.MeshBasicMaterial({ color: '#d98972' }),
    cleaning: new T.MeshBasicMaterial({ color: '#82c7df' }),
    window: new T.MeshBasicMaterial({ color: '#284254' }),
    nightWindow: new T.MeshBasicMaterial({ color: '#8e794d' }),
    locked: material('#23333f'),
  };
  materials.curtain.side = T.DoubleSide;
  // Shader complexity is part of the quality budget, not just DPR and actor count.
  // All variants share the same textures: no duplicate GPU texture uploads.
  const medium = new Map<T.Material, T.Material>();
  const low = new Map<T.Material, T.Material>();
  const originals = new Map<T.Material, T.Material>();
  for (const source of Object.values(materials)) {
    if (!(source instanceof T.MeshStandardMaterial)) continue;
    const simpler = source.clone();
    simpler.normalMap = null;
    // AO/light maps are precomputed and inexpensive to retain at this tier.
    simpler.envMapIntensity = 0;
    medium.set(source, simpler);
    originals.set(simpler, source);
    const cheapest = new T.MeshLambertMaterial({
      color: source.color.clone(),
      map: source.map,
      lightMap: source.lightMap,
      lightMapIntensity: source.lightMapIntensity,
      aoMap: source.aoMap,
      aoMapIntensity: source.aoMapIntensity,
      emissive: source.emissive.clone(),
      emissiveIntensity: source.emissiveIntensity,
      opacity: source.opacity,
      transparent: source.transparent,
      side: source.side,
      depthWrite: source.depthWrite,
    });
    low.set(source, cheapest);
    originals.set(cheapest, source);
  }
  const original = (material: T.Material) =>
    originals.get(material) ?? material;
  const variant = (material: T.Material, quality: Quality): T.Material => {
    const source = original(material);
    return quality === 'low'
      ? (low.get(source) ?? source)
      : quality === 'medium'
        ? (medium.get(source) ?? source)
        : source;
  };
  return {
    geometries,
    materials,
    textureCount: surfaces.textures.length,
    bakeStatus: surfaces.bakeStatus,
    textureBytesEstimate: surfaces.textures.reduce((sum, t) => {
      const image = t.image as { width: number; height: number };
      return sum + (image.width * image.height * 4 * 4) / 3;
    }, 0),
    /** Switch shared materials without rebuilding geometry, affecting all instances. */
    applyQuality(root: T.Object3D, quality: Quality) {
      root.traverse((object) => {
        if (!(object instanceof T.Mesh)) return;
        const material = object.material;
        const source = (m: T.Material) => original(m);
        const primary = Array.isArray(material)
          ? source(material[0]!)
          : source(material);
        object.material = Array.isArray(material)
          ? material.map((m) => variant(m, quality))
          : variant(material, quality);
        // Translucent overlays can dominate fill rate on mobile. Preserve
        // layout and room picking while disabling only decorative layers.
        if (primary === materials.halo || primary === materials.contact)
          object.visible = quality !== 'low';
        else if (primary === materials.glass)
          object.visible = quality !== 'low';
      });
    },
    dispose() {
      for (const material of medium.values()) material.dispose();
      for (const material of low.values()) material.dispose();
      Object.values(geometries).forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
      surfaces.dispose();
    },
  };
}
export type Assets = ReturnType<typeof createAssets>;
export type MaterialName = keyof Assets['materials'];
export type ShapeName = keyof Assets['geometries'];

/** Per-shape/material instancing: repeated furniture parts do not add individual draws. */
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
    tilt = 0,
  ) {
    const key = `${shape}:${material}`;
    if (!this.items.has(key))
      this.items.set(key, { shape, material, matrices: [] });
    const matrix = new T.Matrix4().compose(
      new T.Vector3(...position),
      new T.Quaternion().setFromEuler(new T.Euler(tilt, rotation, 0)),
      new T.Vector3(...size),
    );
    this.items.get(key)!.matrices.push(matrix);
  }
  finish() {
    const group = new T.Group();
    for (const item of this.items.values()) {
      const mesh = new T.InstancedMesh(
        this.assets.geometries[item.shape],
        this.assets.materials[item.material],
        item.matrices.length,
      );
      item.matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
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
/** Architectural wordmark: a fixed surface, never a camera-facing billboard. */
export function hotelWordmark(color = '#ffe0a5') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '500 84px Georgia, serif';
  const title = 'HEYAT',
    gap = 9;
  const width =
    [...title].reduce((sum, c) => sum + ctx.measureText(c).width, 0) + gap * 4;
  let x = (512 - width) / 2;
  for (const c of title) {
    ctx.fillText(c, x, 48);
    x += ctx.measureText(c).width + gap;
  }
  ctx.font = '500 17px sans-serif';
  const subtitle = 'HOTEL',
    spacing = 10;
  const subWidth =
    [...subtitle].reduce((sum, c) => sum + ctx.measureText(c).width, 0) +
    spacing * 4;
  x = (512 - subWidth) / 2;
  for (const c of subtitle) {
    ctx.fillText(c, x, 106);
    x += ctx.measureText(c).width + spacing;
  }
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  const material = new T.MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const mesh = new T.Mesh(new T.PlaneGeometry(1, 1), material);
  mesh.userData.ownedWordmark = true;
  return mesh;
}
export function disposeGroup(group: T.Object3D) {
  group.traverse((object) => {
    if (object instanceof T.InstancedMesh) object.dispose();
    if (object instanceof T.Mesh && object.userData.ownedWordmark) {
      object.geometry.dispose();
      const material = object.material as T.MeshBasicMaterial;
      material.map?.dispose();
      material.dispose();
    }
    if (object instanceof T.Sprite) {
      object.material.map?.dispose();
      object.material.dispose();
    }
  });
}
