import {
  audienceOptions,
  durationOptions,
  goalOptions,
  preparednessOptions
} from "../data/demoTemplates";

const fieldClass =
  "w-full rounded-[10px] border border-[rgba(43,41,38,0.12)] bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-accent";
const labelClass = "mb-1.5 block text-xs font-medium text-secondary";

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function HeroSection({ input, onInputChange, onUseExample, onSubmit, isLoading }) {
  return (
    <section className="animate-rise rounded-panel border border-[rgba(43,41,38,0.1)] bg-surface p-6 shadow-soft sm:p-8 lg:p-10">
      <div className="max-w-3xl">
        <div className="mb-4 inline-flex rounded-full bg-[rgba(201,106,61,0.1)] px-3 py-1 text-xs font-medium text-accent">
          聚焦单场景，不做万能助手
        </div>

        <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          把一场分享会的准备过程，整理成可执行的行动清单
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-secondary sm:text-lg">
          输入分享目标与关键约束，系统会自动拆解筹备阶段、推荐准备顺序，并给出一份可以直接照着做的最终清单。
        </p>
      </div>

      <div className="mt-8 rounded-panel border border-[rgba(43,41,38,0.1)] bg-canvas/70 p-4 sm:p-5">
        <label className="mb-3 block text-sm font-medium text-ink" htmlFor="goal-input">
          你这次想准备什么样的分享？
        </label>
        <textarea
          id="goal-input"
          className="min-h-24 w-full resize-none rounded-[14px] border border-[rgba(43,41,38,0.12)] bg-surface px-4 py-4 text-base leading-7 text-ink outline-none transition focus:border-accent"
          value={input.topic}
          onChange={(event) => onInputChange("topic", event.target.value)}
          placeholder="例如：我要准备一场面向同事的 AI 工具分享，希望逻辑清楚，现场不慌。"
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label="听众对象"
            value={input.audience}
            onChange={(value) => onInputChange("audience", value)}
            options={audienceOptions}
          />
          <SelectField
            label="分享时长"
            value={input.duration}
            onChange={(value) => onInputChange("duration", value)}
            options={durationOptions}
          />
          <div>
            <label className={labelClass}>分享日期</label>
            <input
              type="date"
              className={fieldClass}
              value={input.date}
              onChange={(event) => onInputChange("date", event.target.value)}
            />
          </div>
          <SelectField
            label="分享目标"
            value={input.goal}
            onChange={(value) => onInputChange("goal", value)}
            options={goalOptions}
          />
          <SelectField
            label="当前准备状态"
            value={input.preparedness}
            onChange={(value) => onInputChange("preparedness", value)}
            options={preparednessOptions}
          />
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <button
            type="button"
            onClick={onUseExample}
            className="inline-flex w-fit rounded-full border border-[rgba(43,41,38,0.1)] bg-surface px-4 py-2 text-sm text-secondary transition hover:border-[rgba(43,41,38,0.16)] hover:text-ink"
          >
            试试示例：一场小型分享会
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
