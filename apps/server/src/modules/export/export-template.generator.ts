/**
 * 导出内容模板生成器
 * 参考：08_导出分享与交付输出实施清单.md
 *
 * 5 种导出类型，面向交付优化的结构化输出，非简单复制页面
 */
import {
  ExportTypeEnum,
  TASK_STATUS_LABELS,
  TaskStatusEnum,
  GOAL_STAGE_LABELS,
  type ExportContextDto,
} from '@ai-task-manager/shared';

export class ExportTemplateGenerator {
  /**
   * 根据类型生成 Markdown
   */
  static generate(type: ExportTypeEnum, ctx: ExportContextDto): string {
    switch (type) {
      case ExportTypeEnum.ACTION_LIST:
        return this.actionList(ctx);
      case ExportTypeEnum.PHASE_PLAN:
        return this.phasePlan(ctx);
      case ExportTypeEnum.REPORT_SUMMARY:
        return this.reportSummary(ctx);
      case ExportTypeEnum.REVIEW_SUMMARY:
        return this.reviewSummary(ctx);
      case ExportTypeEnum.PRESENTATION_OUTLINE:
        return this.presentationOutline(ctx);
      default:
        return this.phasePlan(ctx);
    }
  }

  /** 生成标题 */
  private static title(ctx: ExportContextDto, heading: string): string {
    const date = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return `# ${ctx.goal.title || ctx.goal.topic}\n\n> ${heading} · ${date}\n\n`;
  }

  // ============================================================
  // 1. 行动清单：聚焦待办与下一步
  // ============================================================
  private static actionList(ctx: ExportContextDto): string {
    const { goal, tasks, progress, plan } = ctx;
    let md = this.title(ctx, '行动清单');

    md += `## 概览\n\n`;
    md += `- 整体进度：${progress.completionRate}%（${progress.completedTasks}/${progress.totalTasks}）\n`;
    if (progress.blockedTasks > 0) {
      md += `- ⚠ 受阻任务：${progress.blockedTasks} 个\n`;
    }
    if (plan.content?.nextActions?.length) {
      md += `- 建议下一步：${plan.content.nextActions[0]}\n`;
    }
    md += '\n';

    // 进行中
    const inProgress = tasks.filter((t) => t.status === TaskStatusEnum.IN_PROGRESS);
    if (inProgress.length > 0) {
      md += `## 进行中\n\n`;
      for (const t of inProgress) {
        md += `- **${t.title}**`;
        if (t.stageName) md += ` · ${t.stageName}`;
        if (t.dueDate) md += ` · 截止 ${t.dueDate.split('T')[0]}`;
        md += '\n';
        if (t.description) md += `  - ${t.description}\n`;
      }
      md += '\n';
    }

    // 待推进
    const pending = tasks.filter((t) => t.status === TaskStatusEnum.PENDING);
    if (pending.length > 0) {
      md += `## 待推进\n\n`;
      for (const t of pending) {
        md += `- [ ] ${t.title}`;
        if (t.stageName) md += ` · ${t.stageName}`;
        md += '\n';
      }
      md += '\n';
    }

    // 受阻
    const blocked = tasks.filter((t) => t.status === TaskStatusEnum.BLOCKED);
    if (blocked.length > 0) {
      md += `## ⚠ 受阻\n\n`;
      for (const t of blocked) {
        md += `- **${t.title}**：${t.blockerNote ?? '未填写原因'}\n`;
      }
      md += '\n';
    }

    // 下一步建议
    if (plan.content?.nextActions?.length) {
      md += `## 下一步建议\n\n`;
      for (const action of plan.content.nextActions) {
        md += `- ${action}\n`;
      }
      md += '\n';
    }

    if (goal.successCriteria) {
      md += `## 成功标准\n\n${goal.successCriteria}\n`;
    }

    return md;
  }

