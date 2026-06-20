"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/app");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "登录失败，请稍后重试",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center animate-rise">
          <h1 className="text-2xl font-semibold text-ink">欢迎回来</h1>
          <p className="mt-2 text-sm text-secondary">
            登录你的 AI 任务管家账号
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-sm animate-rise"
        >
          <Input
            label="邮箱"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="密码"
            type="password"
            name="password"
            placeholder="至少 6 位"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "登录中..." : "登录"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-tertiary">
          还没有账号？{" "}
          <Link
            href="/register"
            className="font-medium text-accent hover:text-accent-hover"
          >
            注册
          </Link>
        </p>
      </div>
    </main>
  );
}
