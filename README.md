# 奇境漫游 · 上海迪士尼

在浏览器中探索园区、查看建筑近景、切换昼夜光影，或观看城堡烟花演示。

这是一个**非官方三维视觉原型**。地面轮廓来自 OpenStreetMap，地标依据公开照片进行近似建模；并非测绘级 1:1 复刻。场景路线仅用于虚拟漫游。

## 功能

- 8 个主题区域、22 个可搜索目的地；地面漫游与高空鸟瞰。
- 点击建筑或搜索景点后，选择「看近景」或「导航」。
- 路线预览、剩余距离和时间、自动行走、暂停与继续。
- 白天、黄昏和夜晚；按日期计算的太阳、月相和星空。
- 多种烟花、城堡分区灯光与投影演示。
- 旋转木马、小飞象等设施细节与动画；部分设施支持慢速和定格演示。
- 本地打包的模型、PBR 材质、植物、渲染库和 Draco 解码器。

## 在本机运行

安装 Node.js 22 或更新版本（推荐 24），在项目根目录打开终端：

```sh
npm run dev
```

打开终端显示的 `http://127.0.0.1:4173/`。项目没有 npm 依赖，**不用执行 npm install，也没有构建步骤**。不要直接双击 HTML 文件打开；浏览器需要通过 HTTP 加载模型和模块。

如果端口被占用：

```sh
npm run dev -- --port 4184
```

### 操作

| 操作 | 作用 |
| --- | --- |
| 拖动 | 调整视角 |
| 滚轮 | 缩放；地面视角持续拉远后进入鸟瞰 |
| W / A / S / D、方向键 | 地面行走 |
| Shift | 加速行走 |
| 点击建筑、搜索目的地 | 打开景点信息并选择近景或导航 |
| 昼夜控件 | 切换光照场景 |

需要支持 WebGL 2 的现代浏览器与硬件加速。场景加载后的流畅程度取决于显卡；性能较低的设备可使用较低画质。

## GitHub 与自动发布

- 项目仓库：[JohnnyGuo132/shanghai-disney-explorer](https://github.com/JohnnyGuo132/shanghai-disney-explorer)
- 网站地址：[奇境漫游](https://JohnnyGuo132.github.io/shanghai-disney-explorer/)

网站地址在首次部署成功后生效。仓库已包含 GitHub Pages 自动发布工作流：每次推送到 `main`，先检查资源与语法，再发布 `dist/`。

首次部署需要在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**，然后在 **Actions → Deploy to GitHub Pages → Run workflow** 启动部署。后续更新只需推送代码。项目不需要部署密钥或服务器。

在其他仓库部署时，无需修改场景资源路径；所有模型与贴图均使用相对路径。请保留完整的 `dist/`、`scripts/` 与 `.github/` 目录。

[GitHub 官方 Pages 工作流说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## 修改与检查

`dist/` 中的 HTML、CSS、JavaScript 就是网站源文件，可直接编辑。运行：

```sh
npm run check
```

检查包括 JavaScript 语法、相对路径、文件名大小写、模型贴图引用、许可记录及文件体积。部署前会自动执行同一检查。

模拟 GitHub 项目子路径：

```sh
npm run dev -- --port 4184 --base /shanghai-disney-explorer/
```

打开 `http://127.0.0.1:4184/shanghai-disney-explorer/`。在另一终端运行 HTTP 资源检查：

```sh
npm run check -- --base-url=http://127.0.0.1:4184/shanghai-disney-explorer/
```

## 目录

```text
.github/workflows/pages.yml    GitHub Pages 自动检查与部署
scripts/serve.mjs              跨平台本地预览（Node 内置模块）
scripts/check.mjs              资源和语法检查
dist/
  index.html                  全园漫游入口
  explore.js / explore.css    界面与交互
  world-scene.js              三维场景
  world-*.js                  建筑、植物、设施、天体和烟花等模块
  map.html                    鸟瞰入口
  experience.html             独立城堡广场场景
  assets/                     模型、贴图、地图、星表及来源记录
  vendor/                     渲染库与解码器
  credits.html                完整素材来源与精度说明
THIRD_PARTY_NOTICES.md         许可范围与第三方声明索引
```

静态目录约 29 MiB，最大单文件不足 2 MB，无需 Git LFS。程序运行无需 API Key 或外部 CDN；来源链接会访问对应的外部网站。

## 数据与许可

完整说明见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) 和 [素材来源页面](./dist/credits.html)。第三方库、贴图和数据保留各自许可；仓库公开本身不改变这些许可，也不为未另行标注的原创内容授予统一开源许可。

建筑高度、装饰、种植与室内陈设包含估算；本项目与迪士尼没有官方关联。灯光和设施动画是视觉演示，不代表真实运营安排。
