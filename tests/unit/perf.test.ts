import { expect, it } from 'vitest';
import {
  autoQualityForDevice,
  FrameMetrics,
  percentile,
} from '../../src/render/perf';

it('starts desktop with full premium visuals and mobile with baked PBR', () => {
  const desktop = 'Mozilla/5.0 (Windows NT 10.0)';
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1)';
  const android = 'Mozilla/5.0 (Linux; Android 15)';
  expect(autoQualityForDevice(desktop)).toBe('high');
  expect(autoQualityForDevice(iphone)).toBe('medium');
  expect(autoQualityForDevice(android)).toBe('medium');
});

it('calculates frame percentiles and caps retained sampling data', () => {
  expect(percentile([30, 10, 20], 0.5)).toBe(20);
  expect(percentile([], 0.95)).toBe(0);
  const metrics = new FrameMetrics();
  for (let i = 0; i < 400; i++)
    metrics.add(20, i * 1000, {
      calls: 50,
      triangles: 10000,
      geometries: 8,
      width: 800,
      height: 600,
      quality: 'medium',
    });
  expect(metrics.samples).toHaveLength(180);
  expect(metrics.samples.at(-1)?.fps).toBe(50);
});

it('counts prolonged rendering stalls instead of hiding frames over two seconds', () => {
  const metrics = new FrameMetrics();
  const stats = {
    calls: 100,
    triangles: 20000,
    geometries: 10,
    width: 800,
    height: 600,
    quality: 'high' as const,
  };
  metrics.add(16, 1000, stats);
  const result = metrics.add(2500, 3500, stats);
  expect(result.p95).toBeGreaterThanOrEqual(16);
  expect(result.fps).toBeLessThan(1);
  expect(metrics.samples.at(-1)?.p50).toBe(16);
});
