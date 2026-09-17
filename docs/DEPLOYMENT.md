# GitHub Pages 部署

[返回项目首页](../README.md)

## 在线地址

**[打开奇境漫游](https://johnnyguo132.github.io/shanghai-disney-explorer/)**

在线访问无需安装 Node.js。推荐使用支持 WebGL 2、开启硬件加速的桌面浏览器。首次需要下载模型与纹理；符合移动加载条件的设备默认选择轻量纹理和「流畅」画质，切换「高画质」会重载完整纹理。加载耗时取决于网络与设备，改动范围见 [性能说明](./PERFORMANCE.md)。

## 发布方式

网站是完整的静态应用，不需要后台服务、数据库或 API Key。发布目录为 `dist/`，模型、纹理、渲染库和解码器随站点部署，资源使用相对路径。

`main` 分支通过 [pages.yml](../.github/workflows/pages.yml)（**Deploy online demo**）自动发布：工作流用 `npm ci` 安装锁定的构建工具，执行 `npm run build -- --check` 核对已提交产物，再运行 `npm run check` 与 `npm test`，通过后上传 `dist/` 并部署到 GitHub Pages。失败的校验不会发布新站点。线上内容跟随成功部署的提交，Release 下载包仍对应固定版本。

构建校验不会自动改写过期 bundle。修改源码后，需先在本机重新构建并提交生成的 JavaScript、许可声明与内联样式。

查看 [Pages 工作流](https://github.com/JohnnyGuo132/shanghai-disney-explorer/actions/workflows/pages.yml) 的最近运行结果。需要重新发布时，在该工作流页点击 **Run workflow**，选择 `main`；已有失败任务可打开后使用 **Re-run jobs** 重试。修改代码导致的失败，应先修复再运行。

## 部署自己的 Fork

1. Fork 本仓库，保留 `main` 分支和 `.github/workflows/pages.yml`。
2. 在自己仓库的 **Actions** 页启用工作流（如果页面提示尚未启用）。仓库的 Actions 策略需要允许工作流中使用的官方 `actions/*` 操作。
3. 打开 **Settings → Pages → Build and deployment**，将 **Source** 设为 **GitHub Actions**。具体设置见 [GitHub 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。
4. 回到 **Actions**，打开 **Deploy online demo** 工作流，点击 **Run workflow** 并选择 `main`。
5. 部署成功后，从 **Settings → Pages** 或部署任务中打开站点。普通项目仓库的地址形式是 `https://你的用户名.github.io/你的仓库名/`，请用自己的用户名和仓库名替换 README 中的在线链接。

后续将网站修改推送到 `main`，工作流会重新校验并发布。无需配置个人访问令牌或将本地 Node.js 服务上传到 GitHub Pages。

## 修改源码后的构建

项目使用 esbuild 合并主入口模块，源码仍保存在 `dist/`。安装 Node.js 22+，在项目目录运行：

```sh
npm ci
npm run build
npm run check
npm test
```

`npm run build` 会生成 `dist/app.bundle.js`、`dist/app.bundle.js.LEGAL.txt`，并将 `dist/explore.css` 同步为 `index.html` 与 `explore.html` 的内联样式。将这些产物与源码一起提交，不要直接编辑压缩 bundle。

只体验或部署仓库已经提交的 `dist/` 时，无需安装构建依赖。构建报告中的压缩估算和文件体积不代表手机实测加载速度；跨网络连接仍需另行测量。

## 在本机验证子路径

以下命令可直接预览已提交的 `dist/`，无需 `npm ci`。如果刚修改源码，先完成上面的构建与检查。在项目目录安装 Node.js 22+，运行：

```sh
node scripts/serve.mjs --port 4184 --base /shanghai-disney-explorer/
```

打开 [本机子路径预览](http://127.0.0.1:4184/shanghai-disney-explorer/)，在另一终端检查资源路径：

```sh
node scripts/check.mjs --base-url=http://127.0.0.1:4184/shanghai-disney-explorer/
```

检查通过后，再在浏览器查看模型、昼夜、烟花、搜索与导航。修改仓库名时，将命令和预览地址中的 `/shanghai-disney-explorer/` 一并换成自己的仓库路径。

## 访问或发布失败

- **站点 404：**确认访问的是自己仓库的 Pages 地址，并检查工作流是否部署成功、Pages 的 Source 是否为 GitHub Actions。
- **页面本身很久才出现：**区分 HTML 连接／首字节等待和取得 HTML 后的样式、脚本执行。当前 Windows 主机首页直接访问约 0.21–0.55 秒，只是本机两次测量，不能代表手机网络；此次首屏优化没有承诺解决跨网络连接问题。
- **模型一直加载或资源 404：**检查工作流校验结果、文件名大小写与相对路径，先运行上面的本机子路径检查。
- **画面黑屏或卡顿：**确认 WebGL 2 与硬件加速可用，尝试「流畅」画质；进一步排查见 [支持说明](../SUPPORT.md) 和 [性能说明](./PERFORMANCE.md)。

历史发行文档保留当时的分发状态，当前在线部署方式以本页为准。
