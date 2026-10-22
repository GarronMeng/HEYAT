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
