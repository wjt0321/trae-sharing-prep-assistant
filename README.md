# AI 任务管家

> 从 `分享会筹备助手` 比赛版升级而来的长期产品骨架，把模糊的想法拆成可推进的步骤，覆盖"灵感到执行"全链路。

## 项目背景

- 比赛背景：`TRAE AI 创造力大赛`，原单页 Demo 保留在 `legacy-demo/`
- 当前阶段：Monorepo 工程骨架（前端 + 后端 + 共享契约层），12 份实施清单全部完成

## 技术栈

### Monorepo 基础
- `pnpm workspaces` 包管理
- `TypeScript 5` 全栈类型安全

### 前端（`apps/web`）
- `Next.js 16` + `React 19`
- `Tailwind CSS 4`（@theme 语法定义 token，无 tailwind.config.js）
- 自建基础组件库（Button / Card / Input / Select / Tag / Modal / Toast / Skeleton 等）

### 后端（`apps/server`）
- `NestJS 11` + `TypeScript`
- `Prisma 6` + `SQLite`（Windows 本地可运行，无 Docker/Redis 依赖）
- 应用内任务 Worker（setInterval 轮询 TaskJob 表，无 BullMQ）
- 本地文件存储（`uploads/`）
- AI 网关（mock 模式 + OpenAI 兼容协议真实接入）
- JWT + Passport + bcrypt 鉴权
- 审计日志 + 监控指标 + 速率限制

### 共享契约层（`packages/shared`）
- CommonJS 模块（兼容 NestJS）
- DTO、枚举、错误码、API 响应结构

## 核心能力

| 模块 | 关键能力 |
|------|----------|
| 认证 | JWT + Session + 注册登录 + 资料修改 + 改密 + 设置页 |
| 工作区 | 工作区 CRUD + 成员邀请 + 角色权限（owner/admin/editor/viewer） |
| 目标 | 目标 CRUD + 场景识别（6 种场景）+ 创建器 |
| 规划 | AI 规划生成 + 重规划 + 版本管理 + 版本比较 |
| 执行 | 任务状态机 + 工作台 + 批量操作 + 任务指派 |
| 知识 | 模板 CRUD + 资产 CRUD + 从目标沉淀 |
| 协作 | 评论 + 回复树 + 指派 + 活动流 |
| 导出 | 5 种导出格式 + 公开共享页 |
| 通知 | 站内通知 + 事件驱动 + 未读计数 |
| AI | 网页端配置 + AES-256-GCM 加密存储 + OpenAI 兼容调用 + mock 回退 + Prompt Registry + SSE 流式 + 成本统计 |
| 监控 | 审计日志 + 健康检查 + 系统指标 + 业务指标 + 速率限制 |

## 目录结构

```
competition_notes/
├── apps/
│   ├── web/                      # Next.js 前端
│   └── server/                   # NestJS 后端
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
├── .github/workflows/            # CI/CD（lint + typecheck + build + test）
├── pnpm-workspace.yaml
└── package.json                  # 根 workspace 脚本
```

## 快速开始

### 环境要求
- Node.js >= 20
- pnpm >= 10

### 安装与启动

```bash
# 1. 安装依赖
pnpm install

# 2. 初始化数据库
cd apps/server
cp .env.example .env
pnpm run db:setup    # prisma generate + migrate + seed
cd ../..

# 3. 启动开发服务器（同时启动前后端）
pnpm run dev
# 前端：http://localhost:3000
# 后端：http://localhost:4000
```

### 演示账号
- 邮箱：`demo@ai-task-manager.local`
- 密码：`password123`

## 常用命令

```bash
# === Monorepo 根目录 ===
pnpm run dev              # 同时启动前后端开发服务器
pnpm run build            # 构建所有 workspace
pnpm run typecheck        # 全量类型检查

# === 后端（apps/server）===
cd apps/server
pnpm run start:dev        # 启动后端开发服务器（watch 模式）
pnpm run build            # nest build
pnpm run typecheck        # tsc --noEmit
pnpm run db:setup         # prisma generate + migrate + seed
pnpm run db:studio        # 打开 Prisma Studio
pnpm run test             # Jest 单元测试
pnpm run backup           # 数据备份（SQLite + uploads + schema）
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

# === legacy-demo（原比赛版）===
cd legacy-demo
npm install
npm run dev               # 启动 Vite 开发服务器
npm run build             # 构建到 docs/
```

## 文档位置

- 项目正式文档：`project-docs/项目文档`
- 实施清单与进度：`project-docs/实施清单`
- MVP 改造规划与任务单：`project-docs/初赛文档`
- 赛前归档资料：`project-docs/赛前准备`
- `docs/`：仅用于 GitHub Pages 静态发布产物

## 在线体验

- legacy-demo：`https://wjt0321.github.io/trae-sharing-prep-assistant/`
- GitHub：`https://github.com/wjt0321/trae-sharing-prep-assistant`

## CI/CD

项目使用 GitHub Actions 进行持续集成（`.github/workflows/ci.yml`）：
- **quality job**：lint + typecheck + build
- **backend-test job**：后端单元测试

推送 to master 或提交 PR 时自动触发。

## 安全与监控

- **审计日志**：12 种关键操作（登录/注册/配置变更/密码修改等）自动记录
- **健康检查**：`GET /api/monitoring/health`（DB/disk/task-backlog 三维度）
- **系统指标**：`GET /api/monitoring/system`（请求/任务/AI/DB 统计）
- **业务指标**：`GET /api/monitoring/business`（目标/规划/执行/导出/模板）
- **速率限制**：默认 120/min/IP，认证接口 10/min/IP
- **安全扫描**：`pnpm run security-scan`（密钥泄露 / .env 跟踪 / 默认密码检测）
- **数据备份**：`pnpm run backup`（SQLite + uploads + schema 快照打包）
- **API Key 加密**：AES-256-GCM 加密存储，读取时脱敏，仅调用时解密
