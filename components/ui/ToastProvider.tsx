'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { Toast } from './Toast'

// ── Context ───────────────────────────────────────────────────────────────

interface ToastContextValue {
  showToast: (message: string, variant: 'success' | 'error') => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// ── Provider ──────────────────────────────────────────────────────────────

interface ToastState {
  id: number
  message: string
  variant: 'success' | 'error'
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)

  const showToast = useCallback((message: string, variant: 'success' | 'error') => {
    const id = Date.now()
    setToast({ id, message, variant })
    setTimeout(() => {
      setToast((t) => (t?.id === id ? null : t))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && <Toast key={toast.id} message={toast.message} variant={toast.variant} />}
    </ToastContext.Provider>
  )
}
