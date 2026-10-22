# HEYAT HOTEL

> 今晚有套吗？ · Three.js + WebGL 2 酒店增量经营游戏（开发中）

HEYAT 是独立新项目，以半写实夜景微缩酒店剖面为视觉方向，将酒店运营与短流程主动增量玩法结合。

当前阶段：**HYA-001 工程初始化**。启动页运行真实 Three.js `WebGLRenderer` / WebGL 2，显示原创几何渲染标记；经营系统、酒店场景与人物尚未实现。

## 本地运行

需要 Node **24.19.0**（见 `.nvmrc`）和 npm **11.9.0**。私有仓库需使用已获授权的 GitHub 账号克隆。

```bash
git clone https://github.com/GarronMeng/HEYAT.git
cd HEYAT
git switch chore/heyat-bootstrap
nvm install
nvm use
npm ci
npm run dev
```

打开终端中的 Vite 地址（默认 `http://localhost:5173`）。支持 WebGL 2 的浏览器应显示立体标记和「WebGL 2 已就绪」。不支持时显示说明和重新加载按钮。无需 API key、环境变量或后端。

```bash
npm test                 # Vitest 单元测试；一次运行后退出
npm run test:watch       # 单元测试监听
npm run typecheck        # 严格 TypeScript 检查
npm run lint             # ESLint + Prettier 检查
npm run format           # 统一格式
npm run build            # 类型检查 + 生产构建，输出 dist/
npx playwright install --with-deps chromium
npm run test:e2e         # 对生产 dist/ 启动预览并进行浏览器验证
npm run preview          # 手动检查生产构建，默认 http://localhost:4173
```

E2E 前必须执行 `npm run build`。测试自动启停 4173 端口预览服务，使用 Chromium / SwiftShader 软件 WebGL 2，生成 `test-results/` 截图和 `playwright-report/` 报告。它验证功能，不能代表 GPU 或 iPhone 性能。Linux 的浏览器系统依赖安装可能需要管理员权限。

生产运行时仅请求同站点的构建资源和 `boot.js`，Three.js 由 npm 安装并打包；无外部 CDN、字体或模型请求。`base: './'` 支持静态站点子目录；将 `dist/` **整体**放到 HTTP(S) 静态服务器，不能直接双击 `file://` 打开。预览部署不在 HYA-001 范围内。

## 工程结构与边界

```text
src/
  core/state.ts           # 纯 TypeScript，只读初始状态；实际状态机留给 HYA-004
  render/createRenderer.ts # Three.js 场景、相机、GPU 资源释放
  render/viewport.ts      # 基础画布尺寸与 DPR 上限
  ui/status.ts           # DOM 启动状态视图，无业务计算
  ui/styles.css          # 桌面 / 竖屏启动页
  app/bootstrap.ts       # 组装内核、UI、渲染器；管理尺寸和生命周期
  app/renderLoop.ts      # 可停止、可测试的渲染循环
  main.ts                # 异步入口与模块加载错误兜底
public/boot.js            # 独立于 ES 模块的入口加载失败/超时/重试兜底
tests/unit/               # 渲染循环和画布尺寸边界
tests/e2e/                # 生产构建首帧、网络、失败、重试和横竖屏
.github/workflows/ci.yml  # PR、main/初始化分支 push 与手动检查，无部署/合并动作
```

依赖方向由 `app` 组装 `core`、`render` 和 `ui`。ESLint 禁止 `core` 引入 Three.js、DOM、渲染/UI/装配层，禁止 UI/渲染层反向引入 `app`。渲染循环不推进经营时间、不修改状态；HYA-004 再定义指令、reducer、固定时间步与事件。

进入后台暂停绘制，回前台恢复，HMR/退出时清理观察器、监听器及 GPU 资源。WebGL 上下文丢失时停止绘制并提供重新加载；完整原位恢复、LOD、实例化、烘焙光照及自动画质降级留给后续 Ticket。当前仅固定 DPR 上限 1.5，未实现画质分档。

## 验证与性能状态

GitHub Actions 执行 `npm ci` → lint → typecheck → 单元测试 → build → Chromium E2E，保留截图和报告 14 天。详细运行证据见 [HYA-001 验证记录](docs/HYA-001_VALIDATION.md)。

**MOBILE_PERF_UNVERIFIED：移动端性能尚未验收。** 桌面 60 FPS 与 iPhone Safari 30 FPS 均为后续目标；本轮没有帧率达标结论。390 × 844 桌面视口检查只证明响应式布局，不等于 iPhone Safari 真机测试。

下一轮建议 HYA-002 的大堂 + 2 客房 + 6 动态角色场景，以及 HYA-003 的性能面板、画质分档和真机测量模板。HYA-001 不自动推进这些工作。

## 项目文档

- [游戏整体定调 / Game Vision](docs/HEYAT_GAME_VISION.md)
- [技术开发计划 / Development Plan](docs/HEYAT_DEVELOPMENT_PLAN.md)
- [工程 Tickets / Work Tickets](docs/HEYAT_WORK_TICKETS.md)
- [Work 首轮启动任务 / Kickoff](docs/HEYAT_WORK_KICKOFF.md)

## 开发工作流

1. 当前分支按 `docs/HEYAT_WORK_KICKOFF.md` 仅执行 **HYA-001**；PR 审核后由用户决定合并。
2. 然后按 `docs/HEYAT_WORK_TICKETS.md` 的依赖关系推进，每轮控制变更范围。
3. 每项功能提交 feature branch + PR，**不得自动合并**。
4. 真实 iPhone Safari 性能未经实机验证前，不得宣布移动端 FPS 已达标。

## 工程与品牌约束

- 保留 `src/core` 业务模拟与 `src/render` 3D 渲染的解耦。
- 禁止直接修改或复制旧项目的压缩构建产物作为源码。
- HEYAT 为暂定工作名；正式发行前需单独评估商标混淆风险。
- 不使用未授权的真实酒店品牌标识、模型或素材。

详见 `docs/`，该目录是产品需求与工程执行的当前依据。
