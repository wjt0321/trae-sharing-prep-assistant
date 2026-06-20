# CLAUDE.md

## 项目概览

- 项目名称：`AI 任务管家`（从 `分享会筹备助手` 比赛版升级而来）
- 项目类型：前后端分离的 Monorepo 长期产品骨架
- 目标：把模糊的想法拆成可推进的步骤，覆盖"灵感到执行"全链路
- 比赛背景：`TRAE AI 创造力大赛`，原单页 Demo 保留在 `legacy-demo/`

## 当前产品范围

- Monorepo 工程骨架（前端 + 后端 + 共享契约层）
- 后端：NestJS 模块化单体，14 个业务模块 + Prisma + SQLite
- 前端：Next.js App Router + Warm Editorial 设计系统
- 安全监控：审计日志 + 健康检查 + 系统指标 + 业务指标 + 速率限制 + CI/CD
- 原 Demo 保留为 `legacy-demo/`，可独立运行

## 技术栈

### Monorepo 基础

- `pnpm workspaces` 包管理
- `TypeScript 5` 全栈类型安全

### 前端（`apps/web`）

- `Next.js 16` + `React 19`
- `Tailwind CSS 4`（@theme 语法定义 token，无 tailwind.config.js）
- 自建基础组件库（Button / Card 等，未引入 shadcn/ui CLI）

### 后端（`apps/server`）

- `NestJS 11` + `TypeScript`
- `Prisma 6` + `SQLite`（Windows 本地可运行，无 Docker/Redis 依赖）
- 应用内任务 Worker（setInterval 轮询 TaskJob 表，无 BullMQ）
- 本地文件存储（`uploads/`）
- AI 网关（mock 模式 + OpenAI 兼容协议真实接入）
- JWT + Passport + bcrypt 鉴权
- 审计日志（AuditLog 模型，12 种动作）
- 监控指标（健康检查 + 系统指标 + 业务指标）
- 速率限制（IP 维度，内存级）
- 请求日志中间件（method/path/status/duration）

### 共享契约层（`packages/shared`）

- CommonJS 模块（兼容 NestJS）
- DTO、枚举、错误码、API 响应结构

## 目录约定

```
competition_notes/
├── apps/
│   ├── web/                      # Next.js 前端
│   │   └── src/
│   │       ├── app/              # App Router 页面
│   │       ├── components/       # UI 组件
│   │       │   └── ui/           # 基础组件（Button/Card 等）
│   │       └── lib/              # 工具函数
│   └── server/                   # NestJS 后端
│       ├── src/
│       │   ├── infrastructure/   # Prisma / TaskWorker / AiGateway / Storage
│       │   ├── modules/          # 14 个业务模块（含 audit / monitoring）
│       │   └── presentation/     # Health / 异常过滤器 / 响应拦截器 / 速率限制 / 请求日志
│       ├── prisma/               # schema + migrations + seed
│       ├── scripts/              # backup.mjs / security-scan.mjs
│       └── uploads/              # 本地文件存储
├── packages/
│   └── shared/                   # 前后端共享契约（CJS）
├── legacy-demo/                  # 原比赛版单页 Demo（React + Vite）
├── project-docs/
│   ├── 实施清单/                  # 12 份分阶段实施清单
│   ├── 项目文档/                  # 正式项目文档
│   ├── 初赛文档/                  # 初赛 MVP 改造规划
│   ├── 赛前准备/                  # 历史方案、比赛资料、草稿
│   └── 未来方向/                  # 答辩与收口材料
├── docs/                         # legacy-demo 的 GitHub Pages 产物
├── pnpm-workspace.yaml
└── package.json                  # 根 workspace 脚本
```

## 文档规则

- 新增项目资料统一放到 `project-docs/项目文档`
- 历史草稿、赛前分析、旧方案归档到 `project-docs/赛前准备`
- MVP 改造相关规划与任务单放到 `project-docs/初赛文档`
- 分阶段实施清单放在 `project-docs/实施清单`
- `docs/` 仅保留 legacy-demo 的 GitHub Pages 静态站内容

## 开发原则

- 前后端分离，共享契约层保证类型一致
- 后端模块化单体，避免过早微服务化
- 优先保证 Windows 本地可运行（SQLite + 本地文件存储，无外部依赖）
- 页面表达要像真实产品，不像聊天套壳或后台系统
- 保持 Warm Editorial 视觉风格的一致性

## 内容与视觉约束

