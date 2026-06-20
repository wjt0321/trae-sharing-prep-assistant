"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api } from "./api";
import { useAuth } from "./auth";

export interface Workspace {
  id: string;
  name: string;
  type: string;
  description: string | null;
  currentRole: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceContextValue {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loading: boolean;
  switchWorkspace: (id: string) => void;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const STORAGE_KEY = "atm_current_workspace_id";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }
    try {
      const list = await api.get<Workspace[]>("/workspaces");
      setWorkspaces(list);

      // 选择当前工作区：localStorage > defaultWorkspaceId > 第一个
      const savedId =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY)
          : null;
      const target =
        list.find((w) => w.id === savedId) ??
        list.find((w) => w.id === user.defaultWorkspaceId) ??
        list[0] ??
        null;
      setCurrentId(target?.id ?? null);
      if (target) {
        localStorage.setItem(STORAGE_KEY, target.id);
      }
    } catch {
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void refreshWorkspaces();
    } else {
      setWorkspaces([]);
      setCurrentId(null);
      setLoading(false);
    }
  }, [user, refreshWorkspaces]);

  const switchWorkspace = useCallback((id: string) => {
    setCurrentId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  const currentWorkspace =
    workspaces.find((w) => w.id === currentId) ?? null;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        loading,
        switchWorkspace,
        refreshWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}
