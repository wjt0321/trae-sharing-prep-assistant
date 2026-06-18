# 实战 MVP 改造总结

## 概述

本次改造基于 `project-docs/初赛文档` 三份文档（改造规划、实施步骤、代码级任务单），将项目从"展示型 Demo"升级为"实战 MVP"。

核心目标：在不破坏现有 `Warm Editorial + Minimal Product` 风格与技术栈的前提下，把规划逻辑从"固定模板填充"升级为"轻量规则引擎"，让输入更真实、输出更可执行。

## 改造范围

本次聚焦 P0 任务（文档明确规定的必须项），P1 增强项列为后续可选。

### P0 完成项

1. 结构化输入
2. 动态结果生成（轻量规则引擎）
3. 单页闭环体验保持稳定
4. 比赛展示感不下降

## 代码改动清单

### `src/data/demoTemplates.js`

- 新增 `defaultInput`：结构化默认示例输入，用于"试试示例"按钮一键填充
- 新增 5 类选项常量：`audienceOptions`、`durationOptions`、`goalOptions`、`preparednessOptions`
- 新增 5 套可组合素材：
  - `audienceProfiles`：5 种听众画像（产品团队/同事/学生/新人/现场听众），含内容重点、案例风格、表达建议、阶段提示
  - `durationProfiles`：5 档时长画像（10/15/30/45/60 分钟），含结构粒度、任务密度、时间分配
  - `goalProfiles`：4 种目标画像（传递信息/说服认同/教学示范/复盘总结），含优先阶段、清单优先项、经验提醒
  - `preparednessProfiles`：5 档准备状态画像（还没开始/已有主题/已有大纲/已有初稿/接近完成），含建议起点阶段
  - `structureSuggestions`：5 档时长对应的结构建议文案
- 为 `basePlanTemplate` 的 4 个阶段补充 `goal`（阶段目标）与 `criteria`（完成标准）

### `src/lib/planner.js`

- 新增 `createPlan(input)` 主入口，接收结构化输入对象
- 实现轻量规则引擎：
  - 听众规则：根据听众画像调整阶段描述
  - 时长规则：根据时长画像生成结构建议与时间分配
  - 日期规则：根据距分享天数生成节奏建议（<3 天压缩 / 3-14 天正常 / >14 天多轮预演）
  - 目标规则：根据目标画像前置清单优先项
  - 准备状态规则：根据准备状态标记阶段状态（已完成/建议起点/待推进）
- 保留 `createPlanFromGoal(goal)` 兼容入口，内部转换为 `createPlan` 调用
- 输出新增 `structureSuggestion`（结构建议对象）、`rhythmAdvice`（节奏建议）字段

### `src/components/HeroSection.jsx`

- 主 textarea 保留为首屏核心，绑定 `input.topic`
- 新增 5 个补充字段：听众对象、分享时长、分享日期、分享目标、当前准备状态
- 采用 3 列克制网格布局，服从现有风格
- 字段样式复用现有 border/bg/rounded token，不做后台表单感

### `src/App.jsx`

- state 从 `goal`（字符串）升级为 `input`（结构化对象）
- `handleSubmit` 调用 `createPlan(input)`
- "试试示例"按钮填充完整结构化示例
- 结果区新增 `StructureSuggestionPanel` 渲染

### `src/components/StageSection.jsx`

- 阶段卡片新增状态徽标（已完成/建议起点/待推进）
- 每张卡片新增展示 `stage.goal`（阶段目标）与 `stage.criteria`（完成标准）
- 完成标准以独立小区块呈现，视觉层级低于任务列表

### `src/components/ChecklistPanel.jsx`

- 前 2 项标注"先做"并使用实心 accent 背景强化视觉优先级
- 新增副标题说明"前两项是当前最该先做的事"

### `src/components/StructureSuggestionPanel.jsx`（新增）

- 展示分享结构建议文案
- 展示结构粒度标签
- 展示时间分配参考

### `src/lib/planner.test.js`

- 从 2 个测试扩展到 10 个
- 覆盖：默认输入稳定性、空字段容错、不同听众差异、不同时长结构建议差异、不同目标清单优先项差异、不同准备状态建议起点差异、阶段目标与完成标准完整性、日期节奏建议

### `vite.config.js`

- 新增 vitest 配置，限定测试范围为 `src/**`，排除 `.trae/**` 与 `docs/**`

## 验证结果

- `npm test`：10 个测试全部通过
- `npm run build`：构建成功
- `npm run dev`：页面正常渲染，无报错

## 风格保持

- 沿用 `Warm Editorial + Minimal Product` 视觉语言
- 所有新增字段与区块复用现有 token（`accent`/`muted`/`surface`/`rounded-panel`/`shadow-soft`）
- 未引入紫粉蓝渐变、玻璃拟态、后台表单感
- 首屏主视觉焦点保留，补充字段以 3 列克制网格呈现
- 阶段区仍适合单独截图
- 结果区比改造前更有执行力

## 后续可选（P1）

以下能力在 P0 稳定后可继续增强：

- 场景模板增强（团队内部/新人培训/工具演示/复盘类）
- 根据时长自动调整输出粒度（当前已部分实现，可进一步细化）
- 根据准备状态自动调整建议起点（当前已部分实现，可进一步细化）
- 更明确的完成标准
- 更强的结果复用性（可导出的行动清单、结构摘要、风险排查清单）

## 迭代记录

### 第一轮迭代：交互健壮性与时区修复

在 MVP 首版上线后进行了一轮迭代，主要解决交互一致性与日期计算的边界问题。

#### 修复内容

1. **加载期间禁用表单编辑**
   - `src/App.jsx`：向 `HeroSection` 传入 `isDisabled` 状态，加载中时为 `true`
   - `src/components/HeroSection.jsx`：主输入框、5 个补充字段、示例按钮在加载期间全部 `disabled`，避免用户在结果生成过程中修改输入导致结果与输入不一致

2. **结果生成后修改输入自动清空旧结果**
   - `src/App.jsx`：`handleInputChange` 与 `handleUseExample` 检测到当前非 `idle` 状态时，自动重置为 `idle` 并清空 `result`，回到预览态
   - 避免用户看到与当前输入不匹配的旧结果

3. **修复负时区下当天日期被误判为已过期**
   - `src/lib/planner.js`：新增 `parseDateInput` 函数，对 `YYYY-MM-DD` 格式的日期按本地时区解析（构造 `new Date(year, month-1, day)`），而非依赖 `new Date(dateStr)` 的 UTC 解析
   - 修复前：在负时区（如美洲）环境下，`new Date("2026-06-18")` 会被解析为 UTC 00:00，本地时间可能落到前一天，导致当天分享被误判为"已过期"
   - 修复后：当天日期正确计算为"距分享仅剩 0 天"

#### 新增测试

- `src/lib/planner.test.js`：新增"负时区语义下当天日期不会被误判为已过期"测试，通过 `vi.stubGlobal("Date", MockDate)` 模拟时区偏移场景
- `src/App.test.jsx`（新增）：引入 `@testing-library/react` + `jsdom`，新增 2 个交互回归测试：
  - 加载期间禁用表单编辑
  - 结果生成后再次修改输入会清空旧结果回到预览态

#### 依赖变更

- `package.json` 新增 devDependencies：
  - `@testing-library/react`：React 组件测试工具
  - `@testing-library/user-event`：用户交互事件模拟
  - `jsdom`：浏览器环境模拟，供组件测试使用
