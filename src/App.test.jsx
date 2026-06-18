/* @vitest-environment jsdom */

import { act } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import App from "./App";

describe("App 交互回归", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test("加载期间禁用表单编辑，避免结果与当前输入不一致", () => {
    const { container } = render(<App />);

    const topicInput = screen.getByLabelText("你这次想准备什么样的分享？");
    const [audienceSelect] = container.querySelectorAll("select");
    const dateInput = container.querySelector('input[type="date"]');

    fireEvent.click(screen.getByRole("button", { name: "开始拆解" }));

    expect(topicInput).toHaveProperty("disabled", true);
    expect(audienceSelect).toHaveProperty("disabled", true);
    expect(dateInput).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "试试示例：一场小型分享会" })).toHaveProperty(
      "disabled",
      true
    );
  });

  test("idle 态展示压缩版示例成果卡和成品化比赛文案", () => {
    render(<App />);

    expect(screen.getByText("示例成果预览")).toBeTruthy();
    expect(screen.getByText("4 个准备阶段已生成")).toBeTruthy();
    expect(screen.getByText("建议从“目标与主题确认”开始推进")).toBeTruthy();
    expect(screen.getByText("行动清单与提醒已收口，可直接照着推进")).toBeTruthy();
    expect(screen.getByText("TRAE AI 创造力大赛 · 参赛作品")).toBeTruthy();
    expect(screen.getByText(/为分享准备生成结构化执行路径的单场景作品/)).toBeTruthy();
  });

  test("结果生成后再次修改输入，会清空旧结果回到预览态", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "开始拆解" }));

    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(screen.getByText("根据你的目标生成的分享筹备路径")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("你这次想准备什么样的分享？"), {
      target: {
        value: "我想准备一场新的分享"
      }
    });

    expect(screen.queryByText("根据你的目标生成的分享筹备路径")).toBeNull();
    expect(screen.getByText("输入后会得到一份可直接执行的筹备结果")).toBeTruthy();
  });
});
