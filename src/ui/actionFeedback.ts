import type { HotelState, Receipt } from '../core/model';
export function operationView(state: HotelState, action: 'checkin' | 'clean') {
  const status = action === 'checkin' ? 'RESERVED' : 'CLEANING';
  const active = state.rooms.find((r) => r.status === status);
  const elapsed = active ? Math.max(0, state.time - active.changedAt) : 0;
  const total = elapsed + (active?.remaining ?? 0);
  return active
    ? {
        busy: true,
        remaining: active.remaining,
        progress: total > 0 ? Math.min(1, elapsed / total) : 1,
        label: `${action === 'checkin' ? '办理' : '清洁'} ${active.remaining.toFixed(1)}s`,
        expected: action === 'checkin' ? (active.order?.revenue ?? 0) : 0,
      }
    : {
        busy: false,
        remaining: 0,
        progress: 0,
        label: action === 'checkin' ? '退房时收取房费' : '准备下一次入住',
        expected: 0,
      };
}
/** Receipt IDs may settle out of order. Track identities, never a max-ID watermark. */
export function receiptTracker(initial: readonly Receipt[]) {
  let seen = new Set(initial.map((r) => r.orderId));
  return {
    consume(rows: readonly Receipt[]) {
      const fresh = rows.filter((r) => !seen.has(r.orderId));
      seen = new Set(rows.map((r) => r.orderId));
      return {
        count: fresh.length,
        amount: fresh.reduce((n, r) => n + r.revenue, 0),
      };
    },
  };
}
export function commandFeedback(
  before: HotelState,
  after: HotelState,
  action: string,
) {
  if (action === 'buy') return `升级完成 −¥${before.cash - after.cash}`;
  if (action === 'checkin') {
    const ids = new Set(
      before.rooms.flatMap((r) => (r.order ? [r.order.id] : [])),
    );
    const order = after.rooms.find(
      (r) => r.order && !ids.has(r.order.id),
    )?.order;
    return order ? `已接待 · 预计 ¥${order.revenue}，退房到账` : '接待已安排';
  }
  return '已安排清洁 · 净房恢复后可再次接待';
}
