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
    expect(screen.getByText("输入分享目标后，这里会出现完整的筹备路径")).toBeTruthy();
  });
});
