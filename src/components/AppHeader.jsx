export function AppHeader() {
  return (
    <header className="border-b border-[rgba(43,41,38,0.1)]">
      <div className="mx-auto flex w-full max-w-content items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-lg font-semibold tracking-tight text-ink">分享会筹备助手</p>
          <p className="text-sm text-secondary">让模糊准备变成清晰行动</p>
        </div>

        <div className="rounded-full border border-[rgba(43,41,38,0.1)] bg-surface px-3 py-1 text-xs font-medium text-secondary">
          TRAE 初赛作品
        </div>
      </div>
    </header>
  );
}
