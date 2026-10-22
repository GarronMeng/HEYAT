import * as T from 'three';
import { floorCount, type HotelState } from '../core/model';
import { Batch, textSprite, type Assets } from './assets';
import { buildLobby, buildRoom, interiorBuilder } from './interiors';

export const roomPosition = (floor: number, slot: number) =>
  new T.Vector3(-4.05 + slot * 2.7, 2.6 + (floor - 1) * 2.25, 0.3);
export function createHotel(assets: Assets, state: HotelState) {
  const batch = new Batch(assets),
    group = new T.Group();
  const { box, soft, plant, cylinder } = interiorBuilder(batch);
  soft('dark', [13.3, 0.5, 6.6], [0, -0.4, 0]);
  box('brass', [12.8, 0.045, 6.3], [0, -0.14, 0]);
  box('stone', [15, 0.13, 8], [0, -0.08, 0.2]);
  for (let i = 0; i < 16; i++)
    box('dark', [0.018, 0.006, 8], [-7.3 + i * 0.95, 0, 0.2]);
  for (let i = 0; i < 8; i++) box('dark', [15, 0.006, 0.018], [0, 0, -3.5 + i]);
  buildLobby(batch);
  // Frame the entrance with shared street fixtures; keep the middle foreground open.
  for (const x of [-6.3, 6.3]) {
    soft('dark', [1.05, 0.3, 1.5], [x, 0.12, 1.9]);
    plant(x, 0.28, 1.9, 0.85);
    cylinder('black', [0.065, 1.3, 0.065], [x, 0.65, 3.2]);
    cylinder('brass', [0.2, 0.05, 0.2], [x, 1.33, 3.2]);
    batch.add('sphere', 'goldLight', [0.15, 0.23, 0.15], [x, 1.45, 3.2]);
  }

  const sign = textSprite('H E Y A T', '#ffe3ad');
  sign.position.set(-0.15, 1.86, -1.73);
  sign.scale.set(2.1, 0.52, 1);
  group.add(sign);
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
    box('brass', [11.6, 0.035, 0.065], [0, y - 0.035, 2.22]);
    box('goldLight', [11.1, 0.018, 0.025], [0, y - 0.17, 2.17]);
    for (const room of state.rooms.filter((r) => r.floor === floor)) {
      const x = roomPosition(floor, room.slot).x,
        active = room.status !== 'LOCKED';
      const furnished = active || (floor === 1 && room.slot === 1);
      box(
        furnished ? 'wall' : 'locked',
        [2.66, 1.98, 0.13],
        [x, y + 0.99, -1.91],
      );
      box('wood', [2.62, 0.04, 3.9], [x, y + 0.013, 0]);
      // Cutaway stone plinths and small front edges suggest walls without hiding the beds.
      box('marble', [0.085, 0.55, 3.85], [x - 1.34, y + 0.275, 0]);
      box('wood', [0.09, 1.96, 0.11], [x - 1.32, y + 0.98, -1.8]);
      if (!furnished) {
        box('dark', [0.075, 1.98, 0.075], [x + 1.3, y + 0.99, 1.97]);
        box('dark', [2.64, 0.1, 0.12], [x, y + 1.99, 1.97]);
      }
      if (furnished)
        buildRoom(batch, x, y, state.levels.bed ?? 0, state.levels.luxury ?? 0);
      else {
        box('nightGlass', [2.53, 1.83, 0.04], [x, y + 0.98, 1.95]);
        for (const dx of [-0.83, 0, 0.83])
          box('brass', [0.022, 1.83, 0.035], [x + dx, y + 0.98, 1.99]);
      }
      const lamp = new T.Mesh(
        assets.geometries.box,
        assets.materials.available,
      );
      lamp.scale.set(0.27, 0.035, 0.04);
      lamp.position.set(x + 0.65, y - 0.035, 2.27);
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
        active ? '#edd9af' : '#7d919d',
        256,
        64,
      );
      number.position.set(x, y - 0.14, 2.4);
      number.scale.set(0.52, 0.26, 1);
      number.material.depthTest = false;
      group.add(number);
      const proxy = new T.Mesh(assets.geometries.box, proxyMaterial);
      proxy.scale.set(2.6, 1.95, 3.9);
      proxy.position.set(x, y + 1, 0);
      proxy.userData.roomId = room.id;
      group.add(proxy);
      proxies.push(proxy);
    }
    box('dark', [0.11, 0.59, 4], [-5.48, y + 0.3, 0]);
    box('dark', [0.11, 0.59, 4], [5.48, y + 0.3, 0]);
  }
  const roofY = 2.6 + floors * 2.25 - 0.23;
  box('dark', [11.8, 0.22, 0.75], [0, roofY, -1.7]);
  box('dark', [11.85, 0.035, 0.8], [0, roofY + 0.13, -1.7]);
  box('brass', [11.85, 0.02, 0.025], [0, roofY + 0.15, -1.29]);
  box('goldLight', [11.25, 0.035, 0.025], [0, roofY - 0.12, -1.29]);
  for (const x of [-4.7, -3.4, 2.9, 4.3]) {
    box('dark', [1.06, 0.28, 0.6], [x, roofY + 0.25, -1.7]);
    plant(x, roofY + 0.38, -1.7, 0.6);
  }
  for (let x = -5.6; x < 5.7; x += 0.8)
    box('brass', [0.018, 0.42, 0.018], [x, roofY + 0.44, -2.02]);
  box('brass', [11.3, 0.025, 0.025], [0, roofY + 0.66, -2.02]);
  box('dark', [3.1, 0.63, 0.1], [-0.5, roofY + 0.46, -1.58]);
  const roofSign = textSprite('HEYAT HOTEL', '#ffdda1');
  roofSign.scale.set(2.9, 0.73, 1);
  roofSign.position.set(-0.5, roofY + 0.48, -1.48);
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
