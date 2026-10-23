# 人物服务动作实机验证

- 运行方式：Node 24.19 / npm 11.9；npm ci、npm run build、npm run preview；当前试玩继续使用 https://heyat-art-ui-review.garronmeng.chatgpt.site 。
- 本地 20/20 单测，typecheck、lint、生产构建通过；原有 16/16 WebGL/经营/存档/相机/UI 测试通过，新增人物服务采帧测试 1/1 通过。
- [默认视角修改前](evidence/character-service/before-default.jpg) / [修改后](evidence/character-service/after-default.jpg)；[斜视修改前](evidence/character-service/before-oblique.jpg) / [修改后](evidence/character-service/after-oblique.jpg)。相同初始存档、暂停、High、1440×900 和相同相机输入。人物待机姿态和礼宾循环时间存在采帧时间差。
- [服务场景](evidence/character-service/service.jpg) 使用 101 RESERVED、102 CLEANING 的另一存档，不能与上面的初始存档逐像素比较。[实帧动作序列](evidence/character-service/service-motion.gif) 为真实 Three.js 截图，6 帧；软件渲染与截图开销影响帧间隔，GIF 放慢播放，仅用于看姿态变化，不是实时 FPS 录屏。

## 诊断数据

Linux x86_64，Headless Chromium 141.0.7390.37，ANGLE Vulkan SwiftShader（CPU 软件渲染）。浏览器 1440×900，High、DPR 1；游戏画布采样包含 1440×566 和打开设置时的 1070×566。38 个短程样本，含相机、截图开销：Draw Calls 中位 66、三角形 60,010、FPS 中位 2.99。几何 18、纹理 26，浏览器粗粒度 JS Heap 11.2 MB。完整报告和汇总在 evidence/character-service/ 下。

没有新增人物道具独立 draw 或纹理。与上轮一房截图 68 calls 的差异来自当前两房服务存档的场景批次，不作为优化幅度对比。此次采样不是固定分辨率两分钟基准，也不是硬件验收。MOBILE_PERF_UNVERIFIED；iPhone Safari 30 FPS、桌面真实 GPU 60 FPS 与长期热稳定均未实测。

## 尚存限制

跨楼层人员采用房门位置交接；中远景不播放完整服务动作；六人仅为经营状态的代表，不与所有订单人数一一对应。箱包使用简化手提造型，拖把与制服共用角色网格；无复杂手指、足底 IK、面部表情或全场景寻路。
