# AI 任务管家 - API 文档

> 后端服务地址：`http://localhost:4000`
> 全局前缀：`/api`（health 除外）
> 统一响应结构：`{ success: boolean, data: any, error: { code, message } | null, timestamp: string }`

## 目录

1. [认证（auth）](#1-认证auth)
2. [工作区（workspace）](#2-工作区workspace)
3. [目标（goal）](#3-目标goal)
4. [规划（planning）](#4-规划planning)
5. [执行（execution）](#5-执行execution)
6. [知识库（knowledge）](#6-知识库knowledge)
7. [协作（collaboration）](#7-协作collaboration)
8. [导出（export）](#8-导出export)
9. [通知（notification）](#9-通知notification)
10. [AI 配置（ai-config）](#10-ai-配置ai-config)
11. [提示词管理（prompt-registry）](#11-提示词管理prompt-registry)
12. [审计日志（audit）](#12-审计日志audit)
13. [监控（monitoring）](#13-监控monitoring)
14. [健康检查（health）](#14-健康检查health)
15. [集成（integration）](#15-集成integration)

---

## 1. 认证（auth）

### POST /api/auth/register
注册新用户。

**请求体**：
```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "用户名"
}
```

**响应**：`{ user, accessToken, refreshToken, expiresIn, tokenType }`

### POST /api/auth/login
登录。

**请求体**：
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**：`{ user, accessToken, refreshToken, expiresIn, tokenType }`

### POST /api/auth/refresh
刷新 token。

**请求体**：
```json
{ "refreshToken": "..." }
```

### GET /api/auth/me
获取当前用户信息。（需登录）

### PATCH /api/auth/me
更新用户资料。（需登录）

**请求体**：
```json
{
  "displayName": "新名称",
  "avatarUrl": "https://..."
}
```

### POST /api/auth/change-password
修改密码。（需登录）

**请求体**：
```json
{
  "oldPassword": "old123",
  "newPassword": "new123"
}
```

### POST /api/auth/logout
登出（吊销当前 session）。（需登录）

---

## 2. 工作区（workspace）

### GET /api/workspaces
获取当前用户的工作区列表。（需登录）

### POST /api/workspaces
创建工作区。（需登录）

**请求体**：
```json
{
  "name": "工作区名称",
  "type": "team"
}
```

### GET /api/workspaces/:id
获取工作区详情。（需成员）

### PATCH /api/workspaces/:id
更新工作区。（需 admin/owner）

### DELETE /api/workspaces/:id
删除工作区。（需 owner）

### GET /api/workspaces/:id/members
获取工作区成员列表。（需成员）

### POST /api/workspaces/:id/members
邀请成员。（需 admin/owner）

**请求体**：
```json
{
  "email": "invitee@example.com",
  "role": "editor"
}
```

### DELETE /api/workspaces/:id/members/:userId
移除成员。（需 admin/owner）

### GET /api/workspaces/:id/invites
获取工作区待处理邀请。（需成员）

### POST /api/workspaces/invites/:token/accept
接受邀请。（需登录）

---

## 3. 目标（goal）

### GET /api/goals
获取目标列表。（需登录）

**查询参数**：`workspaceId`、`scenarioType`、`currentStage`、`keyword`

### POST /api/goals
创建目标。（需成员）

### POST /api/goals/detect-scenario
识别场景类型。（需登录）

**请求体**：
```json
{ "topic": "我要准备一场分享会" }
```

### POST /api/goals/normalize-context
规范化上下文。（需登录）

### GET /api/goals/:id
获取目标详情。（需成员）

### PATCH /api/goals/:id
更新目标。（需编辑权限）

### DELETE /api/goals/:id
删除目标。（需 owner/admin）

---

## 4. 规划（planning）

### GET /api/goals/:goalId/plans
获取目标的规划版本列表。（需成员）

### POST /api/goals/:goalId/plans
生成首版规划。（需成员）

**请求体**：
```json
{
  "context": { ... },
  "scenarioType": "sharing_prep"
}
```

### GET /api/goals/:goalId/plans/active
获取活跃规划版本。（需成员）

### GET /api/goals/:goalId/plans/compare
比较规划版本。（需成员）

**查询参数**：`versionA`、`versionB`

### PATCH /api/goals/:goalId/plans/active
切换活跃版本。（需编辑权限）

**请求体**：
```json
{ "planId": "..." }
```

### GET /api/plans/:id
获取规划详情。（需成员）

### POST /api/goals/:goalId/replan
重规划。（需编辑权限）

**请求体**：
```json
{
  "reason": "时间提前了",
  "contextChanges": { ... }
}
```

---

## 5. 执行（execution）

### GET /api/goals/:goalId/tasks
获取目标的任务列表。（需成员）

### GET /api/goals/:goalId/tasks/progress
获取目标进度。（需成员）

### GET /api/goals/:goalId/tasks/next-steps
获取下一步建议。（需成员）

### GET /api/tasks/:id
获取任务详情。（需成员）

### GET /api/tasks/:id/history
获取任务状态历史。（需成员）

### POST /api/goals/:goalId/tasks
创建任务。（需编辑权限）

### PATCH /api/tasks/:id
更新任务。（需编辑权限）

### DELETE /api/tasks/:id
删除任务。（需编辑权限）

### PATCH /api/tasks/:id/status
更新任务状态。（需编辑权限）

**请求体**：
```json
{
  "status": "in_progress",
  "blockerNote": "（blocked 时必填）"
}
```

### POST /api/goals/:goalId/tasks/batch-status
批量更新任务状态。（需编辑权限）

### POST /api/goals/:goalId/tasks/sync-from-plan
从规划同步任务。（需编辑权限）

**请求体**：
```json
{ "mode": "append" | "replace" }
```

---

## 6. 知识库（knowledge）

### GET /api/workspaces/:workspaceId/templates
获取模板列表。（需成员）

**查询参数**：`category`、`scenarioType`、`keyword`

### POST /api/workspaces/:workspaceId/templates
创建模板。（需编辑权限）

### GET /api/templates/:id
获取模板详情。（需成员）

### PATCH /api/templates/:id
更新模板。（需编辑权限）

### DELETE /api/templates/:id
删除模板。（需编辑权限，内置模板不可删）

### POST /api/goals/:goalId/templates
从目标创建模板。（需编辑权限）

### GET /api/templates/:id/for-goal
获取模板预填字段。（需成员）

### GET /api/workspaces/:workspaceId/assets
获取知识资产列表。（需成员）

**查询参数**：`type`、`keyword`、`tag`

### POST /api/workspaces/:workspaceId/assets
创建知识资产。（需编辑权限）

### GET /api/assets/:id
获取资产详情。（需成员）

### PATCH /api/assets/:id
更新资产。（需编辑权限）

### DELETE /api/assets/:id
删除资产。（需编辑权限）

### POST /api/exports/:exportId/assets
从导出沉淀为知识资产。（需编辑权限）

---

## 7. 协作（collaboration）

### GET /api/goals/:goalId/comments
获取评论列表（含回复树）。（需成员）

### POST /api/goals/:goalId/comments
创建评论。（需成员）

**请求体**：
```json
{
  "content": "评论内容",
  "anchorType": "goal" | "task" | "plan" | "phase",
  "anchorId": "...",
  "mentions": ["userId"],
  "parentId": "（回复时填写）"
}
```

### PATCH /api/comments/:id
更新评论。（需作者/admin/owner）

### DELETE /api/comments/:id
删除评论。（需作者/admin/owner）

### POST /api/comments/:id/resolve
解决评论。（需成员）

### POST /api/comments/:id/reopen
重开评论。（需成员）

### POST /api/tasks/:taskId/assign
指派任务。（需编辑权限）

**请求体**：
```json
{ "assigneeId": "userId" }
```

### DELETE /api/tasks/:taskId/assign
取消指派。（需编辑权限）

### GET /api/tasks/:taskId/assignments
获取指派历史。（需成员）

### GET /api/workspaces/:workspaceId/my-assignments
获取我的指派。（需成员）

### GET /api/goals/:goalId/activities
获取活动流。（需成员）

**查询参数**：`type`、`page`、`pageSize`

---

## 8. 导出（export）

### GET /api/goals/:goalId/exports
获取导出记录列表。（需成员）

### POST /api/goals/:goalId/exports
创建导出。（需成员）

**请求体**：
```json
{
  "type": "action_list" | "phase_plan" | "report_summary" | "review_summary" | "presentation_outline",
  "format": "markdown"
}
```

### GET /api/exports/:id
获取导出详情。（需成员）

### DELETE /api/exports/:id
删除导出记录。（需编辑权限）

### PATCH /api/exports/:id/share
更新分享设置。（需编辑权限）

**请求体**：
```json
{
  "shareEnabled": true,
  "shareExpiresAt": "2026-12-31T23:59:59Z",
  "allowDownload": true
}
```

### GET /api/exports/:id/download
下载导出文件。（需成员）

### GET /api/shares/:token
公开访问共享页（无需登录）。

---

## 9. 通知（notification）

### GET /api/notifications
获取通知列表。（需登录）

**查询参数**：`workspaceId`、`isRead`、`type`、`page`、`pageSize`

### GET /api/notifications/unread-count
获取未读通知数。（需登录）

### POST /api/notifications/:id/read
标记通知已读。（需登录）

### POST /api/notifications/read-all
全部标记已读。（需登录）

**查询参数**：`workspaceId`

### DELETE /api/notifications/:id
删除通知。（需登录）

---

## 10. AI 配置（ai-config）

### GET /api/ai-config
获取 AI 配置（API Key 脱敏）。（需登录）

### PUT /api/ai-config
更新 AI 配置。（需登录）

**请求体**：
```json
{
  "provider": "openai",
  "baseUrl": "https://api.openai.com/v1",
  "modelName": "gpt-4",
  "apiKey": "sk-..."
}
```

### DELETE /api/ai-config
清除 AI 配置。（需登录）

### POST /api/ai-config/test
测试 AI 连接。（需登录）

### POST /api/ai-config/chat/stream
流式对话（SSE）。（需登录）

**请求体**：
```json
{
  "messages": [
    { "role": "user", "content": "你好" }
  ]
}
```

**响应**：SSE 流（`Content-Type: text/event-stream`）

### GET /api/ai-config/stats
获取 AI 调用统计。（需登录）

**查询参数**：`days`

---

## 11. 提示词管理（prompt-registry）

### GET /api/prompts
获取提示词模板列表。（需登录）

### GET /api/prompts/versions
获取提示词版本列表。（需登录）

**查询参数**：`name`

### GET /api/prompts/by-name/:name
按名称获取活跃版本。（需登录）

### GET /api/prompts/:id
获取提示词详情。（需登录）

### POST /api/prompts
创建提示词。（需登录）

### PUT /api/prompts/:id
更新提示词（创建新版本）。（需登录）

### POST /api/prompts/:id/activate
激活版本。（需登录）

### POST /api/prompts/by-name/:name/render
渲染提示词。（需登录）

**请求体**：
```json
{
  "variables": {
    "topic": "分享会",
    "audience": "同事"
  }
}
```

### DELETE /api/prompts/:id
删除提示词。（需登录）

---

## 12. 审计日志（audit）

### GET /api/audit
获取审计日志列表。（需登录）

**查询参数**：
- `page`（默认 1）
- `pageSize`（默认 20）
- `action`（login/logout/register/create/update/delete/export/share/config_change/password_change/invite/role_change）
- `result`（success/failure）
- `keyword`（搜索 actorEmail/path/errorMessage）
- `startDate`、`endDate`（ISO 8601）

**响应**：
```json
{
  "items": [
    {
      "id": "...",
      "actorId": "...",
      "actorEmail": "user@example.com",
      "action": "login",
      "actionLabel": "登录",
      "resourceType": "session",
      "resourceId": null,
      "result": "success",
      "errorMessage": null,
      "ipAddress": "127.0.0.1",
      "userAgent": "...",
      "method": "POST",
      "path": "/api/auth/login",
      "detail": null,
      "createdAt": "2026-06-20T..."
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
```

### GET /api/audit/:id
获取审计日志详情。（需登录）

### GET /api/audit/stats/summary
获取审计统计。（需登录）

**查询参数**：`days`（默认 7）

**响应**：
```json
{
  "days": 7,
  "totalActions": 100,
  "totalSuccess": 95,
  "totalFailure": 5,
  "byAction": [
    { "action": "login", "count": 50, "successCount": 48, "failureCount": 2 }
  ],
  "byResourceType": [
    { "resourceType": "session", "count": 50 }
  ],
  "byDay": [
    { "date": "2026-06-20", "count": 100, "failureCount": 5 }
  ],
  "recentFailures": [
    {
      "id": "...",
      "action": "login",
      "actorEmail": "unknown@example.com",
      "errorMessage": "用户不存在",
      "createdAt": "..."
    }
  ]
}
```

---

## 13. 监控（monitoring）

### GET /api/monitoring/health
健康检查。（需登录）

**响应**：
```json
{
  "status": "ok" | "degraded" | "unhealthy",
  "service": "ai-task-manager-server",
  "version": "0.1.0",
  "env": "development",
  "timestamp": "...",
  "startedAt": "...",
  "uptimeSeconds": 3600,
  "checks": [
    {
      "name": "database",
      "status": "ok",
      "durationMs": 1,
      "detail": "SQLite 连接正常"
    },
    {
      "name": "disk",
      "status": "ok",
      "durationMs": 2,
      "detail": "DB 文件大小: 1.2MB"
    },
    {
      "name": "task-backlog",
      "status": "ok",
      "durationMs": 2,
      "detail": "排队中: 0, 执行中: 0"
    }
  ]
}
```

### GET /api/monitoring/system
系统指标。（需登录）

**查询参数**：`days`（默认 7）

**响应**：
```json
{
  "days": 7,
  "generatedAt": "...",
  "requests": {
    "totalRequests": 1000,
    "successRequests": 950,
    "clientErrors": 45,
    "serverErrors": 5,
    "errorRate": 0.05,
    "avgDurationMs": 35,
    "slowRequests": 2,
    "byStatusCode": [...],
    "byDay": [...]
  },
  "taskQueue": {
    "queued": 0,
    "running": 0,
    "succeeded": 10,
    "failed": 1,
    "failureRate": 0.09,
    "byType": [...]
  },
  "aiCalls": {
    "totalCalls": 50,
    "successCount": 48,
    "failureCount": 2,
    "failureRate": 0.04,
    "avgDurationMs": 1200
  },
  "database": {
    "dbSizeBytes": 1200000,
    "tableCounts": [
      { "table": "User", "count": 10 },
      { "table": "Goal", "count": 5 }
    ]
  }
}
```

### GET /api/monitoring/business
业务指标。（需登录）

**查询参数**：`days`（默认 7）

**响应**：
```json
{
  "days": 7,
  "generatedAt": "...",
  "goalCreation": {
    "totalAttempts": 10,
    "successCount": 10,
    "successRate": 1.0,
    "byScenarioType": [...],
    "byDay": [...]
  },
  "planAdoption": {
    "goalsWithPlan": 8,
    "totalGoals": 10,
    "adoptionRate": 0.8,
    "bySource": [...]
  },
  "replanUsage": {
    "goalsWithReplan": 2,
    "totalReplans": 3,
    "avgReplansPerGoal": 1.5,
    "replanRate": 0.2
  },
  "goalProgress": {
    "byStage": [...],
    "completedCount": 1,
    "totalGoals": 10,
    "completionRate": 0.1,
    "avgTaskCompletionRate": 0.35
  },
  "exportShare": {
    "totalExports": 5,
    "byType": [...],
    "shareCount": 2,
    "failureCount": 0
  },
  "templateReuse": {
    "totalTemplates": 10,
    "totalUsageCount": 15,
    "avgUsagePerTemplate": 1.5,
    "templatesUsed": 6,
    "reuseRate": 0.6,
    "topTemplates": [...]
  }
}
```

---

## 14. 健康检查（health）

### GET /health
基础健康检查（无需登录，无全局前缀）。

**响应**：
```json
{
  "status": "ok",
  "service": "ai-task-manager-server",
  "timestamp": "...",
  "database": "connected"
}
```

---

## 15. 集成（integration）

### GET /api/integrations
获取集成列表。（需登录）

### POST /api/integrations
创建集成。（需登录）

### DELETE /api/integrations/:id
删除集成。（需登录）

### POST /api/integrations/test
测试集成。（需登录）

---

## 错误码

| 范围 | 模块 | 示例 |
|------|------|------|
| 1xxx | 通用 | INTERNAL_ERROR / VALIDATION_ERROR |
| 2xxx | 认证 | AUTH_INVALID_CREDENTIALS / AUTH_TOKEN_EXPIRED |
| 3xxx | 工作区 | WORKSPACE_NOT_FOUND / WORKSPACE_PERMISSION_DENIED |
| 4xxx | 目标 | GOAL_NOT_FOUND / GOAL_SCENARIO_UNKNOWN |
| 5xxx | 规划 | PLAN_NOT_FOUND / PLAN_GENERATION_FAILED |
| 6xxx | 执行 | TASK_NOT_FOUND / TASK_INVALID_STATUS_TRANSITION |
| 7xxx | 知识 | TEMPLATE_NOT_FOUND / ASSET_NOT_FOUND |
| 8xxx | 协作 | COMMENT_NOT_FOUND / ASSIGNMENT_NOT_FOUND |
| 9xxx | 导出 | EXPORT_NOT_FOUND / SHARE_TOKEN_INVALID |
| 10xxx | 通知 | NOTIFICATION_NOT_FOUND |
| 11xxx | AI 配置 | AI_CONFIG_NOT_FOUND / AI_CONFIG_TEST_FAILED |
| 12xxx | 提示词 | PROMPT_NOT_FOUND / PROMPT_RENDER_FAILED |
| 13xxx | 审计/监控 | AUDIT_LOG_NOT_FOUND / MONITORING_QUERY_FAILED / RATE_LIMIT_EXCEEDED |

## 速率限制

| 接口 | 限制 | 说明 |
|------|------|------|
| `/api/auth/login` | 10 次/分钟/IP | 认证接口 |
| `/api/auth/register` | 10 次/分钟/IP | 认证接口 |
| 其他接口 | 120 次/分钟/IP | 默认限制 |

超限响应：429 Too Many Requests

响应头：
- `X-RateLimit-Limit`：总限制数
- `X-RateLimit-Remaining`：剩余次数
- `X-RateLimit-Reset`：重置时间（Unix 时间戳）
