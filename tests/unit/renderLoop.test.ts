import { describe, expect, it, vi } from 'vitest';
import {
  createRenderLoop,
  simulationFrameDelta,
} from '../../src/app/renderLoop';
import { viewportSize } from '../../src/render/viewport';

describe('frame delta handling under low FPS', () => {
  it('does not slow hotel revenue when GPU rendering takes multiple seconds', () => {
    expect(simulationFrameDelta(1000, 2000)).toBe(1);
    expect(simulationFrameDelta(1000, 3500)).toBe(2.5);
    expect(simulationFrameDelta(1000, 9000)).toBe(5);
    expect(simulationFrameDelta(0, 9000)).toBe(0);
    expect(simulationFrameDelta(3000, 2000)).toBe(0);
  });
});

describe('render lifecycle', () => {
  it('never creates duplicate loops and cancels pending work when hidden/disposed', () => {
    let callback = () => {};
    const scheduler = {
      request: vi.fn((next: () => void) => {
        callback = next;
        return 7;
      }),
      cancel: vi.fn(),
    };
    const draw = vi.fn();
    const loop = createRenderLoop(draw, scheduler);
    loop.start();
    loop.start();
    expect(scheduler.request).toHaveBeenCalledTimes(1);
    callback();
    expect(draw).toHaveBeenCalledTimes(1);
    loop.stop();
    expect(scheduler.cancel).toHaveBeenCalledWith(7);
    callback();
    expect(draw).toHaveBeenCalledTimes(1);
    loop.start();
    callback();
    expect(draw).toHaveBeenCalledTimes(2);
  });

  it('does not schedule another frame if drawing stops the loop', () => {
    let callback = () => {};
    const request = vi.fn((next: () => void) => {
      callback = next;
      return 1;
    });
    const loop = createRenderLoop(() => loop.stop(), {
      request,
      cancel: vi.fn(),
    });
    loop.start();
    callback();
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe('viewport sizing', () => {
  it('protects hidden/zero-sized viewports and caps high-DPI allocation', () => {
    expect(viewportSize(0, 0, 3)).toEqual({
      width: 1,
      height: 1,
      pixelRatio: 1.5,
    });
    expect(viewportSize(390.5, 844.8, 1)).toEqual({
      width: 390,
      height: 844,
      pixelRatio: 1,
    });
  });
});
