# AGENT.md

## 目标

本仓库用于维护 `AI 任务管家`（从 `分享会筹备助手` 比赛版升级而来）。
任何 Agent 在执行任务时，都应优先服务于以下目标：

- 保持 Monorepo 工程骨架可运行（前端 + 后端 + 共享契约层）
- 保持 legacy-demo 可独立运行
- 保持页面适合截图、录屏与比赛发帖
- 保持文档归档清晰
- 保持安全监控与发布治理就位

## 执行优先级

1. 不破坏当前可运行的 Monorepo 工程
2. 不偏离"AI 任务管家"的产品范围（灵感到执行全链路）
3. 不把页面改成聊天机器人或后台系统
4. 不把新文档放错目录
5. 修改后完成测试、构建与必要提交

## 工作边界

### 可以做

- 优化前端页面结构、文案、样式和交互细节
- 完善后端模块、API 与数据模型
- 完善共享契约层 DTO / 枚举 / 错误码
- 新增项目文档
- 调整截图、录屏、发帖相关材料
- 提交清晰的小步 Git 版本

### 不要做

- 不要擅自引入 Docker / Redis 等外部依赖（保持 Windows 本地可运行）
- 不要擅自接入未加密的 API Key（必须通过 Web 界面配置 + AES-256-GCM 加密存储）
- 不要把文档散落到错误目录
- 不要在 legacy-demo 中引入后端服务

## 架构理解（必读）

本项目是一个 **Monorepo 工程骨架**（pnpm workspaces），包含：

```
competition_notes/
├── apps/
│   ├── web/                      # Next.js 16 前端（App Router + Tailwind 4）
│   └── server/                   # NestJS 11 后端（Prisma + SQLite）
├── packages/
│   └── shared/                   # 前后端共享契约（CJS，DTO + 枚举 + 错误码）
├── legacy-demo/                  # 原比赛版单页 Demo（React + Vite，独立运行）
├── project-docs/                 # 项目文档
├── docs/                         # legacy-demo 的 GitHub Pages 产物
└── .github/workflows/            # CI/CD（lint + typecheck + build + test）
```

### 后端 14 个业务模块

```
auth / workspace / goal / planning / execution
knowledge / collaboration / export / integration
notification / ai-config / prompt-registry
audit / monitoring
```

### 前端核心页面

```
/login /register                  # 认证
/app                              # 首页（目标列表）
/app/goals/[id]                   # 目标详情
/app/goals/[id]/plan              # 规划详情
/app/goals/[id]/execution         # 执行工作台
/app/goals/[id]/collaboration     # 协作页
/app/goals/[id]/exports           # 导出页
/app/templates                    # 模板库
/app/assets                       # 知识资产库
/app/workspaces                   # 工作区管理
/app/notifications                # 通知中心
/app/settings/*                   # 设置页（资料/密码/成员/通知/AI配置/提示词）
/app/admin                        # 监控页（系统概览/业务指标/审计日志）
/share/[token]                    # 公开共享页
```

### legacy-demo（原比赛版）

原比赛版单页 Demo 保留在 `legacy-demo/`，是一个 **纯前端规则引擎**，没有后端、没有 AI 调用。

```
用户输入（6 项结构化字段：topic / audience / duration / date / goal / preparedness）
        │
        ▼
  HeroSection ──→ App.handleSubmit()
        │               │
        │         setStatus("loading")  → 骨架屏
        │         setTimeout(900ms)
        │               │
        │         createPlan(input)     ← src/lib/planner.js
        │               │
        │    规则叠加：听众 → 时长 → 目标 → 准备状态 → 日期
        │               │
        ▼               ▼
  setResult() ← setStatus("done")
        │
        ▼
  输出组件树：
  ├── StageSection             — 4 阶段卡片
  ├── StructureSuggestionPanel — 结构建议 + 时间分配
  ├── ChecklistPanel           — 行动清单
  └── InsightPanel             — 准备重点 + 容易遗漏
```

## 代码与文件位置

### Monorepo 核心

| 文件 | 职责 |
|------|------|
| `CLAUDE.md` | 项目约定、技术栈、命令、目录 |
| `pnpm-workspace.yaml` | workspace 配置 |
| `package.json` | 根 workspace 脚本 |
| `.github/workflows/ci.yml` | CI/CD（lint + typecheck + build + test） |

### 后端核心

