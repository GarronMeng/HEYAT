import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export type Role = 'reception' | 'porter' | 'housekeeping' | 'guest';
export const JOINTS = [
  [0, 0, 0, -1],
  [0, 0.65, 0, 0],
  [0, 1.02, 0, 1],
  [-0.19, 0.89, 0, 1],
  [-0.2, 0.69, 0, 3],
  [0.19, 0.89, 0, 1],
  [0.2, 0.69, 0, 5],
  [-0.085, 0.55, 0, 0],
  [-0.085, 0.3, 0, 7],
  [0.085, 0.55, 0, 0],
  [0.085, 0.3, 0, 9],
] as const;
const outfits: Record<Role, [string, string]> = {
  reception: ['#283e50', '#24313e'],
  porter: ['#763c46', '#253645'],
  housekeeping: ['#90ada5', '#304a50'],
  guest: ['#d2bfa0', '#506677'],
};
/** One reusable vertex-colour mesh per uniform; rigid weights on a shared 11-joint rig. */
export function figureGeometry(role: Role) {
  const parts: T.BufferGeometry[] = [];
  const [coat, trousers] = outfits[role];
  const part = (
    s: number[],
    p: number[],
    color: string,
    joint: number,
    round = false,
  ) => {
    const source = round
      ? new T.SphereGeometry(0.5, 10, 8)
      : new T.BoxGeometry(1, 1, 1);
    const g = source.toNonIndexed();
    source.dispose();
    g.scale(s[0]!, s[1]!, s[2]!);
    g.translate(p[0]!, p[1]!, p[2]!);
    const n = g.getAttribute('position').count,
      rgb = new T.Color(color);
    const colors = new Float32Array(n * 3),
      indices = new Uint16Array(n * 4),
      weights = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      colors.set([rgb.r, rgb.g, rgb.b], i * 3);
      indices[i * 4] = joint;
      weights[i * 4] = 1;
    }
    g.setAttribute('color', new T.BufferAttribute(colors, 3));
    g.setAttribute('skinIndex', new T.BufferAttribute(indices, 4));
    g.setAttribute('skinWeight', new T.BufferAttribute(weights, 4));
    parts.push(g);
  };
  part([0.32, 0.34, 0.2], [0, 0.76, 0], coat, 1, true);
  part([0.28, 0.15, 0.18], [0, 0.55, 0], trousers, 0, true);
  part([0.105, 0.22, 0.015], [0, 0.8, 0.103], '#f3e6d1', 1);
  part(
    [0.035, 0.16, 0.022],
    [0, 0.79, 0.117],
    role === 'guest' ? '#927455' : '#c5a56c',
    1,
  );
  part([0.07, 0.027, 0.02], [0.09, 0.84, 0.1], '#dbbe82', 1);
  part([0.075, 0.11, 0.075], [0, 0.99, 0], '#bc9071', 2, true);
  part([0.155, 0.19, 0.145], [0, 1.105, 0], '#cda383', 2, true);
  part([0.158, 0.09, 0.15], [0, 1.174, -0.012], '#3a302e', 2, true);
  part([0.11, 0.105, 0.065], [0, 1.14, -0.05], '#3a302e', 2, true);
  part([0.033, 0.045, 0.034], [0, 1.09, 0.07], '#c39a7b', 2, true);
  for (const side of [-1, 1]) {
    const arm = side < 0 ? 3 : 5,
      leg = side < 0 ? 7 : 9;
    part([0.095, 0.23, 0.11], [side * 0.19, 0.79, 0], coat, arm, true);
    part([0.075, 0.19, 0.09], [side * 0.2, 0.605, 0.01], coat, arm + 1, true);
    part(
      [0.065, 0.075, 0.06],
      [side * 0.2, 0.49, 0.02],
      '#cda383',
      arm + 1,
      true,
    );
    part([0.11, 0.29, 0.13], [side * 0.085, 0.415, 0], trousers, leg, true);
    part([0.09, 0.26, 0.1], [side * 0.085, 0.19, 0], trousers, leg + 1, true);
    part(
      [0.115, 0.07, 0.2],
      [side * 0.085, 0.045, 0.045],
      '#222b32',
      leg + 1,
      true,
    );
  }
  if (role === 'housekeeping')
    part([0.25, 0.25, 0.025], [0, 0.66, 0.106], '#e1dacb', 1);
  if (role === 'porter') part([0.21, 0.035, 0.21], [0, 1.215, 0], coat, 2);
  const result = mergeGeometries(parts)!;
  parts.forEach((g) => g.dispose());
  result.computeBoundingSphere();
  return result;
}
export function bindFigure(geometry: T.BufferGeometry, material: T.Material) {
  const mesh = new T.SkinnedMesh(geometry, material);
  const bones = JOINTS.map(() => new T.Bone());
  JOINTS.forEach(([x, y, z, parent], i) => {
    const anchor = parent < 0 ? [0, 0, 0] : JOINTS[Math.max(0, parent)]!;
    bones[i]!.position.set(x - anchor[0]!, y - anchor[1]!, z - anchor[2]!);
    if (parent < 0) mesh.add(bones[i]!);
    else bones[parent]!.add(bones[i]!);
  });
  mesh.bind(new T.Skeleton(bones));
  // Animated silhouettes are small; avoid rest-pose sphere clipping raised hands.
  mesh.frustumCulled = false;
  return { mesh, bones };
}
