<div align="center">

# 奇境漫游 · 上海迪士尼

**在浏览器里逛上海迪士尼，从全园鸟瞰到城堡夜色。**

[![持续检查](https://github.com/JohnnyGuo132/shanghai-disney-explorer/actions/workflows/ci.yml/badge.svg)](https://github.com/JohnnyGuo132/shanghai-disney-explorer/actions/workflows/ci.yml)
[![最新版本](https://img.shields.io/github/v/release/JohnnyGuo132/shanghai-disney-explorer)](https://github.com/JohnnyGuo132/shanghai-disney-explorer/releases/latest)
[![原创内容采用 MIT 许可](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE.md)

[下载体验](https://github.com/JohnnyGuo132/shanghai-disney-explorer/releases/latest) · [快速开始](#快速开始) · [操作指南](./docs/USER_GUIDE.md) · [English](./README.en.md)

</div>

[![奇幻童话城堡，来自应用实际运行画面](./docs/media/showcase/hero-castle.jpg)](./docs/media/showcase/hero-castle.jpg)

沿着步道走近地标，拉远镜头俯瞰园区，再回到城堡前等待烟花。奇境漫游是一款非官方开源三维探索应用，在本机浏览器中运行，模型、纹理、渲染库与解码器均随项目提供。

## 走进园区

<table>
  <tr>
    <td width="50%"><a href="./docs/media/showcase/park-overview.jpg"><img src="./docs/media/showcase/park-overview.jpg" alt="全园鸟瞰实际运行截图" /></a></td>
    <td width="50%"><a href="./docs/media/showcase/tron.jpg"><img src="./docs/media/showcase/tron.jpg" alt="明日世界创极速光轮实际运行截图" /></a></td>
  </tr>
  <tr>
    <td align="center">全园鸟瞰</td>
    <td align="center">明日世界 · 创极速光轮</td>
  </tr>
  <tr>
    <td><a href="./docs/media/showcase/treasure-cove.jpg"><img src="./docs/media/showcase/treasure-cove.jpg" alt="宝藏湾海盗船实际运行截图" /></a></td>
    <td><a href="./docs/media/showcase/roaring-mountain.jpg"><img src="./docs/media/showcase/roaring-mountain.jpg" alt="探险岛雷鸣山实际运行截图" /></a></td>
  </tr>
  <tr>
    <td align="center">宝藏湾</td>
    <td align="center">探险岛 · 雷鸣山</td>
  </tr>
  <tr>
    <td><a href="./docs/media/showcase/zootopia.jpg"><img src="./docs/media/showcase/zootopia.jpg" alt="疯狂动物城建筑实际运行截图" /></a></td>
    <td><a href="./docs/media/showcase/carousel.jpg"><img src="./docs/media/showcase/carousel.jpg" alt="幻想曲旋转木马实际运行截图" /></a></td>
  </tr>
  <tr>
    <td align="center">疯狂动物城</td>
    <td align="center">幻想曲旋转木马</td>
  </tr>
</table>

## 等一场城堡烟花

[![城堡灯光与烟花演出的实际运行录屏片段](./docs/media/showcase/fireworks.gif)](./docs/media/showcase/fireworks.gif)

约 60 秒的演出结合烟花、城堡分区灯光、投影与烟雾。也可以自由切换日光、暮色与星夜；星空与月相随日期计算，昼夜随时间设置变化。

*本页图片与动图均采集自 v1.0.3 实际运行画面，点击可查看原图。不同设备、窗口尺寸和画质设置会影响效果。详见 [截图与录制说明](./docs/SHOWCASE.md)。*

## 按自己的节奏探索

| 体验 | 可以做什么 |
| --- | --- |
| **8 个主题区域，22 个主要目的地** | 搜索地标，或直接点击建筑，前往附近的观景位置。 |
| **从步道走向全园鸟瞰** | 地面行走、近景观察，连续拉远进入鸟瞰，通过小地图辨认位置。 |
| **沿路线自动漫游** | 预览步道路线、距离与预计时间，再开始自动行走，随时暂停或继续。 |
| **停下来观察细节** | 查看建筑、植物、铺地与街道家具；部分游乐设施支持运行、慢速和定格。 |
| **切换昼夜，观看演出** | 从日光走到星夜，或前往城堡观演位置，观看灯光烟花。 |

[![步道路线预览与导航控件实际运行截图](./docs/media/showcase/navigation.jpg)](./docs/media/showcase/navigation.jpg)

**基本操作：** 拖动环顾，滚轮缩放，`W A S D` 或方向键行走，按住 `Shift` 加速。`/` 打开搜索，`Esc` 关闭面板或中断自动移动。完整交互见 [操作指南](./docs/USER_GUIDE.md)。

## 快速开始

需要 **[Node.js 22+](https://nodejs.org/)**，以及支持 **WebGL 2**、开启**硬件加速**的浏览器。推荐使用电脑、鼠标与键盘。

```sh
git clone https://github.com/JohnnyGuo132/shanghai-disney-explorer.git
cd shanghai-disney-explorer
node scripts/serve.mjs
```

打开 [http://127.0.0.1:4173/](http://127.0.0.1:4173/)，等待场景载入即可开始。无需 `npm install`、前端构建、API Key 或外部素材 CDN。游览时保持终端运行，结束后按 `Ctrl+C` 关闭服务。

**不使用 Git？** 打开 [最新发行版](https://github.com/JohnnyGuo132/shanghai-disney-explorer/releases/latest)，下载名称以 `-source.zip` 结尾的源码包，解压后在项目目录运行 `node scripts/serve.mjs`。下载无需登录。GitHub Pages 尚未启用，目前通过本机运行体验。静态网站包与校验方法见 [发行指南](./docs/RELEASING.md)，启动问题见 [反馈与支持](./SUPPORT.md)。

## 一起完善它

`dist/` 包含可直接编辑的应用代码与全部运行素材；`scripts/` 提供本地服务、检查、测试和发行工具，无需前端构建。

```sh
npm run check
npm test
```

欢迎提交 Issue 和 Pull Request。从 [贡献指南](./CONTRIBUTING.md) 与 [架构说明](./docs/ARCHITECTURE.md) 开始，也可以查看 [路线图](./docs/ROADMAP.md) 或 [反馈问题](https://github.com/JohnnyGuo132/shanghai-disney-explorer/issues/new/choose)。安全问题请使用 [私密报告渠道](./SECURITY.md)，版本变化见 [更新记录](./CHANGELOG.md)。

**体验范围：** 园区轮廓参考 OpenStreetMap，建筑与景观为近似重建，内景以局部橱窗和陈设为主；未达到测绘级复刻。应用不提供真实排队、票务、营业数据或完整设施乘坐模拟，手机与平板尚未完成广泛机型验证。详见 [已知限制](./docs/ROADMAP.md) 与 [性能说明](./docs/PERFORMANCE.md)。

## 许可与致谢

项目原创内容采用 **[MIT 许可](./LICENSE.md)**，欢迎使用、修改与贡献。第三方软件、素材及数据保留各自条款，不属于项目 MIT 授权范围；来源与署名见 [第三方声明](./THIRD_PARTY_NOTICES.md) 和 [素材来源](./dist/credits.html)。

感谢 Three.js、OpenStreetMap 贡献者、Poly Haven、ambientCG、HYG、NASA SVS，以及随附库与素材的作者。

本项目与迪士尼及上海迪士尼度假区没有官方关联，也未获其背书。名称、商标与第三方形象的权利归各自权利人。
