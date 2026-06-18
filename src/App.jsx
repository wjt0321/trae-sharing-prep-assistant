import { useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { ChecklistPanel } from "./components/ChecklistPanel";
import { FooterNote } from "./components/FooterNote";
import { HeroSection } from "./components/HeroSection";
import { InsightPanel } from "./components/InsightPanel";
import { LoadingState } from "./components/LoadingState";
import { StageSection } from "./components/StageSection";
import { StructureSuggestionPanel } from "./components/StructureSuggestionPanel";
import { defaultInput } from "./data/demoTemplates";
import { createPlan } from "./lib/planner";

const initialHint = {
  title: "输入分享目标后，这里会出现完整的筹备路径",
  description:
    "你将看到 4 个准备阶段、分享结构建议、最终行动清单，以及准备重点和容易遗漏的事项。重点不是“回答你”，而是帮你把分享准备真正往前推进。"
};

export default function App() {
  const [input, setInput] = useState(defaultInput);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);

  const hintCards = [
    "先确认主题和听众",
    "再搭内容结构",
    "然后安排时间与设备",
    "最后完成预演和收尾检查"
  ];

  const handleInputChange = (field, value) => {
    if (status !== "idle") {
      setStatus("idle");
      setResult(null);
    }

    setInput((prev) => ({ ...prev, [field]: value }));
  };

  const handleUseExample = () => {
    if (status !== "idle") {
      setStatus("idle");
      setResult(null);
    }

    setInput({ ...defaultInput });
  };

  const handleSubmit = () => {
    setStatus("loading");

    window.setTimeout(() => {
      setResult(createPlan(input));
      setStatus("done");
    }, 900);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-content flex-col gap-10 px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
        <HeroSection
          input={input}
          onInputChange={handleInputChange}
          onUseExample={handleUseExample}
          onSubmit={handleSubmit}
          isLoading={status === "loading"}
          isDisabled={status === "loading"}
        />

        {status === "idle" && (
          <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-panel border border-dashed border-[rgba(43,41,38,0.16)] bg-surface p-6 shadow-soft">
              <p className="text-sm font-medium text-accent">结果预览区</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">{initialHint.title}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-secondary">
                {initialHint.description}
              </p>
            </div>

            <div className="rounded-panel border border-[rgba(43,41,38,0.1)] bg-surface p-6 shadow-soft">
              <p className="text-sm font-medium text-secondary">你会得到什么</p>
              <ul className="mt-4 space-y-3">
                {hintCards.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-ink">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {status === "loading" && <LoadingState />}

        {status === "done" && result && (
          <>
            <section className="animate-rise rounded-panel border border-[rgba(43,41,38,0.1)] bg-surface p-6 shadow-soft">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-accent">{result.title}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-ink">根据你的目标生成的分享筹备路径</h2>
                </div>
                <div className="max-w-xl rounded-[14px] bg-muted px-4 py-3 text-sm leading-6 text-secondary">
                  <p>输入目标：{result.goalEcho}</p>
                  <p className="mt-2">{result.summary}</p>
                </div>
              </div>
            </section>

            <StageSection stages={result.stages} />

            {result.structureSuggestion && (
              <StructureSuggestionPanel suggestion={result.structureSuggestion} />
            )}

            <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <ChecklistPanel checklist={result.checklist} />
              <InsightPanel insights={result.insights} />
            </section>
          </>
        )}
      </main>

      <FooterNote />
    </div>
  );
}
