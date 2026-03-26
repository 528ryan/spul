'use client'

import { useState, useEffect } from 'react'
import type { ProductWithVariants } from '@/lib/types'

interface UseProdutosReturn {
  products: ProductWithVariants[]
  loading: boolean
}

export function useProdutos(): UseProdutosReturn {
  const [products, setProducts] = useState<ProductWithVariants[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetch('/api/products')
      .then((res) => res.json())
      .then((data: { products: ProductWithVariants[] }) => {
        if (!cancelled) {
          setProducts(Array.isArray(data.products) ? data.products : [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { products, loading }
}
