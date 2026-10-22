import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const FIGURE_WIDTH = 0.82;
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
    shape: boolean | 'taper' = false,
  ) => {
    const source =
      shape === 'taper'
        ? new T.CylinderGeometry(0.5, 0.38, 1, 10)
        : shape
          ? new T.SphereGeometry(0.5, 12, 8)
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
  part([0.32, 0.36, 0.19], [0, 0.77, 0], coat, 1, 'taper');
  part([0.25, 0.13, 0.17], [0, 0.55, 0], trousers, 0, 'taper');
  part([0.09, 0.22, 0.012], [0, 0.82, 0.098], '#f0e7d8', 1);
  if (role !== 'guest')
    part([0.025, 0.16, 0.014], [0, 0.81, 0.108], '#7c5960', 1);
  part([0.055, 0.018, 0.012], [0.09, 0.85, 0.105], '#d3b478', 1);
  part([0.068, 0.12, 0.066], [0, 0.995, 0], '#bf9677', 2, 'taper');
  // About 7.5 heads tall, with a subtle jaw, nose and hair cap.
  part([0.142, 0.165, 0.135], [0, 1.105, 0.005], '#cda383', 2, true);
  part([0.1, 0.075, 0.105], [0, 1.065, 0.012], '#cda383', 2, true);
  part([0.145, 0.065, 0.137], [0, 1.17, -0.009], '#342d2a', 2, true);
  part([0.12, 0.1, 0.055], [0, 1.13, -0.052], '#342d2a', 2, true);
  part([0.026, 0.035, 0.029], [0, 1.097, 0.073], '#be9577', 2, true);
  // Minimal eyes are shared geometry, not a facial-animation system.
  for (const side of [-1, 1]) {
    part([0.009, 0.008, 0.006], [side * 0.033, 1.122, 0.066], '#3b3430', 2);
    const arm = side < 0 ? 3 : 5,
      leg = side < 0 ? 7 : 9;
    part([0.079, 0.235, 0.092], [side * 0.185, 0.805, 0], coat, arm, 'taper');
    part(
      [0.065, 0.21, 0.076],
      [side * 0.2, 0.604, 0.008],
      coat,
      arm + 1,
      'taper',
    );
    part([0.062, 0.025, 0.075], [side * 0.2, 0.506, 0.008], '#eee3d1', arm + 1);
    part(
      [0.052, 0.067, 0.049],
      [side * 0.2, 0.47, 0.014],
      '#cda383',
      arm + 1,
      true,
    );
    part(
      [0.108, 0.29, 0.125],
      [side * 0.085, 0.415, 0],
      trousers,
      leg,
      'taper',
    );
    part(
      [0.09, 0.255, 0.103],
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
  if (role === 'housekeeping')
    part([0.21, 0.27, 0.014], [0, 0.69, 0.105], '#e0d7c5', 1);
  if (role === 'porter') {
    part([0.18, 0.026, 0.17], [0, 1.21, -0.005], coat, 2);
    part([0.15, 0.035, 0.13], [0, 1.19, -0.01], coat, 2);
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
