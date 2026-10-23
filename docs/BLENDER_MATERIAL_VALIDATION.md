# Blender 材质、烘焙与网页实机验证

## 已交付

使用真实 Blender **4.5.3 LTS / Cycles CPU** 处理现有 Three.js 酒店，而非 AI 概念图。导入游戏代码生成的 612 个组件实例、8 份共享几何与 UV；九张木纹/布艺/石材 Color、Normal、ORM 贴图，加客房 AO 和无底色的直接/间接光照图，共 **11 张 256² PNG，536,763 bytes（约 0.51 MiB）**。法线、粗糙度和底色共享复用，铜件调整金属度/粗糙度与灯光关系。

修正原客房光照平面 y+0.029 低于木地板顶面 y+0.033 的遮挡，改为 y+0.037；现在真实烘焙层可见。降低冷色环境填充、加强暖光层次，继续使用原有一盏半球光和两盏方向光，无新增实时阴影或每房灯光。角色、经营、UI、升级与 v1 存档保留。

- [Blender 可编辑源文件](../art/blender/heyat-material-light.blend)；[完整导出/烘焙脚本和重建命令](../scripts/blender/README.md)。Blender 支持离线审阅、材质编辑与烘焙，手机继续运行 Three.js + WebGL2。
- [网页修改前](evidence/blender/before-game.jpg) / [网页修改后](evidence/blender/after-game.jpg)：同为两间 AVAILABLE 客房、暂停、High、1440×900 默认相机；人物循环采帧时刻有差异。
- [网页近景](evidence/blender/after-close.jpg)：一房初始存档的自由相机斜视，不能与两房默认图逐像素比较。
- [手机布局实图](evidence/blender/phone-layout.jpg)：Chromium 390×844 响应式检查，非 iPhone Safari 真机。
- [Blender 离线审阅图](evidence/blender/blender-offline.jpg)：Cycles 32 samples、AgX、1080×720，没有游戏人物/UI，只作离线材质和灯光参考，不冒充游戏截图。

试玩：[HEYAT 当前组合版本](https://heyat-art-ui-review.garronmeng.chatgpt.site)。发布的 27 个构建文件与测试 dist 的 SHA256 全部一致，包含人物精修和本轮 Blender 贴图。部署源提交 ca2b2f6c9445c9c77b9fa19a770233aeabbab430；对应 GitHub 运行时代码 24c92673c1ee64376d40a0365f75a417b7ff775e。

## 检查结果

- `npm test`：20/20；`npm run typecheck`、`npm run lint`、`npm run build` 通过。
- 完整 `npm run test:e2e`：**19/19（5.1 分钟）**，含经营闭环、存读档、损坏存档、扩建/终局、上下文恢复、相机、三档材质、手机布局、人物动作、真实像素与字标视角。CI 源分支没有 review-only 点击用例，因此数量少 1。
- 新增材质检查确认 **loaded=11 / fallbacks=0**；拦截全部烘焙贴图时 **loaded=0 / fallbacks=11**，仍可渲染、无 pageerror、资金不变。原始结果在 material-loaded.json / material-fallback.json。
- SHA256 校验 11 张贴图与 manifest 完全一致。法线/ORM/AO 使用 non-color，Color/Light 使用 sRGB。异步纹理在共享对象中原位更新；销毁后的回调不重新上传资源。

## 性能实测与边界

测试设备为 **云端 Linux x86_64、Headless Chromium 141.0.7390.37、ANGLE Vulkan SwiftShader（CPU 软件渲染）**，不是实际桌面显卡。两间客房、六名动画代表角色、营业暂停、High、DPR 1、浏览器 1440×900；固定游戏 drawing buffer **1440×566**，无相机动作，等待采样 120 秒。排除前 15 秒和设置抽屉改变尺寸的样本后，101 个样本覆盖 121.8 秒。

| 指标                          | 实测            |
| ----------------------------- | --------------- |
| Draw Calls 中位               | 66              |
| 可见三角形中位                | 60,010          |
| FPS 样本中位                  | 2.58            |
| P95 帧时间样本中位            | 769.8 ms        |
| 几何 / 纹理数                 | 18 / 29         |
| JS Heap（浏览器粗粒度）       | 11.2 MB         |
| surface 纹理 RGBA+mipmap 估算 | 4,237,995 bytes |
| 烘焙贴图加载                  | 11/11，回退 0   |

原始 [benchmark-report.json](evidence/blender/benchmark-report.json) 和 [summary.json](evidence/blender/summary.json) 可复核。surface 估算不包含所有屋顶文字、背景等纹理，不是总 GPU VRAM；WebGL 不暴露真实显存字节。相比本轮人物基线，场景 Draw Calls/三角形保持不变，新增三张共享粗糙度贴图，surface 估算增加约 1 MiB。此前短程 FPS 含截图/相机，不能直接推导性能提升或回退幅度。

**MOBILE_PERF_UNVERIFIED**：没有完成 iPhone Safari 30 FPS、桌面真实 GPU 60 FPS 或 15 分钟热稳定测试。软件 FPS 很低；此结果仅证明渲染路径和资源预算，没有硬件性能达标结论。

## 保留问题

- 共享第一间房的 floor AO/irradiance 是空间近似；升级家具/不同布局没有逐个重烘焙。Low 档继续简化法线、AO、反射和装饰层。
- 本轮使用本地 PNG + mipmaps，没有 KTX2/Basis GPU 压缩；贴图损坏时保留原程序纹理。
- Blender 离线阴影和 AgX 的效果不能完整移植到手机实时画面；游戏没有启用 Cycles、实时全局光照或动态阴影。
- 人物仍为低面数代表，跨楼层为房门交接；未增加完整寻路、手指/面部动画或足底 IK。
- GitHub CI 状态以 PR 实际检查为准；未通过远端检查不合并。
