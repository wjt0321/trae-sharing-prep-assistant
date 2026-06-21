# 网页 ICO 总图切片素材提示词清单

## 1. 使用目标

本清单用于一次性生成一张包含全部网页图标的总图，再通过后期切片得到独立的 `ico` 素材，避免逐个出图造成额度浪费、风格不统一、尺寸不一致。

当前这张总图主要覆盖项目里已经明确出现 Emoji 的入口，包括：

- 设置导航
- 管理页 Tab
- 通用空状态
- 工作区空状态
- 通知空状态

对应代码位置：

- `apps/web/src/app/app/settings/layout.tsx`
- `apps/web/src/app/app/admin/page.tsx`
- `apps/web/src/components/ui/Empty.tsx`
- `apps/web/src/app/app/notifications/page.tsx`

## 2. 图标清单

建议本次总图一次性包含以下 12 个图标：

1. 个人资料 `ico-profile`
2. 密码与安全 `ico-security`
3. 工作区成员 `ico-workspace-members`
4. 通知偏好 `ico-notification`
5. AI 网关 `ico-ai-gateway`
6. 提示词模板 `ico-prompts`
7. 系统概览 `ico-admin-overview`
8. 业务指标 `ico-admin-business`
9. 审计日志 `ico-admin-audit`
10. 通用空状态 `ico-empty-default`
11. 工作区空状态 `ico-empty-workspace`
12. 空通知 `ico-empty-notification`

## 3. 总体风格要求

统一风格必须满足以下要求：

- 暖中性色产品风格，贴合当前网页的 `Warm Editorial + Minimal Product`
- 轻线性图标，不要彩色 Emoji 感
- 线条克制，圆角柔和，留白充足
- 背景透明或纯白纯净背景，方便后期切片
- 不要 3D、不要渐变、不要玻璃拟态、不要霓虹、不要卡通
- 不要拟物金属质感，不要厚重阴影
- 图标之间风格完全统一，像一套同源设计系统

配色建议：

- 主描边：接近 `#2B2926`
- 次级描边：接近 `#5F5A53`
- 强调点缀：少量 `#C96A3D`

## 4. 单张总图排版要求

为了方便切片，建议直接要求模型输出规则网格，不要自由排布。

推荐画布结构：

- 4 列 x 3 行
- 共 12 个图标
- 每个图标位于独立方形单元格中央
- 单元格之间留足白边
- 所有图标大小、视觉重量、描边粗细一致
- 每个图标下面预留极短英文标签，便于人工识别后切片

推荐尺寸：

- 总图尺寸优先用 `2048x1536`
- 如果模型对规则排版控制一般，可改用 `1792x1024`

推荐标签顺序：

第一行：

- profile
- security
- workspace
- notification

第二行：

- ai
- prompts
- overview
- business

第三行：

- audit
- empty
- workspace-empty
- notification-empty

## 5. 主提示词

下面这条是建议你优先直接投给 `gpt-image2` 的主提示词：

```text
Create a single icon atlas image for a warm editorial productivity web app. The image must contain exactly 12 icons arranged in a clean 4-column by 3-row grid, evenly spaced, centered in separate square cells, with consistent icon size, stroke weight, and visual balance. The style is refined warm-neutral SaaS product design, minimal editorial, calm, premium, elegant, thin outline icons with soft rounded corners, subtle accent orange details, mostly dark ink lines on a clean light background. No emoji style, no cartoon, no 3D, no glossy effect, no gradient, no glassmorphism, no neon, no heavy shadows, no photorealism.

Include these 12 icons in this exact left-to-right, top-to-bottom order:
1. user profile
2. account security lock
3. workspace members team
4. notification bell
5. AI gateway as abstract connected nodes with a subtle spark, not a robot face
6. prompt template document with text lines
7. system overview dashboard
8. business metrics rising line chart
9. audit log as magnifying glass over document lines
10. generic empty state as tray or content container
11. workspace empty state as layered panels or structured container, not a house
12. empty notifications as muted bell or quiet notification center

Place a tiny lowercase English label below each icon for identification: profile, security, workspace, notification, ai, prompts, overview, business, audit, empty, workspace-empty, notification-empty.

Keep all icons stylistically unified like one professional icon family for a real product UI kit. Ensure each icon is isolated with enough whitespace for later slicing. Composition must be straight, organized, grid-based, and highly slice-friendly.
```

## 6. 强约束版提示词

如果第一次生成的结果出现排布混乱、风格飘、图标互相靠太近，可以改用下面这条更强约束版本：

```text
Design a sprite-sheet style icon board for a premium warm editorial web application UI kit. Generate exactly 12 separate icons in a strict 4x3 grid layout. Each icon must stay inside its own clearly separated square zone with generous padding. Keep the background plain and uncluttered for easy manual slicing. All icons must be centered and aligned, with identical stroke thickness, identical visual scale, and a unified minimal line-icon language.

Style requirements: warm neutral palette, premium productivity software aesthetic, editorial restraint, soft rounded strokes, clean vector-like appearance, subtle orange accent only where necessary, no emoji look, no illustration scene, no stickers, no mascots, no 3D, no gradients, no colorful backgrounds, no decorative frames, no perspective distortion.

Grid order:
Row 1: profile, security, workspace, notification
Row 2: ai, prompts, overview, business
Row 3: audit, empty, workspace-empty, notification-empty

Icon meanings:
- profile = single person account icon
- security = rounded padlock
- workspace = two-person collaborative team icon
- notification = elegant bell
- ai = abstract intelligence / connected nodes / spark
- prompts = document template with lines
- overview = dashboard summary panel
- business = rising trend line
- audit = magnifier plus document
- empty = tray or empty content container
- workspace-empty = layered workspace panels, not a house
- notification-empty = muted bell

Add small lowercase text labels under each icon only for identification. Make the final image feel like a professional export from a product icon system.
```

## 7. 中文补充说明词

如果你更想用中文指令，可以把下面这段追加到主提示词后面：

```text
请把这 12 个图标严格排成 4 列 3 行的整齐网格，每个图标居中放在自己的独立方格区域内，彼此不要靠太近，方便后期切片。整张图像要像同一套产品图标系统，不要出现风格跳跃，不要做成表情包，不要做成插画场景。背景尽量纯净，图标边缘清晰，适合后期逐个裁切导出。
```

## 8. 切片建议

为了后期切片更省事，建议你在出图后优先检查这几个点：

1. 12 个图标是否都完整出现，没有漏项
2. 图标是否严格按 4 x 3 排布
3. 每个图标周围是否有足够空白
4. 标签是否没有挡住图标主体
5. `ai` 图标是否被错误画成机器人表情
6. `workspace-empty` 是否被误画成房子
7. `empty` 与 `notification-empty` 是否差异足够明显

## 9. 如果第一张还不够稳

如果第一轮结果不够适合切片，建议第二轮追加这句修正词：

```text
Make the layout more technical and slicing-friendly: wider spacing, stricter alignment, more uniform icon size, simpler shapes, cleaner background, less decorative detail.
```

## 10. 最终建议

最省额度的做法是：

- 先用“主提示词”出一张
- 如果排布不规整，再用“强约束版提示词”重出一张
- 在最满意的版本上切出 12 个图标
- 后续网页替换时统一使用这一批图标，避免风格混乱

如果后面你要，我还可以继续帮你补一版：

- “适合深色背景使用”的反白版总图提示词
- “适合 16px / 20px 小尺寸显示”的超简化版图标提示词
