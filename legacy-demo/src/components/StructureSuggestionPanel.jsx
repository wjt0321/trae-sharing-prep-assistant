export function StructureSuggestionPanel({ suggestion }) {
  return (
    <section className="animate-rise rounded-panel border border-[rgba(43,41,38,0.1)] bg-surface p-6 shadow-soft">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">分享结构建议</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">按这个结构组织内容会更稳</h2>
        </div>
        <p className="text-xs font-medium text-tertiary">结构粒度：{suggestion.granularity}</p>
      </div>

      <p className="mt-4 text-sm leading-7 text-ink">{suggestion.text}</p>

      <div className="mt-4 rounded-[14px] border border-[rgba(43,41,38,0.08)] bg-canvas/70 px-4 py-3">
        <p className="text-xs font-medium text-secondary">时间分配参考</p>
        <p className="mt-1 text-sm leading-6 text-ink">{suggestion.timeAllocation}</p>
      </div>
    </section>
  );
}
