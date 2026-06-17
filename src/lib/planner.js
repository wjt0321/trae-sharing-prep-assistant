import { basePlanTemplate, defaultGoal } from "../data/demoTemplates";

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

export function createPlanFromGoal(goal = defaultGoal) {
  const normalizedGoal = goal.trim() || defaultGoal;
  const audience = extractAudience(normalizedGoal);
  const topic = extractTopic(normalizedGoal);

  return {
    ...basePlanTemplate,
    goalEcho: normalizedGoal,
    summary: `系统已围绕${audience}的分享场景，拆出“定主题、备内容、控现场、做预演”四个连续阶段。`,
    stages: basePlanTemplate.stages.map((stage) => ({
      ...stage
    })),
    checklist: [...basePlanTemplate.checklist],
    insights: {
      highlights: [
        `先确认${audience}最想听到什么，再决定内容深度和案例。`,
        ...basePlanTemplate.insights.highlights.slice(1)
      ],
      risks: [...basePlanTemplate.insights.risks]
    },
    title: "分享会筹备方案",
    topic,
    audience
  };
}
