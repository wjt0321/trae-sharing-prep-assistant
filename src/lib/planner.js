import {
  audienceProfiles,
  basePlanTemplate,
  defaultGoal,
  defaultInput,
  durationProfiles,
  goalProfiles,
  preparednessProfiles,
  structureSuggestions
} from "../data/demoTemplates";

// ===== 兼容旧入口：从自然语言文本中提取听众与主题 =====

function extractAudience(goal) {
  if (goal.includes("产品团队")) {
    return "产品团队";
  }

  if (goal.includes("同事")) {
    return "同事";
  }

  if (goal.includes("学生")) {
    return "学生";
  }

  if (goal.includes("新人")) {
    return "新人";
  }

  return "现场听众";
}

function extractTopic(goal) {
  const topicMarkers = ["分享", "主题"];

  for (const marker of topicMarkers) {
    const markerIndex = goal.indexOf(marker);

    if (markerIndex !== -1) {
      const snippet = goal.slice(Math.max(0, markerIndex - 6), markerIndex + 6).trim();
      if (snippet) {
        return snippet.replace(/[，。！]/g, "");
      }
    }
  }

  return "这场分享";
}

// ===== 规则引擎：根据结构化输入生成动态结果 =====

function resolveAudience(audience) {
  return audienceProfiles[audience] || audienceProfiles["现场听众"];
}

function resolveDuration(duration) {
  return durationProfiles[duration] || durationProfiles["30分钟"];
}

function resolveGoal(goal) {
  return goalProfiles[goal] || goalProfiles["传递信息"];
}

function resolvePreparedness(preparedness) {
  return preparednessProfiles[preparedness] || preparednessProfiles["还没开始"];
}

function resolveStructureSuggestion(duration) {
  return structureSuggestions[duration] || structureSuggestions["30分钟"];
}

// 计算距分享日期的天数，返回 null 表示未填日期
function daysUntil(dateStr) {
  if (!dateStr) {
    return null;
  }

  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function buildRhythmAdvice(days) {
  if (days === null) {
    return "";
  }

  if (days < 0) {
    return "分享日期已过，建议尽快确认新的时间或直接进入预演收尾。";
  }

  if (days <= 2) {
    return `距分享仅剩 ${days} 天，压缩节奏，聚焦核心内容与设备检查。`;
  }

  if (days <= 14) {
    return `距分享还有 ${days} 天，按四阶段正常推进即可。`;
  }

  return `距分享还有 ${days} 天，时间充裕，可多轮预演打磨细节。`;
}

// 根据听众画像调整阶段任务描述
function applyAudienceToStages(stages, audienceProfile) {
  return stages.map((stage) => {
    const hint = audienceProfile.stageHints[stage.title];
    if (!hint) {
      return stage;
    }

    return {
      ...stage,
      description: `${stage.description}（${audienceProfile.focus}：${hint}）`
    };
  });
}

// 根据准备状态标记建议起点
function applyPreparednessToStages(stages, preparednessProfile) {
  const startIndex = preparednessProfile.startStage;
  return stages.map((stage, index) => {
    if (index < startIndex) {
      return {
        ...stage,
        status: "done",
        tag: `阶段 ${index + 1} · 已完成`
      };
    }

    if (index === startIndex) {
      return {
        ...stage,
        status: "current",
        tag: `阶段 ${index + 1} · 建议起点`
      };
    }

    return {
      ...stage,
      status: "pending",
      tag: `阶段 ${index + 1}`
    };
  });
}

// 根据目标调整清单优先级
function applyGoalToChecklist(baseChecklist, goalProfile) {
  const priorityItem = goalProfile.checklistPriority;
  return [priorityItem, ...baseChecklist];
}

// 根据听众与目标生成动态 insights
function buildInsights(audience, audienceProfile, goalProfile) {
  const highlights = [
    `面向${audience}，重点放在${audienceProfile.focus}，案例选${audienceProfile.caseStyle}。`,
    goalProfile.insight,
    basePlanTemplate.insights.highlights[1]
  ];

  const risks = [
    ...basePlanTemplate.insights.risks,
    audience === "学生" || audience === "新人"
      ? "入门类听众容易在术语上卡住，准备一份术语对照或操作清单。"
      : "专业听众容易追问细节，提前准备数据口径与备选答案。"
  ];

  return { highlights, risks };
}

// 根据时长调整阶段任务密度提示
function applyDurationToStages(stages, durationProfile) {
  if (!durationProfile.taskDensity) {
    return stages;
  }

  return stages.map((stage) => ({
    ...stage,
    description: `${stage.description}`
  }));
}

// ===== 主入口：结构化输入生成计划 =====

export function createPlan(input = defaultInput) {
  const normalizedInput = {
    ...defaultInput,
    ...input,
    topic: (input.topic || "").trim() || defaultInput.topic
  };

  const audience = normalizedInput.audience || "现场听众";
  const audienceProfile = resolveAudience(audience);
  const durationProfile = resolveDuration(normalizedInput.duration);
  const goalProfile = resolveGoal(normalizedInput.goal);
  const preparednessProfile = resolvePreparedness(normalizedInput.preparedness);
  const structureSuggestion = resolveStructureSuggestion(normalizedInput.duration);
  const days = daysUntil(normalizedInput.date);
  const rhythmAdvice = buildRhythmAdvice(days);

  // 1. 阶段：先应用听众画像，再应用准备状态标记
  let stages = basePlanTemplate.stages.map((stage) => ({ ...stage }));
  stages = applyAudienceToStages(stages, audienceProfile);
  stages = applyDurationToStages(stages, durationProfile);
  stages = applyPreparednessToStages(stages, preparednessProfile);

  // 2. 清单：根据目标前置优先项
  const checklist = applyGoalToChecklist(basePlanTemplate.checklist, goalProfile);

  // 3. insights：根据听众与目标动态生成
  const insights = buildInsights(audience, audienceProfile, goalProfile);

  // 4. summary：综合听众、时长、日期节奏
  const summaryParts = [
    `系统已围绕${audience}的分享场景，拆出"定主题、备内容、控现场、做预演"四个连续阶段。`,
    `内容侧重${audienceProfile.focus}，结构按${durationProfile.granularity}组织。`
  ];
  if (rhythmAdvice) {
    summaryParts.push(rhythmAdvice);
  }
  if (preparednessProfile.advice) {
    summaryParts.push(preparednessProfile.advice);
  }

  return {
    title: "分享会筹备方案",
    goalEcho: normalizedInput.topic,
    summary: summaryParts.join(""),
    stages,
    checklist,
    insights,
    structureSuggestion: {
      text: structureSuggestion,
      timeAllocation: durationProfile.timeAllocation,
      granularity: durationProfile.granularity
    },
    topic: extractTopic(normalizedInput.topic),
    audience,
    duration: normalizedInput.duration,
    goal: normalizedInput.goal,
    preparedness: normalizedInput.preparedness,
    rhythmAdvice
  };
}

// ===== 兼容入口：从自然语言文本生成计划 =====

export function createPlanFromGoal(goal = defaultGoal) {
  const normalizedGoal = goal.trim() || defaultGoal;
  const audience = extractAudience(normalizedGoal);
  const topic = extractTopic(normalizedGoal);

  return createPlan({
    topic: normalizedGoal,
    audience,
    duration: "30分钟",
    date: "",
    goal: "传递信息",
    preparedness: "还没开始"
  });
}
