export default function RelatorioLoading() {
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-28 bg-surface-2 rounded-lg" />
        <div className="h-8 w-36 bg-surface-2 rounded-lg" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 h-28 bg-surface-2 rounded-xl border border-border" />
        <div className="h-28 bg-surface-2 rounded-xl border border-border" />
        <div className="h-28 bg-surface-2 rounded-xl border border-border" />
        <div className="h-28 bg-surface-2 rounded-xl border border-border col-span-2 lg:col-span-1 hidden lg:block" />
      </div>

      {/* Chart skeleton */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-40 bg-surface-2 rounded" />
          <div className="h-7 w-40 bg-surface-2 rounded-lg" />
        </div>
        <div className="flex items-end gap-2 h-[120px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className="w-full bg-surface-2 rounded-t"
                style={{ height: `${40 + Math.random() * 60}px` }}
              />
              <div className="h-2.5 w-6 bg-surface-2 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Main grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left col */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
            <div className="h-4 w-32 bg-surface-2 rounded" />
            {[70, 50, 30].map((w) => (
              <div key={w} className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-3 bg-surface-2 rounded" style={{ width: `${w}%` }} />
                  <div className="h-3 w-16 bg-surface-2 rounded" />
                </div>
                <div className="h-1.5 bg-surface-2 rounded-full" />
              </div>
            ))}
          </div>
          <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
            <div className="h-4 w-24 bg-surface-2 rounded" />
            {[60, 45, 25].map((w) => (
              <div key={w} className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-3 bg-surface-2 rounded" style={{ width: `${w}%` }} />
                  <div className="h-3 w-16 bg-surface-2 rounded" />
                </div>
                <div className="h-1.5 bg-surface-2 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Right col */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
            <div className="h-4 w-20 bg-surface-2 rounded" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3 w-4 bg-surface-2 rounded" />
                <div className="h-3 flex-1 bg-surface-2 rounded" />
                <div className="h-3 w-16 bg-surface-2 rounded" />
              </div>
            ))}
          </div>
          <div className="bg-surface border border-border rounded-xl p-5 space-y-2">
            <div className="h-4 w-36 bg-surface-2 rounded" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-border last:border-0">
                <div className="h-3 w-24 bg-surface-2 rounded" />
                <div className="h-3 w-16 bg-surface-2 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
