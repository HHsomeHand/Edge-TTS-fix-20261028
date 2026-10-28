# Edge TTS 修复说明

本修复基于 HHsomeHand/SillyTavern-EdgeTTS-Plugin 的 main 分支。

已确认：仓库原有 dist/plugin.js 内仍是 Sec-MS-GEC v1；npm install 更新 node_modules 不会自动重新打包这个文件。msedge-tts 2.1.1 使用 v2。本修复将依赖固定为 2.1.1，并重新构建 dist/plugin.js。

源码还补上了输入类型校验、异步音频流错误处理和 TTS 连接清理。握手失败会返回 502；音频发送过程中失败会关闭响应，避免发送损坏音频后再追加错误文本。

## 最省事的安装

1. 停止酒馆。
2. 备份原插件的 dist/plugin.js。
3. 用此压缩包里的 dist/plugin.js 覆盖原插件的同名文件。
4. 重新启动酒馆。

此成品已打包 JavaScript 依赖，只替换 dist/plugin.js 即可试用，无需在手机上构建。

## 自己从源码构建

在原插件目录中替换 src/index.ts，再运行：

```sh
cd ~/SillyTavern/plugins/SillyTavern-EdgeTTS-Plugin
npm install --save-exact msedge-tts@2.1.1
npm run build
```

完成后重启酒馆。不要只更新依赖，也不要只替换 src/index.ts 而不构建。

## 如果仍报 Unexpected server response: 200

WebSocket 握手成功的状态码是 101。200 表示没有成功升级连接，不能仅凭状态码断定是微软还是中间代理返回的。

把 check-edge-tts.cjs 放进插件根目录，分别运行：

```sh
node check-edge-tts.cjs
node check-edge-tts.cjs --bundle
```

第一个直接使用 node_modules 的依赖，第二个调用 dist/plugin.js 的生成路由（模拟响应流）。两者都成功应显示收到的音频字节数。

- 第一个成功而第二个失败：检查 dist/plugin.js 是否已正确替换或重新构建。
- 两者都返回 200：在 Termux 所在设备对比直连与代理，检查代理是否支持 WebSocket，以及是否存在网络登录页、过滤或重定向。不要把 200 当作握手成功，也不要用关闭证书校验解决。
- 两者成功但酒馆失败：确认已彻底重启酒馆，并确认日志里的插件路径与替换位置一致。

## 验证范围

2026-10-28，在本地 Node.js v24.14.0 验证：生产构建通过，ESLint 通过；直接使用 msedge-tts 2.1.1 合成收到 18,731 字节，打包后插件生成路由收到 19,236 字节。

未在用户的 Android / Termux 网络环境上运行，因此不保证能排除当地网络或代理导致的握手错误。
