"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type HealthState =
  | { kind: "loading" }
  | {
      kind: "success";
      status: string;
      service: string;
      database: string;
    }
  | { kind: "error"; message: string };

interface HealthResponse {
  success: boolean;
  data: {
    status: string;
    service: string;
    database: string;
  };
}

export function SystemStatusCard() {
  const [state, setState] = useState<HealthState>({ kind: "loading" });

  const fetchHealth = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/server/health");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as HealthResponse;
      if (!json.success || !json.data) {
        throw new Error("响应格式异常");
      }
      setState({
        kind: "success",
        status: json.data.status,
        service: json.data.service,
        database: json.data.database,
      });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "未知错误",
      });
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
  }, [fetchHealth]);

  return (
    <Card className="w-full max-w-md animate-rise">
      <CardHeader>
        <CardTitle>系统状态</CardTitle>
      </CardHeader>
      <CardContent>
        {state.kind === "loading" && (
          <p className="text-sm text-tertiary">检测中...</p>
        )}
        {state.kind === "success" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-success" />
              <span className="text-sm font-medium text-ink">后端已连接</span>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-tertiary">服务</dt>
              <dd className="text-secondary">{state.service}</dd>
              <dt className="text-tertiary">状态</dt>
              <dd className="text-secondary">{state.status}</dd>
              <dt className="text-tertiary">数据库</dt>
              <dd className="text-secondary">{state.database}</dd>
            </dl>
          </div>
        )}
        {state.kind === "error" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-danger" />
              <span className="text-sm font-medium text-ink">后端未连接</span>
            </div>
            <p className="text-sm text-tertiary">{state.message}</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="secondary" size="sm" onClick={() => void fetchHealth()}>
          重新检测
        </Button>
      </CardFooter>
    </Card>
  );
}
