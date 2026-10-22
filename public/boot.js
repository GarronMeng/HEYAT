// Remains independent of ES modules so a failed entry chunk is still actionable.
function failEntry() {
  if (!document.querySelector('#boot-status')) {
    document.addEventListener('DOMContentLoaded', failEntry, { once: true });
    return;
  }
  document.querySelector('#boot-status').textContent = '页面加载失败';
  document.querySelector('#boot-detail').textContent =
    '未能加载启动文件。请检查网络连接，然后重新加载页面。';
  document.querySelector('.status-card').setAttribute('aria-busy', 'false');
  document.querySelector('#retry').hidden = false;
}
// Vite rewrites/moves the module entry and removes its ID in production.
function moduleError(event) {
  if (
    event.target instanceof HTMLScriptElement &&
    event.target.type === 'module'
  ) {
    failEntry();
  }
}
document.addEventListener('error', moduleError, true);
document.addEventListener(
  'DOMContentLoaded',
  () => {
    document
      .querySelector('#retry')
      ?.addEventListener('click', () => window.location.reload());
  },
  { once: true },
);
const timeout = window.setTimeout(failEntry, 30000);
window.addEventListener(
  'heyat:boot-settled',
  () => {
    window.clearTimeout(timeout);
    document.removeEventListener('error', moduleError, true);
  },
  { once: true },
);
