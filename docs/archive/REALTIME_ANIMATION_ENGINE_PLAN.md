# WhaleGirl 轻量实时 2D Character Animation Runtime — 实施与验收记录

## 1. 目标边界

第一验收门只证明一件事：角色的运动来自运行时骨骼与关键帧，而不是来自动画图片。

交付必须同时满足：

- 角色使用数量由真实遮挡与关节语义决定的独立静态透明 PNG；不再以 15 张作为人为上限。
- 不加载 GIF、APNG、WebP 动画、MP4、PNG 序列或动画 Sprite Sheet。
- 每个显示帧由当前动画时间实时采样关键帧、计算骨骼世界矩阵并绘制 Part。
- 跑步包含 8 个步态相位：Contact、Down、Passing、Up 及左右镜像相位。
- Debug View 可显示骨骼、关节、Part Pivot、FPS、动画名称与当前时间。
- Animation Speed、Clip Duration、Bounce Amount 可运行时修改。
- Debug Override 可把任意骨骼角度即时覆盖为指定值。
- 第一验收门通过前，不实现 Mesh、Spring，也不接入正式 DSH 桌宠。

## 2. 当前序列帧路径审计

### 2.1 播放器代码

- `src/client/renderer/whale-rig/motion.ts`
  - 把 `frameParameter` 作为离散类别处理。
  - 生产 Run Motion 通过 `step` 曲线推进 `runFrame`。
- `src/client/renderer/whale-rig/webgl.ts`
  - 对 `runFrame` 使用 `Math.floor()`。
  - 根据整数索引选择 `part.frames[index]` 的 UV。
- `character-packs/default-whale/runtime/rig.*.json`
  - `run` Part 包含完整人物的多帧 UV 表。
- `character-packs/default-whale/runtime/motions/run.*.json`
  - 720ms 内用 `step` 曲线切换 24 个完整人物帧。
- `scripts/build-run-master-atlas.py`
  - 把完整人物帧打进运行图集。

### 2.2 序列帧资源

- `reference/run_reference_frames/run-master-v1/`
- `reference/run_reference_frames/run-master-v2/`
- `reference/run_reference_frames/pose-sequences/`
- `artifacts/run-master-*`

这些资源仅作为姿态、轮廓和动作节奏参考。第一阶段新 Runtime 的源码、HTML 和构建配置不得引用上述路径。现有生产插件暂时保持可运行，待第一验收门通过后再原子替换，避免在原型期间破坏当前桌宠。

## 3. 可复用代码

`src/client/renderer/whale-rig2/` 已提供可复用的实时内核：

- `math.ts`：2D 仿射矩阵、TRS、矩阵相乘与求逆。
- `bones.ts`：Bone hierarchy、父级优先顺序和 FK。
- `motion.ts`：连续曲线与 Clip 采样。
- `types.ts`：Bone、Pose、Clip、Channel 等基础数据。
- `run-rig.ts`：8 相位跑步数据的原型依据。

第一阶段在该内核上补齐 Part、Animator、Easing、Runtime Override 和独立纹理 Renderer，不另起一套重复数学实现。

## 4. 需要修正或新增的模块

1. `types.ts`
   - 扩展 `easeIn`、`easeOut`、`easeInOut`。
   - 新增不依赖纹理图集的 Part 定义。
2. `animator.ts`
   - `speed`、`durationMs`、播放/暂停、循环时间。
   - 主动画时间与渲染刷新率完全解耦。
3. `character-runtime.ts`
   - Pipeline：Animator → Primary Pose → Runtime Override → FK → Render。
   - `setBoneOverride()` 和 `clearBoneOverride()`。
4. `part-renderer.ts`
   - 每个 Part 持有独立 PNG。
   - 通过 Bone 世界矩阵、Part Pivot、局部旋转/缩放和 z-order 绘制。
5. `master-character.ts`
   - 母带拟合 Bone hierarchy、Part binding、667ms Run Clip 数据。
6. `master-preview.ts`
   - 实时 Debug View、参数面板和验收按钮。

## 5. 第一阶段角色资产

当前验收候选以 `run-master-v3` 的稳定母带帧作为唯一 Golden Pose：

- 16 张可见语义层直接取自母带同一帧，保持人物身份、头身比、服装和鲸尾轮廓。
- 11 张静态遮挡补全层用于关节转开后的隐藏区域，其中四肢补全按母带 Q 版比例单独制作。
- 静态 Golden 页加载 27 张；Run 页淘汰 6 张姿势绑定的腿部碎片，仅加载 21 张可复用静态语义纹理。
- 所有纹理没有动作编号、姿态帧或 Sprite Sheet；`animationFrames = 0`。
- 母带动作帧只用于 Golden 对照和关节/节奏测量，不被 Runtime 导入。

