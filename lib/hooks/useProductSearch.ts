'use client'

import { useState, useCallback } from 'react'
import type { ProductWithVariants } from '@/lib/types'

export function useProductSearch() {
  const [products, setProducts] = useState<ProductWithVariants[]>([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (q: string) => {
    if (q.length < 1) {
      setProducts([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(q)}`)
      if (!res.ok) { setProducts([]); return }
      const data = await res.json() as { products: ProductWithVariants[] }
      setProducts(Array.isArray(data.products) ? data.products : [])
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  return { products, loading, search }
}
