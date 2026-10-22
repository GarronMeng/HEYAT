/** Advance business time from wall-clock frame deltas, even on a slow GPU.
 * Visibility/context lifecycle resets the reference clock before resuming.
 * Only pathological >5s stalls are bounded to avoid excessive catch-up work.
 */
export function simulationFrameDelta(previous: number, now: number): number {
  return previous > 0 && Number.isFinite(now) && now > previous
    ? Math.min((now - previous) / 1000, 5)
    : 0;
}

export interface FrameScheduler {
  request(callback: () => void): number;
  cancel(id: number): void;
}

/** Rendering time never advances the business simulation. */
export function createRenderLoop(draw: () => void, scheduler: FrameScheduler) {
  let running = false;
  let frameId = 0;
  const frame = () => {
    if (!running) return;
    draw();
    if (running) frameId = scheduler.request(frame);
  };
  return {
    start() {
      if (running) return;
      running = true;
      frameId = scheduler.request(frame);
    },
    stop() {
      running = false;
      scheduler.cancel(frameId);
    },
  };
}
