const statusBadgeClass = {
  done: "bg-[rgba(111,144,124,0.12)] text-success",
  current: "bg-[rgba(201,106,61,0.12)] text-accent",
  pending: "bg-muted text-secondary"
};

const statusLabel = {
  done: "已完成",
  current: "建议起点",
  pending: "待推进"
};

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
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-secondary">
                {stage.tag}
              </span>
              {stage.status && (
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass[stage.status]}`}
                >
                  {statusLabel[stage.status]}
                </span>
              )}
            </div>
            <h3 className="text-xl font-semibold text-ink">{stage.title}</h3>
            <p className="mt-3 text-sm leading-6 text-secondary">{stage.description}</p>

            {stage.goal && (
              <p className="mt-3 text-sm leading-6 text-ink">
                <span className="font-medium text-accent">阶段目标：</span>
                {stage.goal}
              </p>
            )}

            <ul className="mt-5 space-y-3">
              {stage.tasks.map((task) => (
                <li key={task} className="flex gap-3 text-sm leading-6 text-ink">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <span>{task}</span>
                </li>
              ))}
            </ul>

            {stage.criteria && (
              <div className="mt-5 rounded-[12px] border border-[rgba(43,41,38,0.08)] bg-canvas/70 px-4 py-3">
                <p className="text-xs font-medium text-secondary">完成标准</p>
                <p className="mt-1 text-sm leading-6 text-ink">{stage.criteria}</p>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
