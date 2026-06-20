"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, tokenStorage, setAuthErrorHandler, ApiError } from "./api";

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  defaultWorkspaceId: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const refreshUser = useCallback(async () => {
    const token = tokenStorage.getAccess();
    if (!token) {
      setState({ user: null, loading: false, error: null });
      return;
    }
    try {
      const user = await api.get<AuthUser>("/auth/me");
      setState({ user, loading: false, error: null });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        tokenStorage.clear();
      }
      setState({ user: null, loading: false, error: null });
    }
  }, []);

  useEffect(() => {
    setAuthErrorHandler(() => {
      setState({ user: null, loading: false, error: null });
    });
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<AuthUser & AuthTokens>("/auth/login", {
      email,
      password,
    });
    tokenStorage.setAccess(result.accessToken);
    tokenStorage.setRefresh(result.refreshToken);
    setState({
      user: {
        id: result.id,
        email: result.email,
        displayName: result.displayName,
        avatarUrl: result.avatarUrl,
        defaultWorkspaceId: result.defaultWorkspaceId,
      },
      loading: false,
      error: null,
    });
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const result = await api.post<AuthUser & AuthTokens>("/auth/register", {
        email,
        password,
        displayName,
      });
      tokenStorage.setAccess(result.accessToken);
      tokenStorage.setRefresh(result.refreshToken);
      setState({
        user: {
          id: result.id,
          email: result.email,
          displayName: result.displayName,
          avatarUrl: result.avatarUrl,
          defaultWorkspaceId: result.defaultWorkspaceId,
        },
        loading: false,
        error: null,
      });
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // 忽略登出请求失败
    }
    tokenStorage.clear();
    setState({ user: null, loading: false, error: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
