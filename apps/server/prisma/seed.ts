/**
 * Prisma 种子数据
 * 参考：11_后端平台数据层与AI基础设施实施清单.md（建立种子数据机制）
 *
 * 运行：pnpm db:seed
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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
