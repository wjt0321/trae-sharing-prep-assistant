const exampleGoal = "我要准备一场小型分享会，但我不知道该怎么安排。";

export function HeroSection({ goal, onGoalChange, onUseExample, onSubmit, isLoading }) {
  return (
    <section className="animate-rise rounded-panel border border-[rgba(43,41,38,0.1)] bg-surface p-6 shadow-soft sm:p-8 lg:p-10">
      <div className="max-w-3xl">
        <div className="mb-4 inline-flex rounded-full bg-[rgba(201,106,61,0.1)] px-3 py-1 text-xs font-medium text-accent">
          Demo · 单场景任务拆解工作台
        </div>

        <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          把分享准备变成行动清单
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-secondary sm:text-lg">
          输入一个分享目标，系统会帮你拆解出准备步骤、执行顺序和最终行动清单。
        </p>
      </div>

      <div className="mt-8 rounded-panel border border-[rgba(43,41,38,0.1)] bg-canvas/70 p-4 sm:p-5">
        <label className="mb-3 block text-sm font-medium text-ink" htmlFor="goal-input">
          你这次想准备什么样的分享？
        </label>
        <textarea
          id="goal-input"
          className="min-h-32 w-full resize-none rounded-[14px] border border-[rgba(43,41,38,0.12)] bg-surface px-4 py-4 text-base leading-7 text-ink outline-none transition focus:border-accent"
          value={goal}
          onChange={(event) => onGoalChange(event.target.value)}
          placeholder="例如：我要准备一场面向同事的 AI 工具分享，希望逻辑清楚，现场不慌。"
        />

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <button
            type="button"
            onClick={() => onUseExample(exampleGoal)}
            className="inline-flex w-fit rounded-full border border-[rgba(43,41,38,0.1)] bg-surface px-4 py-2 text-sm text-secondary transition hover:border-[rgba(43,41,38,0.16)] hover:text-ink"
          >
            试试示例：我要准备一场小型分享会
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-[10px] bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "正在拆解..." : "开始拆解"}
          </button>
        </div>
      </div>
    </section>
  );
}
