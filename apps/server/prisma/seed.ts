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

  // 6. 创建系统内置模板
  const templates = [
    {
      name: '团队内部经验分享',
      category: 'sharing',
      content: JSON.stringify({
        audience: '同事',
        goalType: 'inform',
        duration: 30,
        stages: ['梳理经验', '提炼要点', '设计案例', '排练节奏'],
      }),
    },
    {
      name: '新人培训分享',
      category: 'training',
      content: JSON.stringify({
        audience: '新人',
        goalType: 'teach',
        duration: 60,
        stages: ['了解背景', '讲解概念', '演示操作', '答疑巩固'],
      }),
    },
    {
      name: '工具演示分享',
      category: 'demo',
      content: JSON.stringify({
        audience: '产品团队',
        goalType: 'teach',
        duration: 15,
        stages: ['场景引入', '核心演示', '对比说明', '上手引导'],
      }),
    },
    {
      name: '复盘类分享',
      category: 'review',
      content: JSON.stringify({
        audience: '同事',
        goalType: 'review',
        duration: 45,
        stages: ['回顾目标', '梳理过程', '分析结果', '提炼经验'],
      }),
    },
  ];

  for (const tpl of templates) {
    await prisma.template.upsert({
      where: { id: `builtin-${tpl.category}` },
      update: {},
      create: {
        id: `builtin-${tpl.category}`,
        workspaceId: workspace.id,
        name: tpl.name,
        category: tpl.category,
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
