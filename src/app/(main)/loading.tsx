export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-40 bg-surface rounded-xl border border-line animate-pulse" />
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-surface rounded-xl border border-line p-4 animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-line" />
            <div className="space-y-1.5">
              <div className="h-3 w-28 bg-line rounded" />
              <div className="h-2 w-20 bg-line rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-line rounded" />
            <div className="h-3 w-4/5 bg-line rounded" />
            <div className="h-3 w-3/5 bg-line rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
