/**
 * 登录页测试
 * 验证表单渲染、输入交互、提交流程、错误展示
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock @/lib/auth
const mockLogin = vi.fn();
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    error: null,
    login: mockLogin,
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

// Mock @/lib/api（提供 ApiError 类）
vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    code: string;
    status: number;
    details?: unknown;
    constructor(code: string, message: string, status: number, details?: unknown) {
      super(message);
      this.code = code;
      this.status = status;
      this.details = details;
    }
  },
}));

describe("LoginPage", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockLogin.mockReset();
  });

  it("渲染登录表单（标题、邮箱、密码、提交按钮、注册链接）", () => {
    render(<LoginPage />);

    expect(screen.getByText("欢迎回来")).toBeInTheDocument();
    expect(screen.getByText("登录你的 AI 任务管家账号")).toBeInTheDocument();
    expect(screen.getByLabelText("邮箱")).toBeInTheDocument();
    expect(screen.getByLabelText("密码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
    expect(screen.getByText("注册")).toHaveAttribute("href", "/register");
  });

  it("输入邮箱和密码并提交，调用 login 函数", async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    render(<LoginPage />);

    const emailInput = screen.getByLabelText("邮箱");
    const passwordInput = screen.getByLabelText("密码");
    const submitButton = screen.getByRole("button", { name: "登录" });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("test@example.com", "password123");
    });
  });

  it("登录成功后跳转到 /app", async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/app");
    });
  });

  it("提交中按钮显示“登录中...”并禁用", async () => {
    // 让 login 处于 pending 状态
    mockLogin.mockReturnValueOnce(new Promise(() => {}));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent("登录中...");
    });
  });

  it("登录失败（ApiError）时显示错误消息", async () => {
    const { ApiError } = await import("@/lib/api");
    mockLogin.mockRejectedValueOnce(
      new ApiError("AUTH_INVALID_CREDENTIALS", "邮箱或密码错误", 401),
    );

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "wrong@example.com" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(screen.getByText("邮箱或密码错误")).toBeInTheDocument();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("登录失败（非 ApiError）时显示默认错误消息", async () => {
    mockLogin.mockRejectedValueOnce(new Error("Network error"));

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(screen.getByText("登录失败，请稍后重试")).toBeInTheDocument();
    });
  });

  it("登录失败后按钮恢复可用状态", async () => {
    const { ApiError } = await import("@/lib/api");
    mockLogin.mockRejectedValueOnce(
      new ApiError("AUTH_INVALID_CREDENTIALS", "错误", 401),
    );

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(screen.getByText("错误")).toBeInTheDocument();
    });

    const button = screen.getByRole("button");
    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent("登录");
  });
});
