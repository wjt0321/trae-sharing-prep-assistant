/**
 * AuthGuard 组件测试
 * 验证加载态、未登录跳转、已登录渲染子组件
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthGuard } from "./AuthGuard";

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock @/lib/auth
const mockUseAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("AuthGuard", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockUseAuth.mockReset();
  });

  it("loading 为 true 时显示加载中提示", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      error: null,
    });

    render(
      <AuthGuard>
        <div>受保护内容</div>
      </AuthGuard>,
    );

    expect(screen.getByText("加载中...")).toBeInTheDocument();
    expect(screen.queryByText("受保护内容")).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("loading 为 false 且 user 为 null 时跳转到 /login", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      error: null,
    });

    const { container } = render(
      <AuthGuard>
        <div>受保护内容</div>
      </AuthGuard>,
    );

    expect(mockReplace).toHaveBeenCalledWith("/login");
    expect(mockReplace).toHaveBeenCalledTimes(1);
    // 未登录时不渲染子组件
    expect(container.innerHTML).toBe("");
  });

  it("loading 为 false 且 user 存在时渲染子组件", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        email: "test@example.com",
        displayName: "测试用户",
        avatarUrl: null,
        defaultWorkspaceId: "ws-1",
      },
      loading: false,
      error: null,
    });

    render(
      <AuthGuard>
        <div>受保护内容</div>
      </AuthGuard>,
    );

    expect(screen.getByText("受保护内容")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("user 存在但 loading 仍为 true 时显示加载中", () => {
    // 边界情况：user 已加载但 loading 标志未重置
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        email: "test@example.com",
        displayName: "测试用户",
        avatarUrl: null,
        defaultWorkspaceId: "ws-1",
      },
      loading: true,
      error: null,
    });

    render(
      <AuthGuard>
        <div>受保护内容</div>
      </AuthGuard>,
    );

    // loading 优先级高于 user
    expect(screen.getByText("加载中...")).toBeInTheDocument();
    expect(screen.queryByText("受保护内容")).not.toBeInTheDocument();
  });
});
