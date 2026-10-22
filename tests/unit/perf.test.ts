import { expect, it } from 'vitest';
import { FrameMetrics, percentile } from '../../src/render/perf';

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
