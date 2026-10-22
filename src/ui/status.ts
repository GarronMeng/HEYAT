export type BootStatus = 'loading' | 'ready' | 'error';

export function createStatusView(root: HTMLElement) {
  const title = root.querySelector<HTMLElement>('#boot-status')!;
  const detail = root.querySelector<HTMLElement>('#boot-detail')!;
  const card = root.querySelector<HTMLElement>('.status-card')!;
  const retry = root.querySelector<HTMLButtonElement>('#retry')!;
  return {
    update(status: BootStatus, message: string) {
      root.dataset.status = status;
      title.textContent = {
        loading: '正在启动 3D 引擎…',
        ready: 'WebGL 2 已就绪',
        error: '3D 页面暂时无法启动',
      }[status];
      detail.textContent = message;
      card.setAttribute('aria-busy', String(status === 'loading'));
      retry.hidden = status !== 'error';
    },
  };
}
