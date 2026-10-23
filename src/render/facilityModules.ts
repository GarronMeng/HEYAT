import * as T from 'three';
import type { HotelState } from '../core/model';
import { FACILITY_LABELS } from '../core/guestTypes';
import { Batch, textSprite } from './assets';
import { interiorBuilder } from './interiors';
/** Small annexes reuse the hotel batch. No runtime lights, imported models or room displacement. */
export function buildFacilityModules(
  batch: Batch,
  state: HotelState,
  roofY: number,
) {
  const { box, soft, cylinder } = interiorBuilder(batch),
    labels = new T.Group();
  const tag = (
    id: 'breakfast' | 'gym' | 'lounge' | 'rooftop',
    x: number,
    y: number,
    z: number,
  ) => {
    const label = textSprite(
      `${FACILITY_LABELS[id]} · ${state.levels[id]}`,
      '#efdeb5',
      256,
      36,
    );
    label.scale.set(1.8, 0.4, 1);
    label.material.depthTest = false;
    label.renderOrder = 3;
    label.position.set(x, y, z);
    labels.add(label);
  };
  const pod = (x: number) => {
    box('stone', [1.5, 0.15, 2.8], [x, 0.18, -0.45]);
    box('wood', [1.45, 1.5, 0.06], [x, 1.02, -1.82]);
    for (const z of [-1.8, 0.9]) box('brass', [1.5, 0.06, 0.06], [x, 1.8, z]);
    for (const dx of [-0.72, 0.72])
      box('brass', [0.06, 0.06, 2.8], [x + dx, 1.8, -0.45]);
    for (const z of [-1.8, 0.9])
      box('brass', [0.04, 1.55, 0.04], [x + Math.sign(x) * 0.71, 1.02, z]);
    box('glass', [0.025, 1.4, 2.65], [x + Math.sign(x) * 0.72, 1.01, -0.45]);
    box('goldLight', [1.3, 0.025, 0.025], [x, 1.7, -1.7]);
  };
  const breakfast = Math.min(3, state.levels.breakfast ?? 0);
  if (breakfast) {
    box('stone', [3.6, 0.12, 1.35], [1, 0.12, 3.45]);
    box('wood', [3.2, 0.65, 0.55], [1, 0.5, 3.02]);
    box('marble', [3.3, 0.075, 0.62], [1, 0.86, 3.02]);
    box('black', [0.24, 0.34, 0.25], [-0.15, 1.06, 3.02]);
    box('brass', [0.18, 0.035, 0.27], [-0.15, 0.94, 3.02]);
    for (let i = 0; i < breakfast + 1; i++) {
      cylinder('white', [0.24, 0.025, 0.24], [0.45 + i * 0.42, 0.92, 3.05]);
      box('sand', [0.13, 0.07, 0.12], [0.45 + i * 0.42, 0.97, 3.05]);
    }
    for (let i = 0; i < breakfast; i++) {
      cylinder('brass', [0.055, 0.5, 0.055], [0.1 + i * 0.9, 0.48, 3.9]);
      cylinder('teal', [0.36, 0.1, 0.36], [0.1 + i * 0.9, 0.76, 3.9]);
    }
    tag('breakfast', 1, 1.35, 3.04);
  }
  const gym = Math.min(3, state.levels.gym ?? 0);
  if (gym) {
    pod(-6.55);
    box('nightGlass', [1.05, 0.7, 0.025], [-6.55, 1.15, -1.77]);
    for (let i = 0; i < gym; i++) {
      const z = -1.25 + i * 0.85;
      box('black', [0.68, 0.08, 0.62], [-6.55, 0.35, z]);
      box('slate', [0.5, 0.015, 0.55], [-6.55, 0.4, z]);
      for (const dx of [-0.29, 0.29])
        box('brass', [0.025, 0.65, 0.025], [-6.55 + dx, 0.71, z - 0.18]);
      box('black', [0.5, 0.15, 0.06], [-6.55, 1.05, z - 0.18]);
    }
    tag('gym', -6.55, 2.05, -0.35);
  }
  const lounge = Math.min(3, state.levels.lounge ?? 0);
  if (lounge) {
    pod(6.55);
    for (let i = 0; i < lounge; i++) {
      const z = -1.25 + i * 0.85;
      soft('teal', [0.85, 0.4, 0.65], [6.65, 0.53, z]);
      soft('teal', [0.16, 0.65, 0.7], [7.0, 0.66, z]);
      soft('cream', [0.62, 0.055, 0.54], [6.57, 0.76, z]);
    }
    cylinder('brass', [0.055, 0.45, 0.055], [6.05, 0.49, -0.4]);
    cylinder('wood', [0.45, 0.065, 0.45], [6.05, 0.75, -0.4]);
    cylinder('brass', [0.025, 0.95, 0.025], [7.02, 0.75, 0.68]);
    batch.add('sphere', 'goldLight', [0.17, 0.2, 0.17], [7.02, 1.3, 0.68]);
    tag('lounge', 6.55, 2.05, -0.35);
  }
  const bar = Math.min(3, state.levels.rooftop ?? 0);
  if (bar) {
    box('wood', [10.8, 0.14, 1.55], [0, roofY + 0.05, -2.6]);
    for (const x of [-5.1, 5.1])
      box('dark', [0.07, roofY, 0.07], [x, roofY / 2, -3.25]);
    box('wood', [3.8, 0.6, 0.6], [0, roofY + 0.46, -2.95]);
    box('marble', [3.9, 0.08, 0.65], [0, roofY + 0.8, -2.95]);
    for (let i = 0; i < 3 + bar; i++)
      box(
        i % 2 ? 'green' : 'teal',
        [0.085, 0.24, 0.085],
        [-1.2 + i * 0.4, roofY + 0.96, -3.0],
      );
    for (const x of [-2.2, 2.2])
      for (const z of [-3.25, -1.95])
        box('brass', [0.04, 1.55, 0.04], [x, roofY + 0.9, z]);
    box('dark', [4.5, 0.07, 1.5], [0, roofY + 1.7, -2.6]);
    box('goldLight', [4.2, 0.025, 0.025], [0, roofY + 1.62, -1.94]);
    for (let i = 0; i < bar; i++) {
      const x = -4.6 + i * 0.8;
      cylinder('brass', [0.045, 0.6, 0.045], [x, roofY + 0.42, -2.55]);
      cylinder('cream', [0.36, 0.07, 0.36], [x, roofY + 0.75, -2.55]);
    }
    tag('rooftop', -3.7, roofY + 1.2, -2.15);
  }
  return labels;
}
