export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-40 bg-[#16161f] rounded-xl border border-[#2a2a3a] animate-pulse" />
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-4 animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2a2a3a]" />
            <div className="space-y-1.5">
              <div className="h-3 w-28 bg-[#2a2a3a] rounded" />
              <div className="h-2 w-20 bg-[#2a2a3a] rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-[#2a2a3a] rounded" />
            <div className="h-3 w-4/5 bg-[#2a2a3a] rounded" />
            <div className="h-3 w-3/5 bg-[#2a2a3a] rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
