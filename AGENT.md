# AGENT.md

## 目标

本仓库用于维护 `分享会筹备助手` 比赛 Demo。  
任何 Agent 在执行任务时，都应优先服务于以下目标：

- 保持单场景聚焦
- 保持 Demo 可运行
- 保持页面适合截图、录屏与比赛发帖
- 保持文档归档清晰

## 执行优先级

1. 不破坏当前可运行 Demo
2. 不偏离“分享会筹备助手”的单场景范围
3. 不把页面改成聊天机器人或后台系统
4. 不把新文档放错目录
5. 修改后完成测试、构建与必要提交

## 工作边界

### 可以做

- 优化前端页面结构、文案、样式和交互细节
- 完善本地规划逻辑与测试
- 新增比赛所需项目文档
- 调整截图、录屏、发帖相关材料
- 提交清晰的小步 Git 版本

### 不要做

- 不要擅自引入后端服务
- 不要擅自接入真实大模型 API
- 不要擅自添加登录、数据库、多人协作
- 不要把 Demo 扩展成多场景平台
- 不要把文档散落到错误目录

## 架构理解（必读）

本项目是一个**纯前端规则引擎**，没有后端、没有 AI 调用。

```
用户输入（6 项结构化字段：topic / audience / duration / date / goal / preparedness）
        │
        ▼
  HeroSection ──→ App.handleSubmit()
        │               │
        │         setStatus("loading")  → 骨架屏
        │         setTimeout(900ms)       （测试用 vi.advanceTimersByTime(900) 匹配）
        │               │
        │         createPlan(input)     ← src/lib/planner.js
        │               │
        │    ┌──────────┼──────────┐
        │    ▼          ▼          ▼
        │  从 demoTemplates.js 查表：
        │  · audienceProfiles   (5 种听众画像)
        │  · durationProfiles   (5 种时长画像)
        │  · goalProfiles       (4 种目标画像)
        │  · preparednessProfiles (5 种准备状态)
        │  · structureSuggestions (5 种结构建议)
        │  · basePlanTemplate   (4 阶段模板 + 清单 + insights)
        │               │
        │    规则叠加顺序：听众 → 时长 → 目标 → 准备状态 → 日期
        │               │
        ▼               ▼
  setResult() ← setStatus("done")
        │
        ▼
  输出组件树：
  ├── StageSection             — 4 阶段卡片（done/current/pending 状态）
  ├── StructureSuggestionPanel — 按时长推荐结构 + 时间分配
  ├── ChecklistPanel           — 行动清单，前 2 项标"先做"
  └── InsightPanel             — 准备重点(highlights) + 容易遗漏(risks)
```

**关键行为**：`createPlan()` 是纯函数，所有逻辑是查表 + 字符串拼接，完全确定性。任何输入组合都不会报错——缺失字段会 fallback 到默认值（`defaultInput`）。

**状态机**：`idle`（初始/预览）→ `loading`（骨架屏 900ms）→ `done`（完整输出）。修改任何输入字段立即回到 `idle` 并 `setResult(null)`。

## 代码与文件位置

| 文件 | 职责 |
|------|------|
| `src/App.jsx` | 页面主入口，3 状态切换，组装所有子组件 |
| `src/App.test.jsx` | 组件交互回归测试（jsdom 环境，fake timers） |
| `src/components/HeroSection.jsx` | 首屏输入区：textarea + 4 个 select + date + 按钮 |
| `src/components/StageSection.jsx` | 4 阶段卡片网格，含状态标记与完成标准 |
| `src/components/StructureSuggestionPanel.jsx` | 结构建议 + 时间分配 |
| `src/components/ChecklistPanel.jsx` | 编号清单，前 2 项高亮"先做" |
| `src/components/InsightPanel.jsx` | 准备重点（绿）+ 容易遗漏（黄）双列表 |
| `src/components/LoadingState.jsx` | 4 个骨架卡片 + "正在拆解..." |
| `src/components/AppHeader.jsx` | 顶部标题栏 + 比赛标记 |
| `src/components/FooterNote.jsx` | 底部产品说明 |
| `src/data/demoTemplates.js` | 所有知识库/画像表/模板数据（~275 行，是数据核心） |
| `src/lib/planner.js` | 规则引擎，`createPlan()` + `createPlanFromGoal()` |
| `src/lib/planner.test.js` | 规划逻辑单元测试（纯逻辑，无需 jsdom） |
| `src/styles/globals.css` | Tailwind 指令 + 全局样式 + 动画定义 |
| `.trae/` | ⚠️ TRAE IDE 技能文件，非项目源码，vitest 已排除，**不要在此目录做任何修改** |
| `project-docs/赛前准备` | 历史方案、比赛资料、草稿归档 |
| `project-docs/项目文档` | 正式项目文档 |
| `project-docs/初赛文档` | MVP 改造规划与任务单 |
| `docs/` | GitHub Pages 构建产物（`npm run build` 输出） |

