import * as T from 'three';
import type { HotelState } from '../core/model';
import { roomPosition } from './hotel';
import type { Assets } from './assets';

export function createPeople(assets: Assets) {
  const group = new T.Group();
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#243f55';
  ctx.fillRect(19, 42, 26, 45);
  ctx.fillRect(21, 84, 8, 40);
  ctx.fillRect(35, 84, 8, 40);
  ctx.fillRect(10, 46, 8, 40);
  ctx.fillRect(46, 46, 8, 40);
  ctx.fillStyle = '#cba17d';
  ctx.beginPath();
  ctx.ellipse(32, 26, 11, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  const spriteTexture = new T.CanvasTexture(canvas);
  spriteTexture.colorSpace = T.SRGBColorSpace;
  const spriteMaterial = new T.SpriteMaterial({
    map: spriteTexture,
    transparent: true,
    depthWrite: false,
  });
  const actors = Array.from({ length: 26 }, (_, index) => {
    const lod = new T.LOD(),
      body = new T.Group();
    const mesh = (
      shape: keyof Assets['geometries'],
      mat: keyof Assets['materials'],
      scale: [number, number, number],
      position: [number, number, number],
    ) => {
      const object = new T.Mesh(
        assets.geometries[shape],
        assets.materials[mat],
      );
      object.scale.set(...scale);
      object.position.set(...position);
      body.add(object);
      return object;
    };
    mesh('sphere', 'skin', [0.16, 0.21, 0.17], [0, 0.74, 0]);
    mesh(
      'soft',
      index < 6 ? 'black' : index % 3 ? 'navy' : 'cream',
      [0.24, 0.3, 0.15],
      [0, 0.5, 0],
    );
    const left = mesh(
      'cylinder',
      'black',
      [0.065, 0.31, 0.07],
      [-0.06, 0.22, 0],
    );
    const right = mesh(
      'cylinder',
      'black',
      [0.065, 0.31, 0.07],
      [0.06, 0.22, 0],
    );
    mesh('cylinder', 'skin', [0.055, 0.29, 0.055], [-0.15, 0.49, 0]);
    mesh('cylinder', 'skin', [0.055, 0.29, 0.055], [0.15, 0.49, 0]);
    if (index >= 6) mesh('soft', 'wood', [0.14, 0.24, 0.1], [0.21, 0.24, 0]);
    lod.addLevel(body, 0);
    const distant = new T.Mesh(
      assets.geometries.soft,
      assets.materials[index < 6 ? 'black' : 'navy'],
    );
    distant.scale.set(0.2, 0.7, 0.12);
    distant.position.y = 0.4;
    lod.addLevel(distant, 27);
    const far = new T.Sprite(spriteMaterial);
    far.scale.set(0.4, 0.85, 1);
    far.position.y = 0.42;
    lod.addLevel(far, 38);
    lod.scale.setScalar(0.86);
    group.add(lod);
    return { lod, left, right };
  });
  return {
    group,
    dispose() {
      spriteTexture.dispose();
      spriteMaterial.dispose();
    },
    update(state: HotelState, time: number, limit: number) {
      actors.forEach((actor) => (actor.lod.visible = false));
      actors.forEach((actor) => {
        actor.lod.levels[1]!.distance = limit <= 10 ? 15 : 27;
        actor.lod.levels[2]!.distance = limit <= 10 ? 23 : 38;
      });
      const pose = (
        index: number,
        position: T.Vector3,
        moving: boolean,
        rotation = 0,
      ) => {
        const actor = actors[index];
        if (!actor || index >= limit) return;
        actor.lod.visible = true;
        actor.lod.position.copy(position);
        actor.lod.rotation.y = rotation;
        actor.left.rotation.x = moving ? Math.sin(time * 7 + index) * 0.4 : 0;
        actor.right.rotation.x = -actor.left.rotation.x;
      };
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
        if (
          room.status === 'OCCUPIED' ||
          room.status === 'RESERVED' ||
          room.status === 'CLEANING'
        ) {
          const p = roomPosition(room.floor, room.slot);
          p.y += 0.04;
          p.x += 0.83;
          p.z = 0.65;
          if (room.status === 'RESERVED')
            p.z = 1.4 - Math.min(1, (state.time - room.changedAt) / 2) * 0.7;
          pose(
            index++,
            p,
            room.status !== 'OCCUPIED',
            Math.sin(time * 0.3) * 0.2,
          );
        }
      }
    },
  };
}
