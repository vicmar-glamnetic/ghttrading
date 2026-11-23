import type { ReactNode } from 'react'

/**
 * One section of the side panel: a small uppercase header with
 * optional meta on the right, then its content. Sections stack edge to edge,
 * separated by rules — no floating cards.
 */
export function PanelSection({ label, meta, children }: { label: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-line">
      <header className="flex h-10 items-center gap-2 px-4 text-[10px] font-bold uppercase tracking-wider text-ink3">
        <span>{label}</span>
        {meta && <span className="ml-auto flex items-center gap-1.5 normal-case tracking-normal">{meta}</span>}
      </header>
      {children}
    </section>
  )
}
