export function LoadingState() {
  return (
    <section className="animate-rise">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-2 w-2 rounded-full bg-accent" />
        <p className="text-sm font-medium text-secondary">正在拆解准备步骤...</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-panel border border-[rgba(43,41,38,0.1)] bg-surface p-5 shadow-soft"
          >
            <div className="skeleton mb-4 h-5 w-24 rounded-full" />
            <div className="skeleton mb-3 h-7 w-2/3 rounded-xl" />
            <div className="skeleton mb-6 h-4 w-full rounded-xl" />
            <div className="space-y-3">
              <div className="skeleton h-4 w-full rounded-xl" />
              <div className="skeleton h-4 w-11/12 rounded-xl" />
              <div className="skeleton h-4 w-3/4 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
