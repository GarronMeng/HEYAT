# HYA-N06 · 持久角色与连续动线

原渲染每帧选第一间CLEANING/RESERVED/OCCUPIED房间并直接赋坐标，因此首个房态改变就瞬移；墙钟步频与瞬时LOD阈值又放大了停走/高速闪动。本PR依赖N03（PR #20），复用已通过CI的PR #14角色轮廓、服装、骨骼与动作，增加PeopleMotion持久任务控制器，不重建人物、不修改经营状态或收益。

六名角色常驻：双前台、礼宾、清洁、两名住客。接待/等候/礼宾沿用已有手势与低面数共享模型；清洁和代表住客锁定当前任务，往返经过大堂开放通道、外侧服务升降通道、楼层前走廊和房门，不因为房态列表改变而重新赋位置。服务期间以短清洁/等待动作表现；高速经营时视觉代表可以滞后，不为每笔订单生成实体或积压无限任务。身份历史上限128，任务最多2，性能采样最多120。右前绿植让出服务通道，开放井道和前侧落脚平台避免穿过楼板；升降时脚步暂停、共享低面数踏板随行。这是简化服务升降表现，不是完整电梯调度系统。

视觉只使用真实帧间隔（最大0.1秒），最大平移0.95单位/秒，3×仅加速原模拟；步幅按实际水平移动距离，转身取最短角且限速。暂停/模态框/图形丢失同步冻结根位置、步频和手势；画面质量/楼层重建保留人物池。缩放LOD在0.7/0.85之间采用滞回，距离LOD另有15%滞回，避免临界来回切换。未增加动态灯光、阴影或后处理。

验证状态：PR创建时尚待CI，不能标记完成。新增单测覆盖慢帧位移、只有井道内允许跨层、在途目标不切换、1×/3×视觉同速、暂停冻结、并行清洁任务稳定、历史和采样有界、模型骨骼和礼宾路线。新增真实WebGL E2E覆盖3×、暂停、缩放LOD、上下文恢复、资源与人物保持、390×844布局，保存截图和性能报告。CI还从固定N03父版本构建相同fixture/相机的修改前截图。完整集成测试使用同一PR最终树，涵盖N01–N06，不自动合并。

本地环境在开始写入N06时断开，因此本阶段通过GitHub提交及Actions验证，不能声称本地手工视觉验收。CI实际通过后再记录结果与运行链接。证据在对应Actions运行的heyat-browser-evidence工件：n06-before-results与test-results/character-motion目录包含真实Three.js PNG、motion/paused/restored报告；dist为生产预览，可下载后在目录中运行npx serve dist（或检出分支npm ci && npm run dev）。不是AI概念图。iPhone真机仍未测试，MOBILE_PERF_UNVERIFIED。

变更文件：render/peopleMotion（新增）、people/peoplePoses/peopleAnimation/figureRig、hotel、createHotelRenderer、app/bootstrap、peopleGeometry/peopleMotion单测、character-motion E2E、CI前后截图步骤与本文。仍保留Low/Medium/High。Blender材质PR #15保持独立，未自动合并或修改已有在线预览。
