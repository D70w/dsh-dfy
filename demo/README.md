# 大肥鱼免 API 演示

本地运行：

```sh
npm run build:demo
npm run demo
```

打开 http://127.0.0.1:3152/ 。页面可以摸摸角色、选择 16 种表情、模拟 6 种工作反馈。

演示复用插件的角色绘制、表情和道具实现，不接入 DSH、模型接口、账户或历史记录。所有任务均为模拟；不存储输入，不需要密钥。

构建产物位于 `artifacts/public-demo/`，可作为静态网站部署，支持子目录。仅复制白名单中的实时角色资源，不包含视频或开发实验。角色资源许可与项目一致：CC BY-NC-SA 4.0。发布演示站前需另行确认，不随 npm 包上传。

浏览器验收：启动后运行 `python tests/browser_public_demo.py`。

## 视频优化（开发工具，非运行依赖）

用 `WHALE_FFMPEG` 指定 ffmpeg 路径，运行 `node scripts/optimize-videos.mjs` 生成候选。执行 `python tests/browser_video_optimization.py` 前另启动 `node scripts/serve-preview.mjs 3153`。检查对比截图后，才用 `--apply-existing` 采纳候选；只替换更小且透明度通过检查的文件。原始视频备份在忽略目录 `artifacts/media-originals/`。

最终用户安装和运行插件不需要 ffmpeg 或 Python。
