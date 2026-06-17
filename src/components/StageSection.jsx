export function StageSection({ stages }) {
  return (
    <section className="animate-rise">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">阶段拆解</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">把准备过程拆成 4 个连续阶段</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-secondary">
          每一步都保持简短、清楚、可执行，让你知道先做什么、后做什么。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {stages.map((stage) => (
          <article
            key={stage.id}
            className="rounded-panel border border-[rgba(43,41,38,0.1)] bg-surface p-6 shadow-soft"
          >
            <div className="mb-4 inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-secondary">
              {stage.tag}
            </div>
            <h3 className="text-xl font-semibold text-ink">{stage.title}</h3>
            <p className="mt-3 text-sm leading-6 text-secondary">{stage.description}</p>

            <ul className="mt-5 space-y-3">
              {stage.tasks.map((task) => (
                <li key={task} className="flex gap-3 text-sm leading-6 text-ink">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
