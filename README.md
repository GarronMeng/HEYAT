# HEYAT HOTEL

原创城市夜景酒店主动增量游戏 · 第一版可试玩 Demo。

[打开私有试玩版](https://heyat-hotel-playtest.garronmeng.chatgpt.site)（使用 Garron 的账号访问）

从一间开放客房开始，手动接待、退房收款、清洁，购买十二项收益/效率/规模升级，解锁自动入住与自动清洁，扩建为三层、十二间客房的精品酒店。

## 安装与运行

需要 Node 24.19.0（`.nvmrc`）和 npm 11.9.0。

```bash
git clone https://github.com/GarronMeng/HEYAT.git
cd HEYAT
nvm install
nvm use
npm ci
npm run dev
```

打开 Vite 输出的本地地址。无需 API key、账户或后端。所有运行资源由 npm 本地打包，不请求外部 CDN、字体或模型。

```bash
npm test                 # 单元测试
npm run typecheck        # 严格类型检查
npm run lint             # ESLint 与 Prettier
npm run build            # 构建 dist/
npx playwright install --with-deps chromium
npm run test:e2e         # 先构建；测试生产 dist/，保存浏览器截图和失败 trace
npm run preview          # 生产预览
npm run simulate         # 三种购买策略，保存经济基线 JSON
```

## 玩法

1. 点击「开始营业」，接待第一位客人。退房时房费到账。
2. 点击「安排清洁」，脏房变为净房后才能再次接待。
3. 打开「升级与扩建」，在收益、效率、规模三个分组选择升级。
4. 完成九单并购买自动入住机，再解锁自动客房服务。
5. 开放当前楼层的四间房后向上扩建。十二间客房、品牌三级、累计房费 ¥200,000 达成终点。

设置中可切换 1× / 3× 试玩速度、暂停、画质、导出存档和性能报告。拖动旋转、滚轮/双指缩放，点击客房查看真实房态；也可从客房目录打开。

每次操作和每五秒自动保存到当前浏览器；刷新从同一状态继续。后台暂停且不补算离线收益。损坏存档会保留，用户可先导出，再明确确认重开。存档不跨设备同步。

## 工程结构

| 路径                                 | 职责                                                          |
| ------------------------------------ | ------------------------------------------------------------- |
| `src/core/model.ts`, `simulation.ts` | 100 ms 固定时钟、房态机、有限队列、订单和唯一结算             |
| `src/core/progression.ts`            | 十二项升级、前置条件、价格、自动化与有限目标                  |
| `src/core/save.ts`                   | 版本化存档编码与校验                                          |
| `src/render/`                        | 原创模块化酒店、共享材质/实例化、角色池与 LOD、拾取、性能采样 |
| `src/ui/game.ts`, `styles.css`       | 单抽屉、HUD、操作、引导、横竖屏布局                           |
| `src/app/bootstrap.ts`               | 内核/UI/渲染组装、保存、时钟、上下文恢复、生命周期            |
| `public/boot.js`                     | 入口加载失败和重试兜底                                        |
| `tests/`                             | Vitest、Playwright 生产回归                                   |

经营内核不依赖 DOM / Three.js；UI 和场景读取同一份只读快照，只通过命令修改经营数据。静态网站需整体托管 `dist/`，不能用 `file://` 打开；Vite 使用相对资源路径支持子目录。

## 验证与边界

第一版功能验证和 Ticket 状态见 [试玩验收记录](docs/PLAYTEST_V01.md)。三种自动购买策略约 22.1–22.4 分钟到达终点；首次自动化约 4.85–5.27 分钟，首次扩建约 15.3–15.8 分钟。这是模拟结果，不是玩家试玩数据。

**MOBILE_PERF_UNVERIFIED：移动端性能尚未验收。** Chromium / SwiftShader 浏览器回归只验证功能与响应式布局；桌面集显 60 FPS、iPhone Safari 30 FPS 均需硬件实测。设置中导出报告保存最近最多 180 秒采样。

画面为程序化几何的第一轮场景，尚未达到概念图的半写实精修质量。当前上限三层客房加大堂、十二间房，尚未实现 backlog 的 24 房压力场景。没有商业资产、广告、内购、云存档、外部分析或第二家酒店。

## 工作流与基线

所有实现保持独立 feature branch + PR。用户于 2026-10-22 明确授权检查后自动合并，并持续开发至第一版试玩；这覆盖早期文档中“不自动合并/止于 HYA-001”的流程限制。

- [游戏定调](docs/HEYAT_GAME_VISION.md)
- [开发计划](docs/HEYAT_DEVELOPMENT_PLAN.md)
- [Ticket 验收定义](docs/HEYAT_WORK_TICKETS.md)
- [初始工程记录](docs/HYA-001_VALIDATION.md)

仅修改 GarronMeng/HEYAT，不复用旧项目编译 bundle，不使用未授权的真实酒店品牌素材。HEYAT 为工作名，发行前另行确认商标与资产权利。
