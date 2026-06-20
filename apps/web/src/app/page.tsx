"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SystemStatusCard } from "@/components/SystemStatusCard";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/app");
    }
  }, [user, loading, router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-canvas px-6 py-16">
      <div className="flex w-full max-w-3xl flex-col items-center gap-10">
        <header className="flex flex-col items-center gap-3 text-center animate-rise">
          <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            AI 任务管家
          </h1>
          <p className="max-w-xl text-base text-secondary sm:text-lg">
            从灵感到执行，把模糊的想法拆成可推进的步骤
          </p>
        </header>

        <SystemStatusCard />

        <div className="flex gap-3 animate-rise">
          <Link href="/login">
            <Button variant="primary" size="lg">
              登录
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="secondary" size="lg">
              注册
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
