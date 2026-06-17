import { describe, expect, test } from "vitest";
import { createPlanFromGoal } from "./planner";

describe("createPlanFromGoal", () => {
  test("为分享会目标生成 4 个阶段与最终行动清单", () => {
    const result = createPlanFromGoal("我要准备一场小型分享会，但我不知道该怎么安排。");

    expect(result.title).toBe("分享会筹备方案");
    expect(result.stages).toHaveLength(4);
    expect(result.stages[0].title).toBe("目标与主题确认");
    expect(result.checklist.length).toBeGreaterThanOrEqual(5);
    expect(result.insights.highlights.length).toBeGreaterThanOrEqual(2);
    expect(result.insights.risks.length).toBeGreaterThanOrEqual(2);
  });

  test("会根据输入关键词调整摘要文案", () => {
    const result = createPlanFromGoal("我要做一个面向产品团队的 AI 工具分享。");

    expect(result.summary).toContain("产品团队");
    expect(result.goalEcho).toContain("AI 工具分享");
  });
});
