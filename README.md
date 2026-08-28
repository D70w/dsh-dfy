# dsh-dfy

`dsh-dfy` 是一个面向 DeepSeek Harness Web Profile 的 Host/Browser Cordis 插件。它将测试网站中已经确认的鲸鱼娘桌宠运行时迁移为可安装的 DSH 插件，包含 Live2D 风格分层待机、移动动作、互动反馈、情绪特效、对话气泡、独立输入框、菜单、账单和桌宠设置。

English: [README.en.md](./README.en.md)

## 当前版本

- npm 包名：`dsh-dfy`
- 当前版本：`0.1.4`
- 默认分支：`main`
- GitHub：<https://github.com/D70w/dsh-dfy>

## 安装到 DSH

发布到 npm 后，可直接安装注册表中的包：

```sh
npm install dsh-dfy
```

插件依赖由 DSH Web Profile 提供；如果 npm 在普通项目中尝试自动解析整套 DSH peer 依赖并报 `ERESOLVE`，请使用 `npm install --legacy-peer-deps dsh-dfy`，或直接使用下面的 DSH 插件命令。

如果是在 DSH Web Profile 中启用，使用 DSH 的插件命令（它会把 npm 包加入当前 profile）：

```sh
dsh plugin --profile web add dsh-dfy
```

离线或本地验收时，也可以先构建 tarball，再安装本地包：

```sh
corepack pnpm install
corepack pnpm run build
dsh plugin --profile web add ./dsh-dfy-0.1.4.tgz
```

如果使用项目中的发布脚本生成包，tarball 会放在 `release/packages/`。安装完成后启动 Web Profile：

```sh
dsh web --port 3088
```

插件会以一个 `dsh-dfy` Loader 项加载，并向 `shell.overlay` 和 `settings.section` 提供界面。它不会创建第二个 React 根，也不会替换 DSH 的 `root` 页面。

## 功能范围

### 角色与动作

- 1280×1280 的共享设计坐标系和透明 Canvas 渲染。
- 分层待机角色：头发、呆毛、眼睛、眉毛、耳朵、身体、裙子、腿、尾巴和服装附件。
- 呼吸、眨眼、视线、身体关节、头发、裙摆、呆毛和尾巴的连续动态。
- 水平跑步、向左跑、上浮和下潜动作，均使用准备、循环、结束三段式视频，并与角色位置和朝向衔接。
- 经过校准的一次性动作视频；待机、移动和动作共享 350×350 CSS 表面、底部锚点和缩放策略。
- 点击时的 QQ 弹反馈、抓取点物理、腮红持续状态和次级部件跟随。

### 对话与情绪

- 头顶气泡默认显示角色说话内容；气泡输入框单独位于角色下方，并可拖动。
- 菜单包含对话、表情、模型、账户和设置页。
- 支持离线人设台词，也支持用户填写 OpenAI 兼容接口的 Base URL、模型名和 API Key。
- 预置喜欢、害羞、生气、惊讶、难过、开心、困惑、委屈、困倦、得意、期待、坏笑、安心、认真、紧张和馋嘴等情绪。
- 情绪拥有独立的眼眉嘴变形、身体表演和粒子特效，例如爱心、怒气、问号、流泪、汗滴、`Z` 和白米饭。

### 账户与本地账单

- DSH Host 端代理官方 DeepSeek 余额接口，浏览器端不接触 Host 凭据。
- 余额按设置的时间间隔刷新，默认每 10 分钟。
- 使用 DSH 提供的 token 数据在本地统计输入、缓存命中、缓存写入和输出消耗。
- 支持按天和按小时查看本地账单；未配置官方余额时，会明确显示不可用状态，不伪装成官方余额。

### 桌宠故事与设置

- 支持蝴蝶追逐、光标靠近、午睡、白饭和饭碗小故事。
- 互动、食物、工作反应和关系阶段使用 Host 持久化状态与 UUID 幂等命令。
- 支持自动漫游、减少动态、固定当前位置、回到底部默认位置、键盘方向微调和安静模式。
- 思考状态相关资源当前按上线后路线保留；正常上线运行不强制启用思考态移动动作。

## 开发与验证

安装依赖并运行完整检查：

```sh
corepack pnpm install
corepack pnpm run verify
```

`verify` 包含：

- TypeScript 类型检查；
- 273 个 Vitest 单元/组件/契约测试；
- 正式构建；
- npm 包内容预览。

真实浏览器验收使用隔离的 DSH Web Profile：

```sh
python tests/run_browser_e2e.py --dsh-home <isolated-dsh-home> --port 3088
```

视觉调试面板只在 URL 带 `?whaleDebug=1` 时启用，例如：

```text
http://127.0.0.1:3088/?whaleDebug=1
```

## 仓库内容边界

仓库保留源码、测试、正式运行资源、许可证和设计文档。以下内容不会进入 Git：

- `node_modules/`、`lib/`、`release/` 和构建缓存；
- `artifacts/` 中的历史预览、视频分析和截图；
- PSD、临时抠图源、E2E 临时 DSH Home；
- `character-packs/default-whale/source/` 下的开发期源素材。

正式安装包只分发 `character-packs/default-whale/runtime/production-v1/`，这样运行所需资源与开发阶段素材保持分离。

## 许可证与素材来源

插件代码采用 MIT License。默认角色是“鲸鱼娘形象”的获批 chibi-maid 衍生资源，角色栅格素材遵循 CC BY-NC-SA 4.0。作者、来源、改动链和再分发说明见 [ASSETS_LICENSE.md](./ASSETS_LICENSE.md) 与 [character-packs/default-whale/SOURCE.md](./character-packs/default-whale/SOURCE.md)。

## 已知限制

- 大角度肘部表演、跳跃落地、更丰富的嘴型和更多语义表情仍需要经过确认的新素材与局部网格。
- 当前白饭故事是叙事互动，不会真正扣减库存。
- 八小时长时间运行、低端设备代表性性能测试和完整屏幕阅读器验收仍属于后续发布门槛。
