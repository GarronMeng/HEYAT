# HEYAT HOTEL

> 今晚有套吗？ · Three.js + WebGL 2 酒店增量经营游戏（开发中）

HEYAT 是独立新项目，以半写实夜景微缩酒店剖面为视觉方向，将酒店运营与短流程主动增量玩法结合。

当前阶段：**产品规格与 Work 开发任务已就绪，游戏代码尚未初始化。**

## 项目文档

- [游戏整体定调 / Game Vision](docs/HEYAT_GAME_VISION.md)
- [技术开发计划 / Development Plan](docs/HEYAT_DEVELOPMENT_PLAN.md)
- [工程 Tickets / Work Tickets](docs/HEYAT_WORK_TICKETS.md)
- [Work 首轮启动任务 / Kickoff](docs/HEYAT_WORK_KICKOFF.md)

## 开发工作流

1. 先按 `docs/HEYAT_WORK_KICKOFF.md` 执行 **HYA-001**，建立 TypeScript + Vite + Three.js 工程、测试和 CI。
2. 然后按 `docs/HEYAT_WORK_TICKETS.md` 的依赖关系推进，每轮控制变更范围。
3. 每项功能提交 feature branch + PR，**不得自动合并**。
4. 真实 iPhone Safari 性能未经实机验证前，不得宣布移动端 FPS 已达标。

## 工程与品牌约束

- 保留 `src/core` 业务模拟与 `src/render` 3D 渲染的解耦。
- 禁止直接修改或复制旧项目的压缩构建产物作为源码。
- HEYAT 为暂定工作名；正式发行前需单独评估商标混淆风险。
- 不使用未授权的真实酒店品牌标识、模型或素材。

详见 `docs/`，该目录是产品需求与工程执行的当前依据。