  // ============================================================
  // 2. 阶段计划：完整规划结构
  // ============================================================
  private static phasePlan(ctx: ExportContextDto): string {
    const { goal, plan, tasks, progress } = ctx;
    let md = this.title(ctx, '阶段计划');

    md += `## 目标概要\n\n`;
    md += `- 原始目标：${goal.topic}\n`;
    md += `- 当前阶段：${GOAL_STAGE_LABELS[goal.currentStage] ?? goal.currentStage}\n`;
    if (goal.timeConstraint) md += `- 时间约束：${goal.timeConstraint}\n`;
    if (goal.resourceConstraint) md += `- 资源约束：${goal.resourceConstraint}\n`;
    if (goal.successCriteria) md += `- 成功标准：${goal.successCriteria}\n`;
    md += '\n';

    if (!plan.content) {
      md += '> 尚无规划内容\n';
      return md;
    }

    md += `## 规划摘要\n\n${plan.content.summary}\n\n`;
    md += `## 进度概览\n\n`;
    md += `- 整体完成率：${progress.completionRate}%\n`;
    md += `- 已完成：${progress.completedTasks} / ${progress.totalTasks}\n`;
    md += `- 进行中：${progress.inProgressTasks}\n`;
    md += `- 受阻：${progress.blockedTasks}\n\n`;

    // 阶段与任务
    md += `## 阶段与任务\n\n`;
    for (const phase of plan.content.phases) {
      const phaseTasks = tasks.filter((t) => t.stageName === phase.name);
      const completed = phaseTasks.filter((t) => t.status === TaskStatusEnum.COMPLETED).length;
      md += `### ${phase.name}${phaseTasks.length > 0 ? `（${completed}/${phaseTasks.length}）` : ''}\n\n`;
      if (phase.description) md += `${phase.description}\n\n`;

      for (const task of phase.tasks) {
        const realTask = phaseTasks.find((t) => t.title === task.title);
        const status = realTask ? realTask.status : TaskStatusEnum.PENDING;
        const check = status === TaskStatusEnum.COMPLETED ? 'x' : ' ';
        md += `- [${check}] ${task.title}`;
        if (task.priority) md += ` · ${task.priority}`;
        if (realTask?.status === TaskStatusEnum.BLOCKED) md += ` · ⚠受阻`;
        md += '\n';
        if (task.description) md += `  - ${task.description}\n`;
      }
      md += '\n';
    }

    // 风险
    if (plan.content.risks?.length > 0) {
      md += `## 风险与应对\n\n`;
      for (const risk of plan.content.risks) {
        md += `- **${risk.description}**（影响：${risk.impact}）\n`;
        if (risk.mitigation) md += `  - 应对：${risk.mitigation}\n`;
      }
      md += '\n';
    }

    // 里程碑
    if (plan.content.milestones?.length > 0) {
      md += `## 里程碑\n\n`;
      for (const m of plan.content.milestones) {
        md += `- **${m.name}**`;
        if (m.targetDate) md += ` · 目标 ${m.targetDate.split('T')[0]}`;
        md += '\n';
        if (m.description) md += `  - ${m.description}\n`;
      }
      md += '\n';
    }

    // 假设
    if (plan.content.assumptions?.length > 0) {
      md += `## 假设\n\n`;
      for (const a of plan.content.assumptions) {
        md += `- ${a}\n`;
      }
    }

    return md;
  }

