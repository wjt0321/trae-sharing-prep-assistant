function InsightList({ title, items, toneClass }) {
  return (
    <div className="rounded-[14px] border border-[rgba(43,41,38,0.08)] bg-canvas/70 p-4">
      <p className={`text-sm font-medium ${toneClass}`}>{title}</p>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-ink">
            <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${toneClass.replace("text-", "bg-")}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InsightPanel({ insights }) {
  return (
    <section className="rounded-panel border border-[rgba(43,41,38,0.1)] bg-surface p-6 shadow-soft">
      <p className="text-sm font-medium text-secondary">准备重点与提醒</p>
      <h2 className="mt-2 text-2xl font-semibold text-ink">别遗漏这些关键细节</h2>

      <div className="mt-6 space-y-4">
        <InsightList title="准备重点" items={insights.highlights} toneClass="text-success" />
        <InsightList title="容易遗漏的事" items={insights.risks} toneClass="text-warning" />
      </div>
    </section>
  );
}