运行时骨架包含 `world → pelvis → chest → head` 主干、双侧 shoulder/arm、hip/thigh/calf/foot 和三段 tail chain。裙摆保持在躯干层，腿部纹理不再携带裙片。

## 6. 实现顺序

1. 校验并输出独立透明 Part。
2. 实现 Part/Scene Graph 和独立纹理加载。
3. 整理 Bone hierarchy 与 FK。
4. 扩展 Easing 和 Animator。
5. 编写 8 相位 Run Clip。
6. 实现 Runtime Override 和 Debug View。
7. 静态 Golden Pose 对照。
8. 逐相位和连续播放视觉验收。
9. 在第一验收门停止。

## 6.1 当前第一验收门产物

- `character-packs/default-whale/source/master-cutout-v1/`：静态语义纹理与机器可读 manifest。
- `artifacts/whale-master-cutout-v1/preview.html`：Golden Pose、母带叠加、Bone/Pivot 和即时骨骼覆盖。
- `artifacts/whale-master-cutout-v1/run-preview.html`：Bone + Keyframe 实时 Run、速度/周期控制与相位定格。
- `src/client/renderer/whale-rig2/master-character.ts`：18 骨、8 相位、667ms Run Clip 与 Part binding。
- `src/client/renderer/whale-rig2/master-character.test.ts`：纹理来源、骨架拓扑、Pivot、闭环和动态改速回归。

Golden 静态重组与母带差异像素比例约 3.3%，浏览器 50% 叠加未发现人物身份、头身比、裙摆或尾根错位。Run 预览不加载母带动作帧，P0/P2/P4/P6 均由实时曲线求值。

## 6.2 2026-08-21 用户更新 V1 正式资产

当前继续验收的角色资产位于：

`character-packs/default-whale/source/bind-pose-v3/textures/animation-v1-gpt-update-candidate/`

该候选遵循 [CHARACTER_ASSET_PIPELINE.md](./CHARACTER_ASSET_PIPELINE.md)：

- 全部零件使用 `1024×1024` 共享画布；
- 近远腿等高并绑定用户确认的骨盆、髋、膝、踝数据；
- 远侧手臂中的错误头发像素已移回头发语义层；
- 颈侧卷发 V3 从隐藏根部到卷曲末端整束替换，不再拼接单独发梢；
- 双臂已由完整干净资产拆为上臂袖、前臂袖、袖口与手，并接入肩—肘—腕三级实时层级；绑定重组差异为 0 像素；
- 浏览器已验收绑定、交替摆臂和连续跑步两个相反相位，未发现头发/裙子误绑定、袖口缺口或运行报错；
- Hair/Tail/Ahoge 已使用纹理网格与独立固定步长 Spring；主动画暂停后仍可自然衰减；
- 该资产已通过内容哈希清单提升为 `runtime/rig2/` 正式角色包，并接入生产 `WhaleRenderer`。

旧 `runFrame`/24 姿态轨只保留为源码与动作参考。它不在生产资产白名单中，也不进入 npm 安装包；生产客户端只导入 WhaleRig2。

## 7. 失败条件

以下任一项出现即不通过：

- 新 Runtime 或预览页面加载完整人物动作帧。
- 动作由 `frameIndex++`、离散 UV 切换或预渲染图片驱动。
- 改变速度或时长需要重新生成图片。
- 四肢没有真实父子 Bone hierarchy。
- 骨骼 Debug Overlay 与人物运动不一致。
- 静态组装存在断头、断肢、裙摆重复、比例突变或明显接缝。
- 连续播放看起来像零件漂浮而不是完整动漫角色。

## 8. 生产验收结果（2026-08-21）

- Tail/Hair/Ahoge Mesh、独立 Spring、Idle/Run/Working 等状态混合和 DSH 生命周期均已接入。
- 生产使用透明 Canvas 2D CPU 蒙皮；无需 Rive、Live2D 或新增运行时依赖。
- 质量档位：高质量为 256 内部像素、活动 60fps/待机 30fps；省资源为 192 内部像素、活动 30fps/待机 20fps；两者动画来源相同。
- 隔离 DSH profile 实测：112px 舞台，向外跑采到 23 个不同实时画面，镜像回程采到 8 个不同实时画面，无 console/page error。
- 完整浏览器流程通过：加载、菜单、拖拽、设置、摸摸、隐藏/召回、追蝴蝶、指针拜访、打盹、持久化与清理。
- 全量门禁：39 个测试文件、168 项测试、TypeScript、构建和 `npm pack --dry-run` 全部通过。

下一阶段不再改动运行时架构，重点转向新增经视觉验收的表情/嘴型、跳跃关键资产、长时间性能与可访问性测试。