- 视觉风格：暖中性色（Warm Editorial + Minimal Product）、克制、清爽
- 设计系统 token（在 `apps/web/src/app/globals.css` 的 `@theme inline` 中定义）：
  - `canvas` (#F8F6F1) — 页面底色
  - `surface` (#FFFFFF) — 卡片/面板底色
  - `muted` (#F1ECE4) — 次级底色
  - `ink` (#2B2926) — 主文字色
  - `secondary` (#5F5A53) — 辅助文字
  - `tertiary` (#8C857B) — 弱化文字
  - `accent` (#C96A3D) — 强调色（按钮、标记点）
  - `accent-hover` (#B85B31) — 悬停态
  - `success` (#6F907C) / `warning` (#B69042) / `danger` (#B45A42) — 语义色
  - `border` (#E8E2D6) — 边框色
- 动画：`.animate-rise`（淡入上移 220ms）
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

## 架构概览

```
                    ┌─────────────────────────┐
                    │   apps/web (Next.js)    │
                    │   http://localhost:3000 │
                    └────────────┬────────────┘
                                 │ /api/server/* (rewrites 代理)
                                 ▼
                    ┌─────────────────────────┐
                    │  apps/server (NestJS)   │
                    │  http://localhost:4000  │
                    │  全局前缀 /api           │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
     ┌────────────────┐ ┌──────────────┐ ┌────────────────┐
     │  Prisma + DB   │ │ TaskWorker   │ │  AiGateway     │
     │  (SQLite)      │ │ (轮询 TaskJob)│ │  (mock+real)   │
     └────────────────┘ └──────────────┘ └────────────────┘

     后端 14 个业务模块：
     auth / workspace / goal / planning / execution
     knowledge / collaboration / export / integration
     notification / ai-config / prompt-registry
     audit / monitoring

     共享契约层 packages/shared（CJS）：
     DTO + 枚举 + 错误码 + API 响应结构
```

**后端核心设计**：全局前缀 `/api`（health 除外），全局 ValidationPipe（whitelist + transform），全局异常过滤器，统一响应拦截器（`{success, data, error, timestamp}`）。TaskWorker 用 setInterval 轮询 TaskJob 表，支持重试。AiGateway 在 mock 模式下记录调用日志到 AiCallLog 表。审计日志通过 AuditService.record() 异步写入 AuditLog 表。速率限制通过 RateLimitMiddleware 实现（IP 维度，内存级）。请求日志通过 RequestLogMiddleware 记录并写入 MonitoringService 内存统计。

**前端核心设计**：Next.js App Router，`/api/server/*` 通过 rewrites 代理到后端。设计 token 用 Tailwind 4 `@theme` 语法定义，基础组件手写（Button/Card 等）。监控页 `/app/admin` 提供三 Tab（系统概览 / 业务指标 / 审计日志）。

**legacy-demo**：原比赛版单页 Demo 保留在 `legacy-demo/`，独立运行（`cd legacy-demo && npm run dev`），构建产物发布到 `docs/` 供 GitHub Pages 访问。

**CI/CD**：GitHub Actions（`.github/workflows/ci.yml`），push to master 或 PR 时触发 lint + typecheck + build + backend test。

## 常用命令

```bash
# === Monorepo 根目录 ===
pnpm install              # 安装所有 workspace 依赖
pnpm run dev              # 同时启动前后端开发服务器
pnpm run build            # 构建所有 workspace
pnpm run typecheck        # 全量类型检查

# === 后端（apps/server）===
cd apps/server
pnpm run start:dev        # 启动后端开发服务器（watch 模式）
pnpm run start:prod       # 生产模式启动（需先 build）
pnpm run build            # nest build
pnpm run typecheck        # tsc --noEmit
pnpm run db:setup         # prisma generate + migrate + seed
pnpm run db:migrate       # 创建新迁移
pnpm run db:seed          # 写入种子数据
pnpm run db:studio        # 打开 Prisma Studio
pnpm run test             # Jest 单元测试
pnpm run backup           # 数据备份（SQLite + uploads + schema 快照）
pnpm run security-scan    # 安全扫描（密钥泄露 / .env 跟踪 / 默认密码）

# === 前端（apps/web）===
cd apps/web
pnpm run dev              # 启动前端开发服务器
pnpm run build            # 构建生产产物
pnpm run typecheck        # tsc --noEmit
pnpm run lint             # ESLint

# === 共享包（packages/shared）===
cd packages/shared
pnpm run build            # tsc -b（编译到 dist/）
pnpm run typecheck        # tsc --noEmit

# === legacy-demo（原比赛版）===
cd legacy-demo
npm install
npm run dev               # 启动 Vite 开发服务器
npm test                  # 运行 Vitest 测试
npm run build             # 构建到 docs/
```

## 修改后必做检查

- 后端改动后：`cd apps/server && pnpm run typecheck && pnpm run build`
- 前端改动后：`cd apps/web && pnpm run typecheck && pnpm run build`
- 共享包改动后：`cd packages/shared && pnpm run build`（后端依赖 dist/）
- 数据库 schema 改动后：`cd apps/server && pnpm run db:migrate`
- 如有新增文档，确认文档放在正确目录

## Git 约定

- 当前仓库已经初始化本地 Git
- 提交信息建议使用 Conventional Commits
- 优先使用清晰范围，例如：
  - `feat(server): ...` / `feat(web): ...` / `feat(shared): ...`
  - `docs(project): ...`
  - `fix(ui): ...`
- 远程仓库：`https://github.com/wjt0321/trae-sharing-prep-assistant`
- GitHub Pages（legacy-demo）：`https://wjt0321.github.io/trae-sharing-prep-assistant/`

## 网络约束

- 当网络问题阻断远程仓库提交时，使用本地代理端口 10808
- 使用代理端口 10808 提交后，必须将代理设置恢复原状
