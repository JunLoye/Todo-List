# Todo List 桌面应用

[![版本](https://img.shields.io/badge/版本-1.1.0-blue?style=flat-square&logo=github)](https://github.com/junloye/Todo-List/releases)
[![许可证](https://img.shields.io/badge/许可证-MIT-green?style=flat-square&logo=opensourceinitiative)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-28.x-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![GitHub Issues or Pull Requests](https://img.shields.io/github/issues/JunLoye/Todo-List)](https://github.com/JunLoye/Todo-List/issues)
[![GitHub 下载](https://img.shields.io/github/downloads/junloye/Todo-List/total?style=flat-square&logo=github&label=下载)](https://github.com/junloye/Todo-List/releases)
[![GitHub 仓库](https://img.shields.io/badge/GitHub-junloye%2FTodo--List-181717?style=flat-square&logo=github)](https://github.com/junloye/Todo-List)

一个基于 Electron 的轻量级待办事项管理工具，支持任务增删改查、截止日期、深色模式等功能。

## 功能特性

- **任务管理**：添加、编辑、删除、标记完成/未完成
- **截止日期**：可为任务设置截止日期，过期自动高亮提醒
- **排序与筛选**：按创建时间或截止日期排序，支持按全部/进行中/已完成筛选
- **统计面板**：实时显示全部、进行中、已完成任务数量
- **数据持久化**：任务数据自动保存在用户目录
- **导出数据**：将任务列表导出为 JSON 文件
- **深色模式**：一键切换亮色/暗色主题，偏好自动保存
- **截止日期开关**：可全局启用/关闭截止日期功能，界面同步调整
- **检查更新**：连接 GitHub Releases API 检测新版本，点击跳转下载
- **无外部依赖**：纯原生实现，大部分功能无需联网

## 技术栈

- **Electron** 28.x
- **原生 HTML/CSS/JS**
- **canvas-confetti** 用于完成任务的庆祝动画
- **localStorage** 存储主题与功能开关偏好
- **Electron IPC** 实现文件读写

## 下载与安装

### 下载预构建版本（推荐）

无需安装 Node.js 和编译环境，直接下载可执行文件即可使用：

1. 访问本项目的 [Releases 页面](https://github.com/junloye/Todo-List/releases)
2. 在最新版本中找到 `TodoList.exe`（Windows 便携版）
3. 下载后双击即可运行，无需安装

> 如果系统提示“Windows 已保护你的电脑”，请点击“更多信息”然后选择“仍要运行”。

### 从源码构建

如果你希望自行编译或修改代码，请按照以下步骤操作。

#### 环境要求

- Node.js 18+ 或 20+
- npm 或 yarn

#### 步骤

1. 克隆或下载项目代码
2. 进入项目目录，安装依赖：

```bash
npm install
```

3. 启动应用：

```bash
npm start
```

4. 打包为独立 exe 文件：

```bash
npm run dist          # 生成安装包
npm run dist:portable # 生成便携版 exe（单文件）
```

打包产物位于 `dist/` 目录下。

## 项目结构

```
.
├── main.js           # Electron 主进程
├── preload.js        # 预加载脚本，安全暴露 API
├── index.html        # 主界面
├── renderer.js       # 渲染进程逻辑
├── styles.css        # 样式表
├── package.json      # 项目配置及依赖
└── assets/           # 应用图标文件夹
```

## 快捷键与操作

- 在任务输入框或日期选择框中按 `Enter` 快速添加任务。
- 点击任务复选框可切换完成状态。
- 点击任务右侧的编辑/删除图标进行修改或删除。
- 点击侧边栏「设置」打开设置面板，可切换深色模式、关闭截止日期功能、检查更新等。

## 常见问题

**Q: 导出的文件保存在哪里？**  
A: 导出时会弹出系统保存对话框，用户可选择保存路径。

**Q: 为什么检查更新失败？**  
A: 请确保网络可访问 GitHub API。网络波动可能导致更新失败。如果使用预构建版本，请检查 Releases 页面的版本号是否与软件内显示一致。

**Q: 如何更新到新版本？**  
A: 在软件内点击“检查更新”，如有新版本会提示跳转到 Releases 页面，下载新的 exe 替换旧文件即可。

## 许可证

[MIT License](LICENSE)