'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useProductSearch } from '@/lib/hooks/useProductSearch'
import type { ProductWithVariants } from '@/lib/types'

interface ProductAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (product: ProductWithVariants) => void
  onClear?: () => void
  placeholder?: string
  className?: string
}

export function ProductAutocomplete({
  value,
  onChange,
  onSelect,
  onClear,
  placeholder = 'Buscar por SKU ou nome...',
  className = '',
}: ProductAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { products, search } = useProductSearch()

  const scheduleSearch = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => { void search(q) }, 300)
    },
    [search],
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(v: string) {
    onChange(v)
    if (!v) {
      setOpen(false)
      onClear?.()
      return
    }
    scheduleSearch(v)
    setOpen(true)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => { if (value.length > 0 && products.length > 0) setOpen(true) }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && products.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
          {products.slice(0, 6).map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => { onSelect(p); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-2 transition-colors text-left cursor-pointer"
            >
              <span className="text-xs font-mono text-accent">{p.sku}</span>
              <span className="text-xs text-muted truncate">{p.name}</span>
              {p.product_variants.length > 0 && (
                <span className="ml-auto text-[10px] text-muted shrink-0">
                  {p.product_variants.length}v
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
