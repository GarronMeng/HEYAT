import './ui/styles.css';

async function start() {
  try {
    const { bootstrap } = await import('./app/bootstrap');
    bootstrap();
  } catch {
    // The UI module may be the chunk that failed; use the static shell directly.
    document.querySelector('#boot-status')!.textContent = '页面加载失败';
    document.querySelector('#boot-detail')!.textContent =
      '启动模块未能加载。请检查网络连接，然后重新加载页面。';
    document.querySelector('.status-card')!.setAttribute('aria-busy', 'false');
    document.querySelector<HTMLButtonElement>('#retry')!.hidden = false;
  } finally {
    window.dispatchEvent(new Event('heyat:boot-settled'));
  }
}

void start();
