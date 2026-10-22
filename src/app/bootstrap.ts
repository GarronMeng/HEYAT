import { createInitialState } from '../core/state';
import { createRenderer, type SceneRenderer } from '../render/createRenderer';
import { createStatusView } from '../ui/status';
import { createRenderLoop } from './renderLoop';

export function bootstrap() {
  const root = document.querySelector<HTMLElement>('#app')!;
  const canvas = root.querySelector<HTMLCanvasElement>('#scene')!;
  const viewport = root.querySelector<HTMLElement>('#viewport')!;
  const ui = createStatusView(root);
  const state = createInitialState();
  ui.update('loading', '正在初始化本地 Three.js 渲染器。');
  let renderer: SceneRenderer;
  try {
    renderer = createRenderer(canvas);
  } catch (error) {
    ui.update(
      'error',
      error instanceof Error ? error.message : '渲染器初始化失败，请重新加载。',
    );
    return;
  }
  const loop = createRenderLoop(
    () => {
      try {
        renderer.render();
      } catch {
        loop.stop();
        canvas.hidden = true;
        ui.update('error', '渲染已中断，请重新加载页面。');
      }
    },
    {
      request: (callback) => window.requestAnimationFrame(callback),
      cancel: (id) => window.cancelAnimationFrame(id),
    },
  );
  const resize = () => {
    const { width, height } = viewport.getBoundingClientRect();
    renderer.resize(width, height, window.devicePixelRatio);
  };
  const visibility = () => {
    if (document.hidden || root.dataset.status !== 'ready') loop.stop();
    else loop.start();
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    loop.stop();
    canvas.hidden = true;
    ui.update(
      'error',
      '图形连接已中断。请重新加载；自动恢复将在后续性能 Ticket 中实现。',
    );
  };
  const observer = new ResizeObserver(resize);
  const dispose = () => {
    loop.stop();
    observer.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', pageHide);
    canvas.removeEventListener('webglcontextlost', contextLost);
    renderer.dispose();
  };
  const pageHide = (event: PageTransitionEvent) => {
    // Preserve resources when entering the browser's back/forward cache.
    if (!event.persisted) dispose();
  };
  try {
    resize();
    renderer.render(); // Ready means a real frame has been submitted.
    canvas.hidden = false;
    ui.update(
      'ready',
      `本地渲染模块运行正常。${state.phase === 'not-started' ? '经营系统等待后续开发。' : ''}`,
    );
    observer.observe(viewport);
    canvas.addEventListener('webglcontextlost', contextLost);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pageHide);
    visibility();
  } catch {
    dispose();
    ui.update('error', '首帧渲染失败，请重新加载或检查浏览器图形设置。');
  }
  if (import.meta.hot) import.meta.hot.dispose(dispose);
}
