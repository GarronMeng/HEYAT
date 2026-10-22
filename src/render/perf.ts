export type Quality = 'low' | 'medium' | 'high';
export const QUALITY = {
  low: { dpr: 0.8, people: 10, city: 8 },
  medium: { dpr: 1.2, people: 18, city: 16 },
  high: { dpr: 1.5, people: 26, city: 24 },
} as const;
export function percentile(values: number[], fraction: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[
    Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))
  ]!;
}
export interface RenderStats {
  fps: number;
  p50: number;
  p95: number;
  calls: number;
  triangles: number;
  geometries: number;
  width: number;
  height: number;
  quality: Quality;
}
export class FrameMetrics {
  private frames: number[] = [];
  private lastSample = 0;
  readonly samples: Array<RenderStats & { at: number }> = [];
  add(
    milliseconds: number,
    now: number,
    stats: Omit<RenderStats, 'fps' | 'p50' | 'p95'>,
  ): RenderStats {
    if (milliseconds > 0 && milliseconds < 2000) {
      this.frames.push(milliseconds);
      if (this.frames.length > 240) this.frames.shift();
    }
    const average =
      this.frames.reduce((a, b) => a + b, 0) / Math.max(1, this.frames.length);
    const current = {
      ...stats,
      fps: average ? 1000 / average : 0,
      p50: percentile(this.frames, 0.5),
      p95: percentile(this.frames, 0.95),
    };
    if (now - this.lastSample >= 1000) {
      this.lastSample = now;
      this.samples.push({ ...current, at: Math.round(now) });
      if (this.samples.length > 180) this.samples.shift();
    }
    return current;
  }
}
