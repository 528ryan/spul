export type BusinessType = '3d_printing' | 'graphic' | 'other'
export type CategoryType = 'entrada' | 'saida'

export interface CategoryDef {
  name: string
  type: CategoryType
  business_type: BusinessType | null
  is_default: boolean
  /** Quando true, o form de lançamento entra em modo pedido (multi-item) */
  isPedido?: boolean
}

/**
 * Categorias pré-definidas espelhando exatamente o banco (categories onde user_id IS NULL).
 * Usado pelo form de lançamento para renderizar as opções corretas por business_type.
 * is_default=true → analytics ricos | is_default=false → só totais
 *
 * 'Pedido' (antes 'Venda') dispara criação automática de order na produção.
 * 'Devolução' é saída (despesa) — atualizado no banco via migration 003.
 */
export const PREDEFINED_CATEGORIES: CategoryDef[] = [
  // ── Entradas globais ───────────────────────────────────────
  { name: 'Pedido',             type: 'entrada', business_type: null,           is_default: true,  isPedido: true },
  { name: 'Reembolso recebido', type: 'entrada', business_type: null,           is_default: false },
  { name: 'Outros ingressos',   type: 'entrada', business_type: null,           is_default: false },

  // ── Entradas 3D printing ────────────────────────────────────
  { name: 'Serviço de impressão', type: 'entrada', business_type: '3d_printing', is_default: true  },

  // ── Entradas gráfica ────────────────────────────────────────
  { name: 'Serviço gráfico',    type: 'entrada', business_type: 'graphic',       is_default: true  },

  // ── Saídas globais ──────────────────────────────────────────
  { name: 'Insumos',            type: 'saida',   business_type: null,           is_default: true  },
  { name: 'Embalagem',          type: 'saida',   business_type: null,           is_default: true  },
  { name: 'Frete',              type: 'saida',   business_type: null,           is_default: true  },
  { name: 'Taxa de plataforma', type: 'saida',   business_type: null,           is_default: true  },
  { name: 'Devolução',          type: 'saida',   business_type: null,           is_default: false },
  { name: 'Marketing',          type: 'saida',   business_type: null,           is_default: false },
  { name: 'Ferramentas',        type: 'saida',   business_type: null,           is_default: false },
  { name: 'Serviços externos',  type: 'saida',   business_type: null,           is_default: false },
  { name: 'Outros custos',      type: 'saida',   business_type: null,           is_default: false },

  // ── Saídas 3D printing ──────────────────────────────────────
  { name: 'Filamento',             type: 'saida', business_type: '3d_printing', is_default: true  },
  { name: 'Resina',                type: 'saida', business_type: '3d_printing', is_default: true  },
  { name: 'Manutenção impressora', type: 'saida', business_type: '3d_printing', is_default: false },

  // ── Saídas gráfica ──────────────────────────────────────────
  { name: 'Papel / substrato', type: 'saida', business_type: 'graphic', is_default: true  },
  { name: 'Tinta / toner',     type: 'saida', business_type: 'graphic', is_default: true  },
]

/**
 * Retorna as categorias visíveis para um dado business_type e tipo (entrada|saida).
 */
export function getCategoriesFor(
  businessType: BusinessType,
  type: CategoryType,
): CategoryDef[] {
  return PREDEFINED_CATEGORIES.filter(
    (c) =>
      c.type === type &&
      (c.business_type === null || c.business_type === businessType),
  )
}
