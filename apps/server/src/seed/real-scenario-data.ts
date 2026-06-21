type SeedUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  defaultWorkspaceId: string;
};

type SeedWorkspace = {
  id: string;
  name: string;
  type: 'personal' | 'team';
  description?: string;
  ownerId: string;
};

type SeedWorkspaceMember = {
  workspaceId: string;
  userId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
};

type SeedGoal = {
  id: string;
  workspaceId: string;
  creatorId: string;
  topic: string;
  title: string;
  scenarioType: string;
  audience?: string;
  duration?: number;
  shareDate?: Date;
  goalType?: string;
  preparedness?: string;
  timeConstraint?: string;
  resourceConstraint?: string;
  priority?: string;
  successCriteria?: string;
  currentStage: string;
  isCollaborative: boolean;
  sceneTags?: string;
};

type SeedPlan = {
  id: string;
  goalId: string;
  version: number;
  isActive: boolean;
  source: string;
  changeReason?: string;
  aiPromptLog?: string;
  content: string;
};

type SeedTask = {
  id: string;
  goalId: string;
  stageId?: string;
  stageName?: string;
  title: string;
  description?: string;
  status: string;
  sortOrder: number;
  dueDate?: Date;
  completedAt?: Date;
  blockerNote?: string;
  assigneeId?: string;
  creatorId: string;
};

type SeedTaskStatusHistory = {
  id: string;
  taskId: string;
  fromStatus?: string;
  toStatus: string;
  note?: string;
  blockerNote?: string;
  operatorId: string;
  createdAt: Date;
};

type SeedComment = {
  id: string;
  goalId: string;
  userId: string;
  content: string;
  parentId?: string;
  anchorType?: string;
  anchorId?: string;
  type?: string;
  mentions?: string;
  resolvedAt?: Date;
  resolvedById?: string;
};

type SeedAssignment = {
  id: string;
  taskId: string;
  assigneeId: string;
  assignedById: string;
  note?: string;
  createdAt: Date;
};

type SeedActivityEvent = {
  id: string;
  goalId: string;
  type: string;
  actorId: string;
  targetType: string;
  targetId: string;
  targetTitle?: string;
  detail?: string;
  createdAt: Date;
};

type SeedTemplate = {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  category: string;
  scenarioType?: string;
  content: string;
  isBuiltIn?: boolean;
  usageCount?: number;
  createdBy?: string;
};

type SeedAsset = {
  id: string;
  workspaceId: string;
  title: string;
  type: string;
  content: string;
  tags?: string;
  sourceGoalId?: string;
  creatorId?: string;
};

type SeedExport = {
  id: string;
  goalId: string;
  type: string;
  format: string;
  title: string;
  content: string;
  filePath?: string;
  shareToken?: string;
  shareExpiresAt?: Date;
  allowDownload: boolean;
  status: string;
  errorMessage?: string;
  creatorId: string;
};

type SeedNotification = {
  id: string;
  userId: string;
  workspaceId: string;
  type: string;
  title: string;
  content: string;
  targetType?: string;
  targetId?: string;
  readAt?: Date;
};

export type RealScenarioDataset = {
  users: SeedUser[];
  workspaces: SeedWorkspace[];
  workspaceMembers: SeedWorkspaceMember[];
  goals: SeedGoal[];
  plans: SeedPlan[];
  tasks: SeedTask[];
  taskStatusHistories: SeedTaskStatusHistory[];
  comments: SeedComment[];
  assignments: SeedAssignment[];
  activityEvents: SeedActivityEvent[];
  templates: SeedTemplate[];
  assets: SeedAsset[];
  exports: SeedExport[];
  notifications: SeedNotification[];
};

const now = new Date('2026-06-21T10:00:00.000Z');

function dateAt(daysOffset: number, hours = 0) {
  return new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000 + hours * 60 * 60 * 1000);
}

function createPlanContent(input: {
  summary: string;
  phases: Array<{
    id: string;
    name: string;
    description: string;
    order: number;
    tasks: Array<{
      id: string;
      title: string;
      description: string;
      priority: string;
      estimatedHours?: number;
      dependencies?: string[];
    }>;
  }>;
  risks: Array<{ id: string; description: string; impact: string; mitigation: string }>;
  milestones: Array<{ id: string; name: string; description: string; targetDate?: string }>;
  nextActions: string[];
  assumptions: string[];
}) {
  return JSON.stringify(input);
}

