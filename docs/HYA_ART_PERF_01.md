# HYA-ART-PERF-01 · WebGL 材质与画质分层

基线：未合并的 `feat/premium-diorama-stage-1`（PR #7）。本任务只处理渲染器与材质，不修改经济模拟、客房数量、存档或 UI 经营接口。

## 已实施

- **High**：保留完整 `MeshStandardMaterial`、法线与 AO 纹理，并按需创建 PMREM 环境反射，供桌面与性能足够的设备使用。
- **Medium**：共享相同颜色纹理和几何体；保留 Standard 光照但移除大部分法线贴图与 AO，关闭环境反射，不再为 Medium 启动创建 PMREM。
- **Low**：共享相同纹理，使用较轻的 `MeshLambertMaterial`；移除用于装饰的半透明玻璃、光晕和接触阴影叠层。布局、房态提示、交互命中与经营计算保持不变。
- iPhone/iPad/Android 默认使用 Low；桌面默认 Medium。手动选择 High 可以恢复完整材质。持续低 FPS 自动降级保留。
- 切换画质时对共享材质实例切换，而不是重建全部房间几何。新增环境恢复逻辑，使 WebGL context restore 只重建当前所需的反射资源。
- 性能报告增加 `visualTier` 字段，说明着色路径、法线、环境反射与装饰层的启用状态。
- 新增 Playwright E2E 回归：循环切换 Low/Medium/High/Low，检查运行时诊断、WebGL 入口状态以及现金/房间/营业收入保持不变。

## 约束与验收边界

1. 渲染降级不会影响 `src/core`，不能使存档格式发生变化。
2. 低画质仍应保留床、家具、酒店入口和客房颜色区分，不能以空白场景代替。
3. Medium/Low 的效果以实机截图复核；高画质不得被静默永久替换成简模。
4. 目标 iPhone Safari 30 FPS、桌面 Chrome 60 FPS **尚未完成硬件验证**。
5. SwiftShader 软件 FPS 只适合比较同环境的相对成本，不代替手机硬件结果；需要在相同运行模式和温度条件下重新采样。
6. 若 PR #7 后续更新，请先合并基线变更并重新执行测试，不要覆盖修改者的未审更改。

## 下一步（独立 Tickets）

- **PERF-02**：最繁忙 12 房场景的 High/Medium/Low 同设备基准截图与热机 15 分钟测试；补齐原性能采样器忽略超长帧的偏差。
- **ART-02**：六名轻度写实低面数人物、动作复用与 LOD，不得增加数十个实时骨骼动画。
- **ART-03**：以低成本渐层背景和少量实例化灯光替换重复盒状城市，不能加每帧全屏 Bloom/SSR。

## 执行记录

源代码分支 `perf/staged-webgl-quality-profiles`；真实测试结果以 GitHub Actions 和 PR 最终记录为准。尚无 iPhone 实机验收，严禁标记 `MOBILE_PERF_VERIFIED`。
