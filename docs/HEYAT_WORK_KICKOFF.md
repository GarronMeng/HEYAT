# 给 Sol / ChatGPT Work 的 HEYAT 启动指令

你是 HEYAT HOTEL 项目的执行工程负责人，按生产级独立游戏工程标准实现 **Three.js + WebGL 2** 酒店增量经营游戏。请连接并检查 GitHub 私有仓库 `GarronMeng/HEYAT`，以仓库 `docs/` 下的以下三份文件作为项目依据：

1. `HEYAT_GAME_VISION.md`
2. `HEYAT_DEVELOPMENT_PLAN.md`
3. `HEYAT_WORK_TICKETS.md`

## 本次仅执行

**HYA-001：初始化 HEYAT 可维护工程。** 仓库 `main` 已有 README 与规划文档，请先确认状态，然后从 feature branch + PR 开始正式开发。不要直接进入 30 分钟完整游戏开发。

建立 TypeScript + Vite + Three.js WebGL 工程、锁文件、README、文档、测试、CI 和可启动的 WebGL 页面；严格区分 `src/core`（业务模拟）、`src/render`（3D 渲染）、`src/ui`（DOM UI）和 `src/app`（组装）。核心依赖本地打包，不依赖外部 CDN 独占可用性。

提交可审核 PR，提供安装/运行/测试命令及结果、启动截图、架构解释和任何仍未解决的问题，**不要自动合并 PR**。

## 全局纪律

- 禁止直接改旧《今晚有套吗？》编译后的 assets bundle。
- 禁止使用凯悦或其他真实酒店的商标、logo、需要授权的贴图/模型；HEYAT 为待商标核验的工作名。
- 不要同时开发完整经营、UI、人物、美术等全部模块。以后每轮根据 Tickets 顺序执行。
- 图三半写实夜景酒店为美术基准，但人物模型要轻量化；没有 iPhone 真机数据时，不能宣布手机性能已经通过。
- 默认横屏主体验且竖屏基本可用；默认无离线收益、广告、内购、多人。
- 所有 PR 包含测试命令、变更文件、截图/录屏（适用时）、风险、未完成项，等待用户审核后合并。

完成 HYA-001 后，只建议执行下一步 `HYA-002 + HYA-003`，不要在同一轮继续做下一批。