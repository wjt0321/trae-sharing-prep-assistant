import { afterEach, describe, expect, test, vi } from "vitest";
import { createPlan, createPlanFromGoal } from "./planner";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createPlanFromGoal（兼容入口）", () => {
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

describe("createPlan（结构化输入）", () => {
  test("默认输入生成稳定结果", () => {
    const result = createPlan();

    expect(result.title).toBe("分享会筹备方案");
    expect(result.stages).toHaveLength(4);
    expect(result.structureSuggestion).toBeDefined();
    expect(result.structureSuggestion.text).toBeTruthy();
    expect(result.structureSuggestion.timeAllocation).toBeTruthy();
    expect(result.checklist.length).toBeGreaterThanOrEqual(6);
  });

  test("空字段输入不报错且生成稳定结果", () => {
    const result = createPlan({});

    expect(result.title).toBe("分享会筹备方案");
    expect(result.stages).toHaveLength(4);
    expect(result.audience).toBeTruthy();
    expect(result.summary).toBeTruthy();
  });

  test("不同听众对象产出不同的阶段描述", () => {
    const productTeam = createPlan({
      topic: "AI 工具分享",
      audience: "产品团队",
      duration: "30分钟",
      goal: "传递信息",
      preparedness: "还没开始"
    });

    const student = createPlan({
      topic: "AI 工具分享",
      audience: "学生",
      duration: "30分钟",
      goal: "传递信息",
      preparedness: "还没开始"
    });

    expect(productTeam.summary).toContain("产品团队");
    expect(student.summary).toContain("学生");
    expect(productTeam.stages[0].description).not.toBe(student.stages[0].description);
  });

  test("不同时长产出不同的结构建议", () => {
    const shortSharing = createPlan({
      topic: "快速分享",
      audience: "同事",
      duration: "10分钟",
      goal: "传递信息",
      preparedness: "还没开始"
    });

    const longSharing = createPlan({
      topic: "深度分享",
      audience: "同事",
      duration: "60分钟",
      goal: "传递信息",
      preparedness: "还没开始"
    });

    expect(shortSharing.structureSuggestion.text).not.toBe(longSharing.structureSuggestion.text);
    expect(shortSharing.structureSuggestion.timeAllocation).not.toBe(
      longSharing.structureSuggestion.timeAllocation
    );
  });

  test("不同目标产出不同的清单优先项", () => {
    const inform = createPlan({
      topic: "信息分享",
      audience: "同事",
      duration: "30分钟",
      goal: "传递信息",
      preparedness: "还没开始"
    });

    const review = createPlan({
      topic: "复盘分享",
      audience: "同事",
      duration: "30分钟",
      goal: "复盘总结",
      preparedness: "还没开始"
    });

    expect(inform.checklist[0]).not.toBe(review.checklist[0]);
  });

  test("不同准备状态调整建议起点", () => {
    const notStarted = createPlan({
      topic: "分享",
      audience: "同事",
      duration: "30分钟",
      goal: "传递信息",
      preparedness: "还没开始"
    });

    const hasDraft = createPlan({
      topic: "分享",
      audience: "同事",
      duration: "30分钟",
      goal: "传递信息",
      preparedness: "已有初稿"
    });

    const notStartedCurrent = notStarted.stages.find((s) => s.status === "current");
    const hasDraftCurrent = hasDraft.stages.find((s) => s.status === "current");

    expect(notStartedCurrent.title).toBe("目标与主题确认");
    expect(hasDraftCurrent.title).toBe("预演与收尾检查");
  });

  test("阶段卡片包含目标与完成标准", () => {
    const result = createPlan();

    result.stages.forEach((stage) => {
      expect(stage.goal).toBeTruthy();
      expect(stage.criteria).toBeTruthy();
    });
  });

  test("日期字段影响节奏建议", () => {
    const today = new Date();
    const soon = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000);
    const soonStr = soon.toISOString().split("T")[0];

    const far = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const farStr = far.toISOString().split("T")[0];

    const soonResult = createPlan({
      topic: "分享",
      audience: "同事",
      duration: "30分钟",
      date: soonStr,
      goal: "传递信息",
      preparedness: "还没开始"
    });

    const farResult = createPlan({
      topic: "分享",
      audience: "同事",
      duration: "30分钟",
      date: farStr,
      goal: "传递信息",
      preparedness: "还没开始"
    });

    expect(soonResult.rhythmAdvice).toContain("压缩节奏");
    expect(farResult.rhythmAdvice).toContain("多轮预演");
  });

  test("负时区语义下当天日期不会被误判为已过期", () => {
    const RealDate = Date;

    class MockDate extends RealDate {
      constructor(...args) {
        if (args.length === 0) {
          super("2026-06-18T12:00:00");
          return;
        }

        if (args.length === 1 && args[0] === "2026-06-18") {
          super("2026-06-17T17:00:00");
          return;
        }

        super(...args);
      }

      static now() {
        return new RealDate("2026-06-18T12:00:00").getTime();
      }
    }

    vi.stubGlobal("Date", MockDate);

    const result = createPlan({
      topic: "分享",
      audience: "同事",
      duration: "30分钟",
      date: "2026-06-18",
      goal: "传递信息",
      preparedness: "还没开始"
    });

    expect(result.rhythmAdvice).toContain("距分享仅剩 0 天");
  });
});
