'use client'

interface ExportButtonsProps {
  mes: string
}

export function ExportButtons({ mes }: ExportButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => window.open(`/api/relatorio/export?mes=${mes}&formato=csv`)}
        className="flex items-center gap-1.5 bg-surface-2 border border-border text-sm text-muted hover:text-text hover:border-border-2 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
      >
        <IconDownload />
        CSV
      </button>
      <button
        onClick={() => window.open(`/api/relatorio/export?mes=${mes}&formato=pdf`)}
        className="flex items-center gap-1.5 bg-surface-2 border border-border text-sm text-muted hover:text-text hover:border-border-2 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
      >
        <IconFile />
        PDF
      </button>
    </div>
  )
}

function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function IconFile() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}
