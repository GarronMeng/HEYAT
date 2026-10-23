import { Batch, type MaterialName } from './assets';

export function interiorBuilder(batch: Batch) {
  const box = (
    m: MaterialName,
    s: [number, number, number],
    p: [number, number, number],
    r = 0,
  ) => batch.add('box', m, s, p, r);
  const soft = (
    m: MaterialName,
    s: [number, number, number],
    p: [number, number, number],
    r = 0,
  ) => batch.add('soft', m, s, p, r);
  const cylinder = (
    m: MaterialName,
    s: [number, number, number],
    p: [number, number, number],
  ) => batch.add('cylinder', m, s, p);
  const plant = (x: number, y: number, z: number, scale = 1) => {
    cylinder(
      'marble',
      [0.32 * scale, 0.38 * scale, 0.32 * scale],
      [x, y + 0.19 * scale, z],
    );
    cylinder(
      'brass',
      [0.34 * scale, 0.025 * scale, 0.34 * scale],
      [x, y + 0.37 * scale, z],
    );
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4,
        h = (0.52 + (i % 3) * 0.13) * scale;
      cylinder(
        'wood',
        [0.012 * scale, h, 0.012 * scale],
        [
          x + Math.sin(a) * 0.055 * scale,
          y + 0.37 * scale + h / 2,
          z + Math.cos(a) * 0.055 * scale,
        ],
      );
      batch.add(
        'sphere',
        i % 2 ? 'foliage' : 'green',
        [0.22 * scale, 0.42 * scale, 0.075 * scale],
        [
          x + Math.sin(a) * 0.15 * scale,
          y + 0.5 * scale + h * 0.55,
          z + Math.cos(a) * 0.15 * scale,
        ],
        a,
        0.35,
      );
    }
  };
  const halo = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    tilt = 0,
  ) => batch.add('plane', 'halo', [w, h, 1], [x, y, z], 0, tilt);
  return { box, soft, cylinder, plant, halo };
}
export function buildRoom(
  batch: Batch,
  x: number,
  y: number,
  bedLevel: number,
  luxury: number,
) {
  const { box, soft, cylinder, plant, halo } = interiorBuilder(batch);
  const shadow = (dx: number, z: number, w: number, d: number) =>
    batch.add(
      'plane',
      'contact',
      [w, d, 1],
      [x + dx, y + 0.048, z],
      0,
      -Math.PI / 2,
    );
  shadow(-0.13, -0.48, 1.95, 2.6);
  shadow(0.8, 0.8, 0.95, 1.25);
  // Shared Blender-baked floor irradiance/AO; overlay sits above the wood slab top (+0.033).
  batch.add(
    'plane',
    'floorLight',
    [2.59, 3.88, 1],
    [x, y + 0.037, 0],
    0,
    -Math.PI / 2,
  );
  box('wood', [2.55, 0.12, 0.09], [x, y + 0.1, -1.78]);
  box('wood', [2.55, 1.57, 0.075], [x, y + 0.93, -1.79]);
  for (const dx of [-1.05, -0.53, 0, 0.53, 1.05])
    box('brass', [0.012, 1.52, 0.025], [x + dx, y + 0.94, -1.735]);
  soft('cream', [1.79, 0.91, 0.12], [x - 0.12, y + 0.8, -1.58]);
  for (const dx of [-0.66, -0.12, 0.42])
    soft('sand', [0.49, 0.84, 0.055], [x + dx, y + 0.81, -1.49]);
  box('goldLight', [1.8, 0.018, 0.025], [x - 0.12, y + 1.29, -1.49]);
  halo(x - 0.1, y + 1.39, -1.695, 2.15, 0.9);
  // Low, upholstered divan with a separate mattress, duvet, fold and cushions.
  soft('wood', [1.56, 0.23, 1.99], [x - 0.13, y + 0.24, -0.48]);
  soft('sand', [1.53, 0.26, 1.94], [x - 0.13, y + 0.38, -0.48]);
  soft('white', [1.48, 0.23, 1.88], [x - 0.13, y + 0.56, -0.47]);
  soft('white', [1.5, 0.065, 1.22], [x - 0.13, y + 0.7, -0.17]);
  soft('cream', [1.5, 0.085, 0.18], [x - 0.13, y + 0.72, -0.72]);
  soft(
    bedLevel ? 'teal' : 'rug',
    [1.51, 0.04, 0.43],
    [x - 0.13, y + 0.745, 0.18],
  );
  for (const dx of [-0.49, 0.22]) {
    soft('white', [0.6, 0.16, 0.39], [x + dx, y + 0.77, -1.07], dx * 0.08);
    soft('teal', [0.27, 0.18, 0.18], [x + dx, y + 0.83, -0.82]);
  }
  batch.add(
    'plane',
    'rug',
    [2.12, 2.75, 1],
    [x - 0.1, y + 0.041, 0.12],
    0,
    -Math.PI / 2,
  );
  // Floor plane is drawn below the rug; bed hides central atlas shadow.
  for (const dx of [-1.11, 0.95]) {
    soft('wood', [0.37, 0.39, 0.48], [x + dx, y + 0.26, -1.13]);
    box('marble', [0.4, 0.04, 0.51], [x + dx, y + 0.48, -1.13]);
    cylinder('brass', [0.03, 0.29, 0.03], [x + dx, y + 0.65, -1.13]);
    cylinder('cream', [0.24, 0.2, 0.24], [x + dx, y + 0.87, -1.13]);
    cylinder('goldLight', [0.18, 0.025, 0.18], [x + dx, y + 0.76, -1.13]);
    halo(x + dx, y + 0.91, -1.7, 0.67, 1.2);
    box('brass', [0.026, 0.2, 0.025], [x + dx, y + 1.18, -1.62]);
    batch.add(
      'sphere',
      'goldLight',
      [0.07, 0.07, 0.07],
      [x + dx, y + 1.08, -1.59],
    );
  }
  // A cutaway glazed boundary with pleated fabric, slender mullions and a pelmet.
  box('glass', [0.02, 1.62, 2.86], [x + 1.29, y + 1.07, -0.1]);
  for (const z of [-1.52, 1.35]) {
    box('brass', [0.035, 1.71, 0.035], [x + 1.28, y + 1.04, z]);
    batch.add(
      'curtain',
      'curtain',
      [0.44, 1.65, 1],
      [x + 1.25, y + 1.06, z + (z < 0 ? 0.15 : -0.15)],
      Math.PI / 2,
    );
  }
  box('wood', [0.16, 0.12, 3.08], [x + 1.22, y + 1.94, -0.08]);
  box('goldLight', [0.025, 0.025, 2.76], [x + 1.13, y + 1.85, -0.08]);
  // Partial coffer leaves the top/front open for the gameplay camera.
  box('wall', [2.61, 0.13, 0.32], [x, y + 1.97, -1.72]);
  box('goldLight', [2.4, 0.025, 0.03], [x, y + 1.86, -1.56]);
  box('wall', [0.17, 0.13, 3.6], [x - 1.22, y + 1.97, -0.05]);
  // Writing nook, normal proportions, four slender legs and a small reading chair.
  box('wood', [0.67, 0.055, 0.9], [x + 0.81, y + 0.87, 0.78]);
  for (const dx of [0.53, 1.07])
    for (const z of [0.44, 1.12])
      box('brass', [0.025, 0.82, 0.025], [x + dx, y + 0.45, z]);
  soft('teal', [0.38, 0.13, 0.41], [x + 0.35, y + 0.49, 0.94]);
  soft('teal', [0.08, 0.44, 0.42], [x + 0.17, y + 0.71, 0.94]);
  for (const dx of [0.22, 0.49])
    for (const z of [0.79, 1.1])
      box('wood', [0.025, 0.4, 0.025], [x + dx, y + 0.23, z]);
  box('cream', [0.24, 0.02, 0.18], [x + 0.83, y + 0.92, 0.7], 0.15);
  cylinder('white', [0.06, 0.09, 0.06], [x + 0.81, y + 0.96, 1.03]);
  // TV sits off the bed axis so it doesn't obstruct the room interior.
  box('wood', [0.54, 0.38, 0.26], [x - 0.94, y + 0.25, 1.54]);
  box('black', [0.6, 0.37, 0.035], [x - 0.94, y + 0.67, 1.57]);
  box('brass', [0.027, 0.24, 0.035], [x - 0.94, y + 0.47, 1.55]);
  soft('rug', [1.17, 0.18, 0.36], [x - 0.17, y + 0.35, 0.99]);
  for (const dx of [-0.62, 0.28])
    box('brass', [0.025, 0.26, 0.025], [x + dx, y + 0.17, 1.0]);
  box('brass', [0.53, 0.48, 0.035], [x + 0.84, y + 1.45, -1.73]);
  batch.add('plane', 'art', [0.48, 0.42, 1], [x + 0.84, y + 1.45, -1.705]);
  plant(x + 1.05, y + 0.04, 1.57, 0.64);
  if (luxury) {
    soft('cream', [0.55, 0.35, 0.59], [x - 0.72, y + 0.24, 0.77]);
    cylinder('brass', [0.36, 0.035, 0.36], [x - 0.79, y + 0.52, 1.18]);
    plant(x + 0.83, y + 0.92, 0.45, 0.27);
  }
}
export function buildLobby(batch: Batch) {
  const { box, soft, cylinder, plant, halo } = interiorBuilder(batch);
  for (const [x, z, w, d] of [
    [-0.15, -0.52, 3.9, 1.25],
    [-3.8, -0.2, 2.65, 1.25],
    [-3.8, 0.97, 1.3, 1.3],
  ])
    batch.add(
      'plane',
      'contact',
      [w!, d!, 1],
      [x!, 0.246, z!],
      0,
      -Math.PI / 2,
    );
  box('marble', [11.2, 0.22, 4.6], [0, 0.12, 0.07]);
  for (let x = -5.5; x < 5.6; x += 0.92)
    box('brass', [0.008, 0.004, 4.55], [x, 0.235, 0.07]);
  for (const z of [-1.4, -0.35, 0.7, 1.75])
    box('brass', [11.15, 0.004, 0.008], [0, 0.235, z]);
  box('wall', [11.2, 2.15, 0.13], [0, 1.31, -1.94]);
  box('marble', [3.8, 2.02, 0.055], [-0.15, 1.29, -1.84]);
  for (let x = -5.4; x < 5.5; x += 0.145)
    if (Math.abs(x) > 2.05) box('wood', [0.065, 2.1, 0.085], [x, 1.3, -1.82]);
  // Reception: rounded stone counter, dark recess, gold reveal and warm base strip.
  soft('marble', [3.4, 0.87, 0.77], [-0.15, 0.68, -0.52]);
  box('black', [3.14, 0.07, 0.025], [-0.15, 0.91, -0.119]);
  box('brass', [3.11, 0.012, 0.03], [-0.15, 0.87, -0.104]);
  box('goldLight', [3.1, 0.03, 0.03], [-0.15, 0.285, -0.1]);
  soft('marble', [3.55, 0.09, 0.87], [-0.15, 1.14, -0.52]);
  halo(-0.15, 0.248, -0.17, 4.1, 1.7, -Math.PI / 2);
  for (const x of [-1.15, 0.87]) {
    box('black', [0.3, 0.22, 0.035], [x, 1.35, -0.64]);
    box('brass', [0.03, 0.15, 0.03], [x, 1.21, -0.64]);
  }
  cylinder('brass', [0.17, 0.35, 0.17], [-0.2, 1.36, -0.7]);
  for (let i = 0; i < 5; i++)
    batch.add(
      'sphere',
      'cream',
      [0.17, 0.15, 0.16],
      [
        -0.2 + Math.sin(i * 2) * 0.1,
        1.57 + (i % 2) * 0.08,
        -0.7 + Math.cos(i * 2) * 0.08,
      ],
    );
  // Lounge grouping with cushions, piping, a rug and a brass/stone coffee table.
  batch.add(
    'plane',
    'rug',
    [3.15, 2.4, 1],
    [-3.8, 0.242, 0.38],
    0,
    -Math.PI / 2,
  );
  soft('teal', [2.22, 0.36, 0.74], [-3.79, 0.56, -0.21]);
  soft('teal', [2.25, 0.59, 0.2], [-3.79, 0.85, -0.5]);
  for (const x of [-4.78, -2.8])
    soft('teal', [0.22, 0.47, 0.77], [x, 0.77, -0.16]);
  for (const x of [-4.48, -3.79, -3.1])
    soft('teal', [0.65, 0.16, 0.59], [x, 0.78, -0.11]);
  for (const x of [-4.35, -3.2])
    soft('cream', [0.34, 0.35, 0.13], [x, 1.02, -0.33], 0.12);
  soft('sand', [0.66, 0.32, 0.73], [-2.55, 0.5, 1.12], -0.28);
  soft('sand', [0.66, 0.5, 0.15], [-2.48, 0.73, 1.46], -0.28);
  cylinder('brass', [0.8, 0.065, 0.8], [-3.82, 0.62, 0.97]);
  cylinder('marble', [0.75, 0.03, 0.75], [-3.82, 0.67, 0.97]);
  cylinder('black', [0.11, 0.35, 0.11], [-3.82, 0.4, 0.97]);
  cylinder('brass', [0.14, 0.18, 0.14], [-3.8, 0.78, 0.98]);
  for (const dx of [-0.12, 0, 0.12])
    batch.add('sphere', 'cream', [0.15, 0.1, 0.13], [-3.8 + dx, 0.91, 0.98]);
  // Elevator portal and floor directory.
  box('brass', [1.18, 1.95, 0.09], [3.78, 1.24, -1.8]);
  box('black', [1.03, 1.8, 0.04], [3.78, 1.23, -1.73]);
  box('brass', [0.013, 1.72, 0.02], [3.78, 1.23, -1.69]);
  box('goldLight', [0.35, 0.05, 0.03], [3.78, 2.08, -1.67]);
  // A suspended ring chandelier and repeated tiny pendants, no point lights.
  batch.add(
    'ring',
    'brass',
    [1.55, 1.55, 1.55],
    [-0.1, 2.15, 0.07],
    0,
    Math.PI / 2,
  );
  batch.add(
    'ring',
    'goldLight',
    [1.42, 1.42, 1.42],
    [-0.1, 2.115, 0.07],
    0,
    Math.PI / 2,
  );
  for (const x of [-4, 0, 4]) {
    cylinder('brass', [0.012, 0.31, 0.012], [x, 2.15, -0.4]);
    batch.add('sphere', 'goldLight', [0.12, 0.19, 0.12], [x, 1.91, -0.4]);
    halo(x, 1.9, -1.71, 1.7, 2.3);
  }
  box('wall', [11.4, 0.12, 0.4], [0, 2.4, -1.68]);
  box('goldLight', [10.9, 0.025, 0.035], [0, 2.32, -1.45]);
  // Entrance canopy, glass side panel, threshold steps and original luggage cart.
  box('dark', [3.35, 0.12, 2.1], [-3.9, 2.37, 2.43]);
  box('dark', [3.4, 0.032, 2.16], [-3.9, 2.44, 2.43]);
  box('brass', [3.4, 0.025, 0.03], [-3.9, 2.445, 3.49]);
  box('goldLight', [2.95, 0.018, 0.035], [-3.9, 2.295, 3.43]);
  for (const x of [-5.36, -2.44]) {
    box('brass', [0.055, 2.12, 0.055], [x, 1.24, 3.32]);
    box('black', [0.14, 0.18, 0.14], [x, 0.27, 3.32]);
  }
  box('glass', [0.025, 1.97, 1.7], [-5.35, 1.3, 2.33]);
  for (let i = 0; i < 3; i++)
    box(
      'stone',
      [3.1, 0.08 * (i + 1), 0.34],
      [-3.9, 0.04 * (i + 1), 3.94 - i * 0.28],
    );
  soft('black', [0.75, 0.11, 0.52], [-1.98, 0.36, 1.42]);
  for (const x of [-2.29, -1.67])
    for (const z of [1.22, 1.63])
      batch.add('sphere', 'black', [0.1, 0.1, 0.1], [x, 0.3, z]);
  for (const x of [-2.29, -1.67])
    cylinder('brass', [0.035, 0.91, 0.035], [x, 0.86, 1.42]);
  batch.add('arch', 'brass', [0.62, 0.62, 0.62], [-1.98, 1.32, 1.42]);
  soft('navy', [0.26, 0.43, 0.25], [-2.13, 0.63, 1.42]);
  soft('rug', [0.26, 0.34, 0.29], [-1.82, 0.58, 1.42]);
  for (const x of [-2.13, -1.82])
    box('brass', [0.14, 0.04, 0.025], [x, 0.89, 1.42]);
  for (const x of [-5, 4.85]) plant(x, 0.24, -1.18, 1.2);
  for (const x of [5.2, -5.4]) plant(x, 0.03, 2.05, 0.8);
}
