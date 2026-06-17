# CLAUDE.md

## 项目概览

- 项目名称：`分享会筹备助手`
- 项目类型：`React + Vite + Tailwind CSS` 单页 Web Demo
- 目标：为 `TRAE AI 创造力大赛` 初赛提供一个可运行、可截图、可录屏的最小体验产品
- 核心场景：用户输入一个分享目标，页面输出结构化的筹备阶段、行动清单与提醒信息

## 当前产品范围

- 单页桌面优先工作台
- 3 个主要状态：
  - 初始态
  - 处理中态
  - 输出态
- 输出内容聚焦：
  - 4 个阶段任务卡片
  - 最终行动清单
  - 准备重点 / 容易遗漏的事

## 技术栈

- `React 18`
- `Vite 5`
- `Tailwind CSS 3`
- `Vitest`

## 目录约定

- `src/App.jsx`
  - 页面主入口与状态切换
- `src/components`
  - 页面 UI 组件
- `src/data/demoTemplates.js`
  - 默认演示数据模板
- `src/lib/planner.js`
  - 本地规划逻辑
- `src/lib/planner.test.js`
  - 规划逻辑测试
- `src/styles/globals.css`
  - 全局样式与视觉 token
- `project-docs/赛前准备`
  - 历史方案、比赛资料、草稿与提示词归档
- `project-docs/项目文档`
  - 后续新增的正式项目文档
- `docs/`
  - GitHub Pages 静态发布产物，由构建生成

## 文档规则

- 不要再把新文档直接丢到 `docs` 根目录
- 新增项目资料统一放到 `project-docs/项目文档`
- 历史草稿、赛前分析、旧方案归档到 `project-docs/赛前准备`
- `docs/` 仅保留构建后的静态站内容

## 开发原则

- 保持 Demo 聚焦，不扩展成万能 AI 助手
- 优先保证“输入 -> 结构化输出”的演示闭环
- 优先保证截图和录屏效果，而不是堆复杂功能
- 不随意加入后端、数据库、登录、多人协作等超范围能力
- 页面表达要像真实产品，不像聊天套壳或后台系统

## 内容与视觉约束

- 视觉风格：暖中性色、克制、清爽、适合比赛展示
- 避免：
  - 紫粉蓝大渐变
  - 玻璃拟态
  - 满屏指标卡
  - 聊天气泡式主布局
  - 后台管理页风格
- 文案强调：
  - 帮用户推进事情
  - 生成可执行路径
  - 输出结构化结果

## 常用命令

```bash
npm install
npm run dev
npm test
npm run build
```

## 修改后必做检查

- 运行 `npm test`
- 运行 `npm run build`
- 如有新增文档，确认文档放在正确目录
- 如有改首页文案，确认措辞更像“参赛作品展示页”

## Git 约定

- 当前仓库已经初始化本地 Git
- 提交信息建议使用 Conventional Commits
- 优先使用清晰范围，例如：
  - `feat(demo): ...`
  - `docs(project): ...`
  - `fix(ui): ...`
- 远程仓库：`https://github.com/wjt0321/trae-sharing-prep-assistant`
- GitHub Pages：`https://wjt0321.github.io/trae-sharing-prep-assistant/`

## 推荐演示输入

`我要准备一场小型分享会，但我不知道该怎么安排。`
