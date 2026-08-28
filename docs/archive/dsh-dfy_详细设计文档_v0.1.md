# dsh-dfy 详细设计文档 v0.16

> 修订基线：DeepSeek Harness `0.1.0-rc.5`（本地 `deepseek-harness` 源码，2026-08-19）。本文保留原文件名，内容版本升级为 v0.16。产品事实见 `PRODUCT.md`，角色与文案基线见 `dsh-dfy_角色设定文档_v0.1.md` v0.3，完整用户体验时序见 `dsh-dfy_体验设计文档_v0.1.md` v0.10。

# 0. 文档定位与已核实基线

本文用于指导 dsh-dfy 的产品设计、架构实现、Codex 开发和 GitHub 开源。宿主接入不再基于假想 Adapter：当前 DSH 已确认采用 Cordis 插件生命周期、Host/Browser 双入口、Web Slot UI 扩展、Session Projection 会话投影、Client Store 设备偏好与 Storage Domain 宿主持久化。核心养成逻辑仍保持宿主无关，具体 DSH 接口集中在边界层。

| 状态 | 说明 |
|---|---|
| 已确定 | 项目名为 dsh-dfy；默认角色是与 Harness 工作状态联动的“大肥鱼”，产品定位为“嘴硬但会干活的工位搭子”。 |
| 设计原则 | 插件品牌与第三方角色 IP 分离；默认素材应自制或使用明确授权资源。 |
| 已核实的宿主接口 | 插件为 Cordis 模块；浏览器 UI 注入 `shell.overlay`；会话事件通过 Session Projection 投影到客户端；rc.5 第三方用户偏好使用 root-scoped Client Store；养成数据使用 Storage Domain。 |
| 兼容基线 | 首版只声明支持 DSH `0.1.0-rc.5`；DSH 仍处于预发布阶段，升级必须重新跑真实组合 smoke test。 |
| 首要工程策略 | 领域 reducer 与 DSH 边界分离；先完成可安装的双面插件闭环，再扩展养成内容。 |

## 0.1 本次修订结论

- 角色体验不采用“潜航节律”或深海神秘叙事。核心节奏改为“干活—邀功—摸鱼”，核心表演为“气泡嘴硬、身体诚实”。
- Harness 空闲时启用可中断的自主生活小剧场：她围绕 homeAnchor 产生意图、在有限领地活动，用户可轻度改变结局；工作事件始终优先并安全清理故事状态。
- 默认关系是平等的损友/同事/长期搭档，不默认称用户为“主人”，不把亲密成长写成服从成长。
- 角色稳定核心与社区流行梗分层：爱吃白饭、聪明可靠、嘴硬心软、不承认胖属于稳定核心；Token、鱼片、模型版本笑话属于可替换低频梗层。
- 桌宠默认可视高度以约 96–112px 为基线，优先保证脸、呆毛、耳鳍与鲸尾可读，避免占用大面积工作区。
- 插件发布为带 `dsh.bundle.patch` 的组合包，通过 `dsh plugin --profile <name> add <package>` 安装；不能只提供一段前端代码。
- 包根入口 `.` 是 Node/Host 插件，`./client` 是浏览器插件。函数型插件使用 Cordis 具名导出：Host 按需提供 `name`、`inject`、`Config`、`apply`，Browser 至少提供 `inject`、`apply`；禁止把 default export 与函数型对象混用。
- 浮动鲸鱼注入加法型 `shell.overlay` Slot；禁止占用 `root`，否则会替换整个 Web 应用。
- Host 只投影白名单化的状态枚举和序号，不向浏览器传递提示词、代码、工具参数、文件路径或终端输出。
- 会话联动使用 Session Projection，可在刷新后从已提交事件重建；宠物长期数据使用 Storage Domain。rc.5 的 Web API 只暴露内置 Settings namespace，第三方插件不能伪造白名单项，因此本版普通偏好与视口位置共用一个 root-scoped Client Store，并明确为设备本地数据；宿主未来提供第三方 exposure metadata 后再迁移跨浏览器偏好。
- 当前浏览器模块不是普通 ESM/Vite 产物，构建必须输出 DSH Module Loader 所需的 factory 注册格式。
- 当前 `/plugins` 只承载 `client.js` 与 sourcemap；正式角色资产由 Host 通过 `webServer.register()` 挂载插件自有的受限、版本化资源路由，不能假设包内 `assets/` 会被 DSH 自动发布，也不能把大型图集无条件塞进 `client.js`。
- 默认角色渲染采用项目自有 WhaleRig2 轻量实时方案，不依赖 Cubism Core，不引入完整刚体物理引擎。19 张静态语义零件通过骨骼层级、关键帧曲线、CPU Mesh 与独立 Spring 在运行时生成待机、工作和跑步；所有动作共享参数协议、舞台 Pivot、状态混合、镜像和外层位移，不使用动作序列帧，也不宣称拥有原图中不存在的独立遮挡层或表情贴图。
- WhaleRig 是 Browser 插件内部实现，不注册新的 Harness 公共 Service，不修改 agent loop、SessionEventMap 或模型请求；`core/behavior` 只输出与渲染技术无关的 `BehaviorIntent`。
- 所有 Host/Browser 注册、监听、路由、投影、Slot、计时器和渲染循环都由调用方 Cordis fiber 的 effect 持有；卸载、HMR、页面隐藏和 Canvas 运行时销毁必须有明确收口。

## 0.2 实现时的 DSH 依据

以下文件是本次结论的本地源码依据；实现时应再次对照当前 checkout，但独立插件不得通过相对路径 import DSH 仓库内部源码。

| 主题 | DSH 参考文件 |
|---|---|
| Bundle 发布与 profile 安装 | `../deepseek-harness/docs/user/develop/basic/publish.zh.md` |
| 插件架构与扩展原则 | `../deepseek-harness/docs/architecture.md`、`../deepseek-harness/AGENTS.md` |
| Client 模块发现与 `/plugins` 路由 | `../deepseek-harness/packages/client/modules/src/index.ts` |
| factory bundle 契约 | `../deepseek-harness/packages/client/tsdown.client.ts` |
| `shell.overlay` Slot、root scope 与指针穿透 | `../deepseek-harness/packages/client/ui-layout/src/client/index.ts`、`../deepseek-harness/packages/client/ui-layout/src/client/AppFrame.tsx`、`../deepseek-harness/packages/client/ui-layout/src/client/AppFrame.module.css` |
| 会话事件类型与 turn reason | `../deepseek-harness/packages/core/session/src/types.ts` |
| Session Projection | `../deepseek-harness/packages/session/session-projection/README.zh.md` |
| rc.5 Settings 白名单限制与 Client Store | `../deepseek-harness/packages/host/apiproxy/src/api-proxy.ts`、`../deepseek-harness/packages/client/runtime/src/client/contract/store.ts` |
| Client Store 持久化 | `../deepseek-harness/packages/client/runtime/src/client/contract/store.ts` |
| Storage Domain | `../deepseek-harness/docs/subsystems/storage.zh.md` |
| Web profile 的实际组合 | `../deepseek-harness/packages/bundle/web-app/cordis.patch.yml` |

## 0.3 社区插件案例核对：dsh-web-ui / dsh-pet

