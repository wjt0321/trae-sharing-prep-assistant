/**
 * Prisma 种子数据
 * 参考：11_后端平台数据层与AI基础设施实施清单.md（建立种子数据机制）
 *
 * 运行：pnpm db:seed
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { buildRealScenarioDataset } from '../src/seed/real-scenario-data';

const prisma = new PrismaClient();
const realDataset = buildRealScenarioDataset();

async function main() {
  console.log('开始写入种子数据...');

  // 1. 创建默认用户
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@ai-task-manager.local' },
    update: {},
    create: {
      email: 'demo@ai-task-manager.local',
      passwordHash,
      displayName: '演示用户',
    },
  });
  console.log(`已创建用户: ${user.email}`);

  // 2. 创建个人工作区
  const workspace = await prisma.workspace.upsert({
    where: { id: 'demo-personal-workspace' },
    update: {},
    create: {
      id: 'demo-personal-workspace',
      name: '我的个人工作区',
      type: 'personal',
      ownerId: user.id,
    },
  });
  console.log(`已创建工作区: ${workspace.name}`);

  // 3. 设置默认工作区
  await prisma.user.update({
    where: { id: user.id },
    data: { defaultWorkspaceId: workspace.id },
  });

  // 4. 创建工作区成员关系
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: 'owner',
    },
  });
  console.log('已创建工作区成员关系');

  // 5. 创建示例目标
  const goal = await prisma.goal.upsert({
    where: { id: 'demo-goal-1' },
    update: {},
    create: {
      id: 'demo-goal-1',
      workspaceId: workspace.id,
      creatorId: user.id,
      topic: '我要准备一场小型分享会，但我不知道该怎么安排。',
      audience: '同事',
      duration: 30,
      goalType: 'inform',
      preparedness: '还没开始',
    },
  });
  console.log(`已创建示例目标: ${goal.topic}`);

  // 6. 创建系统内置模板（场景模板，参考 TemplateCategoryEnum + TemplateContentDto）
  const templates = [
    {
      id: 'builtin-sharing-prep',
      name: '团队内部经验分享',
      description: '面向同事的经验分享，30 分钟，inform 类型',
      category: 'scenario',
      scenarioType: 'sharing_prep',
      content: JSON.stringify({
        audience: '同事',
        goalType: 'inform',
        duration: 30,
        timeConstraint: '一周内',
        successCriteria: '同事能复述 3 个核心要点',
        planHints: ['梳理经验', '提炼要点', '设计案例', '排练节奏'],
        checklist: ['确认场地与设备', '准备演示材料', '提前 10 分钟到场'],
        description: '面向同事的经验分享，30 分钟，inform 类型',
      }),
    },
    {
      id: 'builtin-training',
      name: '新人培训分享',
      description: '面向新人的系统培训，60 分钟，teach 类型',
      category: 'scenario',
      scenarioType: 'sharing_prep',
      content: JSON.stringify({
        audience: '新人',
        goalType: 'teach',
        duration: 60,
        timeConstraint: '两周内',
        successCriteria: '新人能独立完成基础操作',
        planHints: ['了解背景', '讲解概念', '演示操作', '答疑巩固'],
        checklist: ['准备新人手册', '搭建练习环境', '安排答疑环节'],
        description: '面向新人的系统培训，60 分钟，teach 类型',
      }),
    },
    {
      id: 'builtin-competition',
      name: '比赛项目推进',
      description: '比赛项目从立项到交付的推进模板',
      category: 'scenario',
      scenarioType: 'competition',
      content: JSON.stringify({
        timeConstraint: '一个月内',
        resourceConstraint: '独立完成或 2-3 人协作',
        priority: 'high',
        successCriteria: '按时提交符合要求的参赛作品',
        planHints: ['需求拆解', '技术选型', '核心实现', '演示打磨', '提交复盘'],
        checklist: ['确认比赛规则与截止时间', '搭建项目骨架', '准备演示视频'],
        description: '比赛项目从立项到交付的推进模板',
      }),
    },
    {
      id: 'builtin-content-creation',
      name: '内容创作规划',
      description: '内容创作（文章/视频/课程）的规划模板',
      category: 'scenario',
      scenarioType: 'content_creation',
      content: JSON.stringify({
        timeConstraint: '两周内',
        resourceConstraint: '独立完成',
        successCriteria: '产出符合质量标准的内容并发布',
        planHints: ['选题调研', '大纲设计', '内容撰写', '审校打磨', '发布推广'],
        checklist: ['确认目标受众', '准备素材', '检查发布渠道'],
        description: '内容创作（文章/视频/课程）的规划模板',
      }),
    },
    {
      id: 'builtin-small-project',
      name: '小项目起步',
      description: '小项目从想法到落地的推进模板',
      category: 'scenario',
      scenarioType: 'small_project',
      content: JSON.stringify({
        timeConstraint: '一个月内',
        resourceConstraint: '独立完成',
        priority: 'medium',
        successCriteria: '完成 MVP 并可对外演示',
        planHints: ['需求确认', '架构设计', '核心开发', '测试验收', '上线发布'],
        checklist: ['确认核心需求', '搭建开发环境', '准备演示场景'],
        description: '小项目从想法到落地的推进模板',
      }),
    },
    {
      id: 'builtin-learning',
      name: '学习目标拆解',
      description: '学习目标从拆解到掌握的推进模板',
      category: 'scenario',
      scenarioType: 'learning',
      content: JSON.stringify({
        timeConstraint: '一个月内',
        successCriteria: '能独立应用所学知识解决实际问题',
        planHints: ['明确学习目标', '拆解知识图谱', '分阶段学习', '实践巩固', '复盘总结'],
        checklist: ['准备学习资料', '安排学习时间', '设计实践项目'],
        description: '学习目标从拆解到掌握的推进模板',
      }),
    },
  ];

  for (const tpl of templates) {
    await prisma.template.upsert({
      where: { id: tpl.id },
      update: {},
      create: {
        id: tpl.id,
        workspaceId: workspace.id,
        name: tpl.name,
        description: tpl.description,
        category: tpl.category,
        scenarioType: tpl.scenarioType,
        content: tpl.content,
        isBuiltIn: true,
      },
    });
  }
  console.log(`已创建 ${templates.length} 个系统内置模板`);

  // 7. 创建内置提示词模板（Prompt Registry）
  const promptTemplates = [
    {
      name: 'goal.detect_scenario',
      description: '目标场景识别：把用户的模糊目标归类到预设场景',
      systemPrompt: '你是目标场景识别助手，负责把用户的模糊目标归类到预设场景。',
      userTemplate: '目标：{{topic}}',
      variables: ['topic'],
    },
    {
      name: 'plan.generate',
      description: '规划生成：把目标拆解为结构化的阶段、任务、风险与里程碑',
      systemPrompt: '你是规划引擎，负责把目标拆解为结构化的阶段、任务、风险与里程碑。',
      userTemplate: '目标：{{topic}}\n场景：{{scenarioType}}',
      variables: ['topic', 'scenarioType'],
    },
    {
      name: 'plan.replan',
      description: '重规划：根据约束变化重新生成规划',
      systemPrompt: '你是重规划引擎，根据约束变化重新生成规划。',
      userTemplate: '重规划原因：{{reason}}\n目标：{{topic}}',
      variables: ['reason', 'topic'],
    },
  ];

  for (const tpl of promptTemplates) {
    const existing = await prisma.promptTemplate.findFirst({
      where: { name: tpl.name },
    });
    if (!existing) {
      await prisma.promptTemplate.create({
        data: {
          name: tpl.name,
          description: tpl.description,
          systemPrompt: tpl.systemPrompt,
          userTemplate: tpl.userTemplate,
          variablesJson: JSON.stringify(tpl.variables),
          version: 1,
          isActive: true,
        },
      });
    }
  }
  console.log(`已创建 ${promptTemplates.length} 个内置提示词模板`);

  // 8. 创建真实业务场景数据
  for (const scenarioUser of realDataset.users) {
    await prisma.user.upsert({
      where: { email: scenarioUser.email },
      update: {
        displayName: scenarioUser.displayName,
        avatarUrl: scenarioUser.avatarUrl,
      },
      create: {
        id: scenarioUser.id,
        email: scenarioUser.email,
        passwordHash,
        displayName: scenarioUser.displayName,
        avatarUrl: scenarioUser.avatarUrl,
      },
    });
  }
  console.log(`已创建 ${realDataset.users.length} 个真实业务用户`);

  for (const scenarioWorkspace of realDataset.workspaces) {
    await prisma.workspace.upsert({
      where: { id: scenarioWorkspace.id },
      update: {
        name: scenarioWorkspace.name,
        type: scenarioWorkspace.type,
        description: scenarioWorkspace.description,
        ownerId: scenarioWorkspace.ownerId,
      },
      create: scenarioWorkspace,
    });
  }
  console.log(`已创建 ${realDataset.workspaces.length} 个真实业务工作区`);

  for (const scenarioUser of realDataset.users) {
    await prisma.user.update({
      where: { id: scenarioUser.id },
      data: { defaultWorkspaceId: scenarioUser.defaultWorkspaceId },
    });
  }

  for (const scenarioMember of realDataset.workspaceMembers) {
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: scenarioMember.workspaceId,
          userId: scenarioMember.userId,
        },
      },
      update: {
        role: scenarioMember.role,
      },
      create: scenarioMember,
    });
  }
  console.log(`已创建 ${realDataset.workspaceMembers.length} 条真实业务成员关系`);

  for (const scenarioGoal of realDataset.goals) {
    await prisma.goal.upsert({
      where: { id: scenarioGoal.id },
      update: {
        workspaceId: scenarioGoal.workspaceId,
        creatorId: scenarioGoal.creatorId,
        topic: scenarioGoal.topic,
        title: scenarioGoal.title,
        scenarioType: scenarioGoal.scenarioType,
        audience: scenarioGoal.audience,
        duration: scenarioGoal.duration,
        shareDate: scenarioGoal.shareDate,
        goalType: scenarioGoal.goalType,
        preparedness: scenarioGoal.preparedness,
        timeConstraint: scenarioGoal.timeConstraint,
        resourceConstraint: scenarioGoal.resourceConstraint,
        priority: scenarioGoal.priority,
        successCriteria: scenarioGoal.successCriteria,
        currentStage: scenarioGoal.currentStage,
        isCollaborative: scenarioGoal.isCollaborative,
        sceneTags: scenarioGoal.sceneTags,
      },
      create: scenarioGoal,
    });
  }
  console.log(`已创建 ${realDataset.goals.length} 个真实业务目标`);

  for (const scenarioPlan of realDataset.plans) {
    await prisma.plan.upsert({
      where: { id: scenarioPlan.id },
      update: {
        goalId: scenarioPlan.goalId,
        version: scenarioPlan.version,
        isActive: scenarioPlan.isActive,
        source: scenarioPlan.source,
        changeReason: scenarioPlan.changeReason,
        aiPromptLog: scenarioPlan.aiPromptLog,
        content: scenarioPlan.content,
      },
      create: scenarioPlan,
    });
  }

  for (const scenarioTask of realDataset.tasks) {
    await prisma.executionTask.upsert({
      where: { id: scenarioTask.id },
      update: {
        goalId: scenarioTask.goalId,
        stageId: scenarioTask.stageId,
        stageName: scenarioTask.stageName,
        title: scenarioTask.title,
        description: scenarioTask.description,
        status: scenarioTask.status,
        sortOrder: scenarioTask.sortOrder,
        dueDate: scenarioTask.dueDate,
        completedAt: scenarioTask.completedAt,
        blockerNote: scenarioTask.blockerNote,
        assigneeId: scenarioTask.assigneeId,
        creatorId: scenarioTask.creatorId,
      },
      create: scenarioTask,
    });
  }

  for (const history of realDataset.taskStatusHistories) {
    await prisma.taskStatusHistory.upsert({
      where: { id: history.id },
      update: {
        taskId: history.taskId,
        fromStatus: history.fromStatus,
        toStatus: history.toStatus,
        note: history.note,
        blockerNote: history.blockerNote,
        operatorId: history.operatorId,
        createdAt: history.createdAt,
      },
      create: history,
    });
  }

  for (const comment of realDataset.comments) {
    await prisma.comment.upsert({
      where: { id: comment.id },
      update: {
        goalId: comment.goalId,
        userId: comment.userId,
        content: comment.content,
        parentId: comment.parentId,
        anchorType: comment.anchorType,
        anchorId: comment.anchorId,
        type: comment.type,
        mentions: comment.mentions,
        resolvedAt: comment.resolvedAt,
        resolvedById: comment.resolvedById,
      },
      create: comment,
    });
  }

  for (const assignment of realDataset.assignments) {
    await prisma.assignment.upsert({
      where: { id: assignment.id },
      update: {
        taskId: assignment.taskId,
        assigneeId: assignment.assigneeId,
        assignedById: assignment.assignedById,
        note: assignment.note,
        createdAt: assignment.createdAt,
      },
      create: assignment,
    });
  }

  for (const event of realDataset.activityEvents) {
    await prisma.activityEvent.upsert({
      where: { id: event.id },
      update: {
        goalId: event.goalId,
        type: event.type,
        actorId: event.actorId,
        targetType: event.targetType,
        targetId: event.targetId,
        targetTitle: event.targetTitle,
        detail: event.detail,
        createdAt: event.createdAt,
      },
      create: event,
    });
  }

  for (const template of realDataset.templates) {
    await prisma.template.upsert({
      where: { id: template.id },
      update: {
        workspaceId: template.workspaceId,
        name: template.name,
        description: template.description,
        category: template.category,
        scenarioType: template.scenarioType,
        content: template.content,
        isBuiltIn: template.isBuiltIn ?? false,
        usageCount: template.usageCount ?? 0,
        createdBy: template.createdBy,
      },
      create: {
        ...template,
        isBuiltIn: template.isBuiltIn ?? false,
        usageCount: template.usageCount ?? 0,
      },
    });
  }

  for (const asset of realDataset.assets) {
    await prisma.knowledgeAsset.upsert({
      where: { id: asset.id },
      update: {
        workspaceId: asset.workspaceId,
        title: asset.title,
        type: asset.type,
        content: asset.content,
        tags: asset.tags,
        sourceGoalId: asset.sourceGoalId,
        creatorId: asset.creatorId,
      },
      create: asset,
    });
  }

  for (const exportRecord of realDataset.exports) {
    await prisma.exportRecord.upsert({
      where: { id: exportRecord.id },
      update: {
        goalId: exportRecord.goalId,
        type: exportRecord.type,
        format: exportRecord.format,
        title: exportRecord.title,
        content: exportRecord.content,
        filePath: exportRecord.filePath,
        shareToken: exportRecord.shareToken,
        shareExpiresAt: exportRecord.shareExpiresAt,
        allowDownload: exportRecord.allowDownload,
        status: exportRecord.status,
        errorMessage: exportRecord.errorMessage,
        creatorId: exportRecord.creatorId,
      },
      create: exportRecord,
    });
  }

  for (const notification of realDataset.notifications) {
    await prisma.notification.upsert({
      where: { id: notification.id },
      update: {
        userId: notification.userId,
        workspaceId: notification.workspaceId,
        type: notification.type,
        title: notification.title,
        content: notification.content,
        targetType: notification.targetType,
        targetId: notification.targetId,
        readAt: notification.readAt,
      },
      create: notification,
    });
  }
  console.log('已写入真实业务场景数据');

  console.log('种子数据写入完成');
}

main()
  .catch((e) => {
    console.error('种子数据写入失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
