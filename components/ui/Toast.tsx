'use client'

interface ToastProps {
  message: string
  variant: 'success' | 'error'
}

export function Toast({ message, variant }: ToastProps) {
  const isSuccess = variant === 'success'

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'fixed bottom-4 right-4 z-50',
        'flex items-center gap-3 px-4 py-3 rounded-xl max-w-xs',
        'bg-surface text-sm shadow-lg',
        'toast-enter',
        isSuccess
          ? 'border-2 border-success/40'
          : 'border-2 border-danger/40',
      ].join(' ')}
    >
      <span
        className={[
          'w-2 h-2 rounded-full shrink-0',
          isSuccess ? 'bg-success' : 'bg-danger',
        ].join(' ')}
        aria-hidden="true"
      />
      <span className="text-text">{message}</span>
    </div>
  )
}
