import type { HotelState } from '../core/model';
import { recommendedUpgrade, upgradeCost } from '../core/progression';
/** A permanent dock slot: unavailable recommendations still have a useful, inert label. */
export function recommendationView(state: HotelState) {
  const upgrade = recommendedUpgrade(state);
  return upgrade
    ? {
        id: upgrade.id,
        disabled: false,
        label: `推荐 · ${upgrade.name}  ¥${upgradeCost(state, upgrade.id).toLocaleString('zh-CN')}  ↗`,
      }
    : {
        id: '',
        disabled: true,
        label: '暂无可用升级 · 继续接待与清洁，积累经营资金',
      };
}