  // ============================================================
  // 3. 汇报摘要：面向汇报的结构化摘要
  // ============================================================
  private static reportSummary(ctx: ExportContextDto): string {
    const { goal, plan, progress, tasks } = ctx;
    let md = this.title(ctx, '汇报摘要');

    md += `## 一、目标与背景\n\n`;
    md += `${goal.topic}\n\n`;
    if (goal.timeConstraint) md += `时间约束：${goal.timeConstraint}\n\n`;

    md += `## 二、当前进展\n\n`;
    md += `截至本次汇报，整体完成率 **${progress.completionRate}%**`;
    md += `（已完成 ${progress.completedTasks}/${progress.totalTasks} 项任务）。\n\n`;

    if (progress.inProgressTasks > 0) {
      md += `**正在推进：**\n`;
      const inProgress = tasks.filter((t) => t.status === TaskStatusEnum.IN_PROGRESS);
      for (const t of inProgress) {
        md += `- ${t.title}\n`;
      }
      md += '\n';
    }

    const recentCompleted = tasks
      .filter((t) => t.status === TaskStatusEnum.COMPLETED && t.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
      .slice(0, 5);
    if (recentCompleted.length > 0) {
      md += `**近期完成：**\n`;
      for (const t of recentCompleted) {
        md += `- ${t.title}\n`;
      }
      md += '\n';
    }

    md += `## 三、风险与阻塞\n\n`;
    const blocked = tasks.filter((t) => t.status === TaskStatusEnum.BLOCKED);
    if (blocked.length > 0) {
      for (const t of blocked) {
        md += `- **${t.title}**：${t.blockerNote ?? '受阻'}\n`;
      }
    } else if (plan.content?.risks && plan.content.risks.length > 0) {
      for (const risk of plan.content.risks.slice(0, 3)) {
        md += `- ${risk.description}（影响：${risk.impact}）\n`;
      }
    } else {
      md += `暂无重大风险与阻塞。\n`;
    }
    md += '\n';

    md += `## 四、下一步计划\n\n`;
    const nextActions = plan.content?.nextActions;
    if (nextActions && nextActions.length > 0) {
      for (const action of nextActions) {
        md += `- ${action}\n`;
      }
    } else {
      const pending = tasks.filter((t) => t.status === TaskStatusEnum.PENDING).slice(0, 3);
      for (const t of pending) {
        md += `- 推进「${t.title}」\n`;
      }
    }
    md += '\n';

    if (goal.successCriteria) {
      md += `## 五、成功标准\n\n${goal.successCriteria}\n`;
    }

    return md;
  }

  // ============================================================
  // 4. 复盘摘要：面向复盘的结构化回顾
  // ============================================================
  private static reviewSummary(ctx: ExportContextDto): string {
    const { goal, plan, progress, tasks } = ctx;
    let md = this.title(ctx, '复盘摘要');

    md += `## 一、目标回顾\n\n`;
    md += `- 目标：${goal.topic}\n`;
    md += `- 成功标准：${goal.successCriteria ?? '未明确设定'}\n`;
    if (goal.timeConstraint) md += `- 时间约束：${goal.timeConstraint}\n`;
    md += '\n';

    md += `## 二、完成情况\n\n`;
    md += `- 任务总数：${progress.totalTasks}\n`;
    md += `- 已完成：${progress.completedTasks}（${progress.completionRate}%）\n`;
    md += `- 进行中：${progress.inProgressTasks}\n`;
    md += `- 受阻：${progress.blockedTasks}\n`;
    const skipped = tasks.filter((t) => t.status === TaskStatusEnum.SKIPPED || t.status === TaskStatusEnum.CANCELLED).length;
    if (skipped > 0) md += `- 跳过/取消：${skipped}\n`;
    md += '\n';

    md += `## 三、阶段完成情况\n\n`;
    if (plan.content) {
      for (const phase of plan.content.phases) {
        const phaseTasks = tasks.filter((t) => t.stageName === phase.name);
        const completed = phaseTasks.filter((t) => t.status === TaskStatusEnum.COMPLETED).length;
        const rate = phaseTasks.length > 0 ? Math.round((completed / phaseTasks.length) * 100) : 0;
        md += `- **${phase.name}**：${rate}%（${completed}/${phaseTasks.length}）\n`;
      }
    } else {
      md += `暂无阶段数据\n`;
    }
    md += '\n';

    md += `## 四、阻塞与问题\n\n`;
    const blocked = tasks.filter((t) => t.status === TaskStatusEnum.BLOCKED);
    if (blocked.length > 0) {
      for (const t of blocked) {
        md += `- ${t.title}：${t.blockerNote ?? '未填写'}\n`;
      }
    } else {
      md += `本次推进未出现持续阻塞。\n`;
    }
    md += '\n';

    md += `## 五、复盘要点\n\n`;
    md += `> 以下为建议的复盘思考方向，请结合实际情况填写\n\n`;
    md += `### 做得好的\n\n- \n\n`;
    md += `### 可改进的\n\n- \n\n`;
    md += `### 下次可复用的经验\n\n- \n`;

    return md;
  }

  // ============================================================
  // 5. 演示提纲：面向演讲的提纲
  // ============================================================
  private static presentationOutline(ctx: ExportContextDto): string {
    const { goal, plan, progress } = ctx;
    let md = this.title(ctx, '演示提纲');

    md += `## 开场（建议 2 分钟）\n\n`;
    md += `1. **引入背景**：${goal.topic}\n`;
    if (goal.timeConstraint) md += `2. **时间约束**：${goal.timeConstraint}\n`;
    md += `3. **本次分享目标**：${goal.successCriteria ?? '让听众了解推进情况与成果'}\n\n`;

    md += `## 主体（建议 8-10 分钟）\n\n`;
    if (plan.content) {
      let idx = 1;
      for (const phase of plan.content.phases) {
        const phaseTasks = ctx.tasks.filter((t) => t.stageName === phase.name);
        const completed = phaseTasks.filter((t) => t.status === TaskStatusEnum.COMPLETED).length;
        md += `### 第 ${idx} 部分：${phase.name}\n\n`;
        if (phase.description) md += `${phase.description}\n\n`;
        md += `要点：\n`;
        for (const task of phase.tasks.slice(0, 3)) {
          md += `- ${task.title}\n`;
        }
        if (phaseTasks.length > 0) {
          md += `\n进度：${completed}/${phaseTasks.length} 已完成\n`;
        }
        md += '\n';
        idx++;
      }
    } else {
      md += `1. 推进过程\n2. 关键成果\n3. 遇到的挑战\n\n`;
    }

    md += `## 进展数据（建议 1 分钟）\n\n`;
    md += `- 整体完成率：${progress.completionRate}%\n`;
    md += `- 已完成任务：${progress.completedTasks} 项\n`;
    if (progress.blockedTasks > 0) {
      md += `- 已解决问题：${progress.blockedTasks} 项受阻已处理\n`;
    }
    md += '\n';

    md += `## 风险与应对（建议 2 分钟）\n\n`;
    const risks = plan.content?.risks;
    if (risks && risks.length > 0) {
      for (const risk of risks.slice(0, 3)) {
        md += `- ${risk.description} → ${risk.mitigation}\n`;
      }
    } else {
      md += `- 暂无重大风险\n`;
    }
    md += '\n';

    md += `## 总结与下一步（建议 2 分钟）\n\n`;
    md += `1. **核心成果回顾**\n`;
    const actions = plan.content?.nextActions;
    if (actions && actions.length > 0) {
      md += `2. **下一步计划**：${actions[0]}\n`;
    } else {
      md += `2. **下一步计划**\n`;
    }
    md += `3. **互动答疑**\n`;

    return md;
  }
}