[`zhu1090093659/dsh-web-ui`](https://github.com/zhu1090093659/dsh-web-ui) 中的 `@linxin666/dsh-pet` 是可参考的第三方双面插件案例，但其当前主分支依赖 DSH `0.1.0-rc.7`，本项目仍以本地 `0.1.0-rc.5` 源码为唯一兼容判据。

| 案例做法 | 本项目结论 |
|---|---|
| 一个 npm 包同时声明 `dsh.bundle` 与 `dsh.client`，patch 只插入一个包根 Loader 行 | 采用；DSH 自身测试也明确允许同一 manifest 有 sibling dsh roles。 |
| `.` 输出 Host 插件，`./client` 输出 Browser 插件，另导出 `./invariant` 与 `./package.json` | 采用，并把两面产物、类型、patch、assets 全部纳入发布清单。 |
| Host 通过 `webServer.register()` 提供同源 JSON API 和受限媒体路由 | 采用；角色资产不再整体内联进 `client.js`。 |
| 使用 Settings namespace 保存可编辑偏好 | rc.5 不采用；第三方 namespace 未进入 Web API 明确白名单。设置页与 Overlay 共享一个官方 Client Store，设备本地持久化，不能伪装为内置 namespace。 |
| Browser 自行 `createRoot(document.body)` | 不采用；当前本地 Harness 已提供 root-scope 的 `shell.overlay`，插件必须通过 Slot 加法组合，禁止建立第二 React 根。 |
| Browser 每约 2 秒轮询 Host 宠物状态 | 不照搬；会话活动走 Session Projection 推送，PetSave 只在首次挂载、恢复可见、打开面板和命令成功后读取。 |
| 自管 `$DSH_HOME` JSON 文件与 spritesheet 状态机 | 只参考其体验与资产组织；本项目长期数据走 Storage Domain，角色渲染为私有 WhaleRig2 实时骨骼/网格/弹簧 + 静态降级。 |

# 1. 产品愿景与差异化

**一句话定义：** 一位住在 DeepSeek Harness 里的蓝色大肥鱼——嘴硬、贪吃、会摸鱼，但关键时候真的能干活。

它不是“在窗口上播放一个 GIF”，也不是泛用鲸鱼萌宠。产品把桌宠、工位搭子、Harness 状态反馈和轻量陪伴组合起来，让角色通过工作反差而不是数值仪表盘产生生命感。

| 层级 | 体验 | 必须回答的问题 |
|---|---|---|
| 桌宠层 | 点击、摸头、拖拽、动画、表情 | 它是否“活着”？ |
| 角色表演层 | 嘴硬台词、诚实的脸/呆毛/鲸尾、吃饭与摸鱼 | 它是否像“大肥鱼”，而不是泛用桌宠？ |
| Harness Companion | Thinking / Tool / Done / Error 联动 | 它是否既看得懂工作状态，又不虚构进度？ |
| 长期陪伴层 | 记忆、工位小账本、陪伴天数、成就、表达适应 | 一个月后她是否还是“我的那只大肥鱼”？ |
| 生态层 | Character Pack、Theme、Mod | 社区能否低成本扩展？ |

## 1.1 产品目标

- 在 10 秒内让新用户理解“这是一个会跟着 Harness 工作、会偷懒顶嘴的大肥鱼搭子”。
- 第一版无需复杂 AI，也能依靠状态机、事件和动画产生明显生命感。
- 第一版即可看出“认真干活 → 得意邀功 → 立刻摸鱼”的招牌反差。
- 所有长期状态默认本地持久化，重启后宠物不会“失忆”。
- 核心逻辑与角色素材解耦，为 Character Pack 预留稳定接口。
- 不给开发者制造签到压力，不把真实 API Token 消耗设计成付费/惩罚机制。

## 1.2 非目标

- MVP 不做完整聊天机器人，不与 DeepSeek 主助手争夺对话入口。
- MVP 不做复杂商城、氪金、联网排行榜或强社交。
- MVP 不让宠物因用户离线而死亡、永久降级或清零连续记录。
- MVP 不强依赖云端账户；联网能力后续必须是可选项。
- 不默认绑定“溟月”等第三方角色名或素材。
- 不做深海精灵、潜航陪伴或神秘治愈叙事；鲸鱼元素服务于视觉识别，不支配全部体验隐喻。
- 不做唯命是从的女仆，不默认建立“主人—宠物”关系。

# 2. 产品体验原则

| 原则 | 落地要求 |
|---|---|
| 状态是性格，不是仪表盘 | 数值必须改变动作、台词和行为；避免只显示“好感度 65”。 |
| 角色一致性优先 | 所有动作与文案遵循角色设定文档；摸鱼是表演，能干是底座。 |
| 语言与身体双通道 | 气泡可以嘴硬，表情、呆毛、耳鳍和鲸尾表达真实情绪。 |
| 低打扰 | 工作时不弹大窗口、不遮挡代码；默认以微动画和气泡反馈为主。 |
| 回归友好 | 几天没打开时欢迎用户回来，而不是惩罚、责备或“濒死”。 |
| 彼此养活 | 用户可以投喂她；她也会用完成反馈、休息提醒和回归欢迎照顾用户。 |
| 正反馈 | 投喂、正常完成工作回合、错误后恢复、陪伴天数带来新动作、表情和共同记忆。 |
| 可预测 + 有惊喜 | 核心状态变化可理解，自主故事有因果，低频彩蛋保持非破坏性。 |
| 隐私优先 | 默认只保存统计事件，不保存代码正文、提示词或文件内容。 |

# 3. 核心循环（Core Loop）

用户打开 Harness → 恢复界面偏好与陪伴记忆 → 会话事件形成活动投影 → 大肥鱼进入“干活—邀功—摸鱼”的角色化反馈 → 用户互动/投喂 → Host 确认写入 → 工位小账本按日期滚动结算 → 下次启动继续。

| 阶段 | 输入 | 宠物反馈 | 长期结果 |
|---|---|---|---|
| 进入 | 启动 / 恢复会话 | 醒来、欢迎、恢复安全位置 | 陪伴天数/活跃天数幂等更新 |
| 工作 | Thinking / Tool / File / Terminal | 收起懒散、认真看文件或敲键盘 | 工作事件统计、能量变化 |
| 结果 | Done / Error / Retry | 得意邀功，或先惊吓再嘴硬装镇定 | 成就、心情、恢复记忆 |
| 互动 | 点击 / 摸头 / 投喂 | 即时动作和短台词 | 好感度、饱食度、表达权重 |
| 离开 | 长时间 Idle / 页面隐藏 | 吃白饭、趴桌、打瞌睡、玩尾巴或安静 | 关键变更发生时即持久化；下次启动补做小账本结算 |

# 4. 宠物状态模型

首版只持久化 4 个用户容易理解的数值，统一为 0–100。`focus` 与 `stress` 不再作为长期养成条，改为由当前 Harness 事件和连续结果推导的瞬时行为上下文，避免把桌宠做成维护六块仪表的负担。精确值不常驻，默认通过行为表达。

| 字段 | 含义 | 默认 | 变化规则 | 阈值表现 |
|---|---|---|---|---|
| hunger | 饱食度 | 60 | 随已观察到的活跃工作时间缓慢下降；不按离线真实时间无限衰减 | <25 饿；<10 很饿 |
| mood | 心情 | 70 | 回合正常完成、互动上升；连续失败、长时间工作轻微下降 | <30 低落；>80 开心 |
| affection | 好感度 | 10 | 有效互动、长期陪伴缓慢上升；原则上不因离线显著下降 | 阶段解锁 |
| energy | 精力 | 80 | 工作/活跃消耗；休息/睡觉恢复 | <20 困；>70 精力充沛 |

瞬时上下文：`workMode = idle | thinking | tool`、`pressure = calm | tense | recovering`。它们只决定当前动作，不作为需要用户照料的长期数值。

## 4.1 推荐衰减与保护规则

- 饱食度只按可验证的活跃工作区间结算；离线以及 DSH 后台常驻但无工作事件时不下降。
- 好感度不做日常负衰减，避免用户产生维护负担。
- 精力在睡眠/Idle 中恢复；Harness 长工作会降低，但最低不影响宿主功能。
- 饱食度低只触发吃货喜剧和投喂提示，不导致生病、死亡、能力下降或持续骚扰。
- 任何宠物状态都不得阻止 Harness 正常使用。
- 状态值应经过 clamp(0,100)，所有改变走统一 StateReducer，禁止 UI 直接修改存储。

## 4.2 建议公式（初始可调）

```text
# 在 turn/end 或用户互动时结算，不使用常驻 10 分钟 timer
active_minutes = clamp(turn_end_time - turn_start_time, 0, 120min)
hunger -= floor(active_minutes / 10min)
energy -= floor(active_minutes / 15min)
mood += 1 if turn_reason == 'completed' else 0
pressure = 'tense' if consecutive_error_turns >= 2 else 'calm'

# 下次事件到来时按 idle 间隔恢复，单次有上限
energy += min(floor(idle_minutes / 15min), 20)

# 投喂
hunger += food.satiety
mood += food.mood_bonus
affection += min(food.affection_bonus, daily_affection_cap_remaining)

# 摸头：使用冷却与收益递减，避免疯狂点击刷数值
if now - last_pet_at > 30s:
    affection += 1
    mood += 1
```

# 5. 行为状态机与事件优先级

宠物同时可能“饿、困、正在工作、刚刚出错或正在自主玩耍”。必须定义行为优先级，避免动画互相抢占。推荐采用“用户直接动作 > Harness 结果 > Harness 工作 > 生理/情绪修饰 > 自主剧场 > 微动作 Idle”的决策。任何 Harness 工作事件都能立即中断自主剧场。

| 优先级 | 类型 | 例子 | 规则 |
|---|---|---|---|
| P0 | 用户直接动作 | 被拖拽、正在投喂、打开详情 | 立即响应，动作结束后重新决策 |
| P1 | 关键 Harness | turn_failed、turn_completed | 短动画 1–4 秒，不能无限循环 |
| P2 | Harness 工作 | thinking、tool_call、reading、terminal | 持续到事件结束或超时 |
| P3 | 生理 | sleepy、hungry | 无工作时才主导 |
| P4 | 情绪/压力上下文 | happy、sad、tense、recovering | 修饰 idle/工作动画，不单独抢占 |
| P5 | 自主剧场 | 偷吃白饭、打盹、指针拜访、捉蝴蝶 | 只在 Harness idle 且页面可见时调度；可安全中断 |
| P6 | 工位 Idle | 呼吸、眨眼、玩尾巴、整理裙摆、偷瞄指针 | 低幅、低打扰调度 |

```text
resolveBehavior(context):
  if userInteraction.active: return interactionBehavior
  if recentCriticalHarnessEvent: return oneShotReaction
  if harness.isWorking:
    cancelAutonomyEpisode(reason='work')
    return harnessBehavior
  if energy < 20: return SLEEPY
  if hunger < 25: return HUNGRY
  if pressure == 'tense': return TENSE_IDLE
  if autonomy.canStart(context): return autonomy.nextEpisode(context)
  if mood > 80: return HAPPY_IDLE
  return weightedRandomIdle()
```

## 5.1 自主剧场状态机

```text
AutonomyEpisodePhase = 'notice' | 'intend' | 'attempt' | 'result' | 'recover' | 'return_home'

AutonomyEpisode = {
  id: string
  story: 'nap' | 'eat_rice' | 'cursor_visit' | 'butterfly' | 'tail_play' | 'tidy'
  phase: AutonomyEpisodePhase
  startedAt: number
  homeAnchor: ViewportAnchor
  target?: SafePoint
  branch?: string
  interruptible: true
}
```

- 每个故事必须声明允许进入的上下文、最大时长、可打断点、用户介入分支、清理函数和回家策略。
- `turn/start`、拖拽、页面隐藏和安全区失效必须调用同一取消路径，清理道具、路径、timer 和临时点击热区。
- 工作打断可生成一个只在内存中存在的 `EpisodeResumeToken`，有效期不超过 10 分钟，只允许在工作结束后回调一次；页面刷新不恢复。
- 自主移动以插件拥有的视口安全边缘带和 `homeAnchor` 为主，不依赖 DSH 私有 class、层级或布局结构。只允许用通用语义排除规则避开 `button`、`a`、表单控件、`[contenteditable]` 与可聚焦元素；命中时取消故事，不动态绕路。
- 自动移动期间角色层必须 `pointer-events: none`，只用指针距离变化分支；角色稳定停下且未覆盖通用交互元素后才恢复自身热区。禁止模拟或转发底层点击。
- 指针活动采样节流到不高于 10Hz，只在内存保存最新 CSS 像素坐标与活动时间；不保存轨迹、按键值或输入内容。
- 路径在故事开始时一次性计算，以 `transform`/Web Animations API 执行；禁止逐帧读取布局或 React state 驱动每个动画帧。

## 5.2 行为意图与渲染解耦

领域状态机不得直接调用 WhaleRig、Web Animations API、Canvas 或 React。它只产生离散、可比较的 `BehaviorIntent`；Browser 编排层负责把意图解析成当前角色包支持的动作、表情、道具与降级表现。

```text
BehaviorIntent = {
  id: string
  channel: 'harness' | 'interaction' | 'autonomy' | 'idle'
  action: string
  expression?: string
  priority: number
  loop: boolean
  causeSeq?: number
  reducedMotion: 'preserve' | 'replace-static' | 'suppress'
}
```

- `BehaviorIntent` 不出现骨骼名、纹理名、网格参数或 Canvas 概念；同一领域行为可以由 WhaleRig2、静态占位图或测试 renderer 实现。
- 动作默认值在 `resolveAction(intent, manifest)` 一次解析并返回完整 `ResolvedAction`，执行路径不得散落 `?? default` 或隐式兜底。
- 缺少必需静态部件的内置 manifest 在构建和测试时失败；Canvas 不可用、资源加载失败或 reduced motion 属于运行环境降级，切换到权利清晰的静态角色而不影响 Harness。
- 工作事件产生新意图时，编排器取消低优先级动作、道具路径和故事 token，再提交工作动作；renderer 无权延迟、改写或虚构 Harness 状态。

# 6. 互动系统

| 动作 | 反馈 | 养成权重 | 限制 |
|---|---|---|---|
| 单击 | 短回应 / 看向鼠标 | 低 | 可连续触发但动作去抖 |
| 摸头 | 躲开、害羞或嘴硬；尾巴暴露真实心情 | 中 | 30 秒有效收益冷却 |
| 拖拽 | 跟随移动并轻微挣扎，放下后整理围裙 | 无 | 不得误触 Harness 主操作 |
| 双击 | 打开宠物详情或快捷菜单 | 无 | 可配置 |
| 投喂 | 播放进食 + 数值变化 | 高 | 不同食物有 cooldown / daily cap |
| 长按 | 抱住光标影子或护住饭碗 | 低 | 可作为隐藏彩蛋；不捕获或移动真实指针 |
| 戳肚子/叫胖 | 鼓脸否认、尾巴拍一下 | 无 | 只做友善彩蛋，不鼓励连续打扰 |

## 6.1 好感度阶段

| 好感度 | 阶段 | 表现 |
|---|---|---|
| 0–19 | 初见 | 礼貌但维持体面；偷吃被发现会马上藏起来 |
| 20–39 | 熟悉 | 主动看向用户、跟随鼠标，开始轻度互相吐槽 |
| 40–59 | 亲近 | 解锁抱住光标影子、嘴硬关心和反向休息提醒 |
| 60–79 | 信赖 | 失败时不责怪，恢复成功时共同庆祝 |
| 80–100 | 老朋友 | 纪念日、专属小账本、更多低频私房动作 |

关系成长只改变熟悉程度和表达方式，不把她训练得更服从；默认始终使用平等称呼。

# 7. 投喂与轻量经济系统

投喂围绕“爱吃白饭”建立识别度，不再用一套泛用游戏食物充当主要经济系统。Token 只保留为次要社区梗，绝不对应真实 API Token 消耗。首版不做商店货币：基础白饭始终可用，特殊食物才进入库存并来自正常使用或成就。

| 食物 | 稀有度 | 效果（示例） | 来源 |
|---|---|---|---|
| 小碗白饭 | 基础 | +12 hunger, +3 mood | 始终可投喂；数值收益有 30 分钟冷却 |
| 加蛋白饭 | 稀有 | +18 hunger, +5 mood | 错误后恢复成功 |
| 工位便当 | 稀有 | +22 hunger, +4 energy | 长工作里程碑 |
| Token 饭团 | 彩蛋 | +15 hunger, 特殊偷吃动作 | 低频成就；纯本地梗 |
| 神秘零食 | 彩蛋 | +8~16 hunger | 低频彩蛋；不使用“鱼片”作为日常食物 |

食物差异主要服务动作、台词和共同记忆，而不是鼓励用户计算最优数值。冷却中的基础白饭仍播放极短回应，但不增加数值或好感；这样首次投喂和回归体验永远可完成，又不能靠连续点击刷成长。即使特殊食物库存为空，大肥鱼也不会因饥饿持续弹窗。

# 8. 长期记忆与工位小账本

“记忆”应以事件统计和里程碑为主，不默认保存敏感对话或代码。目标是让宠物能记住共同经历，而不是建立第二套聊天记录。

| 字段 | 含义 | 保存周期 |
|---|---|---|
| first_seen_at | 第一次见面时间 | 永久 |
| days_together | 从第一次见面到当前的自然日 | 永久 |
| active_days | 实际打开插件的天数 | 永久 |
| longest_streak | 最长连续活跃天数 | 永久 |
| total_interactions | 总互动次数 | 永久 |
| total_feed_count | 总投喂次数 | 永久 |
| completed_turns | 正常完成的 Harness 回合数（不等同于用户任务数） | 永久 |
| turn_end_counts | 按 completed/error/blocked/max-tokens/aborted/interrupted 分类计数 | 永久 |
| longest_session_minutes | 最长活跃会话 | 永久 |
| favorite_food | 最常投喂食物 | 动态 |

## 8.1 小账本生成

每日日期滚动时或次日首次启动时，从当天统计事件生成 2–5 句“大肥鱼的工位小账本”。数据事实与角色口吻分层：事实必须准确，角色可以轻度嘴硬、邀功或甩锅，但不能改写完成/失败状态。不要依赖浏览器关闭回调，因为进程退出时它不保证执行。MVP 用模板生成，无需调用模型。

```text
2026-08-18
今天有 4 个 Harness 回合顺利完成。
有一个错误好像折腾了很久，不过最后解决了。
我当然一点都不担心，最后还不是顺利搞定了。
另外，我只吃了 2 碗白饭。很少，对吧？
```

# 9. 自主生活事件与表达适应

自主事件用于制造“她有自己的生活”的感觉，不能只是随机动画，更不能打断用户工作。每段明显事件采用“发现—意图—尝试—结果—角色化收尾”，并遵循低概率、可取消、无惩罚原则。

| 事件 | 条件 | 结果 | 频控 |
|---|---|---|---|
| 偷吃白饭 | Harness idle、页面可见、有库存 | 用户靠近可分支为藏碗/被发现；自动消耗可关闭 | 1/day |
| 指针拜访 | Harness idle、关系≥熟悉、指针停留 | 走到 40–64px 安全距离坐下；不持续追逐 | 1/10–15min |
| 捉蝴蝶 | 陪伴空闲、当天预算允许 | 在 150–240px 小舞台内尝试；用户可改变蝴蝶方向 | 0–2/day |
| 工位睡着 | energy < 30 且 idle | 趴桌或站着打瞌睡 | 低概率 |
| 尾巴出卖她 | 台词嘴硬后 | 尾巴显示真实开心、生气或担心 | 每类有冷却 |
| 认真模式 | 连续 error ≥ 2 | 收起懒散、专注处理；不夸张卖萌 | 事件结束即恢复 |
| 反向催休息 | 连续活跃工作达到阈值 | 一句短提醒；可关闭 | 最多 1/90min |
| 离开又回来 | 离线 2–7 天 | 特别欢迎 | 每次回归一次 |

## 9.1 自主剧场调度约束

- 默认 `homeAnchor` 周围 160–240px 为“守在工位”领地；可选散步模式只允许沿窗口底边与侧边安全带移动。
- 同一时间只运行一个 AutonomyEpisode，最多保留两个 10–30 秒短暂痕迹；明显事件结束后有 20–40 秒安静期。
- Harness working、页面隐藏、用户拖拽或路径失效会立即中断；中断不能延迟真实工作反馈。
- 关系阶段只能提高靠近意愿，不能突破安全距离、频率预算、安静模式和 reduced motion。
- 长期连续故事只保存 allowlist 中的离散标记，最长跨 7 个活跃日自动过期，不显示任务进度。

## 9.2 自适应表达权重

角色核心人格固定，不允许通过养成把她变成完全不同的人。系统只记录用户偏好，微调动作和台词权重。

| 权重 | 增长来源 | 行为影响 |
|---|---|---|
| interactionWarmth | 互动/摸头频繁 | 更主动靠近，但仍保留嘴硬 |
| foodMemory | 投喂偏好 | 记住常喂食物，改变进食台词 |
| nightAffinity | 夜间活跃多 | 夜间困倦/陪伴动作概率提高 |
| workBond | Harness 活跃与共同恢复 | 工作后邀功、共同庆祝动作更丰富 |
| banter | 用户经常触发吐槽彩蛋 | 友善互损台词权重提高；不升级为攻击性 |

# 10. DeepSeek Harness 联动设计

联动分为两层：Host 插件把已提交的会话事件折叠为小型 `WhaleActivityProjection`；Client 插件把投影与当前会话的实时 `running` 状态归一化为 `PetEvent`。领域逻辑不直接订阅 Cordis 事件。这样既能在页面刷新后重建状态，也不会把高频 `assistant/chunk` 或敏感 payload 推入 UI。

| DSH 已提交事件/状态 | 投影结果 | 内部事件 | 默认表现 |
|---|---|---|---|
| `turn/start` | `activity=working` | `WORK_START` | 整理围裙，从摸鱼态迅速进入工作态 |
| `step/start` | `activity=thinking` | `THINKING_START` | 认真凝视或看书，低频偷瞄饭碗 |
| `tool/call` | 增加 active call + 工具粗分类 | `TOOL_START` | 文件类翻看资料；终端类敲键盘；其他为通用干练工作动作 |
| `tool/result` | 移除对应 active call | `TOOL_END` | 仍有调用则保持 tool，否则回到工作等待态 |
| `turn/end: completed` | `activity=idle` + `reaction=success` | `TURN_COMPLETED` | 叉腰得意/等待夸奖，随后找饭或趴下；不宣称用户任务已完成 |
| `turn/end: error/blocked/max-tokens` | `activity=idle` + 对应 reaction | `TURN_FAILED` | 先惊吓再装镇定；不责怪用户、不无限循环 |
| `turn/end: aborted/interrupted` | `activity=idle` + `reaction=interrupted` | `TURN_INTERRUPTED` | 收起工具并平静嘴硬，不按失败惩罚 |
| Client `summary.running=false` | 实时兜底 idle | `HARNESS_IDLE` | 回到吃饭、趴桌、睡觉、玩尾巴或观察鼠标等工位 Idle |

不在首版推断 `USER_INPUT_ACTIVE`、文件读写细节或 retry 次数：当前稳定契约不足以可靠区分这些语义。若未来 DSH 新增正式事件或可选服务，只通过声明的事件类型或 `ctx.get(name)` 接入；不得探测方法存在、解析界面 DOM、命令文本或工具参数来静默改变语义。

## 10.1 内部事件模型

```text
type PetEvent = {
  id: string
  type: PetEventType
  timestamp: number
  source: 'harness' | 'user' | 'timer' | 'system'
  payload?: Record<string, unknown>   // 默认禁止放代码正文
  importance: 'low' | 'normal' | 'high'
}

interface HarnessAdapter {
  fromProjection(input: WhaleActivityProjection, session: SessionSummary): PetEvent[]
  getCapabilities(): HarnessCapabilities
}
```

`HarnessAdapter` 是纯转换器，不自行管理订阅。订阅生命周期由 Client Cordis fiber 管理，Host 投影注册的 disposer 也绑定 Host fiber，插件卸载/HMR 时必须自动清理。

## 10.2 Host 会话投影

```text
type WhaleActivityProjection = {
  schemaVersion: 1
  activity: 'idle' | 'working' | 'thinking' | 'tool'
  toolKind?: 'file' | 'terminal' | 'other'
  activeToolCount: number
  reaction?: 'success' | 'error' | 'blocked' | 'max_tokens' | 'interrupted'
  causeSeq: number
  changedAt: number
}
```

- 在 client-safe 的共享类型文件中对 `@deepseek-ai/dsh-session-projection/types` 的 `SessionProjectionMap` 做 declaration merge，声明 `'whalePet.activity': WhaleActivityProjection`。Host definition、wire、Client `session.projections.faceOf(...)` 和 React hook 必须共享这一张类型表，不在 Client 侧手写镜像接口。
- Host 通过 `ctx.sessionProjections.register(...)` 注册唯一 key（建议 `whalePet.activity`）。`init/apply/view` 必须同步、纯函数化；无关事件必须返回原状态引用。
- Projection definition 的 `schema` 按当前 DSH 公共类型提供严格 `ZodType<WhaleActivityProjection>`；这是 Session Projection 自身的契约，不能用类型断言跳过，也不能与 Settings 的 Schemastery schema 混为一物。
- 投影 key 是进程级注册，不能作为逐会话能力信号；投影空值必须能表达“该会话没有活动”，Client 根据值而不是 key 是否存在决定表现。
- `view` 返回全量 JSON 值，不能发裸增量或混入 PetSave；框架拥有事件驱动和快照一致性，领域插件不再私自订阅同一 `session/event` 来维护第二份投影状态。
- `stateVersion` 用于投影缓存失效；改变字段形状或折叠语义时递增。
- `changedAt` 必须取自 `SessionEvent.time`，不能在 `apply` 内调用 `Date.now()`，否则日志重放不再确定。
- 内部投影状态按 `callId` 跟踪未完成工具；Client 的 live `runningCalls` 只作实时校验和断线期间兜底。
- `toolKind` 只允许根据工具名称白名单归类，不保存工具参数、结果、文件路径、命令或正文。未知工具统一为 `other`。
- `assistant/chunk` 不改变投影，避免 token 级事件风暴。
- `turn/end` 的 `causeSeq` 是一次性反馈标识。Client 以 `(sessionId, causeSeq)` 去重，过期反馈不补播。

## 10.3 多会话仲裁与一次性动画

- 当前选中的会话优先决定鲸鱼状态；当前会话不存在时显示全局 idle。
- 其他后台会话正在运行时，只显示低幅度的“后台忙碌”提示，不抢占当前会话的动画和气泡。
- 会话切换和连续事件采用 250–500ms 合并窗口，避免鲸鱼在 `thinking/tool/working` 间闪烁。
- success/error 等反馈只播放一次，默认有效期 4 秒；刷新后若事件时间已过期则直接显示当前稳定态。
- Client 仅保存有限的已见游标（例如最近 32 个 session），防止去重集合无限增长。
- 大肥鱼的台词只能解释投影中明确存在的状态，不能根据动画虚构“已经修好”“文件没问题”或“任务完成”。
- 若连续失败后出现成功，可播放一次“松口气 → 强行邀功”的恢复动作；该模式比单纯成功更能表达角色，但仍以 `causeSeq` 去重。

## 10.4 多标签页与可见性收敛

- 同一 origin 优先使用 Web Locks API 的 `dsh-dfy:presentation` 锁选出可见、聚焦的 `presentationLeader`；不支持 Web Locks 时才使用 `BroadcastChannel('dsh-dfy')` + 独立 localStorage 短租约（随机 tabId、心跳、TTL、确定性冲突退让）。
- 只有 leader 运行 L2/L3 自主故事、主动提醒并提交 `record-story-outcome`；非 leader 只显示 L0/L1 状态，避免重复故事和长期记忆膨胀。
- leader 隐藏、失焦、卸载或租约超时后释放；接管者从稳定状态开始，不迁移路径、道具或 EpisodeResumeToken。
- `BroadcastChannel` 不可用时，各标签页可本地播放基础动画，但禁用自主故事持久化和主动提醒；不能用无锁写入换取功能完整。
- 页面可见但用户离开时，结果反馈仍只消费一次，可保留最长 10 分钟的静态姿势/书签。页面隐藏期间不播放；恢复后只有 5 分钟内、未消费的 `causeSeq` 可转成一次静态结果收据，不重播庆祝、不重复奖励。

# 11. 成就、服装与房间

| 成就 | 条件 | 奖励 |
|---|---|---|
| 工位新同事 | 第一次启动 | 初见动作 |
| 第一碗白饭 | 第一次投喂 | 藏饭碗动作 |
| 刚才那个不算 | 首次从错误恢复到成功 | 松口气后邀功动作 + 加蛋白饭 |
| 深夜搭子 | 深夜活跃达到指定时长 | 趴桌夜灯动作 |
| 这点活交给我 | 累计工具事件达到里程碑 | 专属认真工作动作 |
| 我才没等你 | 好感度达到 80 | 嘴硬欢迎动作 |
| 互相养活 | 陪伴 100 天 | 纪念动作与小账本封面 |

完整房间系统建议放在 MVP 之后。若扩展场景，优先做与角色一致的“工位角落”：饭碗、矮桌、小电脑、抱枕和夜灯；先定义可装备槽位与解锁表，再评估更大的房间界面。

# 12. Character Pack 与 WhaleRig 规范

WhaleRig 是本插件拥有的轻量参数动画运行时，不是 Cubism 兼容层，也不是 Harness 公共能力。它只服务当前已确认的角色表现：部件层级、少量局部网格、参数曲线、动作混合、命名提示点与次级弹簧物理。`core/behavior` 不依赖它，Character Pack 只提供声明式模型、动作映射、静态降级和可选台词。

默认“大肥鱼”包必须通过 `dsh-dfy_角色设定文档_v0.1.md` 的一致性验收，并使用项目自有或明确可再分发的原始素材。资产管线从 PSD/Krita 等通用分层源文件进入项目，不读取、转换或兼容 Cubism `.moc3`、`.model3.json`、`.motion3.json` 等输出。

当前 DSH `/plugins` 路由只提供客户端 bundle 与 sourcemap，不会自动发布包内任意 `assets/`。这不妨碍双面插件在 Host 侧通过正式 `webServer.register()` 注册自己的资源路由。资产交付采用以下两阶段：

- Phase 0：早期使用小型内联占位 fallback 验证 Browser 插件即使渲染器初始化失败也不会拖住 Harness；该错误视觉占位已在获批角色接入时移除。
- v0.1 正式角色：Host 注册 `/dsh-dfy/assets/v1` 前缀路由，按构建期生成的只读资产索引提供默认 WhaleRig JSON、PNG 图集与 fallback；shader 固定在受审查的客户端代码中，角色包不得提供 shader 或脚本。URL 带内容 hash，响应使用固定 MIME、大小上限和 immutable 缓存。Client 不提交文件路径，Host 不接受目录遍历、任意磁盘路径或动态 MIME。
- v0.2+ 外部 Character Pack：复用同一受限路由，但必须先完成安装来源、manifest 签名/版本、解包限额、路径规范化、授权信息和卸载失效策略；角色包仍是数据，不执行脚本。

资源 route 与 API route 都由 Host 插件 fiber 的 effect 持有；插件禁用或卸载后必须同时消失。Rig2 清单、静态部件或 Canvas 初始化失败时，Browser 使用同一条白名单资源 route 显示获批角色 PNG，而不是重新出现旧占位形象或令 Client plugin apply 抛错。

## 12.1 WhaleRig v0 资产格式

```text
character-packs/default-whale/
├── source/
│   └── canonical-transparent.png
├── runtime/
│   ├── manifest.<hash>.json
│   ├── character.<hash>.png
│   ├── character-motion-atlas.<hash>.png
│   ├── rig.<hash>.json
│   ├── expressions.<hash>.json
│   ├── physics.<hash>.json
│   └── motions/
│       ├── idle.<hash>.json
│       ├── working.<hash>.json
│       ├── smug.<hash>.json
│       ├── denying.<hash>.json
│       ├── ready.<hash>.json
│       └── run.<hash>.json
├── SOURCE.md
└── LICENSE
```

```text
{
  "schemaVersion": 2,
  "id": "default-whale",
  "displayName": "大肥鱼",
  "canvas": { "width": 112, "height": 112 },
  "files": {
    "atlas": "character-motion-atlas.<hash>.png",
    "fallback": "character.<hash>.png",
    "rig": "rig.<hash>.json",
    "expressions": "expressions.<hash>.json",
    "physics": "physics.<hash>.json"
  },
  "performances": {
    "ready": { "motion": "motions/ready.<hash>.json", "pose": "front-ready", "loop": true, "mirrorable": true },
    "run": { "motion": "motions/run.<hash>.json", "pose": "front-run", "loop": true, "mirrorable": true, "stridePx": 22 }
  },
  "actions": {
    "idle": {
      "motion": "motions/idle.<hash>.json",
      "pose": "idle",
      "expression": "neutral",
      "loop": true,
      "mirrorable": true
    }
  },
  "capabilities": ["drag", "pet", "feed", "expressions"]
}
```

`rig.json` 只描述项目需要的事实：部件父子关系、绘制顺序、锚点、角色挂点、交互热区、纹理坐标、局部网格和参数绑定。`motion` 只包含参数曲线、离散状态/事件轨、时长与命名提示点；默认值由 manifest 解析阶段一次补齐，renderer 执行时只接收完整、已验证的 `ResolvedRig` 与 `ResolvedMotion`。

## 12.2 WhaleRig2 运行时边界

| 组件 | 职责 | 明确不做 |
|---|---|---|
| Rig loader | 严格解析内置 Rig2 manifest、静态语义纹理与弹簧参数 | 不读取任意文件路径，不接受脚本 |
| Scene graph | 骨骼/部件父子变换、绘制顺序和挂点 | 不提供通用 3D 场景 |
| Mesh deformer | 双腿 CPU 蒙皮；头发、鲸尾和呆毛网格变形 | 不加载完整人物姿态帧，不播放视频 |
| Motion state machine | 实时采样关键姿势并插值；状态切换时短时混合 | 不决定业务行为，不解释 Harness 事件 |
| Spring solver | 呆毛、耳鳍、裙摆、头发和鲸尾的有界阻尼跟随 | 不做刚体世界、重力、碰撞或寻路 |
| Canvas 2D renderer | 单角色透明画布、静态纹理三角映射与分层合成 | 不接管全屏，不建立第二个 React root |
| Static fallback | 资源/画布加载失败时保持角色可见 | 不伪装为完整动作能力 |

角色整体在局部舞台中的走动和回位由共享 `CharacterMotionController` 以外层 compositor `transform` 驱动；蝴蝶、饭粒、气泡和短暂特效是独立 DOM/SVG Actor。Character Pack V1 正式版由 19 张 `1024×1024` 共享坐标静态语义 PNG 构成：双腿绑定髋—膝—踝，双臂绑定肩—肘—腕，头发、鲸尾和呆毛使用纹理网格。`run` 为 900ms 连续循环，实时插值双腿交替、反向摆臂、身体起伏、前倾与头部反向补偿；状态切换只在 180ms 边界内混合，不在 Run 内部用 CrossFade 掩盖离散帧。

WhaleRig2 已于 2026-08-21 替换旧生产路径。旧 `runFrame`、24 姿态图集和 motion JSON 只作源码/动作参考，不在 Host 资产白名单，也不进入 npm 包。任何新动作必须由静态零件、Rig、Keyframe、Mesh 与 Spring 表达，禁止重新引入 GIF、视频、Sprite Sheet 或动作 PNG 序列。

用户提供的视频与跑步母带只用于姿势方向、轮廓、节奏和视觉质量参照，运行时不读取其中任何帧。正式绑定图、关节和静态零件遵循 `CHARACTER_ASSET_PIPELINE.md` 的像素语义所有权与隐藏补全规则。

运行时使用局部 `requestAnimationFrame`：静止且无需次级运动时按需绘制；普通待机可限制模型更新到 24–30fps；短暂扑击允许跟随显示刷新；页面隐藏、插件卸载或角色被隐藏时停止。每帧不得读取布局、set React state 或创建无界临时对象。

每个活动帧按固定顺序求值：初始姿势 → 基础 motion → 高优先级局部 motion → expression → 视线/呼吸等程序参数 → 弹簧物理 → 参数限幅 → 骨骼和网格世界变换 → 绘制。顺序属于运行时契约，避免同一动作因调用先后不同而改变表情或尾巴结果。

弹簧求解使用固定时间步和有界子步：前台累计时间按 1/60 秒推进，每个显示帧最多执行 3 个子步；超额时间丢弃，页面恢复时不追赶后台帧并将不安全速度清零。所有输出经过 `maxOffset` 限幅，非法数值立即停止该链并记录脱敏诊断，不能把 NaN 扩散到整个模型。

WhaleRig2 作为 `src/client/renderer/whale-rig2/` 下的私有模块存在。当前只有一个 Browser renderer 消费者，因此不注册 `ctx.whaleRig`、不设计 Service Definition/Provider/Consumer seam，也不把通用引擎能力加入 DSH。只有出现第二个真实消费者并证明生命周期可独立演进时，才重新评估抽包。

自研不等于拒绝依赖。Spike 必须记录维护状态良好的候选库是否能同时满足自有资产格式、可抢占动作、静态降级、factory bundle、许可和资源预算；若某个依赖确实删除了运行时代码与测试且不引入更大的宿主风险，应优先采用。WhaleRig 只拥有无法被合适依赖消除的项目特定代码，不重复实现通用矩阵、schema 或测试工具。

动作时长、提示点、弹簧刚度/阻尼、最大偏移和模型限额属于经过 schema 校验的资产/协议数据，在解析阶段生成完整规格；部署安全项进入 Host `Config`。rc.5 下用户体验偏好与设备/视口态由同一个 root-scoped Client Store 明确设备本地持有；若宿主未来开放第三方 Settings exposure，再以迁移步骤拆分跨浏览器偏好。运行路径不得散落不可配置的体验数字或根据设备暗中改变角色语义。

## 12.3 捉蝴蝶执行契约

```text
ButterflyEpisode = {
  seed,
  phase,
  homeAnchor,
  waypoints,
  outcome,
  abortController
}
```

1. Episode 使用注入的种子随机源一次生成 3–5 个局部路径点和预定结局；蝴蝶不做逐帧随机游走，测试可复现相同路径。
2. `notice` 播放视线与抬头参数；`stalk` 复用走路动作并移动角色外层；`pounce` 在 `launch`、`handsClose`、`land` 提示点同步外层短弧线和蝴蝶挂点。
3. 命中不是刚体碰撞结果。`handsClose` 到达时根据预定结局、用户是否缓慢帮助和连续失败保护决定 `caught`/`missed`，再播放对应动作。
4. 指针最多 10Hz 影响蝴蝶下一路径点，不修改正在执行的路径段；蝴蝶和移动角色均不截获底层点击。
5. `turn/start`、用户拖拽、页面隐藏、视口失效和卸载调用同一 `abort()`：取消 WAAPI 句柄、移除道具、清空提示点回调、停止低优先级 motion，并在 150–250ms 内回到工作位置。
6. `prefers-reduced-motion` 下不生成追逐路径：蝴蝶在原位出现，角色只用视线、头部和静态合手姿势完成不超过 2 秒的等价故事。

## 12.4 角色包安全要求

- 角色包只允许声明式 JSON + 静态资源，不允许执行任意 JavaScript、shader 或表达式代码；v0.1 shader 固定在受审计的运行时中。
- 限制单包压缩体积、解码纹理、文件数量、网格顶点、参数、弹簧链、蒙版和动作时长，所有限制在完整解析结果已知的位置执行。
- 路径必须规范化，禁止 `../` 路径穿越；首版不得通过 `file://`、任意绝对路径或工作区路径读取素材。
- manifest、rig、physics 和 motion schema 严格校验，未知字段默认拒绝；内置包校验失败必须在构建/测试阶段大声失败，不能带病发布。
- 每个循环或位移动作必须声明取消语义、reduced-motion 替代表现与镜像规则；缺失时只允许静态展示，不能参与 AutonomyEpisode。
- 展示作者、许可证、原始分层素材来源与修改记录；第三方角色包由安装者自行确认授权。
- 只允许受控 MIME（WebP/PNG/JSON；SVG 仅用于独立道具并须净化或构建时转位图），禁止脚本、外链和事件属性。
- 不接受 Cubism 或其他受限运行时的专有模型输出作为输入；项目代码许可与角色素材许可分开记录。

# 13. UI / UX 设计

核心体验不是打开面板养数值，而是在工作区边缘看见一场持续但克制的“大肥鱼工位小剧场”。默认宠物约 96–112px 高，以右下角安全位置出现；用户缩放后仍需保持表情与鲸尾可辨认。首次体验、注意力预算、完整工作回合、共同记忆、详情浮层、异常状态和验收场景以 `dsh-dfy_体验设计文档_v0.1.md` 为实现依据。

| 界面 | 内容 | 默认行为 |
|---|---|---|
| 浮动宠物 | 角色动画、气泡台词 | 始终低打扰；可拖动；位置记忆 |
| 快捷菜单 | 投喂、摸头、睡觉、详情、设置 | 右键或长按打开 |
| 宠物详情 | 饱食度/心情/精力/好感度、偏好记忆、成就 | 不常驻；不展示 focus/stress 仪表 |
| 工位小账本 | 每日摘要、共同恢复、纪念日 | 可关闭/清空；事实与角色口吻分层 |
| 设置 | 动画、音效、透明度、事件联动、隐私 | 支持“一键安静模式” |
| 角色包管理 | 安装、启用、授权信息 | 后续阶段 |

## 13.1 低打扰规范

- 工作事件动画原则上不超过 4 秒，持续工作状态可循环但幅度小。
- 气泡台词默认 1–2 行，3–5 秒自动消失；高频事件合并。
- 宠物不得覆盖输入框、主要按钮；拖拽后保存安全位置。
- 默认只在状态切换、用户主动互动和低频彩蛋时出现气泡；常态生命感主要靠眨眼、视线、呆毛和鲸尾。
- “嘴硬—身体诚实”只在部分事件触发，不能每个状态都强行讲笑话。
- 提供“专注模式”：仅保留非常轻微的 working/idle 动画，关闭随机气泡。
- 提供全局暂停与隐藏，不影响状态持久化。

## 13.2 双通道表演规范

- 气泡表达她试图维持的体面，表情、呆毛、耳鳍和鲸尾表达真实情绪。例如嘴上说“我才没等你”，视线却追随鼠标。
- 动作先说明系统状态，再承载角色笑点。`error` 必须先让用户看出异常，再演“刚才那个不算”。
- 不同事件共用角色语法但不共用同一动画：成功是得意，恢复成功是松口气后强行得意，长工作完成是疲惫后邀功。
- 小尺寸下不要依赖饭粒、文字牌等细节传递核心含义；这些只作为近看彩蛋。

## 13.3 Overlay 交互与位置安全

- Client 组件通过 `ctx.slots.inject('shell.overlay', ...)` 注册。Harness 的 `.overlayLayer` 为 `pointer-events: none`，但其直接子条目会被恢复为 `auto`；因此本插件的条目根节点必须再次设置 `pointer-events: none`，只有静止鲸鱼热区、气泡和菜单节点显式恢复 `pointer-events: auto`。移动角色和所有装饰道具保持穿透。
- 拖拽仅从明确的抓取区域开始；交互控件内的点击不得误触拖拽。按下 `Escape` 关闭菜单/详情并取消当前拖拽。
- 位置保存为相对锚点 + 偏移，而不是只保存绝对像素；窗口缩放、侧栏变化、浏览器 zoom 或显示器变化后重新 clamp。
- 无论存档位置如何，至少保留 24px 可抓取区域在可视范围内。位置损坏或 schema 不兼容时回到右下角安全默认值。
- 不通过 DSH 专有 class、文本或层级推断输入区；自主移动只在视口安全边缘带内，并用通用语义选择器排除原生交互元素。命中排除区即取消移动，不尝试解析布局绕行。
- 默认尺寸不得按角色立绘比例铺满侧栏或工作区；96–112px 是角色本体基线，不包含短时气泡。缩放范围建议首版为 0.75–1.5。
- 视口宽度小于 1024px 时自动关闭 roaming 并缩小领地；小于 768px 时角色基线降为 80–96px，只运行 homeAnchor 附近动作。触控目标仍不得小于 44×44 CSS px。

## 13.4 无障碍与动效降级

- 遵守 `prefers-reduced-motion`；开启后禁用散步、指针拜访、追逐、漂浮位移、弹跳和快速帧动画，只保留原地表情/姿势或克制的透明度切换，不用瞬移替代移动。
- 鲸鱼入口可键盘聚焦，提供明确 focus ring、可读的 `aria-label`，菜单支持完整键盘导航。获得焦点时取消自主移动并回到安全静止姿势；菜单关闭后焦点回到触发控件。
- working/error 等关键状态不能只靠颜色或动画表达；详情面板提供简短文本状态。
- 自主蝴蝶、饭粒、抱枕等装饰层 `aria-hidden=true` 且不可聚焦；装饰气泡不进入 live region。连接/存档等关键变化使用去重的 `aria-live=polite` 文本。
- 粗指针/触控设备不依赖 hover、追踪指针或隐蔽手势；“叫她过来”“回工位休息”等功能始终有可聚焦菜单项。
- 音效默认关闭；开启后仍需提供独立音量、静音和事件类别开关。
- 页面不可见时暂停非必要动画和自主故事，恢复时不补播过期反馈。

# 14. 技术架构建议

```text
DSH Host / Cordis                                  DSH Browser / Cordis
┌───────────────────────────┐                     ┌──────────────────────────┐
│ Session events            │                     │ Session snapshots        │
│  └─ Session Projection ───┼── projection frame ─► Projection Adapter      │
│                           │                     │            │             │
│ Storage Domain            │                     │ Pet Command Client       │
│  └─ PetState + memories   │◄── command/result ──┤                          │
│                           │   same-origin HTTP  │            │             │
│                           │                     │            ▼             │
│ Plugin-owned API route    │                     │ Reducer / Behavior       │
└───────────────────────────┘                     │            ▼             │
                                                  │ Motion Orchestrator      │
                                                  │  ├─ WhaleRig2 / Canvas2D │
                                                  │  ├─ WAAPI root motion    │
                                                  │  └─ DOM/SVG props        │
                                                  │            │             │
                                                  │ shell.overlay + store    │
                                                  └──────────────────────────┘
```

| 模块 | 职责 | 约束 |
|---|---|---|
| core/domain | PetState、PetEvent、Inventory、Achievement 等纯领域对象 | 不依赖 Harness/UI |
| core/reducer | 所有状态变化 | 纯函数优先，易测试 |
| core/behavior | 行为决策、优先级、冷却 | 输出 animation intent |
| core/autonomy | 自主意图、故事阶段、分支、频控与中断 | 纯状态机；不读取 DSH DOM，不直接移动真实指针 |
| core/progression | 成就、奖励、表达权重、里程碑 | 与 UI 解耦，不改变核心人格 |
| host/projection | 折叠 DSH 会话事件 | 只输出小型脱敏 JSON，不写宠物存档 |
| host/settings | 注册 `dsh-dfy` namespace，把组合 `Config` 作为 base 并响应用户覆盖 | 普通偏好不进入 PetSave，不自建第二套设置协议 |
| host/storage | 打开 Storage Domain、串行执行宠物命令与会话奖励 | 宿主是养成长期状态唯一真源 |
| host/http | GET 状态、POST 命令与只读版本化资产路由 | 同源、schema 校验、限体积、幂等、路径白名单 |
| client/harness | Projection → PetEvent | 不解析 DOM、日志文本或工具参数 |
| client/store | 普通用户偏好、当前视口锚点、面板开合、动画/reaction 游标与 presentation leader | rc.5 下设备本地持久化；Overlay 与设置页共享唯一实例 |
| client/orchestrator | BehaviorIntent → ResolvedAction，动作优先级、提示点、取消和降级 | 不写领域状态，不延迟 Harness 事件 |
| client/renderer/whale-rig2 | 内部骨骼/纹理网格、关键帧、状态混合、弹簧与 Canvas 2D 绘制 | 私有模块，不注册 Harness Service |
| client/renderer/stage | 角色整体 WAAPI 位移、DOM/SVG 道具、气泡和点击热区 | 只在 `shell.overlay` 局部舞台活动 |
| packs | 声明式角色资源解析、默认值解析和安全限额 | 不执行脚本；v0.1 仅内置包 |
| ui | 详情、设置、工位小账本、库存 | 不直接改 state |
| tests | 单元、状态机、持久化、兼容性 | CI 必须运行 |

## 14.1 Cordis 双面插件与安装契约

- npm 包根入口 `.`：Host Cordis 插件。`sessionProjections`、`storageDomain` 与 `webServer` 是核心 Host 依赖；`settings` 通过 `installSettingsSection()`/`ctx.inject(['settings'], ...)` 可选挂接，服务缺席时回退到组合层 `Config`，不让用户设置 Provider 成为插件启动硬门槛。
- npm 子路径 `./client`：Browser Cordis 插件，只导出它真正消费的服务名，例如当前的 `slots`、`locale`；会话列表与投影通过 root Slot 标准 props 读取，不额外注入 `sessions`，rc.5 也不注入无法绑定第三方 namespace 的 `settingsScope`。不能把 npm 包名误写进 Cordis `inject`。
- `package.json` 同时声明 `{ "dsh": { "bundle": { "patch": "./cordis.patch.yml" }, "client": { ... } } }`，`exports` 至少包含 `.`、`./invariant`、`./client` 和 `./package.json`；`files` 必须覆盖两面产物、类型、sourcemap、patch、资产索引和获准发布的 assets。
- `cordis.patch.yml` 插入包根 Host 行；Client 模块扫描通过该已启用 Loader 行发现同包的 `dsh.client` 声明。
- `dsh.client.platform` 固定为 `web`；普通业务插件不设置 `immediately: true`。`dsh.client.inject` 只列包名形式的组合图元数据，初版预计为 Client Runtime、UI Layout、UI Settings 与 Locale 中实际依赖的条目；它只用于 preflight/HMR diff，不控制 apply 顺序。真正的激活等待由浏览器入口导出的 Cordis 服务名 `inject` 决定，二者不得混淆。
- React、Cordis、Client Runtime、UI Slots 等共享身份模块必须作为 peer/external 由 DSH Module Loader 提供，禁止把第二份实现打进 `client.js`；否则 Context、Service、Hook 或 React 实例可能不相认。
- Browser 源码对 `@deepseek-ai/*` 的 SDK/插件引用原则上只做 `import type` 或空的类型合并导入，运行时协作通过 `ctx` 服务与 Slot 完成；只有 DSH 明确列入 browser platform module table 的 React/Cordis/UI 基础模块，以及经当前构建基线批准的 external，才能产生运行时 `require`。产物 purity test 必须扫描意外内联与未知 external。
- 所有实际 import 的 DSH 包都声明与兼容基线一致的 peer dependency；CI 同时检查缺失 peer、意外内联和未解析 external。
- Host `Config` 不会自动出现在浏览器启动 manifest。部署安全项只属于 Cordis 配置；rc.5 普通用户偏好由 Client Store 保存，非设置型运行事实由脱敏 Host API/Projection 返回。不得把 Host Config、Client Store 和养成存档混成一份数据。
- 安装验证命令为 `dsh plugin --profile <profile> add <package-or-tarball>`，随后用 `dsh --profile <profile> --dump-config` 和真实 Web 启动验证。
- Client 必须通过 `ctx.slots.inject('shell.overlay', ...)` 等待声明，再用 `ctx.slots.register(...)` 添加有唯一 `id` 的条目；不得注册 `root`、自行 `createRoot()` 或依赖插槽加载顺序。条目根节点自行恢复点击穿透，因为 Harness 会给 Overlay 的直接子条目启用指针事件。
- 设置 UI 通过 `ctx.slots.inject('settings.section', ...)` 注册唯一 `id: 'whale-pet'` 的 root-scope 页面；桌宠快捷菜单与该页面绑定同一个 root-scoped Client Store handle，不能各自创建一份开关。设置壳未组合时，Overlay 仍按同一 Store 工作，不能因找不到展示 Slot 而让 Host 能力失效。
- `ctx.slots.register()` 与 `ctx.sessionProjections.register()` 使用其自带的调用方 fiber effect；HTTP route、额外事件监听和 renderer 资源通过 `ctx.effect()`/`ctx.on()` 持有。所有贡献必须在 fiber dispose 后可观察地消失，HMR 不保留第二份宠物或后台循环。
- `shell.overlay` 是 root scope 且没有业务 owner props；宠物通过正式 Client Runtime 会话面读取当前会话，不让 `ui-layout` 向它传递领域数据。
- Session Projection 只折叠已提交 `session/event`：`init/apply/view` 保持纯同步，无关事件返回同一状态引用，值只包含全量、JSON 安全、白名单字段；投影本身不写 PetSave。
- 桌宠不向模型注入提示词、工具或消息，因此不新增模型可见输入和 SessionEvent。若未来任何宠物信息进入模型请求，必须先按 Harness“model-visible means logged”原则设计耐久事件与回放语义。
- 不修改 `agent-loop`，不监听私有 UI DOM 来推断 agent 状态，不把一个内部 renderer 包装成没有第二消费者的 capability seam。宿主 API 缺失时使用正式可选注入降级，不能探测方法存在后静默改变语义。
- 内置静态资产与动作配置在构建时严格校验；运行环境不支持 Canvas 2D 或资源加载失败时使用静态 fallback。前者是发布错误并大声失败，后者是可预期能力降级，两者不得混为“什么都不显示”。

浏览器产物必须调用 `window.__ModuleLoader__.load({ id, factory })`，依赖由传入的同步 `require` 解析。不能直接把普通 Vite ESM 输出当作 `./client`。独立仓库应自带与锁定 DSH 版本配套的构建 helper，并用产物测试验证 factory handoff、CSS 清理和 external 集合；不得从相邻 `deepseek-harness` 工作树相对 import 构建脚本。Git 安装需要可自包含的 `prepare`；公开发布优先提供 npm 预构建包或 tarball，减少安装时执行代码的授权负担。

### 14.1.1 最小可安装插件清单

以下是实现期必须收敛到的结构，不是普通 React 应用清单：

```json
{
  "name": "dsh-dfy",
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": "^22.19.0 || >=24.0.0" },
  "scripts": {
    "build": "tsc -b && tsdown",
    "prepare": "tsdown --config tsdown.prepare.config.ts"
  },
  "main": "lib/index.js",
  "types": "lib/types/index.d.ts",
  "exports": {
    ".": { "types": "./lib/types/index.d.ts", "default": "./lib/index.js" },
    "./invariant": { "types": "./lib/types/invariant.d.ts", "default": "./lib/invariant.js" },
    "./client": { "types": "./lib/types/client/index.d.ts", "default": "./lib/client.js" },
    "./package.json": "./package.json"
  },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "inject": [
        "@deepseek-ai/dsh-client-runtime",
        "@deepseek-ai/dsh-client-ui-layout",
        "@deepseek-ai/dsh-client-ui-settings",
        "@deepseek-ai/dsh-client-locale"
      ],
      "platform": "web"
    }
  },
  "files": [
    "lib/**/*.js",
    "lib/**/*.js.map",
    "lib/**/*.d.ts",
    "cordis.patch.yml",
    "assets",
    "ASSETS_LICENSE.md"
  ],
  "license": "MIT"
}
```

```yaml
# cordis.patch.yml
- insert:
    - id: whale-pet
      name: dsh-dfy
```

`src/index.ts` 使用函数型 Host 插件具名导出；当前以可选 `ctx.inject(['sessionProjections'], ...)` 注册活动投影，并以可选 `ctx.inject(['webServer'], ...)` 注册受限资源路由，未来阶段才使用 `storageDomain`。`src/client/index.ts` 使用函数型 Browser 插件具名导出，当前只声明真正直接消费的 `slots` 与 `locale`；`useSessions`/投影来自 root Slot 标准 props，设置页与 Overlay 共享 Store seat。manifest 的 `dsh.client.inject` 是浏览器模块包图元数据，源码导出的 `inject` 是 Cordis 服务名；测试必须分别断言。rc.5 SDK 未完整发布到 npm，因此开发类型固定到可获得的 rc.7，peer 范围严格限制为 rc.5–rc.7，并以本地 rc.5 源码核对和真实安装测试作为兼容证据；不能用 `workspace:`、相邻源码 import 或未发布 deep import。

插件只允许一个稳定 Loader row id `whale-pet`。以后若被某个聚合 bundle 收录，聚合层必须复用该 id 或明确证明 direct/aggregate 安装不会产生双 mount；不得靠模块级布尔变量掩盖重复组合。真实组合测试要覆盖直接安装、禁用/启用、移除，以及未来存在聚合包时的共存路径。

## 14.2 首版写入通道

Session Projection 适合会话只读投影，不负责全局宠物数据写入。DSH 生成式 Remote 的可见方法由客户端组合显式选择，外部包不能假设自身 Remote 自动进入现有 `api-remotes`。因此首版采用插件自有路由：

```text
GET  /api/dsh-dfy/v1/state
POST /api/dsh-dfy/v1/commands

PetCommand =
  | { id, type: 'pet' }
  | { id, type: 'feed', foodId }
  | { id, type: 'record-story-outcome', storyId, outcome }
```

- 显隐、大小、安静模式、气泡、声音、自主生活等普通用户偏好不走 `PetCommand`。rc.5 下它们由一个 root-scoped Client Store handle 设备本地持久化，快捷菜单和 `settings.section` 页面读取同一实例，不能维护第二份配置真源；未来宿主若开放第三方 Settings exposure，迁移必须保留一次性导入与冲突规则。
- Host `Config` 与 Settings 使用 DSH 的 Schemastery schema；Session Projection 按其公共接口提供 Zod schema；插件自有 HTTP 请求/响应也必须经过一套严格、拒绝未知字段的 wire schema。无论具体 schema 库，领域层都只接收校验后的普通 JSON 值。写请求还要拒绝非 JSON、超限 body、跨源 Origin 和缺少插件自定义请求头的情况。
- `id` 为交互命令幂等键，防止重试或多个标签页重复投喂/摸头。
- `record-story-outcome` 只接受预定义 story/outcome 枚举，用于持久化少量连续故事标记；它不能增加工作奖励、修改 Harness 统计或携带自由文本。
- Host 是投喂冷却、每日好感上限和故事结果频控的权威。`record-story-outcome` 设保守上限（例如 20/day/profile），超限只丢弃剧情写入，不影响桌宠显示或 Harness。
- 所有命令按 Storage Domain 串行执行；同一 revision 上的并发写入不得用最后写入覆盖另一条已确认命令。
- 命令先持久化，成功后返回完整、脱敏的 `PetView`；失败时 Client 保留当前显示并提示“本次未保存”，不得乐观永久加值。
- API 路径固定版本号，Host route 的 disposer 绑定插件生命周期。以后若纳入 DSH 正式 Client 组合，可把命令面迁移到 Typert Remote，领域命令保持不变。
- 该 API 继承 DSH Web Server 的网络暴露边界，不自行宣称拥有用户认证；若 DSH 绑定到非本机地址，部署者必须按宿主要求保护整个 Web 入口。

会话奖励不由 Client 上报。Host 直接监听已提交的 `session/event`，只对白名单事件入队；以 `session:<sessionId>:<seq>` 为幂等键写入 Storage Domain。这样页面刷新、多标签和伪造投影都不会重复增加数值。`turn/end: completed` 只记为“回合完成”，不得宣传为可靠的“任务完成”。

多会话工作时长按区间并集计算，不能把并发会话的分钟数相加。Host 维护当前活跃 turn 集合：从 0→1 时开始全局工作区间，从 1→0 时结算一次；异常退出后的未闭合 turn 依赖 DSH 的 interrupted 修复事件收口，并对单段时长设置上限。

Client 不常驻轮询 PetSave：首次挂载、页面重新可见、打开详情以及写命令成功后刷新。响应携带单调递增的 `revision`，旧响应不得覆盖新状态；会话奖励的视觉反馈由 Projection 立即完成，数值面板允许在下次刷新时收敛。Settings 变化由官方 scope 的订阅推送，不借 PetSave GET 轮询配置。

## 14.3 推荐仓库结构

```text
dsh-dfy/
├── cordis.patch.yml
├── src/
│   ├── index.ts                  # Host Cordis 入口
│   ├── host/
│   │   ├── projection.ts
│   │   ├── storage.ts
│   │   ├── settings.ts
│   │   ├── http.ts
│   │   └── assets.ts
│   ├── shared/
│   │   ├── domain/
│   │   ├── reducer/
│   │   ├── behavior/
│   │   ├── autonomy/
│   │   └── protocol.ts
│   └── client/
│       ├── index.ts              # Browser Cordis 入口
│       ├── WhaleOverlay.tsx
│       ├── store.ts
│       ├── settings.ts
│       ├── harness-adapter.ts
│       ├── motion-orchestrator.ts
│       ├── renderer/
│       │   ├── stage.ts
│       │   ├── static-fallback.ts
│       │   └── whale-rig/
│       │       ├── loader.ts
│       │       ├── scene.ts
│       │       ├── mixer.ts
│       │       ├── springs.ts
│       │       └── webgl.ts
├── assets/default-whale/         # Host 受限资源路由的只读输入
├── src/invariant.ts
├── tests/
├── docs/
├── README.md
├── CONTRIBUTING.md
├── LICENSE
├── tsdown.config.ts
├── tsconfig.json
└── package.json
```

# 15. 数据模型与持久化

```text
type StoryId = 'butterfly' | 'rice_caught' | 'nap' | 'cursor_visit' | 'bowl_accident' | 'recovery_meal'
type StoryOutcome = 'seen' | 'success' | 'miss' | 'interrupted' | 'caught_by_user' | 'completed'

type StoryMemoryEntry = {
  stage: string
  count: number
  updatedAt: number
  updatedOnActiveDayOrdinal: number
  expiresOnActiveDayOrdinal?: number
}

type PetSave = {
  schemaVersion: 1
  revision: number
  pet: {
    createdAt: number
    name?: string
    stats: { hunger: number; mood: number; affection: number; energy: number }
    expressionWeights: {
      interactionWarmth: number
      foodMemory: number
      nightAffinity: number
      workBond: number
      banter: number
    }
  }
  inventory: Record<string, number>
  achievements: Record<string, { unlockedAt: number }>
  memories: {
    activeDays: string[]
    totalInteractions: number
    totalFeedCount: number
    completedTurns: number
    turnEndCounts: {
      completed: number; error: number; blocked: number; maxTokens: number; aborted: number; interrupted: number
    }
    longestSessionMinutes: number
    storyMemory: Partial<Record<StoryId, StoryMemoryEntry>>
  }
  daily: Record<string, DailySummary>
  monthly: Record<string, MonthlySummary>
  processedCommands: string[]
}
```

- Host 使用 `ctx.storageDomain` 打开 `dsh_whale_pet` Domain；PetSave 的全局 slot 是长期状态唯一真源。Web profile 已提供 JSON 后端和 Storage Domain。
- Storage Domain 写入已按领域串行且在后端确认持久后才更新内存，因此业务层不再自行实现含糊的 debounce。高频在线 tick 在内存聚合，达到周期或关键事件时提交一次完整快照。
- DSH 预发布存储后端对 domain `version` 不提供迁移，版本不匹配会直接拒绝。为支持应用升级，底层 domain version 在兼容期固定，global schema 接受受控的历史 `PetSave` 联合；打开后由应用迁移到最新 `schemaVersion` 并回写。
- 迁移前把上一份合法快照写入 `backups` 表，最多保留 1–3 份；若介质本身 malformed，插件降级为只读/临时会话并给出恢复指引，不得静默覆盖。
- `processedCommands` 使用有界 LRU（例如 256 项）；长期会话事件去重可使用独立表或按日期压缩，不能无限扩大 global 文档。
- `storyMemory` 只接受预定义 StoryId 和离散阶段，最多保留 16 项；过期故事在每日结算时清理，禁止保存自由文本、工作内容或无限增长的行为日志。
- `daily` 只保留最近 90 个自然日的完整摘要；更早数据折叠到 `monthly`，月摘要最多保留 24 个月，再折叠为 lifetime 计数。小账本 UI 不一次渲染无界历史列表。
- `activeDays` 在两年以内可保存日期集合；更老数据迁移为有界日期区间或年度计数，不能让全局 slot 随使用年限无限增长。
- 日期按用户本地时区生成 YYYY-MM-DD；不要把 UTC 日界线当作“陪伴日”。
- 所有存储失败必须降级为“本次会话继续可用”，不能导致 Harness 崩溃。

## 15.1 浏览器本地状态

Client `defineStore` 只保存当前浏览器/视口专属的 `position/homeAnchor`、安全 clamp 结果、面板开关和有限 reaction 游标。读取 localStorage 后必须经过 schema 校验、默认值合并和 viewport clamp；因为 DSH Store 的持久化是整值读写且软失败，本插件自行承担字段迁移。当前 AutonomyEpisode、路径、临时痕迹、presentationLeader 租约和 `EpisodeResumeToken` 只存在内存中，刷新后不恢复。

`enabled/visible`、`quietMode`、`scale`、气泡、声音、`autonomyEnabled`、`cursorApproach`、`roamingMode`、养成/小账本开关与角色包选择属于用户偏好。rc.5 下 Browser 通过唯一 root-scoped Client Store 读取和更新；系统 `prefers-reduced-motion` 与宿主 locale 是运行环境输入，不复制成隐式第二真源。该限制只适用于普通偏好，宠物数值和账本仍必须进入 Host Storage Domain。

宠物数值、库存、成就、工位小账本和首次见面时间不得只放 localStorage。若 Phase 0 尚未接通 Host API，界面必须标记为“预览数据”，且不能把它作为 v0.1 持久化验收通过的依据。

# 16. 配置、隐私、安全与性能

| 配置项 | 默认 | 说明 |
|---|---|---|
| general.enabled | true | 启用宠物 |
| general.visible | true | 显示桌宠；隐藏不清空设置或养成存档 |
| general.quietMode | false | 专注/安静模式 |
| animation.reducedMotion | system | 跟随系统，也可手动强制开/关 |
| animation.scale | 1.0 | 宠物大小 |
| bubble.enabled | true | 气泡台词 |
| audio.enabled | false | 默认关闭音效 |
| reaction.workEnabled | true | 跟随已提交的 Harness 工作状态 |
| reminder.breakEnabled | true | 忙碌过久后的低频休息提醒 |
| dialogue.communityMemes | true | 允许低频、经审核的社区梗台词 |
| progression.enabled | true | 养成系统 |
| progression.autoEat | false | 饥饿时可消耗已有基础食物自行进食 |
| diary.enabled | true | 本地工位小账本 |
| rareEvents.enabled | true | 低频彩蛋和稀有连续故事 |
| autonomy.enabled | true | 允许自主生活小剧场 |
| autonomy.cursorApproach | true | Harness 空闲时可低频主动靠近指针 |
| autonomy.roamingMode | false | 是否允许沿窗口安全边缘散步 |
| locale | auto | 跟随宿主；所有字符串通过 locale key 提供 |
| characterPack.id | default-whale | 当前角色包 |

以上路径是 `dsh-dfy` namespace 的规范键名；快捷菜单、设置页、测试与迁移不得另起别名。Host `Config` 分成 `deployment` 与 `preferences` 两个 schema：API body 上限、资产根等 `deployment` 字段仅由组合层读取并重启生效；只有安全的 `preferences` 子对象作为该 namespace 的 `base` 暴露给用户设置。缩放、显隐、quietMode、气泡、声音、工作联动、提醒、养成、小账本与 `autonomy.*` 等用户选项由该 namespace 持久化并 live apply；Client Store 不复制这些值。`privacy.storeHarnessContent` 不做成可打开的普通开关：v0.1 的协议根本不接受 Harness 正文，减少误配置面。

## 16.1 安全边界

- 不记录代码正文、提示词正文、终端输出、文件内容；如未来需要，必须另做明确授权开关。
- Character Pack MVP 禁止任意脚本执行。
- 对外部路径、ZIP 解包、文件名做路径规范化与大小限制。
- HarnessAdapter 所需权限遵循最小权限；无法获取某事件时宁可降级，不扩大权限。
- 错误日志应脱敏，不把用户项目内容写入插件日志。
- Session Projection 的 schema 只包含枚举、时间和 seq；代码评审中将“payload 白名单”作为阻断项。
- 宿主 API 写请求要求同源、JSON、自定义头和 body 限额，命令枚举之外一律拒绝；不提供任意文件读取或路径参数。
- `/state` 返回 `PetView`，不返回内部备份、命令去重记录或存储路径。
- 全局 `pointermove`/`keydown` 监听只允许更新内存中的活动时间和最新 CSS 像素坐标，不记录轨迹、按键值或输入内容；采样节流到不高于 10Hz，页面隐藏和卸载时清理。
- 通用语义排除仅用于避免覆盖原生交互元素，不得读取 DSH 专有 class、文本、属性载荷或布局层级来推断用户工作。

## 16.2 性能预算

| 指标 | 建议目标 | 策略 |
|---|---|---|
| 空闲 CPU | 目标 <1% 平均 | 不设全局常驻循环；WhaleRig 仅在可见且参数变化时更新，静止按需绘制 |
| 内存 | 目标 <50MB 增量（含常用资源） | 主角色纹理解码目标 ≤6MB、全部常驻纹理 ≤12MB；卸载释放纹理与 CPU 运行时引用 |
| 动画 | 待机 24–30fps，短暂招牌动作可跟随显示刷新 | reduced motion/安静模式降级；页面隐藏、角色隐藏和卸载即停帧 |
| 绘制 | 单角色、单局部画布、有界三角数量 | 高/省资源两档网格密度；不创建全屏 Canvas 或通用场景树 |
| 事件处理 | 普通事件 <16ms | Reducer 不做 IO |
| 存储 | 异步/防抖 | 不得阻塞 UI/Harness 主线程 |
| 指针活动 | ≤10Hz 采样 | 使用 ref/外部轻量状态，不让每次 pointermove 触发 React render |
| 自主移动 | transform/opacity | 路径一次计算；禁止逐帧读写 layout，结束/中断必须取消动画句柄 |
| 资源恢复 | 清单或纹理失败不影响 Harness | 停止 renderer、显示静态 fallback；下次插件重载从稳定意图重建，不续播旧 Episode |

首版资源预算拆分为：业务代码、WhaleRig2 与样式 gzip 后不超过 400KB，其中 WhaleRig2 运行时目标不超过 100KB；内联静态 fallback 对 `client.js` 的 gzip 增量不超过 80KB，最终 `client.js` gzip 后不超过 480KB；默认角色包经版本化资产路由的首次传输目标不超过 2MB，常驻解码纹理预算不超过 12MB。默认使用静态语义部件、参数动作与独立道具层复用，禁止用短序列帧绕过资产建模。超限时先降低网格密度、内部画布或按需加载道具并保留静态失败回退，不能把外部资产重新塞回 bundle。

## 16.3 主题、对比度与本地化

- 插件定义 `--whale-*` 语义变量（surface、text、muted、border、focus、success、danger），映射到 DSH 正式暴露的主题变量；没有宿主变量时提供独立的 light/dark fallback。禁止依赖未公开的 class 名继承颜色。
- 气泡、菜单和详情文字达到 WCAG AA：普通文字至少 4.5:1，大字至少 3:1；focus ring、边框和状态图形至少 3:1。
- 角色素材本身可保持固定蓝色身份，但关键工作/错误状态不能只靠素材颜色；必须同时使用姿势、图形或文本。
- Windows 强制颜色模式下，菜单、焦点和关键状态仍可辨认；装饰背景和半透明层不能成为唯一边界。
- 所有 UI、台词、日期和数字通过 locale key 与 `Intl` 输出。v0.1 至少完整交付 `zh-CN`；未完成语言使用中性准确的 fallback，不混合半翻译角色文案。
- 气泡、按钮和菜单为翻译扩展预留约 40%，在 200% zoom、emoji 与长 CJK/Latin 字符串下换行或截断但不溢出视口。

# 17. 测试策略

| 测试域 | 关键用例 | 阶段 |
|---|---|---|
| StateReducer 单测 | 四项数值 clamp、食物效果、turn reason、活跃/idle 区间结算 | 必须 |
| BehaviorEngine 单测 | 优先级、冷却、状态冲突、干活—邀功—摸鱼节奏、随机权重边界 | 必须 |
| AutonomyEngine | 意图选择、领地约束、分支结局、频控、工作打断、道具/热区清理、短期回调过期 | MVP |
| WhaleRig2 loader | Rig2 manifest、静态哈希纹理、零动作帧策略、Spring 范围与未知字段拒绝 | 必须 |
| WhaleRig2 motion | 关键帧插值、状态切换、优先级抢占、取消、弹簧稳定性和确定性时间步 | 必须 |
| 捉蝴蝶故事 | 固定 seed 路径、帮助/捣乱分支、连续失败保护，以及每个 phase 收到 `turn/start` 都无残留 | MVP |
| Renderer 降级 | Canvas/资源失败、静态 fallback、页面隐藏停帧、卸载释放资源 | MVP |
| 多标签 leader | 租约竞争、隐藏/关闭接管、BroadcastChannel 缺失降级、story outcome 不重复 | MVP |
| Session Projection | turn/step/tool/turn-end 折叠、无关事件同引用、隐私白名单、stateVersion | 必须 |
| Settings | composition base、用户覆盖、revision 冲突、Provider 缺席回退、快捷菜单与 `settings.section` 同源 | 必须 |
| Host Persistence | 保存/恢复、应用 schema migration、幂等命令、损坏/版本失败降级 | 必须 |
| Character Pack | manifest 校验、非法路径、大文件、缺失动作 | Phase 4 开放前 |
| HarnessAdapter | 用真实 Projection fixture 验证映射、过期反应和多会话仲裁 | 必须 |
| Host API | 同源/请求头/body/schema 校验、错误响应、生命周期卸载 | 必须 |
| Host 资产 route | 只读索引、路径穿越、未知 MIME、超限文件、hash cache、资源缺失 fallback、卸载后 404 | 必须 |
| UI 交互 | 拖拽、点击、召唤/回工位、快捷菜单、96–112px 默认尺寸、位置/领地 clamp、键盘、reduced motion | MVP |
| A11y/i18n | axe、键盘焦点回归、aria-live 去重、强制颜色、200% zoom、长 CJK/Latin/emoji 文案 | MVP |
| 主题与窄窗口 | light/dark/高对比、1024/768px 降级、44px 触控目标、气泡不溢出 | MVP |
| 资源/性能 | client factory 预算、资产 route 缓存/白名单/卸载、解码纹理、pointermove 10Hz、无逐帧 layout、隐藏页零自主调度 | 发布前 |
| 角色一致性 | 禁用潜航叙事、平等称呼、双通道表演、错误不责怪用户、稳定核心与梗层分离 | MVP |
| 包与产物 | sibling `dsh.bundle`/`dsh.client`、四个 exports、factory handoff、external purity、`pnpm pack` 内容、无 `workspace:`/源码 checkout 依赖 | 必须 |
| 插件组合 | 真实 profile 安装 bundle、dump-config、Host/Client 激活、`shell.overlay` 与 `settings.section` 可见、不替换 `root`、不建立第二 React root | 必须 |
| 点击穿透 | Harness 直接子条目为 `pointer-events:auto` 时，插件根节点仍穿透；只有声明热区接收事件 | 必须 |
| 生命周期 | 插件卸载/HMR 后无重复 Slot、Store seat、route、projection、timer、style、rAF、Canvas 或 GPU 资源 | 必须 |
| 长时间 soak | 8h idle/working，检查自主故事 timer、路径、道具热区与内存泄漏 | 发布前 |
| 跨版本兼容 | 至少对支持的 Harness 版本跑 smoke test | 发布前 |

# 18. 开发分期与 MVP 边界

| 阶段 | 范围 | 完成标准 |
|---|---|---|
| Phase 0：安装闭环 Spike | bundle/patch、Host + Client + invariant 导出、factory bundle、`shell.overlay`、共享 Client Store、静态 fallback、真实 profile 安装 | 占位大肥鱼可安装、可卸载、设置可往返、刷新不重复；不因渲染失败拖住 Harness 启动 |
| Phase 1：WhaleRig2 联动桌宠 | Host 受限资产 route；静态部件 loader、骨骼、关键帧、网格、弹簧、Canvas/fallback；Projection、idle/working/thinking/tool/done/error、拖拽、homeAnchor、多会话仲裁 | 能看出“干活—邀功—摸鱼”，资源失败可降级、动作可抢占，渲染与宿主状态边界清晰 |
| Phase 2：电子宠物与首个自主故事 | Storage Domain、命令 API、四项状态、白饭投喂、详情；捉蝴蝶端到端故事，再复用能力实现打盹/偷吃/指针拜访 | 重启数据可靠；抓蝴蝶在每阶段开工都能立即终止且不阻塞点击 |
| Phase 3：长期陪伴 | 工位小账本、成就、陪伴天数、关系距离、短期回调、连续故事、表达权重 | 一周后仍有新反馈且核心人格不漂移 |
| Phase 4：生态 | 在现有受限资源通道上增加外部 Character Pack 安装、授权索引、主题与房间/装扮 | 第三方可无代码制作角色包，且安装/卸载不会执行未知脚本 |

## 18.1 首个 GitHub Release 建议范围：v0.1.0

- 可安装/启用/禁用。
- 显示一个授权明确、符合角色设定文档的默认大肥鱼角色，默认可视高度约 96–112px。
- 默认角色由 WhaleRig2 实时模型驱动；Canvas 或资源失败时仍有静态 fallback，不能导致 Harness 启动失败或角色完全消失。
- 支持拖拽、单击、摸头、投喂。
- 支持 homeAnchor、安全领地，以及捉蝴蝶、打盹、偷吃白饭、指针拜访基础自主生活；捉蝴蝶作为动作管线验收故事，任何工作事件可立即安全打断。
- 支持 idle / thinking(or working) / sleeping / smug(success) / denying(error) 五类基础表现。
- hunger / mood / affection / energy 四项状态可持久化。
- 至少映射 DSH 的 turn/start、step/start、tool/call、tool/result、turn/end 及 live running/idle。
- 宿主存档与浏览器位置分层保存可靠；刷新不重播过期完成/错误动画。
- 支持多会话的稳定仲裁、reduced motion、键盘打开菜单和一键隐藏。
- 支持关闭自主生活和主动靠近；安静模式下不主动拜访、不弹自主气泡。
- README 包含演示 GIF、安装、隐私说明、角色素材许可。
- 公开 Release 前必须完成角色设计与所有内置素材的授权核验。未取得可再分发许可时只能发布不含该复刻角色的技术预览包，不能把开发参考图或临摹素材打入发行物。

# 19. 验收标准（Definition of Done）

| 维度 | 验收条件 |
|---|---|
| 首次体验 | 安装后无需额外配置即可看到宠物；10 秒内可完成第一次互动。 |
| 角色识别 | 不看名称也能从蓝色女仆鲸鱼轮廓、吃白饭、嘴硬与鲸尾表演识别“大肥鱼”。 |
| 工作反差 | 开工认真、成功邀功、随后摸鱼的节奏清晰；不能把专业状态演成无能。 |
| 自主生命感 | Harness 空闲时可产生有因果的小剧场；开工时立即安全中断，自动移动不阻塞底层点击。 |
| 持久化 | 关闭并重新打开 Harness 后，位置、状态、库存与首次见面时间保持。 |
| 联动 | 已核实事件能触发不同宠物行为；多会话不闪烁；刷新不重复结算同一 seq。 |
| 多标签 | 同一浏览器只有 leader 运行并持久化自主故事；接管与降级不重复写入。 |
| 低打扰 | 宠物可隐藏/暂停/安静；不阻塞或覆盖核心操作。 |
| 无障碍 | 键盘、44px 触控目标、焦点回归、aria-live 去重、强制颜色和 reduced motion 均通过；状态不只靠颜色表达。 |
| 养成 | 投喂和摸头能产生可见但不过度的状态/行为变化。 |
| 关系 | 默认称呼平等；关系成长解锁熟悉与互相关心，不解锁主人式服从。 |
| 稳定性 | 连续运行 8 小时无明显内存持续增长、无事件风暴。 |
| 数据边界 | daily/monthly/storyMemory/命令去重均有上限与迁移测试，长期使用不会无限增长。 |
| 资源性能 | client bundle、静态 fallback、角色资产传输、解码纹理、空闲 CPU 和指针采样均满足第 16.2 节预算。 |
| 隐私 | 默认存档中不包含代码正文、Prompt 正文、终端输出。 |
| 素材授权 | `ASSETS_LICENSE.md` 与发行包逐项一致；任何未授权参考素材都会阻断公开发布。 |
| 开源质量 | README、LICENSE、CONTRIBUTING、基本测试和 CI 完整。 |

# 20. GitHub 开源设计

仓库名：`dsh-dfy`。README 首屏应优先展示动画演示和一句话定位，而不是长篇技术介绍。

```text
🐋 dsh-dfy
A smart, lazy and slightly tsundere whale coworker living in DeepSeek Harness.

Feed her rice. Watch her work. Pretend you did not see her slacking off.
```

- README.md：动图、特性、安装、配置、隐私、路线图。
- LICENSE：代码许可证与角色素材许可证分开说明。
- ASSETS_LICENSE.md：逐项记录默认角色素材来源与授权。
- CONTRIBUTING.md：代码贡献、角色包贡献规范。
- SECURITY.md：安全问题反馈渠道，尤其角色包解析相关。
- docs/character-pack.md：角色包 schema 与制作教程。
- CHANGELOG.md：从 v0.1.0 开始维护。

# 21. 后续创意池（不进入首版）

- 大肥鱼的工位角落：饭碗、矮桌、小电脑、抱枕和夜灯。
- “回来啦”回归事件：离线多日后的特殊欢迎，不惩罚。
- 节日/季节事件：本地、可关闭、不依赖服务端。
- 屏幕边缘互动：趴边、钻到窗口后、抱住光标影子。
- 稀有动作：偷吃白饭、擦嘴装没事、摔倒后强装镇定、饭碗扣头、尾巴暴露心情。
- 反向养成：工作过久时她提醒用户休息，形成“到底谁在养谁”的关系反转。
- 可更新梗层：Token、鱼片、模型版本笑话以独立文案包存在，可关闭、可替换，不污染核心人格。
- 导入/导出存档，在不同机器迁移宠物。
- 多宠物/多角色槽位；但避免首版复杂化。
- 可选 LLM 台词润色：明确数据边界、默认关闭。
- 社区角色包索引：只做清单/链接，不自动执行未知代码。

# 22. 关键决策记录

## 22.1 已确定

| 决策 | 结论 | 理由 |
|---|---|---|
| 宿主 UI 形态 | Web Client 的 `shell.overlay` | 加法型浮层，符合桌宠定位且不替换主应用 |
| 插件运行时 | Node/TS Host + React Browser 双面 Cordis 插件 | 与 DSH `dsh.client` 契约一致 |
| 会话事件通道 | Host Session Projection + Client live session snapshot | 可重建、低耦合、可限制隐私字段 |
| 长期存储 | Host Storage Domain | 宠物不会因浏览器 origin/缓存变化轻易失忆 |
| 用户偏好 | rc.5 root-scoped Client `defineStore` | 第三方 namespace 不在 Web API allowlist；快捷菜单和设置页共享 handle，明确设备本地 |
| 设备/视口态 | 同一 Client Store 的独立字段 | 保存安全锚点、面板和有限游标；不与 Host 养成状态混用 |
| 首版写入桥 | 插件自有同源 HTTP 命令面 | 外部插件无需修改 DSH 固定的 Remote 聚合 |
| 角色运行时 | 项目自有 WhaleRig 私有模块 | 只实现大肥鱼所需参数骨骼、局部网格、动作混合和次级物理；不依赖 Cubism Core |
| 次级运动 | 有界阻尼弹簧 | 只处理呆毛、耳鳍、头发、裙摆和鲸尾，不引入完整刚体物理世界 |
| 场景运动 | WAAPI 外层 transform + DOM/SVG 道具 | 与角色内部参数分离，便于中断、降级和安全区约束 |
| 首版素材交付 | 获批角色 PNG 同时作为 WhaleRig 图集与图片 fallback；JSON/PNG 走 Host 受限版本化 route；固定 shader 随客户端代码交付 | `/plugins` 不发布任意 assets，但双面插件可通过正式 WebServer route 安全提供自己的只读资源；角色包不执行代码 |
| 兼容策略 | 锁定并测试 DSH `0.1.0-rc.5` | DSH 处于 RC，接口仍可能变化 |
| 默认角色定位 | 嘴硬但会干活的工位搭子 | 符合社区二创稳定核心，区别于泛用桌宠 |
| 体验节奏 | 干活—邀功—摸鱼 | 以能力与懒散反差取代“潜航节律” |
| 用户关系 | 平等损友/同事/长期搭档 | 保留亲密感，避免主人式服从 |
| 状态维度 | 仅持久化 hunger/mood/affection/energy | focus/pressure 改为瞬时上下文，降低维护负担 |

## 22.2 发布前仍需产品决定

| 决策 | 推荐默认 | 影响 |
|---|---|---|
| 宠物作用域 | 每个 DSH profile 一只鲸鱼 | 与 Host Storage 的部署边界一致；跨 profile 同步后置 |
| WhaleRig 美术源文件 | 自制分层 PSD/Krita + 自有导出管线；96–112px 基线 | 决定部件拆分、参数可读性、图集体积与长期维护成本 |
| 默认角色版权 | 项目自制或取得明确再分发许可 | **公开发布阻断项**；必须逐项记录来源、作者、许可与改动 |
| 项目许可证 | 代码与素材分开授权 | GitHub 发布、角色包复用边界 |
| API 长期方向 | 外部版保持 HTTP；进入 DSH 主组合后评估 Typert Remote | 决定后续维护和上游协作成本 |

## 22.3 当前实现核验（2026-08-21）

Phase 0、Phase 1、Phase 2 核心切片与 Phase 3 的关系/小账本切片已经落地。当前实现事实如下；本节只记录有源码与测试证据的能力，不代表所有长期内容和生态能力已完成：

- Host 以两个可选 `ctx.inject(...)` 分别接入 Session Projection 与 WebServer；缺少任一能力时插件仍可激活。投影、资源路由及其 disposer 都归属插件 fiber。
- 获批默认角色包位于 `character-packs/default-whale/`。Host 只公开 19 张静态 Rig2 部件纹理、1 个严格清单和 1 张静态降级图；文件名包含 SHA-256 前 12 位。旧图集、motion JSON、高分辨率制作源和参考视频均不进入安装包。
- Rig2 manifest 使用 strict schema，固定 `animationFrames: 0` 并明确禁止 GIF、视频、Sprite Sheet 和动作 PNG 序列；角色包不能携带脚本、shader 或表达式代码。
- Browser 仍通过 `shell.overlay` Slot 加法组合，只创建一个 112×112 CSS 透明 Canvas，不创建第二 React root。高质量内部画布为 256×256，省资源为 192×192，动作词汇来自 renderer-independent behavior resolver。
- WhaleRig2 已实现双腿三骨骼 CPU 蒙皮、双臂肩—肘—腕层级、900ms 连续 Run、180ms 状态切换、头发/鲸尾/呆毛 Mesh 与独立 Spring、idle 30fps/活动 60fps 上限、页面隐藏停帧和 reduced-motion 静态姿势。主动画停止后 Spring 继续衰减；追蝴蝶、指针拜访和返回工位共享同一 Run，并在回程镜像完整运行时结果。
- 社区鲸鱼娘待机层已独立完成：8 个结构零件（后发、鲸尾、连衣裙身体、脸底、前发、远/近手臂、呆毛）与 8 个面部零件实时合成；呼吸、自动/立即眨眼、瞳孔看光标、克制的头部跟随、普通/得意/开心轻表情，以及后发/鲸尾/呆毛独立弹簧均可在运行中切换。生产待机使用该层，旅行/动作引擎保持隔离；本轮验收不以跑步质量为目标。
- 隔离 rc.5 真实 profile 已验证插件客户端和全部实际资产均为 200、Canvas `ready`、刷新、隐藏/召回、拖拽持久化、键盘菜单、Settings、摸摸、追蝶、关系解锁后的指针拜访、打盹、偷吃白饭、账页隐私清理和 API 持久化；Canvas 2D 最新实际像素采样得到 32 个向外实时画面与 10 个回程镜像实时画面，测试没有 page error 或 console error。
- 生产 `client.js` 为 338.62KB、gzip 71.88KB；Host 入口为 35.07KB、gzip 10.11KB；npm 包约 1.1MB，明确不包含旧 254KB 动作图集或 `motions/`。45 个测试文件、196 项测试、双 TypeScript 检查、构建与 `npm pack --dry-run` 全部通过。以上不替代 8 小时 soak、真实低端设备或无障碍全量测试。
- 默认角色衍生素材以“鲸鱼娘形象”作者上善无形的 CC BY-NC-SA 4.0 声明为许可基线，并记录生成、社区 Q 版适配、背景移除、缩放和运行时接入改动。角色素材不是 MIT，禁止商业使用；插件代码继续采用 MIT。

Phase 2 首个持久化切片也已核验：

- `dsh_whale_pet` Storage Domain 的 medium version 固定为 1，global schema 接受受控 v0/v1 联合；v0 在迁移前写入 `backups` 表，最多保留 3 份，然后以递增 revision 回写 v1。
- `PetSave v1` 严格限制数值、枚举和集合：命令 receipt 256、日摘要 90 天、月摘要 24 月、activeDays 730 天、storyMemory 16 项；写入前重新 clone、校验、裁剪并深冻结。
- `/api/dsh-dfy/v1/state` 与 `/commands` 只在 Storage Domain + WebServer 同时存在时注册；写请求要求同源、自定义 header、JSON MIME 和 4KB 上限，并拒绝未知字段。持久介质无法打开时只降级为明确标记的 temporary 会话，不阻断 Harness。
- `pet`、始终可用的基础白饭 `feed` 与枚举化 `record-story-outcome` 由 Host 单队列串行；UUID 重试不重复写，每日好感、15 分钟投喂冷却和 20/day 故事上限由 Host 权威执行。
- Client 不把 `PetView` 写入 localStorage，也不常驻轮询；只在挂载、页面重新可见和写成功后刷新，并以 revision 拒绝旧响应覆盖。真实 rc.5 浏览器已验证摸摸命令先持久化、随后进入 `petting`，刷新后 revision 保留。
- 当前生产客户端为 338.62KB、gzip 71.88KB；增加 WhaleRig2、持久化协议、四类自主故事、显式召唤、工位小账本、关系阶段和隐私清理后仍远低于 480KB 上限。
- `AutonomyEngine` 已实现低频捉蝴蝶 Episode：`notice → intend → attempt → result → recover → return-home`，每日最多 2 次明显故事，连续两次扑空后保证成功；指针以不超过 10Hz 的内存快照影响帮助/惊走分支，不保存轨迹或按键内容。
- 故事位移由公共 `characterMotionPose` 和实时 Run 决定：追蝶/白饭限制在 homeAnchor 周围约 68px，指针拜访限制为 28–180px；移动时热点穿透。Harness 开工、菜单、键盘焦点、quiet mode、reduced motion 与页面隐藏会清理 Episode。真实 rc.5 浏览器已验证蝴蝶可见、Host 结果写入，以及第二段故事被键盘焦点即时取消。
- `presentationLeader` 优先通过 Web Locks 选举，降级为 BroadcastChannel + localStorage 6 秒租约/2 秒心跳；无 BroadcastChannel 时只本地表演而不持久化。
- `cursor_visit` 已复用同一 Episode 管线：指针只保留不超过 10Hz 的最新内存采样，静止至少 2 秒且与 homeAnchor 共享 180px 视口边缘带时才候选；移动距离限制为 28–180px，启动前使用通用语义选择器一次性检查四段路线和角色矩形，命中交互元素、无法探测布局、窄窗口或粗指针均取消。移动期间热点穿透；点击、敲键、快速移动、resize、Harness 工作、焦点、quiet mode、reduced motion 和页面隐藏均安全中断。真实 rc.5 E2E 已验证键盘焦点取消、指针拜访、`interrupted` Host 写入和无页面/控制台错误。
- 快捷菜单已增加可聚焦的“追赶蝴蝶/叫她过来/回工位休息/工位小账本”。“追赶蝴蝶”复用正式 `butterfly` Episode、公共动作 Clip、共享移动控制器和独立蝴蝶 Actor，但标记 `origin: manual`、固定展示成功结果，不增加 `sessionCompletions`、不占每日自主故事额度、不提交 `record-story-outcome`。指针拜访的前往和回工位同样复用 `run`，回程只改变朝向与轨迹。真实 E2E 验证八项菜单、四项主动命令、Clip 复用与等待/保持状态。
- `nap` 已复用共享阶段链：在 homeAnchor 出现独立 `aria-hidden`/pointer-pass-through 抱枕层，角色不产生跨视口位移；只有 `result` 静止睡眠阶段恢复宠物热点。最新 10Hz 指针样本进入角色中心 140px 或用户直接激活时，以 `seen` 进入 `recover`，使用既有 denying 姿势和低频嘴硬气泡；正常睡完记录 `completed`。Host 只接受已有 `nap` + 枚举 outcome，StoryMemory 继续受 16 项和活跃日过期边界约束。
- `rice_caught` 已复用共享阶段链：角色以正式 Run 接近固定世界坐标的独立饭碗，在 `result` 复用 feeding 动作；饭碗以反向补偿角色位移保持原位，浏览器 E2E 在靠近阶段测得横向漂移不超过 2.5px。指针进入角色中心 140px 或用户直接激活时进入 `caught_by_user → recover`，复用 denying 与嘴硬气泡，随后镜像 Run 返回 homeAnchor；完成/被发现结果均通过现有有界 StoryMemory 记录。当前该故事只承载叙事，不自动扣除库存。
- 白饭线现已形成有边界的跨活跃日连续剧：`rice_caught` 的结果可在后续活跃日触发 `bowl_accident`，其结果再于更晚活跃日触发 `recovery_meal`。记录以源事件 `updatedAt` 作为一次性消费标记，禁止同日连播与同一结果重复播放；三类线索最多保留七个活跃日，仍受 presentation leader、每日两次、工作优先、quiet mode、reduced motion 与可中断规则约束。饭碗、散落米粒和清洁布是角色纹理之外的独立 SVG Actor，角色仅复用 Run、feeding、denying、smug 和 idle。
- 本地视觉验收可在 DSH web URL 后加 `?whaleDebug=1`。该查询参数只渲染中文“动画验收台”，可立即启动追蝴蝶、跑到光标、打盹、偷吃白饭、打翻饭碗、收拾补饭并实时显示故事/阶段；测试 Episode 不写入账本、不占每日自主次数，正常 URL 不暴露面板。
- Host 会话奖励已实现：插件只监听提交后的 `turn/start`/`turn/end` 白名单事件，以编码后的 session id 与 event seq 形成非 Browser 可提交的幂等收据；所有写入与投喂/摸头共享同一个串行 Storage Domain owner。完成回合、六类结束原因、工作分钟和最长区间进入 PetSave，多会话重叠部分按一个全局区间结算，单段最多 120 分钟；测试覆盖重试、插件中途附着和两个并发会话。
- 工位小账本 UI 已实现：显式打开时刷新 Host 快照，展示四项数值、2–5 条事实与人格分层的当日摘要、最多七条近期日记录及第一碗饭/一起一周/工位搭子成就。面板不常驻轮询，支持键盘打开、Escape/关闭按钮焦点回归、forced-colors 和窄视口滚动；`diary.enabled` 可关闭入口。
- 账页隐私清理已实现为严格 Host 命令与行内二次确认：只清空 `daily`、`monthly`、`storyMemory`，保留四项状态、关系阶段、成就、累计工作/互动统计、活跃天数、每日频控和 `processedCommands`；相同 UUID 重试幂等。确认前 Escape 回到原按钮，提交中禁止重复点击，失败保留原数据并提供重试，真实隔离 profile 已逐项验证删除与保留范围。
- 关系阶段已实现：好感度严格映射为初见/熟悉/亲近/信赖/老朋友五档，并显示在小账本中。自动指针拜访只在熟悉后解锁；角色中心与指针的目标间距随阶段从 120px 缩至 96px，扣除 56px 角色半径后保持 64–40px 安全边距。`interactionWarmth`、`foodMemory`、`workBond` 仅在阈值后选择审核过的熟悉台词，不改变事实、关系称呼或角色核心人格；手动“叫她过来”不被阶段锁住。

# 23. 给 Codex 的首轮开发任务

目标：只完成 Phase 0 安装闭环，不提前堆养成系统。

1. 建立 `package.json`、`cordis.patch.yml`、`src/index.ts`、`src/invariant.ts`、`src/client/index.ts` 和独立构建配置。manifest 同时声明 sibling `dsh.bundle`/`dsh.client` roles，包同时产出 Host `lib/index.js`、invariant 与 DSH factory 格式的 `lib/client.js`。
2. Host 入口用具名导出并能被 Cordis 激活。Client 入口通过 `slots` 分别向 `shell.overlay` 和 `settings.section` 注册可卸载的最小鲸鱼/设置组件，两者共享一个 root-scoped Client Store；不得 `createRoot(document.body)`，组件外区域保持指针穿透，不得伪造 rc.5 未暴露的第三方 Settings namespace。
3. 默认素材先使用项目自制的小型内联静态占位大肥鱼，按约 96–112px 高实现清晰轮廓；至少具备 idle、working、smug、denying 四种可辨状态，完成显示、隐藏、拖拽、viewport clamp 与 reduced motion。Phase 0 只验证 fallback、设置往返和宿主闭环，不提前实现 WhaleRig 或 Character Pack 加载器。
4. 编写最小测试：manifest/Host/Client/invariant 导出契约、Slot 注册与 dispose、Settings base/用户覆盖/Provider 缺席回退、位置恢复/损坏降级、客户端 bundle handoff，以及角色状态到基础动作的映射。
5. 生成 tarball 或本地链接包，执行真实 `dsh plugin --profile whale-dev add ...`、`--dump-config`、启动 Web、刷新、禁用/卸载 smoke test。不得只用 mock 宣称 Phase 0 完成。
6. Phase 0 通过后再提交 Phase 1：注册 `whalePet.activity` Session Projection 与受限版本化资产 route，并完成 WhaleRig2 最小模型、动作混合、弹簧、Canvas/static fallback、真实事件 fixture、一次性 reaction 去重和多会话仲裁。Phase 2 才接 Storage Domain、命令 API 与捉蝴蝶端到端故事。

首轮明确不做：工位小账本、成就、房间、外部角色包、模型生成台词、读取代码/Prompt/终端输出。任何 DSH 依赖都只能出现在 Host/Client 边界文件；`shared` 领域代码不得导入宿主包。

# 24. 设计可行性审计与发布门槛

## 24.1 本轮已修正的设计缺口

| 原问题 | 修正后的契约 |
|---|---|
| 自动靠近既要可点击又要点击穿透，物理上矛盾 | 移动阶段 `pointer-events:none`，只接受距离分支；静止且安全后才恢复热区 |
| 不读 DSH DOM 却声称能避开所有输入区 | 只在视口安全边缘带移动；通用语义元素命中即取消，不解析私有布局、不动态绕路 |
| 多标签会重复自主故事与长期记忆 | `BroadcastChannel` + 短租约选举 presentationLeader；不支持时禁用故事持久化 |
| 首次投喂依赖尚未获得的库存 | 基础白饭始终可用，数值收益有冷却；特殊食物才进入库存 |
| `daily`、`activeDays`、故事状态可能无限增长 | 90 天日摘要、24 个月月摘要、年度/lifetime 聚合，StoryMemory 最多 16 项且自动过期 |
| 动作数量与客户端体积预算不匹配 | 代码、内联 fallback、外部角色资产和解码纹理分项预算；身体 rig 与道具复用，扩充动作前必须建立受限资源路由 |
| 直接使用 Cubism 带来运行时、发布许可与外部格式依赖 | 使用项目自有 WhaleRig 格式和干净资产管线；不读取 Cubism 输出，代码与素材分别授权 |
| “自研 Live2D”容易膨胀成通用编辑器 | WhaleRig v0 只实现当前大肥鱼消费者需要的骨骼、局部网格、参数曲线、混合和弹簧；通用编辑器与第三方包后置 |
| 参数物理被误解为完整物理引擎 | 弹簧只产生次级跟随；位移、扑击和命中由可抢占曲线与故事状态机决定 |
| Canvas 动画循环与空闲低占用冲突 | 高/省资源档限帧、避免主循环与物理循环重复绘制、隐藏停帧；资源失败时静态降级并清理旧 Episode |
| 自建 renderer 可能绕过 Harness 插件生命周期 | WhaleRig2 保持 Browser 私有模块；Slot、监听、rAF、WAAPI、Canvas 和纹理引用全部由 Cordis fiber effect 收口 |
| reduced motion 只写了“减少动画” | 明确关闭散步、追逐和拜访，以原地姿势替代；禁止瞬移 |
| 自主道具、焦点和动态朗读未定义 | 装饰层 aria-hidden，主控件稳定聚焦，移动时取消焦点风险，关键 live region 去重 |
| 页面隐藏与“守候结果”冲突 | 原事件不补播，只允许时限内静态结果收据，不重复奖励 |
| 角色素材授权只作为建议 | 提升为公开 Release 阻断项，未授权只能使用权利清晰的开发占位素材 |

## 24.2 已接受的产品取舍

- 首版不做跨中央工作区的自由寻路。角色只在安全边缘带和 homeAnchor 周围生活；这牺牲“满屏跑动”，换取低耦合与不遮挡工作。
- 指针拜访是桌面细节，不是核心功能。触摸、窄窗口、reduced motion 或无法判断安全区时直接降级为原地视线互动。
- `record-story-outcome` 来源于 Client，因此不能作为工作奖励、稀有资源或可信成就的唯一依据；它只影响无价值的剧情分支。
- 多标签降级时宁可不持久化自主故事，也不接受重复写入和竞态。
- v0.1 先完整支持 `zh-CN`；其他语言只能使用完整、准确的中性 fallback，不发布半翻译人格。

## 24.3 发布门槛

| Gate | 验证内容 | 当前状态 |
|---|---|---|
| G0 宿主闭环 | 真实 profile 安装、启停、刷新、卸载、HMR 无残留 | **安装生命周期通过、HMR 待补**：临时真实 profile 已自动执行安装→启动→WhaleRig2 ready→卸载→重启，并验证 DOM、样式与 JSON 资产路由均消失；完整开发态 HMR 组合仍需复验 |
| G1 素材权利 | 角色设计、立绘、动画、道具逐项拥有可再分发许可 | **非商业发布通过**：作者、原帖、CC BY-NC-SA 4.0、改动与同方式共享边界已记录；商业分发明确禁止 |
| G2 资产管线 | 静态语义 PNG 可生成 Rig2 清单；动作可抢占、含 reduced-motion 替代并满足预算 | **WhaleRig2 通过**：19 张静态部件、双腿/双臂骨骼、实时 Keyframe、Mesh、Spring、180ms 状态切换、独立道具与静态 fallback 均可确定性构建；生产包无动作序列帧。跳跃、大幅屈肘和更丰富嘴型/表情仍等待合格关键资产 |
| G3 交互安全 | 自动移动不覆盖通用交互元素、不截获底层点击、视口变化可恢复 | **受限指针拜访通过**：共享边缘带、28–180px 距离、四段路线/角色矩形通用交互阻断、热点穿透，以及点击/敲键/快速移动/resize/工作/焦点/隐藏清理均有单元和真实浏览器证据；自由散步仍未实现 |
| G4 并发一致性 | 多会话、多标签、重试、leader 接管不重复反应或写入 | **通过**：多会话仲裁、reaction 去重、并发 Host 命令、UUID 重试均有测试；真实双标签 Web Locks E2E 验证同一时刻仅一个 leader，关闭 leader 后 follower 接管且只启动一个自主故事 |
| G5 性能 | 8h soak、空闲 CPU、bundle、解码纹理、draw call、rAF/WAAPI/timer 与渲染资源清理满足预算 | **部分通过**：bundle/角色包预算、高/省资源档、运行中切换 192px 内部画布、限帧、隐藏停帧和 dispose 已验证；8h soak 与代表性低端设备实测待办 |
| G6 无障碍 | 键盘、200% zoom、强制颜色、screen reader、reduced motion 通过 | **大部分自动门通过、真人读屏待补**：键盘菜单与焦点回归、控件可访问名称、系统 reduced motion、forced-colors 焦点和等效 200% zoom 视口内互不遮挡均有真实浏览器证据；完整真实 screen reader 验收仍待人工完成 |
| G7 体验有效性 | 五分钟可理解、一小时不想隐藏、一周能记住共同经历 | 待可用性测试 |

任何 Gate 未通过都不得在 README 中写成已完成能力。当前 G1 只允许遵守署名、非商业、相同方式共享的发行；若未来希望商业分发，必须另行获得权利人授权，不能通过更改代码许可证绕过角色素材条款。

## 24.4 后续仍需产出的交付物

- 默认角色的动作分镜表：关键姿势、时长、可打断点、道具层、热区、镜像限制和 reduced-motion 替代。
- WhaleRig 的低端真实设备性能记录；获批正面完整纹理、局部网格 rig、循环/可抢占动作、5 条次级弹簧和 context-lost 图片降级已完成，仍需在更多设备记录帧时与功耗。
- WhaleRig v0 schema 的后续挂点/热区扩展；当前 manifest、rig、motion、expressions、physics、局部网格列行上限、影响区参数解析、错误降级和静态 fallback 已完成。
- 捉蝴蝶已从剧情专用序列改为 Story Director 组合公共 Clip，并把蝴蝶拆为独立 Actor：现有抓到/扑空、工作抢占、图集失败降级、回工位复用和清理断言已完成；未来取得人工分层源后，可在保持相同 Motion 参数名的前提下把局部网格通道升级为真实遮挡层。
- 视口安全区原型：1920×1080、1366×768、1024px 窄窗口、200% zoom 和侧栏开合组合验证。
- 商业发行所需的额外角色素材授权（仅在项目未来选择商业分发时需要）。
- `PetSave` v1 schema、历史联合、迁移 fixture 和有界数据清理测试。
- AutonomyEngine 已覆盖偷吃白饭、打盹、指针拜访和捉蝴蝶；后续新增故事继续复用阶段、公共 Clip、独立道具、抢占清理与有界记忆契约。
- presentationLeader 的 Web Locks 多标签真实接管已完成；BroadcastChannel/localStorage 降级仍由单元测试覆盖，未来可补不支持 Web Locks 的真实浏览器组合。

# 25. 最终产品判断标准

dsh-dfy 成功与否，不取决于功能数量，而取决于用户是否感觉“这只嘴硬的大肥鱼真的在和我一起上班：需要时很能干，做完就邀功，转眼又去吃白饭，而且记得我们共同经历过什么”。因此优先级应始终是：角色一致性与 Harness 实时联动 > 干活—邀功—摸鱼的行为节奏 > 可靠的长期存档 > 低打扰互动 > 可扩展角色包；商城、复杂房间、多角色和联网功能全部靠后。
