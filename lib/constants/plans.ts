export const PLAN_LIMITS = {
  free: {
    transactions_per_month: 100,
    products: 10,
    active_orders: 20,
    csv_export: false,
    sku_analytics: false,
  },
  pro: {
    transactions_per_month: Infinity,
    products: Infinity,
    active_orders: Infinity,
    csv_export: true,
    sku_analytics: true,
  },
} as const
