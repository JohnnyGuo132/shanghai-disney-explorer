# 发行与下载包

[返回项目首页](../README.md)

## 当前分发方式

项目通过私有 GitHub 仓库的 [Releases](https://github.com/JohnnyGuo132/shanghai-disney-explorer/releases) 分发。只有获授权成员可访问。公开 Pages 已停用；持续检查仅用于验证代码与交付物，不自动发布网站。

发行标签、`package.json` 版本、CHANGELOG 标题及下载文件名使用同一版本号。`v1.0.0` 对应首个完整私有发行。

## 下载哪个文件

| 附件 | 内容与用途 |
| --- | --- |
| `shanghai-disney-explorer-v1.0.0-source.zip` | 浏览器源码、全部运行素材、本地服务、检查脚本及文档。普通体验和后续编辑选这个包 |
| `shanghai-disney-explorer-v1.0.0-website.zip` | 静态网站文件，`index.html` 位于包根目录，适合交给静态 HTTP 服务；不含完整本地开发工具 |
| `SHA256SUMS.txt` | 下载包的 SHA-256 校验值，用于检查下载文件是否与发布文件一致 |
| `release-manifest.json` | 发行版本、提交与文件信息，供追溯和自动化核对 |

GitHub 还可能显示自动生成的 Source code 下载项；本指南中的本地体验步骤以命名明确的 `source.zip` 附件为准。源码包不包含 `.git` 历史、缓存、凭据或未跟踪的工作文件，也不代表包含全部原始建模工程。

### 校验下载文件

将附件与 `SHA256SUMS.txt` 放在同一目录。Windows PowerShell 示例：

```powershell
Get-FileHash -Algorithm SHA256 .\shanghai-disney-explorer-v1.0.0-source.zip
```

将输出的哈希与 `SHA256SUMS.txt` 中同名文件对应值比较，忽略字母大小写。macOS 可使用 `shasum -a 256 文件名`，Linux 可使用 `sha256sum 文件名`。值一致后再解压；校验和用于文件完整性核对，本身不是独立的作者签名。

## 在本地生成发行包

以下适用于维护者，需要安装 Node.js 22+ 与 Git，并在完整 Git 检出目录运行。

1. 更新版本号、CHANGELOG、README 中的发行信息及实际截图。
2. 检查新增素材来源，并保留全部许可声明。
3. 执行资源检查与本地服务测试：

```sh
npm run check
npm test
```

4. 在浏览器检查地面、鸟瞰、日夜、演出、搜索、导航及窄屏布局。功能检查不能由文件存在性检查代替。
5. 提交所有拟发行变更；发行工具要求工作区干净且存在已提交的 HEAD。
6. 生成附件：

```sh
npm run release
```

本版本输出在 `artifacts/v1.0.0/`。工具从已提交的 Git 内容读取文件，以固定 UTF-8 排序、固定时间元数据和 DEFLATE 压缩生成 ZIP。在相同提交、脚本和 Node.js / zlib 版本下，输出字节可复现；不承诺不同 zlib 版本间的压缩字节一致。版本清单记录了实际工具链。

7. 解压生成的包，验证本地启动、主页面和完整资源路径；对照校验和。
8. 为核实后的提交创建 `v1.0.0` 标签，将四个附件上传至私有 Release，填写功能、检查范围和已知限制。发布后确认仓库仍为私有。

发行工具只负责生成本地附件，不应将生成包或凭据提交回代码目录。公开网站恢复与仓库公开是独立操作，需要项目所有者另行决定。

## 子路径验证

资源使用相对路径，可以在本机模拟静态服务子目录：

```sh
npm run dev -- --port 4184 --base /shanghai-disney-explorer/
```

访问 `http://127.0.0.1:4184/shanghai-disney-explorer/`。在另一个终端运行：

```sh
npm run check -- --base-url=http://127.0.0.1:4184/shanghai-disney-explorer/
```

该步骤只进行本地 HTTP 资源验证，不启用任何公网站点。

## 每个版本保留的证据

- 对应提交与版本标签。
- CHANGELOG 中的变化和兼容性说明。
- 资源检查、服务测试和实际浏览器检查结果。
- 实测环境与未验证范围。
- 源码包、网站包、校验和及版本清单。
- 所有素材许可和来源记录。

需要撤回有问题的发行时，先将具体问题和受影响版本写入发行说明，提供修订版本；避免默默替换同一版本的附件。下载者应能区分不同内容。
