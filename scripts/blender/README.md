# HEYAT Blender 材质与烘焙流程

使用 Blender 4.5.3 LTS（Cycles CPU），本地需要可执行的 `blender`，网页运行不依赖 Blender。

```bash
npm ci
npx vite build --ssr scripts/blender/export-scene.mjs --outDir .art-cache
BLENDER_SCENE_JSON=.art-cache/scene.json node .art-cache/export-scene.js
blender -b --threads 4 --python scripts/blender/bake.py -- .art-cache/scene.json public/assets/blender .art-cache/review
npx prettier --write public/assets/blender/manifest.json
npm run build
npm run test:e2e
```

`export-scene.mjs` 调用现有 `createHotel` 和共享资产模块，导出实际组件几何、UV、材质及实例矩阵。离线阶段 stub Canvas 仅为避免对 DOM 的依赖，不使用 stub 像素作为贴图。建筑组件继续由游戏代码维护，避免 Blender 与 Three.js 各自重新建楼。

`bake.py` 创建节点材质并烘焙 oak/fabric/marble 的 Color、Normal、ORM（R=1、G=粗糙度、B=0），256²；导入实际场景，把 Y-up 转为 Z-up，摆放客房暖色区域光和城市冷色补光。用第一间已布置房间的地板 UV 烘焙 AO 与不含底色的 diffuse direct/indirect light，128 samples，再进行小半径高斯滤波。复用该光照到各客房，是移动性能预算内的视觉近似，非全楼逐物件光照图集。

`--reuse-surfaces` 复用已存在的九张材质图，只更新房间烘焙；`--review-only` 同时跳过房间贴图输出及 manifest 改动，只更新离线审阅图和 `.blend`。运行时采用本地 PNG、mipmap 和共享纹理，首轮下载约 0.5 MB；未引入 KTX2/Basis 解码器。Color/Light 用 sRGB，Normal/ORM/AO 用 non-color。

Three.js 按原材质分批与实例化绘制，不加载整栋 glTF，以保留扩建、房态、点击和存档行为。加载成功后原位替换共享纹理；失败时保留程序纹理，销毁后到达的回调不会重新上传。性能报告记录 `surfaceBakes.loaded/fallbacks`，便于确认真实贴图加载状态。

仓库 `art/blender/heyat-material-light.blend` 是带共享几何、材质、灯光和审阅相机的可编辑源文件。Blender 审阅图仅用于查看离线材质/照明；它没有游戏 UI 与角色，不能作为网页性能或最终实机画质的证明。实际网页前后截图与数据在 `docs/BLENDER_MATERIAL_VALIDATION.md`。
