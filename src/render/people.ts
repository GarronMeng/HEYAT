import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { HotelState } from '../core/model';
import { roomPosition } from './hotel';
import type { Assets } from './assets';

type Role = 'reception' | 'porter' | 'housekeeping' | 'guest';
const ROLES: Role[] = ['reception', 'porter', 'housekeeping', 'guest'];
const PALETTE: Record<
  Role,
  { jacket: string; trouser: string; trim: string; hair: string }
> = {
  reception: {
    jacket: '#22394a',
    trouser: '#202735',
    trim: '#c7a36c',
    hair: '#302522',
  },
  porter: {
    jacket: '#7b3640',
    trouser: '#283342',
    trim: '#d4b37b',
    hair: '#352925',
  },
  housekeeping: {
    jacket: '#d0bca6',
    trouser: '#344b52',
    trim: '#648079',
    hair: '#312a28',
  },
  guest: {
    jacket: '#5c7e83',
    trouser: '#404654',
    trim: '#e1cdb0',
    hair: '#4b3227',
  },
};

/** Merge colored primitives once per role: a guest is only three near-field meshes. */
export function createFigureGeometry(
  assets: Pick<Assets, 'geometries'>,
  role: Role,
  leg = false,
): T.BufferGeometry {
  const shapes: T.BufferGeometry[] = [];
  const colors = PALETTE[role];
  const part = (
    shape: keyof Assets['geometries'],
    dimensions: [number, number, number],
    at: [number, number, number],
    color: string,
  ) => {
    const source = assets.geometries[shape];
    // Three.js primitive geometries do not all use the same index layout.
    // BufferGeometryUtils.mergeGeometries requires every input to have the
    // same index mode and attribute schema. Normalize before merging.
    const geometry = source.index ? source.toNonIndexed() : source.clone();
    for (const attribute of Object.keys(geometry.attributes)) {
      if (!['position', 'normal', 'uv'].includes(attribute)) {
        geometry.deleteAttribute(attribute);
      }
    }
    geometry.scale(...dimensions);
    geometry.translate(...at);
    const rgb = new T.Color(color);
    const count = geometry.getAttribute('position').count;
    const buffer = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      buffer[i * 3] = rgb.r;
      buffer[i * 3 + 1] = rgb.g;
      buffer[i * 3 + 2] = rgb.b;
    }
    geometry.setAttribute('color', new T.BufferAttribute(buffer, 3));
    shapes.push(geometry);
  };
  if (leg) {
    // Hip joint is local origin. The entire leg pivots during walking.
    part('soft', [0.105, 0.33, 0.13], [0, -0.16, 0], colors.trouser);
    part('soft', [0.15, 0.1, 0.23], [0, -0.35, 0.035], '#22262d');
  } else {
    // Normal proportions, no oversized chibi head or stick-shaped torso.
    part('soft', [0.37, 0.43, 0.22], [0, 0.67, 0], colors.jacket);
    part('soft', [0.34, 0.14, 0.22], [0, 0.47, 0], colors.trouser);
    part('soft', [0.2, 0.24, 0.13], [0, 0.75, 0.125], colors.trim);
    part('sphere', [0.15, 0.19, 0.145], [0, 1.05, 0], '#c69b7b');
    part('sphere', [0.155, 0.095, 0.15], [0, 1.185, -0.015], colors.hair);
    part('cylinder', [0.032, 0.32, 0.038], [-0.235, 0.66, 0], colors.jacket);
    part('cylinder', [0.032, 0.32, 0.038], [0.235, 0.66, 0], colors.jacket);
    part('sphere', [0.052, 0.061, 0.05], [-0.235, 0.48, 0], '#c69b7b');
    part('sphere', [0.052, 0.061, 0.05], [0.235, 0.48, 0], '#c69b7b');
    // Distinctive roles remain recognizable even in a miniature 3/4 view.
    if (role === 'reception') {
      part('soft', [0.08, 0.045, 0.012], [0.11, 0.77, 0.12], '#e5c88f');
    }
    if (role === 'porter') {
      part('soft', [0.27, 0.055, 0.26], [0, 1.25, 0], '#7b3640');
      part('soft', [0.17, 0.09, 0.2], [0, 1.215, 0], '#273b4d');
    }
    if (role === 'housekeeping') {
      part('soft', [0.265, 0.28, 0.025], [0, 0.64, 0.15], '#dcd4c5');
    }
    if (role === 'guest') {
      part('soft', [0.055, 0.095, 0.045], [0.13, 0.76, 0.155], '#d4b077');
    }
  }
  const merged = mergeGeometries(shapes, false);
  shapes.forEach((shape) => shape.dispose());
  if (!merged)
    throw new Error(`无法合并人物几何体：${role} ${leg ? 'legs' : 'body'}`);
  return merged;
}

function createDistantSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#28394d';
  ctx.fillRect(19, 46, 26, 48);
  ctx.fillRect(20, 92, 9, 30);
  ctx.fillRect(35, 92, 9, 30);
  ctx.fillRect(12, 50, 7, 41);
  ctx.fillRect(45, 50, 7, 41);
  ctx.fillStyle = '#cfaa87';
  ctx.beginPath();
  ctx.ellipse(32, 30, 12, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#332b2b';
  ctx.fillRect(20, 16, 24, 8);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return {
    texture,
    material: new T.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  };
}

