'use client'

import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from 'react'

// ── shared styles ─────────────────────────────────────────────────────────

function fieldBase(hasError: boolean) {
  return [
    'w-full bg-surface-2 border rounded-lg text-sm text-text',
    'placeholder:text-muted transition-colors duration-150',
    'focus:outline-none focus:ring-1',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    hasError
      ? 'border-danger focus:border-danger focus:ring-danger/20'
      : 'border-border focus:border-accent focus:ring-accent/20',
  ].join(' ')
}

function FieldWrapper({
  label,
  id,
  error,
  hint,
  children,
}: {
  label?: string
  id?: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text-2">
          {label}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
      {!error && hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  error?: string
  hint?: string
  prefix?: string
}

export function Input({ label, error, hint, prefix, id, className, ...props }: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <FieldWrapper label={label} id={inputId} error={error} hint={hint}>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted select-none pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          className={[
            fieldBase(!!error),
            prefix ? 'pl-8 pr-3 py-2.5' : 'px-3 py-2.5',
            className ?? '',
          ].join(' ')}
          {...props}
        />
      </div>
    </FieldWrapper>
  )
}

// ── Textarea ──────────────────────────────────────────────────────────────

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export function Textarea({ label, error, hint, id, className, ...props }: TextareaProps) {
  const fieldId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <FieldWrapper label={label} id={fieldId} error={error} hint={hint}>
      <textarea
        id={fieldId}
        className={[
          fieldBase(!!error),
          'px-3 py-2.5 resize-none',
          className ?? '',
        ].join(' ')}
        {...props}
      />
    </FieldWrapper>
  )
}

// ── Select ────────────────────────────────────────────────────────────────

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
}

export function Select({ label, error, hint, id, className, children, ...props }: SelectProps) {
  const fieldId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <FieldWrapper label={label} id={fieldId} error={error} hint={hint}>
      <select
        id={fieldId}
        className={[
          fieldBase(!!error),
          'px-3 py-2.5 cursor-pointer',
          className ?? '',
        ].join(' ')}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  )
}
