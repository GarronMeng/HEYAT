import * as T from 'three';

/** Small deterministic PBR surfaces: no downloads, photographs or runtime CDN. */
export function createSurfaces() {
  const textures: T.Texture[] = [];
  const texture = (canvas: HTMLCanvasElement, color = false) => {
    const map = new T.CanvasTexture(canvas);
    if (color) map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = 4;
    textures.push(map);
    return map;
  };
  const canvas = (size = 256) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    return c;
  };
  const noise = (x: number, y: number) => {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const surface = (kind: 'oak' | 'marble' | 'fabric') => {
    const c = canvas(),
      ctx = c.getContext('2d')!;
    const pixels = ctx.createImageData(256, 256);
    const normals = new Uint8Array(256 * 256 * 4);
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const i = (y * 256 + x) * 4;
        const n = noise(x, y);
        const grain =
          kind === 'oak'
            ? Math.sin(y * 0.95 + Math.sin(x * 0.035) * 2.8) * 5 +
              Math.sin(y * 0.2) * 4 +
              n * 5
            : kind === 'marble'
              ? Math.pow(
                  Math.abs(
                    Math.sin(x * 0.025 + y * 0.014 + Math.sin(y * 0.03) * 0.8),
                  ),
                  26,
                ) *
                  -34 +
                n * 3
              : Math.sin((x * Math.PI) / 2) * Math.cos((y * Math.PI) / 2) * 8 +
                n * 7;
        const base =
          kind === 'oak'
            ? [116, 72, 43]
            : kind === 'marble'
              ? [199, 188, 170]
              : [207, 196, 175];
        for (let k = 0; k < 3; k++) pixels.data[i + k] = base[k]! + grain;
        pixels.data[i + 3] = 255;
        normals[i] =
          128 +
          (kind === 'fabric'
            ? Math.sin((x * Math.PI) / 2) * 14
            : (n - 0.5) * 8);
        normals[i + 1] =
          128 +
          (kind === 'oak'
            ? Math.cos(y * 0.95) * 18
            : (noise(x + 1, y) - 0.5) * 14);
        normals[i + 2] = 254;
        normals[i + 3] = 255;
      }
    ctx.putImageData(pixels, 0, 0);
    const map = texture(c, true);
    const normal = new T.DataTexture(normals, 256, 256);
    normal.needsUpdate = true;
    normal.generateMipmaps = true;
    normal.minFilter = T.LinearMipmapLinearFilter;
    textures.push(normal);
    return { map, normal };
  };
  const oak = surface('oak'),
    marble = surface('marble'),
    fabric = surface('fabric');
  const floorAO = canvas(),
    ao = floorAO.getContext('2d')!;
  ao.fillStyle = '#ffffff';
  ao.fillRect(0, 0, 256, 256);
  const shadow = (x: number, y: number, radius: number, strength: number) => {
    const g = ao.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(0,0,0,${strength})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ao.fillStyle = g;
    ao.fillRect(0, 0, 256, 256);
  };
  shadow(128, 145, 100, 0.75);
  shadow(18, 30, 55, 0.5);
  shadow(236, 30, 55, 0.5);
  const floorLight = canvas(),
    light = floorLight.getContext('2d')!;
  light.fillStyle = '#675444';
  light.fillRect(0, 0, 256, 256);
  for (const x of [28, 228]) {
    const g = light.createRadialGradient(x, 36, 1, x, 36, 155);
    g.addColorStop(0, '#ffd397');
    g.addColorStop(0.4, '#b98048');
    g.addColorStop(1, '#00000000');
    light.fillStyle = g;
    light.fillRect(0, 0, 256, 256);
  }
  const glow = canvas(64),
    gctx = glow.getContext('2d')!;
  const gradient = gctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,200,121,.7)');
  gradient.addColorStop(0.3, 'rgba(255,162,67,.2)');
  gradient.addColorStop(1, 'rgba(255,140,40,0)');
  gctx.fillStyle = gradient;
  gctx.fillRect(0, 0, 64, 64);
  const contact = canvas(64),
    contactCtx = contact.getContext('2d')!;
  const contactGradient = contactCtx.createRadialGradient(
    32,
    32,
    3,
    32,
    32,
    32,
  );
  contactGradient.addColorStop(0, 'rgba(9,6,4,.66)');
  contactGradient.addColorStop(0.6, 'rgba(9,6,4,.32)');
  contactGradient.addColorStop(1, 'rgba(9,6,4,0)');
  contactCtx.fillStyle = contactGradient;
  contactCtx.fillRect(0, 0, 64, 64);
  const art = canvas(),
    paint = art.getContext('2d')!;
  paint.fillStyle = '#c0b299';
  paint.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) {
    paint.fillStyle = ['#263f43', '#436262', '#967547', '#ded2b5'][i % 4]!;
    paint.beginPath();
    paint.ellipse(
      25 + i * 31,
      100 + Math.sin(i) * 55,
      30,
      75,
      i * 0.42,
      0,
      Math.PI * 2,
    );
    paint.fill();
  }
  return {
    oak,
    marble,
    fabric,
    floorAO: texture(floorAO),
    floorLight: texture(floorLight, true),
    glow: texture(glow, true),
    contact: texture(contact),
    art: texture(art, true),
    textures,
    dispose: () => textures.forEach((map) => map.dispose()),
  };
}
