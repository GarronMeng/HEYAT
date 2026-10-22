import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const FIGURE_WIDTH = 1.12;
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
export function figureGeometry(role: Role, variant = 0) {
  const parts: T.BufferGeometry[] = [];
  const [uniform, trousers] = outfits[role];
  const coat = role === 'guest' && variant ? '#657f87' : uniform;
  const skin = variant ? '#a97858' : '#d3ac8b';
  const hair = variant ? '#594234' : '#292b30';
  const part = (
    s: number[],
    p: number[],
    color: string,
    joint: number,
    shape: boolean | 'taper' = false,
  ) => {
    const source =
      shape === 'taper'
        ? new T.CylinderGeometry(0.5, 0.38, 1, 8)
        : shape
          ? new T.SphereGeometry(0.5, 8, 6)
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
  // Tailored continuous silhouette instead of ball-shaped torso and joints.
  part([0.35, 0.36, 0.23], [0, 0.77, 0], coat, 1, 'taper');
  part([0.28, 0.15, 0.2], [0, 0.55, 0], trousers, 0, 'taper');
  part([0.09, 0.22, 0.012], [0, 0.82, 0.119], '#f0e7d8', 1);
  if (role !== 'guest')
    part([0.025, 0.16, 0.014], [0, 0.81, 0.132], '#7c5960', 1);
  part([0.055, 0.018, 0.012], [0.09, 0.85, 0.125], '#d3b478', 1);
  part([0.068, 0.12, 0.066], [0, 0.995, 0], '#bf9677', 2, 'taper');
  // About 7.5 heads tall, with a subtle jaw, nose and hair cap.
  part([0.142, 0.165, 0.135], [0, 1.105, 0.005], skin, 2, true);
  part([0.1, 0.075, 0.105], [0, 1.065, 0.012], skin, 2, true);
  part([0.145, 0.065, 0.137], [0, 1.17, -0.009], hair, 2, true);
  part([0.12, 0.1, 0.055], [0, 1.13, -0.052], hair, 2, true);
  part([0.026, 0.035, 0.029], [0, 1.097, 0.073], '#be9577', 2, true);
  // Minimal eyes are shared geometry, not a facial-animation system.
  for (const side of [-1, 1]) {
    part([0.009, 0.008, 0.006], [side * 0.033, 1.122, 0.066], '#3b3430', 2);
    const arm = side < 0 ? 3 : 5,
      leg = side < 0 ? 7 : 9;
    part([0.102, 0.235, 0.112], [side * 0.185, 0.805, 0], coat, arm, 'taper');
    part(
      [0.081, 0.21, 0.09],
      [side * 0.2, 0.604, 0.008],
      coat,
      arm + 1,
      'taper',
    );
    part([0.062, 0.025, 0.075], [side * 0.2, 0.506, 0.008], '#eee3d1', arm + 1);
    part([0.052, 0.067, 0.049], [side * 0.2, 0.47, 0.014], skin, arm + 1, true);
    part(
      [0.125, 0.29, 0.145],
      [side * 0.085, 0.415, 0],
      trousers,
      leg,
      'taper',
    );
    part(
      [0.104, 0.255, 0.115],
      [side * 0.085, 0.18, 0.009],
      trousers,
      leg + 1,
      'taper',
    );
    part(
      [0.108, 0.055, 0.19],
      [side * 0.085, 0.032, 0.043],
      '#222a30',
      leg + 1,
    );
  }
  // Clothing and tools are merged into the same skinned draw, no extra materials.
  if (role === 'reception') {
    for (const side of [-1, 1])
      part([0.052, 0.19, 0.018], [side * 0.075, 0.83, 0.119], '#415b6b', 1);
    if (variant) part([0.11, 0.09, 0.09], [0, 1.13, -0.095], hair, 2, true);
  }
  if (role === 'housekeeping') {
    part([0.27, 0.34, 0.025], [0, 0.66, 0.127], '#e5dfcc', 1);
    part([0.18, 0.08, 0.016], [0, 0.64, 0.147], '#b5c3b2', 1);
    part([0.29, 0.035, 0.24], [0, 0.73, 0], '#e5dfcc', 1);
    part([0.1, 0.09, 0.09], [0, 1.12, -0.1], hair, 2, true);
    // Mop held beside the right hand, its bottom stays near the floor.
    part([0.018, 0.75, 0.018], [0.24, 0.43, 0.13], '#baac88', 0);
    part([0.25, 0.045, 0.11], [0.24, 0.055, 0.13], '#abb9b0', 0);
  }
  if (role === 'porter') {
    part([0.3, 0.17, 0.23], [0, 0.6, 0], coat, 0, 'taper');
    part([0.18, 0.026, 0.17], [0, 1.21, -0.005], coat, 2);
    part([0.15, 0.035, 0.13], [0, 1.19, -0.01], coat, 2);
    for (const side of [-1, 1]) {
      part([0.075, 0.02, 0.12], [side * 0.15, 0.91, 0], '#c5a773', 1);
      for (const y of [0.7, 0.79, 0.87])
        part([0.018, 0.018, 0.014], [side * 0.065, y, 0.121], '#ddc08a', 1);
    }
  }
  if (role === 'guest' || role === 'porter') {
    // A held travel case gives travellers a readable asymmetric silhouette.
    const bag = role === 'porter' ? '#463c35' : variant ? '#9f6447' : '#344957';
    part([0.19, 0.28, 0.15], [0.285, 0.25, 0.035], bag, 6);
    part([0.09, 0.07, 0.025], [0.26, 0.42, 0.035], '#c3a97b', 6);
    part([0.16, 0.018, 0.16], [0.285, 0.13, 0.035], '#252c32', 6);
    if (role === 'guest') {
      part(
        [0.11, 0.13, 0.04],
        [0, 0.91, 0.115],
        variant ? '#d2b183' : '#ede3d2',
        1,
      );
      if (variant) {
        part([0.14, 0.17, 0.065], [0, 1.1, -0.06], hair, 2, true);
        part([0.045, 0.22, 0.025], [-0.07, 0.8, 0.132], '#d2b183', 1);
      }
    }
  }
  const result = mergeGeometries(parts)!;
  parts.forEach((g) => g.dispose());
  result.scale(FIGURE_WIDTH, 1, 1);
  result.computeBoundingSphere();
  return result;
}
export function bindFigure(geometry: T.BufferGeometry, material: T.Material) {
  const mesh = new T.SkinnedMesh(geometry, material);
  const bones = JOINTS.map(() => new T.Bone());
  JOINTS.forEach(([x, y, z, parent], i) => {
    const anchor = parent < 0 ? [0, 0, 0] : JOINTS[Math.max(0, parent)]!;
    bones[i]!.position.set(
      (x - anchor[0]!) * FIGURE_WIDTH,
      y - anchor[1]!,
      z - anchor[2]!,
    );
    if (parent < 0) mesh.add(bones[i]!);
    else bones[parent]!.add(bones[i]!);
  });
  mesh.bind(new T.Skeleton(bones));
  // Animated silhouettes are small; avoid rest-pose sphere clipping raised hands.
  mesh.frustumCulled = false;
  return { mesh, bones };
}
