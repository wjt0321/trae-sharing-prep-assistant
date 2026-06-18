export function ChecklistPanel({ checklist }) {
  return (
    <section className="rounded-panel border border-[rgba(43,41,38,0.1)] bg-surface p-6 shadow-soft">
      <p className="text-sm font-medium text-accent">最终行动清单</p>
      <h2 className="mt-2 text-2xl font-semibold text-ink">照着这份顺序推进就行</h2>
      <p className="mt-2 text-sm leading-6 text-secondary">前两项是当前最该先做的事。</p>

      <ol className="mt-6 space-y-4">
        {checklist.map((item, index) => {
          const isPriority = index < 2;
          return (
            <li key={item} className="flex gap-4">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  isPriority
                    ? "bg-accent text-white"
                    : "bg-[rgba(201,106,61,0.1)] text-accent"
                }`}
              >
                {index + 1}
              </div>
              <div className="pt-1">
                {isPriority && (
                  <p className="mb-1 text-xs font-medium text-accent">先做</p>
                )}
                <p className="text-sm leading-6 text-ink">{item}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