export function buildRealScenarioDataset(): RealScenarioDataset {
  const users: SeedUser[] = [
    {
      id: 'real-user-lead',
      email: 'lead@ai-task-manager.local',
      displayName: '项目主理人',
      defaultWorkspaceId: 'real-workspace-competition',
    },
    {
      id: 'real-user-product',
      email: 'product@ai-task-manager.local',
      displayName: '产品协作者',
      defaultWorkspaceId: 'real-workspace-sharing',
    },
    {
      id: 'real-user-design',
      email: 'design@ai-task-manager.local',
      displayName: '视觉协作者',
      defaultWorkspaceId: 'real-workspace-competition',
    },
    {
      id: 'real-user-content',
      email: 'content@ai-task-manager.local',
      displayName: '内容协作者',
      defaultWorkspaceId: 'real-workspace-content',
    },
    {
      id: 'real-user-ops',
      email: 'ops@ai-task-manager.local',
      displayName: '运营协作者',
      defaultWorkspaceId: 'real-workspace-content',
    },
  ];

  const workspaces: SeedWorkspace[] = [
    {
      id: 'real-workspace-competition',
      name: 'TRAE 创造力大赛冲刺组',
      type: 'team',
      description: '围绕参赛作品收口、演示与提交的冲刺工作区。',
      ownerId: 'real-user-lead',
    },
    {
      id: 'real-workspace-sharing',
      name: '产品分享筹备组',
      type: 'team',
      description: '围绕培训与复盘分享筹备的协作工作区。',
      ownerId: 'real-user-product',
    },
    {
      id: 'real-workspace-content',
      name: '内容增长工作区',
      type: 'team',
      description: '围绕文章、短视频与发布节奏的内容工作区。',
      ownerId: 'real-user-content',
    },
  ];

  const workspaceMembers: SeedWorkspaceMember[] = [
    { workspaceId: 'real-workspace-competition', userId: 'real-user-lead', role: 'owner' },
    { workspaceId: 'real-workspace-competition', userId: 'real-user-product', role: 'admin' },
    { workspaceId: 'real-workspace-competition', userId: 'real-user-design', role: 'editor' },
    { workspaceId: 'real-workspace-competition', userId: 'real-user-content', role: 'editor' },
    { workspaceId: 'real-workspace-sharing', userId: 'real-user-product', role: 'owner' },
    { workspaceId: 'real-workspace-sharing', userId: 'real-user-lead', role: 'admin' },
    { workspaceId: 'real-workspace-sharing', userId: 'real-user-content', role: 'editor' },
    { workspaceId: 'real-workspace-content', userId: 'real-user-content', role: 'owner' },
    { workspaceId: 'real-workspace-content', userId: 'real-user-ops', role: 'admin' },
    { workspaceId: 'real-workspace-content', userId: 'real-user-design', role: 'editor' },
  ];

  const goals: SeedGoal[] = [
    {
      id: 'real-goal-competition-release',
      workspaceId: 'real-workspace-competition',
      creatorId: 'real-user-lead',
      topic: '在大赛截止前完成 AI 任务管家作品收口、演示打磨与最终提交。',
      title: '比赛项目收口与提交',
      scenarioType: 'competition',
      audience: '评审与答辩观众',
      goalType: 'persuade',
      preparedness: '已完成核心功能，进入冲刺阶段',
      timeConstraint: '本周内完成提交',
      resourceConstraint: '4 人协作，优先保证主链路稳定',
      priority: 'urgent',
      successCriteria: '作品可稳定演示，材料完整，按时提交',
      currentStage: 'executing',
      isCollaborative: true,
      sceneTags: '比赛,产品收口,答辩',
    },
    {
      id: 'real-goal-competition-pitch',
      workspaceId: 'real-workspace-competition',
      creatorId: 'real-user-product',
      topic: '梳理答辩叙事，准备 5 分钟演示口播与问答。',
      title: '答辩叙事与口播稿',
      scenarioType: 'competition',
      goalType: 'inform',
      preparedness: '已有要点草稿',
      timeConstraint: '3 天内',
      resourceConstraint: '主理人与产品协作',
      priority: 'high',
      successCriteria: '口播内容清晰，答辩问题可快速回应',
      currentStage: 'planning',
      isCollaborative: true,
      sceneTags: '答辩,演示',
    },
    {
      id: 'real-goal-competition-materials',
      workspaceId: 'real-workspace-competition',
      creatorId: 'real-user-content',
      topic: '整理截图、封面、亮点说明与提交素材。',
      title: '参赛材料整理',
      scenarioType: 'competition',
      goalType: 'inform',
      preparedness: '已收集部分素材',
      timeConstraint: '2 天内',
      resourceConstraint: '内容与视觉协作',
      priority: 'high',
      successCriteria: '提交素材齐全且格式统一',
      currentStage: 'executing',
      isCollaborative: true,
      sceneTags: '素材,提交',
    },
    {
      id: 'real-goal-sharing-onboarding',
      workspaceId: 'real-workspace-sharing',
      creatorId: 'real-user-product',
      topic: '准备一场面向新同事的 AI 任务管家上手分享。',
      title: '新人培训分享',
      scenarioType: 'sharing_prep',
      audience: '新同事',
      duration: 45,
      shareDate: dateAt(5, 10),
      goalType: 'teach',
      preparedness: '已有初版议程',
      timeConstraint: '5 天内',
      resourceConstraint: '2 人协作，需准备演示案例',
      priority: 'high',
      successCriteria: '新人能独立完成从目标创建到导出的完整流程',
      currentStage: 'executing',
      isCollaborative: true,
      sceneTags: '培训,分享',
    },
    {
      id: 'real-goal-sharing-quarterly',
      workspaceId: 'real-workspace-sharing',
      creatorId: 'real-user-lead',
      topic: '筹备季度复盘分享，沉淀经验和案例。',
      title: '季度经验复盘会',
      scenarioType: 'sharing_prep',
      audience: '产品与运营团队',
      duration: 30,
      shareDate: dateAt(10, 15),
      goalType: 'review',
      preparedness: '正在收集案例',
      timeConstraint: '两周内',
      resourceConstraint: '3 人协作',
      priority: 'medium',
      successCriteria: '复盘会能沉淀出下一季度的统一做法',
      currentStage: 'planning',
      isCollaborative: true,
      sceneTags: '复盘,经验分享',
    },
    {
      id: 'real-goal-content-series',
      workspaceId: 'real-workspace-content',
      creatorId: 'real-user-content',
      topic: '完成三篇系列文章的选题、撰写和发布节奏安排。',
      title: '系列文章发布计划',
      scenarioType: 'content_creation',
      goalType: 'inform',
      preparedness: '已确认主题方向',
      timeConstraint: '本月内',
      resourceConstraint: '内容与运营协作',
      priority: 'high',
      successCriteria: '三篇文章按计划发布并形成统一栏目',
      currentStage: 'executing',
      isCollaborative: true,
      sceneTags: '内容,文章,发布',
    },
    {
      id: 'real-goal-content-video',
      workspaceId: 'real-workspace-content',
      creatorId: 'real-user-ops',
      topic: '制作一支短视频脚本并完成素材清单。',
      title: '短视频脚本制作',
      scenarioType: 'content_creation',
      goalType: 'persuade',
      preparedness: '刚开始',
      timeConstraint: '一周内',
      resourceConstraint: '运营主导，视觉支持',
      priority: 'medium',
      successCriteria: '脚本可直接进入拍摄排期',
      currentStage: 'planning',
      isCollaborative: true,
      sceneTags: '短视频,脚本',
    },
  ];

  const competitionReleasePlanV1 = createPlanContent({
    summary: '围绕比赛目标拆分为功能收口、演示打磨和提交准备三个阶段推进。',
    phases: [
      {
        id: 'phase-competition-v1-scope',
        name: '功能收口',
        description: '确认主链路稳定并修复阻断问题。',
        order: 1,
        tasks: [
          {
            id: 'task-competition-plan-scope',
            title: '确认主链路页面清单',
            description: '梳理需要重点走查的页面与接口。',
            priority: 'high',
            estimatedHours: 2,
          },
          {
            id: 'task-competition-plan-bugs',
            title: '修复提交前阻断问题',
            description: '优先解决登录、目标、规划、执行链路问题。',
            priority: 'high',
            estimatedHours: 6,
          },
        ],
      },
      {
        id: 'phase-competition-v1-demo',
        name: '演示打磨',
        description: '整理演示脚本与核心亮点展示。',
        order: 2,
        tasks: [
          {
            id: 'task-competition-plan-demo',
            title: '整理 5 分钟演示顺序',
            description: '形成首页到导出分享的演示节奏。',
            priority: 'medium',
            estimatedHours: 3,
          },
        ],
      },
      {
        id: 'phase-competition-v1-submit',
        name: '提交准备',
        description: '确认材料齐全并完成平台提交流程。',
        order: 3,
        tasks: [
          {
            id: 'task-competition-plan-submit',
            title: '检查提交材料',
            description: '确认截图、说明、链接与视频都齐全。',
            priority: 'medium',
            estimatedHours: 2,
          },
        ],
      },
    ],
    risks: [
      {
        id: 'risk-competition-v1-time',
        description: '提交前新增问题打乱演示节奏。',
        impact: 'high',
        mitigation: '先保主链路，非关键项后置。',
      },
    ],
    milestones: [
      {
        id: 'milestone-competition-v1-demo',
        name: '完成首版演示',
        description: '主链路可完整串讲。',
        targetDate: '2026-06-23',
      },
    ],
    nextActions: ['梳理主链路页面清单', '确认当前阻断问题'],
    assumptions: ['比赛截止时间不会再变更', '现有技术方案保持不变'],
  });

  const competitionReleasePlanV2 = createPlanContent({
    summary: '比赛收口进入冲刺阶段，围绕问题修复、真实数据、演示材料和最终提交四段推进。',
    phases: [
      {
        id: 'phase-competition-v2-fix',
        name: '问题收敛',
        description: '修复影响主链路演示的高优先级问题。',
        order: 1,
        tasks: [
          {
            id: 'task-competition-v2-login',
            title: '核对登录与工作区切换',
            description: '保证演示账号进入系统后链路稳定。',
            priority: 'high',
            estimatedHours: 2,
          },
          {
            id: 'task-competition-v2-seed',
            title: '补齐真实业务数据',
            description: '为比赛案例、分享案例和内容案例准备真实数据。',
            priority: 'high',
            estimatedHours: 4,
          },
        ],
      },
      {
        id: 'phase-competition-v2-demo',
        name: '演示打磨',
        description: '准备录屏、截图和答辩动线。',
        order: 2,
        tasks: [
          {
            id: 'task-competition-v2-script',
            title: '重写演示脚本',
            description: '突出从目标到导出的完整链路。',
            priority: 'high',
            estimatedHours: 3,
          },
          {
            id: 'task-competition-v2-visual',
            title: '补齐答辩视觉素材',
            description: '统一封面、截图和关键页面说明。',
            priority: 'medium',
            estimatedHours: 3,
          },
        ],
      },
      {
        id: 'phase-competition-v2-submit',
        name: '提交准备',
        description: '确认提报材料完整并执行最终提交。',
        order: 3,
        tasks: [
          {
            id: 'task-competition-v2-report',
            title: '整理问题修复报告',
            description: '记录问题、修复动作与回归结果。',
            priority: 'medium',
            estimatedHours: 2,
          },
          {
            id: 'task-competition-v2-submit',
            title: '执行最终提交流程',
            description: '核对平台要求并完成上传。',
            priority: 'high',
            estimatedHours: 1,
          },
        ],
      },
    ],
    risks: [
      {
        id: 'risk-competition-v2-late-bug',
        description: '真实数据引入后暴露新的页面渲染问题。',
        impact: 'high',
        mitigation: '先做接口核验，再做页面走查，分层排查。',
      },
      {
        id: 'risk-competition-v2-video',
        description: '录屏素材不统一导致演示观感下降。',
        impact: 'medium',
        mitigation: '统一截图点位与脚本顺序后再录制。',
      },
    ],
    milestones: [
      {
        id: 'milestone-competition-v2-check',
        name: '完成真实数据核验',
        description: '主链路与侧链路都能用真实数据打开。',
        targetDate: '2026-06-24',
      },
      {
        id: 'milestone-competition-v2-submit',
        name: '完成最终提交',
        description: '所有提报材料齐备并已上传。',
        targetDate: '2026-06-26',
      },
    ],
    nextActions: ['运行真实数据写入脚本', '核对规划页与执行页是否稳定'],
    assumptions: ['mock AI 回退可支撑本轮演示', '不新增超出比赛范围的大功能'],
  });

  const sharingPlan = createPlanContent({
    summary: '围绕新人培训分享安排素材准备、演示案例、彩排和复盘四个阶段。',
    phases: [
      {
        id: 'phase-sharing-outline',
        name: '议程设计',
        description: '确定新人最需要理解的主链路。',
        order: 1,
        tasks: [
          {
            id: 'task-sharing-outline',
            title: '确定分享结构',
            description: '覆盖目标、规划、执行、导出四段。',
            priority: 'high',
          },
        ],
      },
      {
        id: 'phase-sharing-material',
        name: '素材准备',
        description: '整理截图、案例与演示数据。',
        order: 2,
        tasks: [
          {
            id: 'task-sharing-material',
            title: '准备演示案例',
            description: '使用真实工作区与目标展示完整流程。',
            priority: 'high',
          },
        ],
      },
      {
        id: 'phase-sharing-rehearsal',
        name: '彩排确认',
        description: '确认时间控制和提问环节。',
        order: 3,
        tasks: [
          {
            id: 'task-sharing-rehearsal',
            title: '完成彩排',
            description: '把控时长并补充问答卡片。',
            priority: 'medium',
          },
        ],
      },
    ],
    risks: [
      {
        id: 'risk-sharing-time',
        description: '培训内容过多导致时长失控。',
        impact: 'medium',
        mitigation: '拆分必讲和选讲部分。',
      },
    ],
    milestones: [
      {
        id: 'milestone-sharing-demo',
        name: '完成培训彩排',
        description: '能够稳定讲完一遍。',
        targetDate: '2026-06-25',
      },
    ],
    nextActions: ['确认培训案例顺序', '补齐彩排备注'],
    assumptions: ['培训设备可正常投屏'],
  });

  const contentPlan = createPlanContent({
    summary: '内容发布链路围绕选题、撰写、审校和发布节奏分阶段推进。',
    phases: [
      {
        id: 'phase-content-research',
        name: '选题调研',
        description: '确认系列文章选题与差异化角度。',
        order: 1,
        tasks: [
          {
            id: 'task-content-research',
            title: '确定三篇文章选题',
            description: '保证主题连续且不重复。',
            priority: 'high',
          },
        ],
      },
      {
        id: 'phase-content-writing',
        name: '内容撰写',
        description: '完成大纲、初稿与审校。',
        order: 2,
        tasks: [
          {
            id: 'task-content-outline',
            title: '输出系列文章大纲',
            description: '统一栏目结构与章节层次。',
            priority: 'high',
          },
          {
            id: 'task-content-draft',
            title: '完成首篇文章初稿',
            description: '形成可审校版本。',
            priority: 'medium',
          },
        ],
      },
      {
        id: 'phase-content-release',
        name: '发布节奏',
        description: '安排排期、封面与渠道。',
        order: 3,
        tasks: [
          {
            id: 'task-content-release',
            title: '确认发布时间表',
            description: '安排每篇文章的发布时间和渠道。',
            priority: 'medium',
          },
        ],
      },
    ],
    risks: [
      {
        id: 'risk-content-delay',
        description: '审校反馈滞后影响发布节奏。',
        impact: 'medium',
        mitigation: '先锁定结构，再并行准备封面与渠道文案。',
      },
    ],
    milestones: [
      {
        id: 'milestone-content-outline',
        name: '完成系列大纲',
        description: '内容框架稳定。',
        targetDate: '2026-06-24',
      },
    ],
    nextActions: ['确认选题优先级', '输出系列文章大纲'],
    assumptions: ['渠道排期本周可确认'],
  });

  const plans: SeedPlan[] = [
    {
      id: 'real-plan-competition-release-v1',
      goalId: 'real-goal-competition-release',
      version: 1,
      isActive: false,
      source: 'rule_engine',
      changeReason: '首次规划',
      content: competitionReleasePlanV1,
    },
    {
      id: 'real-plan-competition-release-v2',
      goalId: 'real-goal-competition-release',
      version: 2,
      isActive: true,
      source: 'hybrid',
      changeReason: '补入真实业务数据并聚焦主链路演示',
      aiPromptLog: JSON.stringify({ provider: 'mock', promptName: 'plan.replan' }),
      content: competitionReleasePlanV2,
    },
    {
      id: 'real-plan-sharing-onboarding-v1',
      goalId: 'real-goal-sharing-onboarding',
      version: 1,
      isActive: true,
      source: 'rule_engine',
      changeReason: '首次规划',
      content: sharingPlan,
    },
    {
      id: 'real-plan-content-series-v1',
      goalId: 'real-goal-content-series',
      version: 1,
      isActive: true,
      source: 'rule_engine',
      changeReason: '首次规划',
      content: contentPlan,
    },
  ];

  const tasks: SeedTask[] = [
    {
      id: 'real-task-competition-check-login',
      goalId: 'real-goal-competition-release',
      stageId: 'phase-competition-v2-fix',
      stageName: '问题收敛',
      title: '核对登录与工作区切换',
      description: '确认演示账号与工作区上下文都可正常加载。',
      status: 'completed',
      sortOrder: 100,
      dueDate: dateAt(1),
      completedAt: dateAt(0, 14),
      creatorId: 'real-user-lead',
    },
    {
      id: 'real-task-competition-seed',
      goalId: 'real-goal-competition-release',
      stageId: 'phase-competition-v2-fix',
      stageName: '问题收敛',
      title: '补齐真实业务数据',
      description: '为比赛、分享、内容三类场景准备可演示数据。',
      status: 'in_progress',
      sortOrder: 101,
      dueDate: dateAt(1, 6),
      assigneeId: 'real-user-content',
      creatorId: 'real-user-lead',
    },
    {
      id: 'real-task-competition-script',
      goalId: 'real-goal-competition-release',
      stageId: 'phase-competition-v2-demo',
      stageName: '演示打磨',
      title: '重写演示脚本',
      description: '突出主链路与真实数据的可视化展示。',
      status: 'pending',
      sortOrder: 200,
      dueDate: dateAt(2),
      creatorId: 'real-user-product',
    },
    {
      id: 'real-task-competition-visual',
      goalId: 'real-goal-competition-release',
      stageId: 'phase-competition-v2-demo',
      stageName: '演示打磨',
      title: '补齐答辩视觉素材',
      description: '统一封面、截图和亮点说明。',
      status: 'blocked',
      sortOrder: 201,
      dueDate: dateAt(2, 2),
      blockerNote: '等待最终页面截图完成后统一排版。',
      assigneeId: 'real-user-design',
      creatorId: 'real-user-product',
    },
    {
      id: 'real-task-competition-stretch',
      goalId: 'real-goal-competition-release',
      stageId: 'phase-competition-v2-demo',
      stageName: '演示打磨',
      title: '尝试补充备用演示动画',
      description: '如时间允许再补充额外视觉动效。',
      status: 'skipped',
      sortOrder: 202,
      creatorId: 'real-user-design',
    },
    {
      id: 'real-task-competition-old-video',
      goalId: 'real-goal-competition-release',
      stageId: 'phase-competition-v2-submit',
      stageName: '提交准备',
      title: '沿用旧版录屏方案',
      description: '旧录屏方案已不符合当前产品链路。',
      status: 'cancelled',
      sortOrder: 300,
      creatorId: 'real-user-lead',
    },
    {
      id: 'real-task-sharing-outline',
      goalId: 'real-goal-sharing-onboarding',
      stageId: 'phase-sharing-outline',
      stageName: '议程设计',
      title: '确定分享结构',
      description: '覆盖从目标到导出的完整流程。',
      status: 'completed',
      sortOrder: 100,
      completedAt: dateAt(-1, 11),
      creatorId: 'real-user-product',
    },
    {
      id: 'real-task-sharing-material',
      goalId: 'real-goal-sharing-onboarding',
      stageId: 'phase-sharing-material',
      stageName: '素材准备',
      title: '准备演示案例',
      description: '补齐案例与截图点位。',
      status: 'in_progress',
      sortOrder: 200,
      assigneeId: 'real-user-content',
      creatorId: 'real-user-product',
    },
    {
      id: 'real-task-sharing-rehearsal',
      goalId: 'real-goal-sharing-onboarding',
      stageId: 'phase-sharing-rehearsal',
      stageName: '彩排确认',
      title: '完成彩排',
      description: '确认时长与问答环节。',
      status: 'pending',
      sortOrder: 300,
      dueDate: dateAt(4),
      creatorId: 'real-user-product',
    },
    {
      id: 'real-task-content-outline',
      goalId: 'real-goal-content-series',
      stageId: 'phase-content-writing',
      stageName: '内容撰写',
      title: '输出系列文章大纲',
      description: '统一栏目结构与每篇文章角度。',
      status: 'in_progress',
      sortOrder: 200,
      assigneeId: 'real-user-content',
      creatorId: 'real-user-content',
    },
    {
      id: 'real-task-content-draft',
      goalId: 'real-goal-content-series',
      stageId: 'phase-content-writing',
      stageName: '内容撰写',
      title: '完成首篇文章初稿',
      description: '产出可进入审校的内容版本。',
      status: 'completed',
      sortOrder: 201,
      completedAt: dateAt(-1, 16),
      creatorId: 'real-user-content',
    },
  ];

  const taskStatusHistories: SeedTaskStatusHistory[] = [
    {
      id: 'real-history-competition-login-create',
      taskId: 'real-task-competition-check-login',
      toStatus: 'pending',
      note: '任务已创建',
      operatorId: 'real-user-lead',
      createdAt: dateAt(-2, 10),
    },
    {
      id: 'real-history-competition-login-start',
      taskId: 'real-task-competition-check-login',
      fromStatus: 'pending',
      toStatus: 'in_progress',
      note: '开始核对登录链路',
      operatorId: 'real-user-lead',
      createdAt: dateAt(-1, 9),
    },
    {
      id: 'real-history-competition-login-done',
      taskId: 'real-task-competition-check-login',
      fromStatus: 'in_progress',
      toStatus: 'completed',
      note: '登录、工作区切换与首页加载都已确认',
      operatorId: 'real-user-lead',
      createdAt: dateAt(0, 14),
    },
    {
      id: 'real-history-competition-seed-start',
      taskId: 'real-task-competition-seed',
      fromStatus: 'pending',
      toStatus: 'in_progress',
      note: '开始准备真实业务数据',
      operatorId: 'real-user-content',
      createdAt: dateAt(0, 10),
    },
    {
      id: 'real-history-competition-visual-blocked',
      taskId: 'real-task-competition-visual',
      fromStatus: 'pending',
      toStatus: 'blocked',
      note: '截图尚未定版，先阻塞处理',
      blockerNote: '等待最终页面截图完成后统一排版。',
      operatorId: 'real-user-design',
      createdAt: dateAt(0, 11),
    },
  ];

  const comments: SeedComment[] = [
    {
      id: 'real-comment-competition-1',
      goalId: 'real-goal-competition-release',
      userId: 'real-user-product',
      content: '建议把真实数据场景先补齐，再统一跑一轮功能核验。@内容协作者',
      anchorType: 'goal',
      anchorId: 'real-goal-competition-release',
      mentions: 'real-user-content',
    },
    {
      id: 'real-comment-competition-2',
      goalId: 'real-goal-competition-release',
      userId: 'real-user-content',
      content: '收到，我先补比赛、分享和内容三个工作区的数据。',
      parentId: 'real-comment-competition-1',
      anchorType: 'goal',
      anchorId: 'real-goal-competition-release',
      type: 'annotation',
      resolvedAt: dateAt(0, 15),
      resolvedById: 'real-user-product',
    },
    {
      id: 'real-comment-sharing-1',
      goalId: 'real-goal-sharing-onboarding',
      userId: 'real-user-lead',
      content: '培训环节建议加入导出分享页的演示，这样新人更容易理解完整闭环。',
      anchorType: 'plan',
      anchorId: 'real-plan-sharing-onboarding-v1',
    },
  ];

  const assignments: SeedAssignment[] = [
    {
      id: 'real-assignment-competition-seed',
      taskId: 'real-task-competition-seed',
      assigneeId: 'real-user-content',
      assignedById: 'real-user-lead',
      note: '优先保证三类真实场景都可跑通。',
      createdAt: dateAt(0, 10),
    },
    {
      id: 'real-assignment-competition-visual',
      taskId: 'real-task-competition-visual',
      assigneeId: 'real-user-design',
      assignedById: 'real-user-product',
      note: '等待页面截图定稿后再统一排版。',
      createdAt: dateAt(0, 11),
    },
    {
      id: 'real-assignment-sharing-material',
      taskId: 'real-task-sharing-material',
      assigneeId: 'real-user-content',
      assignedById: 'real-user-product',
      note: '把知识资产库里的案例带入培训分享。',
      createdAt: dateAt(0, 9),
    },
  ];

  const activityEvents: SeedActivityEvent[] = [
    {
      id: 'real-activity-plan-replanned',
      goalId: 'real-goal-competition-release',
      type: 'plan_replanned',
      actorId: 'real-user-lead',
      targetType: 'plan',
      targetId: 'real-plan-competition-release-v2',
      targetTitle: '比赛项目收口与提交',
      detail: '补入真实业务数据并聚焦主链路演示',
      createdAt: dateAt(0, 8),
    },
    {
      id: 'real-activity-task-blocked',
      goalId: 'real-goal-competition-release',
      type: 'task_status_changed',
      actorId: 'real-user-design',
      targetType: 'task',
      targetId: 'real-task-competition-visual',
      targetTitle: '补齐答辩视觉素材',
      detail: 'pending -> blocked',
      createdAt: dateAt(0, 11),
    },
    {
      id: 'real-activity-comment-created',
      goalId: 'real-goal-sharing-onboarding',
      type: 'comment_created',
      actorId: 'real-user-lead',
      targetType: 'comment',
      targetId: 'real-comment-sharing-1',
      targetTitle: '培训环节建议',
      detail: '建议补充导出分享页演示',
      createdAt: dateAt(0, 12),
    },
  ];

  const templates: SeedTemplate[] = [
    {
      id: 'real-template-competition-demo',
      workspaceId: 'real-workspace-competition',
      name: '比赛演示冲刺模板',
      description: '围绕比赛收口、演示、提交的团队模板。',
      category: 'team',
      scenarioType: 'competition',
      content: JSON.stringify({
        title: '比赛项目收口与提交',
        topic: '完成作品收口、演示打磨和提交准备。',
        timeConstraint: '本周内完成提交',
        resourceConstraint: '4 人协作，主链路优先',
        successCriteria: '可稳定演示并按时提交',
        planHints: ['先补真实数据', '再做功能核验', '最后整理提交材料'],
        checklist: ['确认工作区成员分工', '确认关键页面截图', '确认提报链接与素材'],
      }),
      usageCount: 4,
      createdBy: 'real-user-lead',
    },
    {
      id: 'real-template-sharing-onboarding',
      workspaceId: 'real-workspace-sharing',
      name: '新人培训分享模板',
      description: '适用于产品上手培训的团队模板。',
      category: 'team',
      scenarioType: 'sharing_prep',
      content: JSON.stringify({
        title: '新人培训分享',
        topic: '帮助新人理解 AI 任务管家从目标到导出的完整链路。',
        audience: '新同事',
        duration: 45,
        timeConstraint: '5 天内',
        successCriteria: '新人能独立完成完整主链路',
        planHints: ['先讲业务场景', '再演示目标创建', '最后展示导出与分享'],
        checklist: ['准备真实案例', '确认彩排时间', '准备答疑问题'],
      }),
      usageCount: 2,
      createdBy: 'real-user-product',
    },
    {
      id: 'real-template-content-series',
      workspaceId: 'real-workspace-content',
      name: '系列文章发布模板',
      description: '适用于连续内容发布的标准模板。',
      category: 'team',
      scenarioType: 'content_creation',
      content: JSON.stringify({
        title: '系列文章发布计划',
        topic: '围绕一个主题连续发布三篇文章。',
        timeConstraint: '本月内',
        resourceConstraint: '内容与运营协作',
        successCriteria: '三篇文章按节奏发布',
        planHints: ['先做选题矩阵', '再做大纲和初稿', '最后统一排期发布'],
        checklist: ['确认栏目定位', '确认封面规范', '确认渠道节奏'],
      }),
      usageCount: 3,
      createdBy: 'real-user-content',
    },
  ];

  const assets: SeedAsset[] = [
    {
      id: 'real-asset-sharing-checklist',
      workspaceId: 'real-workspace-sharing',
      title: '培训分享准备检查清单',
      type: 'checklist',
      content: '- 确认案例顺序\n- 确认投屏设备\n- 准备答疑卡片\n- 预留 5 分钟互动',
      tags: '培训,分享,检查清单',
      sourceGoalId: 'real-goal-sharing-onboarding',
      creatorId: 'real-user-product',
    },
    {
      id: 'real-asset-competition-case',
      workspaceId: 'real-workspace-competition',
      title: '比赛冲刺案例复盘',
      type: 'case',
      content: '通过补齐真实数据和分层核验，可以快速暴露页面与接口的联动问题。',
      tags: '比赛,复盘,案例',
      sourceGoalId: 'real-goal-competition-release',
      creatorId: 'real-user-lead',
    },
    {
      id: 'real-asset-content-insight',
      workspaceId: 'real-workspace-content',
      title: '系列内容发布节奏洞察',
      type: 'insight',
      content: '先锁定系列大纲，再并行推进初稿与发布时间表，能显著减少返工。',
      tags: '内容,洞察,发布',
      sourceGoalId: 'real-goal-content-series',
      creatorId: 'real-user-content',
    },
  ];

  const exports: SeedExport[] = [
    {
      id: 'real-export-competition-release',
      goalId: 'real-goal-competition-release',
      type: 'presentation_outline',
      format: 'markdown',
      title: '比赛项目收口演示提纲',
      content:
        '# 比赛项目收口演示提纲\n\n## 开场\n- 介绍问题背景\n\n## 主链路\n- 目标创建\n- 规划生成\n- 执行推进\n- 导出分享\n\n## 收尾\n- 总结亮点与提交状态\n',
      shareToken: 'share-real-competition-release',
      shareExpiresAt: dateAt(7),
      allowDownload: true,
      status: 'succeeded',
      creatorId: 'real-user-lead',
    },
    {
      id: 'real-export-sharing-plan',
      goalId: 'real-goal-sharing-onboarding',
      type: 'phase_plan',
      format: 'markdown',
      title: '新人培训分享阶段计划',
      content:
        '# 新人培训分享阶段计划\n\n- 议程设计\n- 素材准备\n- 彩排确认\n- 分享复盘\n',
      allowDownload: true,
      status: 'succeeded',
      creatorId: 'real-user-product',
    },
    {
      id: 'real-export-content-review',
      goalId: 'real-goal-content-series',
      type: 'review_summary',
      format: 'markdown',
      title: '系列文章发布复盘摘要',
      content:
        '# 系列文章发布复盘摘要\n\n- 选题确定较快\n- 初稿质量稳定\n- 审校节奏仍需前置\n',
      allowDownload: false,
      status: 'succeeded',
      creatorId: 'real-user-content',
    },
  ];

  const notifications: SeedNotification[] = [
    {
      id: 'real-notification-competition-blocked',
      userId: 'real-user-product',
      workspaceId: 'real-workspace-competition',
      type: 'task_blocked',
      title: '任务已受阻',
      content: '补齐答辩视觉素材已受阻，等待页面截图定稿。',
      targetType: 'task',
      targetId: 'real-task-competition-visual',
    },
    {
      id: 'real-notification-competition-mention',
      userId: 'real-user-content',
      workspaceId: 'real-workspace-competition',
      type: 'comment_mention',
      title: '你被提及了',
      content: '请优先补齐比赛、分享和内容三个真实场景的数据。',
      targetType: 'comment',
      targetId: 'real-comment-competition-1',
    },
    {
      id: 'real-notification-competition-replan',
      userId: 'real-user-design',
      workspaceId: 'real-workspace-competition',
      type: 'plan_replanned',
      title: '规划已更新',
      content: '比赛项目收口与提交已切换到新版本规划。',
      targetType: 'plan',
      targetId: 'real-plan-competition-release-v2',
    },
    {
      id: 'real-notification-sharing-assigned',
      userId: 'real-user-content',
      workspaceId: 'real-workspace-sharing',
      type: 'task_assigned',
      title: '你有新的任务指派',
      content: '请准备新人培训分享的演示案例。',
      targetType: 'task',
      targetId: 'real-task-sharing-material',
      readAt: dateAt(0, 13),
    },
    {
      id: 'real-notification-content-progress',
      userId: 'real-user-ops',
      workspaceId: 'real-workspace-content',
      type: 'task_status_changed',
      title: '内容任务有新进展',
      content: '首篇文章初稿已经完成，可以进入审校。',
      targetType: 'task',
      targetId: 'real-task-content-draft',
    },
  ];

  return {
    users,
    workspaces,
    workspaceMembers,
    goals,
    plans,
    tasks,
    taskStatusHistories,
    comments,
    assignments,
    activityEvents,
    templates,
    assets,
    exports,
    notifications,
  };
}