## 文档归类规则

- 新生成文档默认放入 `project-docs/项目文档`
- 仅当文档属于历史归档、旧草稿、赛前参考材料时，才放入 `project-docs/赛前准备`
- `docs/` 目录专用于 GitHub Pages 静态发布产物，构建后由 `npm run build` 生成

## 视觉设计系统

所有颜色通过 `tailwind.config.js` 的自定义 token 使用，**禁止硬编码 hex 值**：

| Token | Hex | 用途 |
|-------|-----|------|
| `canvas` | `#F8F6F1` | 页面底色 |
| `surface` | `#FFFFFF` | 卡片/面板底色 |
| `muted` | `#F1ECE4` | 次级底色（骨架屏、标签背景） |
| `ink` | `#2B2926` | 主文字 |
| `secondary` | `#5F5A53` | 辅助文字 |
| `tertiary` | `#8C857B` | 弱化文字（footer） |
| `accent` | `#C96A3D` | 强调色（按钮、圆点、链接） |
| `accent-hover` | `#B85B31` | 按钮悬停 |
| `success` | `#6F907C` | 准备重点/已完成标记 |
| `warning` | `#B69042` | 容易遗漏/风险标记 |

可用动画类：`.animate-rise`（淡入上移 220ms）、`.skeleton`（加载闪烁）。圆角统一使用 `rounded-panel`（16px）或 `rounded-[14px]`/`rounded-[10px]`。

**视觉禁区**：紫粉蓝大渐变、玻璃拟态、满屏指标卡、聊天气泡布局、后台管理页风格。

## 页面修改规则

- 首屏必须清楚表达产品用途
- 输入区必须保持为第一视觉重点
- 结果区必须突出结构化输出
- 行动清单区必须有明确”收口感”
- 文案应偏比赛展示口径，而不是普通工具提示
- **所有颜色必须使用 Tailwind token（如 `text-ink`、`bg-accent`），禁止写死 hex**

## 验证流程

每次完成改动后，按顺序执行：

```bash
npm test              # 必须全部通过（planner 单元测试 + App 交互测试）
npm run build         # 必须构建成功，输出到 docs/
```

运行单个测试文件：

```bash
npx vitest run src/lib/planner.test.js      # 规划逻辑
npx vitest run src/App.test.jsx              # 组件交互
npx vitest src/lib/planner.test.js           # 监视模式
```

**测试注意事项**：
- `App.test.jsx` 依赖 `vi.useFakeTimers()` + `vi.advanceTimersByTime(900)` 跳过 handleSubmit 中的 setTimeout
- `planner.test.js` 有一个负时区日期测试（MockDate），涉及 `vi.stubGlobal("Date", MockDate)`，改动日期逻辑时必须覆盖此场景
- vite test 配置在 `vite.config.js` 的 `test` 字段中，测试文件匹配 `src/**/*.{test,spec}.{js,jsx}`

## Git 提交流程

- 改动完成后先检查状态：

```bash
git status --short
```

- 提交信息保持简洁明确，建议使用：

```bash
git commit -m "docs(project): ..."
git commit -m "feat(demo): ..."
git commit -m "fix(ui): ..."
```

## 文字口径

推荐表达：

- 帮用户推进目标
- 生成可执行路径
- 输出结构化结果
- 适合比赛展示的小产品

避免表达：

- 万能 AI 助手
- 聊天机器人
- 什么都能做
- 大而全平台

## 推荐演示输入

`我要准备一场小型分享会，但我不知道该怎么安排。`
