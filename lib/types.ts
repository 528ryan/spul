// ── Tipos do banco (shapes retornados pelo Supabase) ─────────────────────

export interface Transaction {
  id: string
  user_id: string
  type: 'entrada' | 'saida'
  description: string
  amount: number
  category_id: string | null
  category_name: string
  platform: string | null
  payment_method: string | null
  sku: string | null
  notes: string | null
  date: string
  created_at: string
  gross_amount: number | null
  discount: number | null
  net_amount: number | null
  platform_fee_pct: number | null
  platform_fee_fixed: number | null
  platform_fee_total: number | null
  tracking_code: string | null
}

export interface ProductVariant {
  id: string
  product_id: string
  user_id: string
  sku: string
  attributes: Record<string, string>
  cost_price: number | null
  sale_price: number | null
  is_active: boolean
  created_at: string
}

export interface Product {
  id: string
  user_id: string
  sku: string
  name: string
  cost_price: number | null
  avg_print_minutes: number | null
  platform: string | null
  photo_url: string | null
  notes: string | null
  created_at: string
}

export interface ProductWithVariants extends Product {
  product_variants: ProductVariant[]
}

export interface OrderItem {
  id: string
  order_id: string
  sku: string
  quantity: number
  variant_id: string | null
  variant_attributes: Record<string, string> | null
  created_at: string
}

export interface Order {
  id: string
  user_id: string
  order_ref: string | null
  platform: string | null
  status: 'received' | 'queued' | 'printed' | 'packed' | 'shipped'
  notes: string | null
  transaction_id: string | null
  tracking_code: string | null
  ordered_at: string | null
  created_at: string
  updated_at: string
  order_items: OrderItem[]
}

export interface Category {
  id: string
  user_id: string | null
  business_type: string | null
  name: string
  type: string
  is_default: boolean
  sort_order: number | null
}

export interface Profile {
  id: string
  business_type: '3d_printing' | 'graphic' | 'other'
  business_name: string | null
  plan: 'free' | 'pro'
  onboarding_done: boolean
  created_at: string
  workspace_id: string | null
  plan_expires_at: string | null
}

// ── Constantes de UI ──────────────────────────────────────────────────────

export const PLATFORM_LABELS: Record<string, string> = {
  shopee: 'Shopee',
  tiktok: 'TikTok Shop',
  mercadolivre: 'Mercado Livre',
  direto: 'Direto',
  outro: 'Outro',
}

export const PAYMENT_LABELS: Record<string, string> = {
  pix: 'Pix',
  cartao: 'Cartão',
  dinheiro: 'Dinheiro',
  boleto: 'Boleto',
  transferencia: 'Transferência',
}

export interface WorkspaceProfile extends Profile {
  workspace_id: string | null
  plan_expires_at: string | null
}

export interface Workspace {
  id: string
  owner_id: string
  name: string | null
  created_at: string
}

export interface WorkspaceMember {
  id: string
  user_id: string
  workspace_id: string
  role: 'owner' | 'viewer'
  invited_by: string
  joined_at: string
  is_active: boolean
  email: string
  business_name: string | null
}

export interface Invite {
  id: string
  workspace_id: string
  code: string
  created_by: string
  expires_at: string
  used_at: string | null
  used_by: string | null
  is_active: boolean
  created_at: string
}