export function createPeople(assets: Assets) {
  const group = new T.Group();
  const geometry = new Map<Role, T.BufferGeometry>();
  const legs = new Map<Role, T.BufferGeometry>();
  for (const role of ROLES) {
    geometry.set(role, createFigureGeometry(assets, role));
    legs.set(role, createFigureGeometry(assets, role, true));
  }
  const skin = new T.MeshLambertMaterial({ vertexColors: true });
  const sprite = createDistantSprite();
  const actors = Array.from({ length: 26 }, (_, index) => {
    const role: Role =
      index === 2
        ? 'porter'
        : index === 3
          ? 'housekeeping'
          : index < 6
            ? 'reception'
            : 'guest';
    const lod = new T.LOD();
    const near = new T.Group();
    const torso = new T.Mesh(geometry.get(role)!, skin);
    near.add(torso);
    const left = new T.Mesh(legs.get(role)!, skin);
    const right = new T.Mesh(legs.get(role)!, skin);
    left.position.set(-0.095, 0.45, 0);
    right.position.set(0.095, 0.45, 0);
    near.add(left, right);
    lod.addLevel(near, 0);
    // One proxy mesh and one sprite for medium and far distances.
    const distant = new T.Mesh(
      assets.geometries.soft,
      assets.materials[role === 'guest' ? 'navy' : 'black'],
    );
    distant.scale.set(0.28, 0.86, 0.2);
    distant.position.y = 0.52;
    lod.addLevel(distant, 27);
    const far = new T.Sprite(sprite.material);
    far.scale.set(0.45, 1.02, 1);
    far.position.y = 0.55;
    lod.addLevel(far, 38);
    lod.scale.setScalar(0.84);
    group.add(lod);
    return { lod, left, right, torso };
  });
  const place = (
    actorIndex: number,
    position: T.Vector3,
    moving: boolean,
    time: number,
    limit: number,
    rotation = 0,
  ) => {
    const actor = actors[actorIndex];
    if (!actor || actorIndex >= limit) return;
    actor.lod.visible = true;
    actor.lod.position.copy(position);
    actor.lod.rotation.y = rotation;
    const stride = moving ? Math.sin(time * 5 + actorIndex * 0.7) * 0.45 : 0;
    actor.left.rotation.x = stride;
    actor.right.rotation.x = -stride;
    actor.torso.rotation.z = moving
      ? Math.sin(time * 5 + actorIndex) * 0.015
      : 0;
  };
  return {
    group,
    dispose() {
      geometry.forEach((item) => item.dispose());
      legs.forEach((item) => item.dispose());
      skin.dispose();
      sprite.texture.dispose();
      sprite.material.dispose();
    },
    update(state: HotelState, time: number, limit: number) {
      actors.forEach((actor) => {
        actor.lod.visible = false;
        actor.lod.levels[1]!.distance = limit <= 10 ? 15 : 27;
        actor.lod.levels[2]!.distance = limit <= 10 ? 23 : 38;
      });
      const pose = (
        index: number,
        position: T.Vector3,
        moving: boolean,
        rotation = 0,
      ) => place(index, position, moving, time, limit, rotation);
      pose(0, new T.Vector3(-0.8, 0.25, -1.05), false);
      pose(1, new T.Vector3(0.7, 0.25, -1.05), false);
      pose(
        2,
        new T.Vector3(4.6, 0.25, 1 + Math.sin(time * 0.25) * 0.6),
        true,
        Math.PI / 2,
      );
      pose(
        3,
        new T.Vector3(-4.7, 0.25, 1.9 + Math.sin(time * 0.22) * 0.4),
        true,
      );
      pose(4, new T.Vector3(2.9, 0.25, -0.4), false);
      pose(5, new T.Vector3(-2, 0.25, 1.8), false);
      const queueLimit = Math.min(8, Math.max(1, limit - 8));
      state.queue
        .slice(0, queueLimit)
        .forEach((guest, index) =>
          pose(
            6 + index,
            new T.Vector3(
              1.8 + index * 0.34,
              0.25,
              1.1 + (index % 2) * 0.4 + Math.sin(time + guest.id) * 0.025,
            ),
            false,
            -0.9,
          ),
        );
      let index = 6 + queueLimit;
      for (const room of state.rooms) {
        if (!['OCCUPIED', 'RESERVED', 'CLEANING'].includes(room.status))
          continue;
        const p = roomPosition(room.floor, room.slot);
        p.y += 0.04;
        p.x += 0.83;
        p.z =
          room.status === 'RESERVED'
            ? 1.4 - Math.min(1, (state.time - room.changedAt) / 2) * 0.7
            : 0.65;
        pose(
          index++,
          p,
          room.status !== 'OCCUPIED',
          Math.sin(time * 0.3) * 0.2,
        );
      }
    },
  };
}
