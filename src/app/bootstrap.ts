import { initialHotel } from '../core/model';
import { HotelSimulation } from '../core/simulation';
import { decodeSave, encodeSave } from '../core/save';
import { createRenderer, type SceneRenderer } from '../render/createRenderer';
import type { Quality } from '../render/perf';
import { createStatusView } from '../ui/status';
import { createGameView } from '../ui/game';
import { createRenderLoop, simulationFrameDelta } from './renderLoop';

export const SAVE_KEY = 'heyat-save-v1';
export function bootstrap() {
  const root = document.querySelector<HTMLElement>('#app')!;
  const canvas = root.querySelector<HTMLCanvasElement>('#scene')!;
  const viewport = root.querySelector<HTMLElement>('#viewport')!;
  const welcome = root.querySelector<HTMLDialogElement>('#welcome')!;
  const ending = root.querySelector<HTMLDialogElement>('#ending')!;
  const ui = createStatusView(root);
  let saved: string | null = null,
    saveBlocked = false,
    storageUnavailable = false;
  let initial = initialHotel();
  try {
    saved = localStorage.getItem(SAVE_KEY);
    if (saved) initial = decodeSave(saved);
  } catch {
    if (saved) saveBlocked = true;
    else storageUnavailable = true;
  }
  let simulation = new HotelSimulation(initial);
  let speed = 1,
    paused = false,
    quality = 'auto',
    modal = !saved || saveBlocked,
    lost = false,
    disposed = false;
  let last = 0,
    lastUpdate = 0,
    lastSave = 0,
    lastCompleted = initial.completed,
    endingShown = initial.won;
  const download = (name: string, contents: string) => {
    const url = URL.createObjectURL(
      new Blob([contents], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const save = () => {
    if (saveBlocked) return;
    try {
      localStorage.setItem(SAVE_KEY, encodeSave(simulation.snapshot()));
      view.saveStatus('已自动保存 · 当前设备');
    } catch {
      view.saveStatus('自动保存不可用 · 请导出存档');
    }
  };
  const closeWelcome = () => {
    welcome.close();
    modal = false;
    last = 0;
  };
  const view = createGameView(root, {
    action(name, value) {
      if (name === 'start') {
        if (saveBlocked) {
          if (
            !window.confirm(
              '原存档无法读取。开始新一局会覆盖它；可先在设置中导出原文件。继续？',
            )
          )
            return;
          saveBlocked = false;
          simulation = new HotelSimulation();
        }
        closeWelcome();
        save();
      } else if (name === 'help') {
        modal = true;
        welcome.showModal();
      } else if (name === 'continue') {
        ending.close();
        modal = false;
        last = 0;
      } else if (name === 'reset') {
        if (!window.confirm('重新开始会清除当前营业进度，确定吗？')) return;
        simulation = new HotelSimulation();
        saveBlocked = false;
        endingShown = false;
        lastCompleted = 0;
        ending.close();
        welcome.close();
        modal = false;
        paused = false;
        last = 0;
        renderer.resetCamera();
        save();
        view.toast('新的一夜，准备迎客。');
      } else if (name === 'speed') {
        speed = Number(value) === 3 ? 3 : 1;
        view.toast(`试玩速度 ${speed}×`);
      } else if (name === 'quality') {
        quality = value!;
        renderer.setQuality(
          quality === 'auto' ? 'medium' : (quality as Quality),
          quality === 'auto',
        );
      } else if (name === 'pause') {
        paused = !paused;
        last = 0;
        save();
      } else if (name === 'camera') renderer.resetCamera();
      else if (name === 'export')
        download(
          'heyat-save.json',
          saveBlocked && saved ? saved : encodeSave(simulation.snapshot()),
        );
      else if (name === 'report')
        download(
          'heyat-performance.json',
          JSON.stringify(renderer.report(), null, 2),
        );
      else if (
        !paused &&
        !modal &&
        !lost &&
        ['checkin', 'clean', 'buy'].includes(name)
      ) {
        const result = simulation.command(
          name === 'buy'
            ? { type: 'BUY', id: value! }
            : { type: name === 'checkin' ? 'CHECK_IN' : 'CLEAN' },
        );
        view.toast(result.message);
        save();
      }
      update();
    },
  });
  ui.update('loading', '正在点亮酒店与城市夜景。');
  let renderer: SceneRenderer;
  try {
    renderer = createRenderer(canvas, (id) => view.selectRoom(id));
  } catch (error) {
    ui.update(
      'error',
      error instanceof Error ? error.message : '渲染器初始化失败，请重新加载。',
    );
    view.dispose();
    return;
  }
  const update = () => {
    const state = simulation.snapshot();
    renderer.setState(state);
    view.update(state, renderer.metrics(), {
      speed,
      paused: paused || modal || lost,
      quality,
    });
  };
  const loop = createRenderLoop(
    () => {
      const now = performance.now();
      const delta = simulationFrameDelta(last, now);
      last = now;
      try {
        if (!paused && !modal && !lost) simulation.advance(delta * speed);
        if (now - lastUpdate > 100) {
          update();
          lastUpdate = now;
          const state = simulation.snapshot();
          if (state.completed > lastCompleted) {
            view.toast(
              `退房入账 +¥${state.receipts.at(-1)!.revenue.toLocaleString('zh-CN')}`,
            );
            lastCompleted = state.completed;
          }
          if (state.won && !endingShown) {
            endingShown = true;
            modal = true;
            root.querySelector('#ending-detail')!.textContent =
              `营业 ${Math.floor(state.wonAt! / 60)} 分 ${Math.floor(state.wonAt! % 60)} 秒 · 接待 ${state.completed} 位客人 · 累计房费 ¥${state.revenue.toLocaleString('zh-CN')}`;
            ending.showModal();
            save();
          }
        }
        renderer.render();
        if (now - lastSave > 5000) {
          save();
          lastSave = now;
        }
      } catch {
        loop.stop();
        save();
        ui.update('error', '渲染已中断，进度已尝试保存。请重新加载页面。');
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
    last = 0;
    renderer.resetTiming();
    if (document.hidden) {
      save();
      loop.stop();
    } else if (!lost) loop.start();
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    last = 0;
    loop.stop();
    save();
    ui.update('error', '图形连接已中断，正在等待恢复；也可重新加载继续存档。');
  };
  const contextRestored = () => {
    lost = false;
    last = 0;
    renderer.resetTiming();
    resize();
    update();
    ui.update('ready', '图形连接已恢复。');
    if (!document.hidden) loop.start();
  };
  const cancelModal = (event: Event) => event.preventDefault();
  const observer = new ResizeObserver(resize);
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    loop.stop();
    observer.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', pageHide);
    canvas.removeEventListener('webglcontextlost', contextLost);
    canvas.removeEventListener('webglcontextrestored', contextRestored);
    welcome.removeEventListener('cancel', cancelModal);
    ending.removeEventListener('cancel', cancelModal);
    renderer.dispose();
    view.dispose();
  };
  const pageHide = (event: PageTransitionEvent) => {
    save();
    if (!event.persisted) dispose();
  };
  try {
    resize();
    update();
    renderer.render();
    canvas.hidden = false;
    ui.update('ready', '酒店已经亮灯，欢迎开始营业。');
    observer.observe(viewport);
    canvas.addEventListener('webglcontextlost', contextLost);
    canvas.addEventListener('webglcontextrestored', contextRestored);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pageHide);
    welcome.addEventListener('cancel', cancelModal);
    ending.addEventListener('cancel', cancelModal);
    if (modal) welcome.showModal();
    if (saveBlocked) {
      view.toast('存档无法读取，原文件已保留，可在设置中导出。');
      welcome.querySelector('p.muted')!.textContent =
        '原存档无法读取。开始营业前需确认覆盖；原文件可在设置中导出。';
      welcome.close();
      modal = false;
      paused = true;
      view.setOpen(true);
    }
    if (storageUnavailable) view.saveStatus('存储不可用 · 可导出存档');
    visibility();
  } catch {
    dispose();
    ui.update('error', '首帧渲染失败，请重新加载或检查浏览器图形设置。');
  }
  if (import.meta.hot) import.meta.hot.dispose(dispose);
}
