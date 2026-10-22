import * as T from 'three';

/**
 * A single GPU texture replaces the repeating box-city. The skyline is rendered
 * once on startup, not in the animation loop, so its draw-call cost is zero.
 * Composition is original/procedural and shows an urban night, not waterfront.
 */
export function createNightSkyline(): T.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  let seed = 14591;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#070f20');
  sky.addColorStop(0.38, '#142842');
  sky.addColorStop(0.72, '#344458');
  sky.addColorStop(1, '#0b1524');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 512);
  // A few wide, static gradients give depth without costly postprocessing.
  const bloom = (x: number, y: number, r: number, color: string) => {
    const gradient = ctx.createRadialGradient(x, y, 1, x, y, r);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(10,18,38,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  bloom(754, 300, 310, 'rgba(235,130,95,.24)');
  bloom(255, 327, 330, 'rgba(78,116,180,.20)');
  bloom(510, 393, 370, 'rgba(255,178,96,.12)');
  for (let i = 0; i < 85; i++) {
    const x = random() * 1024;
    const y = 12 + random() * 240;
    const radius = random() > 0.94 ? 1.2 : 0.5;
    ctx.fillStyle =
      random() > 0.3 ? 'rgba(233,224,205,.35)' : 'rgba(159,189,236,.30)';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  const layer = (
    baseline: number,
    count: number,
    minHeight: number,
    maxHeight: number,
    main: string,
    windowColor: string,
    litFraction: number,
  ) => {
    let x = -20;
    for (let i = 0; i < count && x < 1050; i++) {
      const w = 15 + random() * 47;
      const h = minHeight + random() * (maxHeight - minHeight);
      const roof = baseline - h;
      ctx.fillStyle = main;
      ctx.fillRect(x, roof, w, h);
      // Some recessed upper stories and rooftop crowns break the box silhouette.
      if (random() > 0.64) {
        ctx.fillRect(x + w * 0.15, roof - 7, w * 0.7, 9);
      }
      if (random() > 0.87) {
        ctx.fillRect(x + w * 0.5, roof - 21, 1.5, 21);
      }
      const cols = Math.max(1, Math.floor((w - 7) / 7));
      const rows = Math.floor((h - 12) / 9);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (random() > litFraction) continue;
          const wx = x + 5 + col * 7;
          const wy = roof + 9 + row * 9;
          ctx.fillStyle = windowColor;
          ctx.fillRect(wx, wy, 2.6, 3.8);
        }
      }
      x += w + random() * 9;
    }
  };
  layer(389, 52, 35, 115, '#22334b', 'rgba(216,183,136,.28)', 0.38);
  layer(440, 42, 57, 165, '#16283c', 'rgba(248,194,126,.42)', 0.31);
  layer(489, 32, 55, 145, '#0e1d2c', 'rgba(250,203,140,.48)', 0.21);
  // Near street lights suggest the hotel sits within a city block.
  for (let i = 0; i < 30; i++) {
    const x = i * 36 + random() * 20;
    bloom(x, 480 + random() * 15, 18, 'rgba(240,159,85,.24)');
    ctx.fillStyle = 'rgba(248,193,125,.70)';
    ctx.fillRect(x, 477 + random() * 8, 2, 2);
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.magFilter = T.LinearFilter;
  return texture;
}
