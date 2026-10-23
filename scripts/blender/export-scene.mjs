/** Offline geometry bridge only: canvases are stubbed because textures are authored in Blender. */
import { writeFileSync } from 'node:fs';
import * as T from 'three';
import { createAssets } from '../../src/render/assets.ts';
import { createHotel } from '../../src/render/hotel.ts';
import { initialHotel } from '../../src/core/model.ts';
const context = new Proxy(
  {},
  {
    get: (_target, name) => {
      if (name === 'createImageData')
        return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
      if (name === 'measureText') return () => ({ width: 40 });
      if (name === 'createRadialGradient') return () => ({ addColorStop() {} });
      return () => {};
    },
  },
);
globalThis.document = {
  createElement: () => ({ width: 256, height: 256, getContext: () => context }),
};
const assets = createAssets();
const state = initialHotel();
state.rooms[1].status = 'AVAILABLE';
state.levels.room = 1;
const hotel = createHotel(assets, state);
hotel.group.updateMatrixWorld(true);
const names = new Map(
  Object.entries(assets.materials).map(([name, m]) => [m, name]),
);
const geometries = {},
  objects = [];
hotel.group.traverse((o) => {
  if (!o.isMesh || !o.visible || o.material.visible === false) return;
  const material = names.get(o.material);
  // Text and transparent overlays are reproduced separately, never baked as opaque planes.
  if (!material || ['halo', 'contact', 'glass'].includes(material)) return;
  const g = o.geometry,
    id = g.uuid;
  geometries[id] ??= {
    positions: Array.from(g.attributes.position.array),
    uv: g.attributes.uv ? Array.from(g.attributes.uv.array) : [],
    indices: g.index ? Array.from(g.index.array) : null,
  };
  const emit = (matrix) =>
    objects.push({ geometry: id, material, matrix: matrix.toArray() });
  if (o.isInstancedMesh) {
    for (let i = 0; i < o.count; i++) {
      const m = new T.Matrix4();
      o.getMatrixAt(i, m);
      emit(o.matrixWorld.clone().multiply(m));
    }
  } else emit(o.matrixWorld);
});
const materials = Object.fromEntries(
  Object.entries(assets.materials).map(([name, m]) => [
    name,
    {
      color: m.color.toArray(),
      roughness: m.roughness ?? 0.7,
      metalness: m.metalness ?? 0,
      emissive: m.emissive?.toArray(),
      emissiveIntensity: m.emissiveIntensity ?? 0,
    },
  ]),
);
writeFileSync(
  process.env.BLENDER_SCENE_JSON ?? '/tmp/heyat-scene.json',
  JSON.stringify({ geometries, objects, materials }),
);
console.log(
  `Exported ${objects.length} component instances, ${Object.keys(geometries).length} shared geometries`,
);