| 文件 | 职责 |
|------|------|
| `apps/server/src/main.ts` | 入口（全局前缀 /api + CORS + ValidationPipe + 过滤器 + 拦截器） |
| `apps/server/src/app.module.ts` | 根模块（14 个业务模块 + 中间件注册） |
| `apps/server/src/infrastructure/` | Prisma / TaskWorker / AiGateway / Storage |
| `apps/server/src/modules/` | 14 个业务模块 |
| `apps/server/src/presentation/` | Health / 异常过滤器 / 响应拦截器 / 速率限制 / 请求日志 |
| `apps/server/prisma/schema.prisma` | 数据库模型 |
| `apps/server/scripts/backup.mjs` | 数据备份脚本 |
| `apps/server/scripts/security-scan.mjs` | 安全扫描脚本 |

### 前端核心

| 文件 | 职责 |
|------|------|
| `apps/web/src/app/globals.css` | 设计系统 token（@theme inline） |
| `apps/web/src/components/ui/` | 基础组件（Button / Card / Input / Select / Tag / Modal / Toast / Skeleton） |
| `apps/web/src/components/layout/` | 页面骨架（PageContainer / PageHeader / Section） |
| `apps/web/src/lib/api.ts` | API 客户端（fetch 封装 + token 处理） |
| `apps/web/src/lib/auth.tsx` | 认证上下文 |
| `apps/web/src/lib/workspace.tsx` | 工作区上下文 |

### 共享契约

| 文件 | 职责 |
|------|------|
| `packages/shared/src/dto/` | DTO 定义（auth/goal/planning/execution/knowledge/collaboration/export/workspace/audit/monitoring） |
| `packages/shared/src/enums/` | 枚举定义 |
| `packages/shared/src/errors/` | 错误码 + ApiError 类 |

### legacy-demo

| 文件 | 职责 |
|------|------|
| `legacy-demo/src/App.jsx` | 页面主入口，3 状态切换 |
| `legacy-demo/src/components/` | UI 组件（HeroSection / StageSection / StructureSuggestionPanel / ChecklistPanel / InsightPanel） |
| `legacy-demo/src/data/demoTemplates.js` | 知识库/画像表/模板数据 |
| `legacy-demo/src/lib/planner.js` | 规则引擎，createPlan() |
| `legacy-demo/src/lib/planner.test.js` | 规划逻辑单元测试 |

## 文档归类规则

- 新生成文档默认放入 `project-docs/项目文档`
- 实施清单与进度放入 `project-docs/实施清单`
- 仅当文档属于历史归档、旧草稿、赛前参考材料时，才放入 `project-docs/赛前准备`
- `docs/` 目录专用于 GitHub Pages 静态发布产物（legacy-demo 构建输出）

## 视觉设计系统

所有颜色通过 Tailwind 4 `@theme inline` 语法定义（在 `apps/web/src/app/globals.css` 中），**禁止硬编码 hex 值**：

| Token | Hex | 用途 |
|-------|-----|------|
| `canvas` | `#F8F6F1` | 页面底色 |
| `surface` | `#FFFFFF` | 卡片/面板底色 |
| `muted` | `#F1ECE4` | 次级底色 |
| `ink` | `#2B2926` | 主文字 |
| `secondary` | `#5F5A53` | 辅助文字 |
| `tertiary` | `#8C857B` | 弱化文字 |
| `accent` | `#C96A3D` | 强调色（按钮、圆点、链接） |
| `accent-hover` | `#B85B31` | 按钮悬停 |
| `success` | `#6F907C` | 成功标记 |
| `warning` | `#B69042` | 警告标记 |
| `danger` | `#B45A42` | 危险标记 |

**视觉禁区**：紫粉蓝大渐变、玻璃拟态、满屏指标卡、聊天气泡布局、后台管理页风格。

## 验证流程

### Monorepo 验证

```bash
# 共享包
cd packages/shared && pnpm run build

# 后端
cd apps/server && pnpm run typecheck && pnpm run build

# 前端
cd apps/web && pnpm run typecheck && pnpm run build

# 安全扫描
cd apps/server && pnpm run security-scan

# 端到端 API 测试
cd apps/server && pnpm run start:dev
# 另开终端：
curl -s http://localhost:4000/health
```

### legacy-demo 验证

```bash
cd legacy-demo
npm test              # 必须全部通过
npm run build         # 必须构建成功，输出到 docs/
```

## Git 提交流程

- 改动完成后先检查状态：`git status --short`
- 提交信息保持 Conventional Commits 风格：

```bash
git commit -m "feat(server): ..."
git commit -m "feat(web): ..."
git commit -m "feat(shared): ..."
git commit -m "docs(project): ..."
git commit -m "fix(ui): ..."
```

## 文字口径

推荐表达：

- 帮用户推进目标
- 生成可执行路径
- 输出结构化结果
- 从灵感到执行的全链路

避免表达：

- 万能 AI 助手
- 聊天机器人
- 什么都能做
- 大而全平台

## 推荐演示输入

`我要准备一场小型分享会，但我不知道该怎么安排。`
