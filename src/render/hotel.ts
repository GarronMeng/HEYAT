import * as T from 'three';
import { floorCount, type HotelState } from '../core/model';
import { Batch, textSprite, type Assets, type MaterialName } from './assets';

export const roomPosition = (floor: number, slot: number) =>
  new T.Vector3(-4.05 + slot * 2.7, 2.6 + (floor - 1) * 2.25, 0.3);

export function createHotel(assets: Assets, state: HotelState) {
  const batch = new Batch(assets),
    group = new T.Group();
  const box = (
    mat: MaterialName,
    size: [number, number, number],
    pos: [number, number, number],
  ) => batch.add('box', mat, size, pos);
  const soft = (
    mat: MaterialName,
    size: [number, number, number],
    pos: [number, number, number],
  ) => batch.add('soft', mat, size, pos);
  const plant = (x: number, y: number, z: number, scale = 1) => {
    batch.add(
      'cylinder',
      'sand',
      [0.36 * scale, 0.4 * scale, 0.36 * scale],
      [x, y + 0.2 * scale, z],
    );
    for (let i = 0; i < 5; i++) {
      const a = i * 1.256;
      batch.add(
        'sphere',
        i % 2 ? 'green' : 'foliage',
        [0.3 * scale, 0.7 * scale, 0.17 * scale],
        [
          x + Math.sin(a) * 0.17 * scale,
          y + 0.65 * scale,
          z + Math.cos(a) * 0.17 * scale,
        ],
        a,
      );
    }
  };
  // Stone forecourt, illuminated plinth, pavement joints and original street furniture.
  soft('dark', [13.3, 0.5, 6.6], [0, -0.4, 0]);
  box('brass', [12.8, 0.045, 6.3], [0, -0.14, 0]);
  box('stone', [15, 0.13, 8], [0, -0.08, 0.2]);
  for (let i = 0; i < 16; i++)
    box('dark', [0.025, 0.01, 8], [-7.3 + i * 0.95, 0, 0.2]);
  for (let i = 0; i < 8; i++) box('dark', [15, 0.01, 0.025], [0, 0, -3.5 + i]);
  box('sand', [11.4, 0.22, 4.4], [0, 0.12, 0]);
  for (const x of [-6, 6]) {
    box('dark', [0.16, 1.1, 0.16], [x, 0.55, 2.5]);
    box('goldLight', [0.22, 0.1, 0.22], [x, 1.06, 2.5]);
    plant(x, 0, -1.7, 1.1);
  }
  // Cutaway lobby: paneled reception wall, stone desk, lounge and pendant lights.
  box('wall', [11.1, 2.2, 0.12], [0, 1.3, -1.95]);
  for (let x = -5.2; x < 5.4; x += 0.3)
    box('wood', [0.055, 2.1, 0.07], [x, 1.3, -1.86]);
  box('dark', [3.5, 1.1, 0.04], [0, 1.4, -1.78]);
  const sign = textSprite('H E Y A T  H O T E L');
  sign.position.set(0, 1.6, -1.68);
  sign.scale.set(3, 0.75, 1);
  group.add(sign);
  soft('wood', [3.3, 0.87, 0.65], [-0.2, 0.65, -0.55]);
  box('white', [3.45, 0.1, 0.78], [-0.2, 1.12, -0.55]);
  for (const x of [-1.2, 0.9]) {
    box('black', [0.3, 0.28, 0.06], [x, 1.28, -0.7]);
    box('brass', [0.035, 0.2, 0.035], [x, 1.16, -0.72]);
  }
  soft('teal', [1.7, 0.38, 0.64], [-3.9, 0.51, 0.4]);
  soft('teal', [1.7, 0.5, 0.2], [-3.9, 0.8, 0.14]);
  for (const x of [-4.65, -3.15])
    soft('teal', [0.18, 0.5, 0.65], [x, 0.73, 0.42]);
  batch.add('cylinder', 'brass', [0.8, 0.08, 0.8], [-3.7, 0.54, 1.35]);
  batch.add('cylinder', 'black', [0.08, 0.4, 0.08], [-3.7, 0.3, 1.35]);
  soft('sand', [0.7, 0.5, 0.7], [-2.5, 0.55, 1.55]);
  plant(-5, 0.25, -1.2, 1.1);
  plant(4.9, 0.25, -1.2, 1.1);
  // Elevator / stair core, postal luggage rack, an entrance canopy and glass side wing.
  box('dark', [1.15, 1.9, 0.13], [3.8, 1.25, -1.8]);
  box('brass', [0.025, 1.8, 0.03], [3.8, 1.25, -1.7]);
  box('goldLight', [0.4, 0.06, 0.03], [3.8, 2.05, -1.7]);
  for (let i = 0; i < 4; i++)
    box('wood', [1.1, 0.12, 0.22], [5.05, 0.3 + i * 0.14, 0.4 - i * 0.2]);
  box('glass', [0.08, 2.05, 3.6], [-5.52, 1.3, 0]);
  box('brass', [11.6, 0.12, 0.42], [0, 2.4, 2.04]);
  for (const x of [-4, 0, 4]) {
    box('brass', [0.025, 0.55, 0.025], [x, 2, -0.35]);
    batch.add('sphere', 'goldLight', [0.35, 0.25, 0.35], [x, 1.7, -0.35]);
  }
  if (state.levels.autodesk) {
    soft('brass', [0.45, 1.1, 0.4], [2, 0.8, 0.15]);
    box('black', [0.35, 0.35, 0.04], [2, 1.35, 0.38]);
    box('available', [0.22, 0.04, 0.05], [2, 1.25, 0.41]);
  }
  const proxies: T.Mesh[] = [],
    lights = new Map<number, T.Mesh>(),
    curtains = new Map<number, T.Mesh>();
  const proxyMaterial = new T.MeshBasicMaterial({ visible: false });
  const floors = floorCount(state);
  for (let floor = 1; floor <= floors; floor++) {
    const y = 2.6 + (floor - 1) * 2.25;
    box('dark', [11.6, 0.2, 4.4], [0, y - 0.12, 0]);
    box('brass', [11.55, 0.045, 0.055], [0, y - 0.03, 2.21]);
    for (const room of state.rooms.filter((r) => r.floor === floor)) {
      const p = roomPosition(room.floor, room.slot),
        x = p.x,
        active = room.status !== 'LOCKED';
      const furnished = active || (floor === 1 && room.slot === 1);
      box(active ? 'wall' : 'locked', [2.66, 1.95, 0.1], [x, y + 0.98, -1.91]);
      box(active ? 'sand' : 'stone', [2.6, 0.045, 3.9], [x, y + 0.015, 0]);
      box('wall', [0.09, 0.85, 3.9], [x - 1.34, y + 0.425, 0]);
      box('wood', [0.065, 1.95, 0.065], [x + 1.3, y + 0.98, 1.95]);
      box('wood', [2.6, 0.055, 0.08], [x, y + 1.99, 1.95]);
      box('goldLight', [1.8, 0.035, 0.03], [x, y + 1.86, -1.84]);
      if (furnished) {
        const linen = active ? 'white' : 'slate';
        soft('wood', [1.52, 0.27, 1.95], [x - 0.1, y + 0.23, -0.14]);
        soft(linen, [1.48, 0.28, 1.86], [x - 0.1, y + 0.49, -0.14]);
        box('wood', [1.75, 1, 0.13], [x - 0.1, y + 0.57, -1.22]);
        soft(
          active ? 'cream' : 'stone',
          [1.64, 0.65, 0.08],
          [x - 0.1, y + 0.72, -1.12],
        );
        soft(linen, [0.59, 0.16, 0.36], [x - 0.46, y + 0.68, -0.7]);
        soft(linen, [0.59, 0.16, 0.36], [x + 0.23, y + 0.68, -0.7]);
        box(
          (state.levels.bed ?? 0) > 0 ? 'teal' : 'sand',
          [1.49, 0.035, 0.52],
          [x - 0.1, y + 0.65, 0.45],
        );
        for (const side of [-1, 1]) {
          box('wood', [0.32, 0.46, 0.48], [x + side * 0.99, y + 0.28, -0.72]);
          batch.add(
            'cylinder',
            'brass',
            [0.04, 0.23, 0.04],
            [x + side * 0.99, y + 0.65, -0.72],
          );
          batch.add(
            'cylinder',
            'goldLight',
            [0.22, 0.17, 0.22],
            [x + side * 0.99, y + 0.8, -0.72],
          );
        }
        box('wood', [1.1, 0.08, 0.33], [x + 0.56, y + 0.8, 1.55]);
        soft('teal', [0.4, 0.4, 0.4], [x + 0.7, y + 0.3, 1]);
        box('black', [0.7, 0.42, 0.045], [x + 0.2, y + 1.15, 1.74]);
        box('brass', [0.57, 0.45, 0.03], [x + 0.6, y + 1.35, -1.83]);
        box('teal', [0.48, 0.37, 0.035], [x + 0.6, y + 1.35, -1.8]);
        if ((state.levels.luxury ?? 0) > 0) {
          batch.add(
            'cylinder',
            'brass',
            [0.5, 0.07, 0.5],
            [x - 0.86, y + 0.48, 1.28],
          );
          soft('sand', [0.55, 0.42, 0.55], [x - 0.85, y + 0.3, 0.7]);
          plant(x + 0.93, y + 0.25, 1.5, 0.5);
        }
      } else {
        box('wood', [1.2, 0.12, 0.7], [x, y + 0.1, 0]);
        box('sand', [0.6, 0.5, 0.55], [x - 0.2, y + 0.4, 0]);
        box('stone', [0.55, 0.4, 0.55], [x + 0.3, y + 0.35, 0.2]);
      }
      const lamp = new T.Mesh(
        assets.geometries.box,
        assets.materials.available,
      );
      lamp.scale.set(0.7, 0.045, 0.05);
      lamp.position.set(x, y + 0.03, 2.17);
      group.add(lamp);
      lights.set(room.id, lamp);
      const curtain = new T.Mesh(
        assets.geometries.plane,
        assets.materials.glass,
      );
      curtain.scale.set(2.5, 1.9, 1);
      curtain.position.set(x, y + 1, 1.99);
      group.add(curtain);
      curtains.set(room.id, curtain);
      const number = textSprite(
        String(room.id),
        active ? '#e8d7b8' : '#78909d',
        128,
        45,
      );
      number.position.set(x, y - 0.18, 2.25);
      number.scale.set(0.6, 0.6, 1);
      group.add(number);
      const proxy = new T.Mesh(assets.geometries.box, proxyMaterial);
      proxy.scale.set(2.6, 1.95, 3.9);
      proxy.position.set(x, y + 1, 0);
      proxy.userData.roomId = room.id;
      group.add(proxy);
      proxies.push(proxy);
    }
    box('wall', [0.1, 0.85, 4], [-5.48, y + 0.425, 0]);
    box('wall', [0.1, 0.85, 4], [5.48, y + 0.425, 0]);
  }
  const roofY = 2.6 + floors * 2.25 - 0.23;
  box('dark', [11.8, 0.19, 0.7], [0, roofY, -1.75]);
  box('brass', [11.85, 0.045, 0.74], [0, roofY + 0.11, -1.75]);
  for (const x of [-4.5, 4.5]) plant(x, roofY + 0.2, -1.75, 0.7);
  box('dark', [2.2, 0.35, 1.1], [2.8, roofY + 0.3, -1.8]);
  const roofSign = textSprite('HEYAT', '#e5c183');
  roofSign.scale.set(2.8, 0.7, 1);
  roofSign.position.set(-2.5, roofY + 0.7, -1.65);
  group.add(roofSign);
  group.add(batch.finish());
  return {
    group,
    proxies,
    proxyMaterial,
    update(next: HotelState) {
      for (const room of next.rooms) {
        const lamp = lights.get(room.id),
          curtain = curtains.get(room.id);
        if (!lamp || !curtain) continue;
        lamp.material =
          assets.materials[
            room.status === 'AVAILABLE'
              ? 'available'
              : room.status === 'OCCUPIED' || room.status === 'RESERVED'
                ? 'occupied'
                : room.status === 'DIRTY'
                  ? 'dirty'
                  : room.status === 'CLEANING'
                    ? 'cleaning'
                    : 'locked'
          ];
        curtain.visible = room.status === 'LOCKED';
      }
    },
  };
}
