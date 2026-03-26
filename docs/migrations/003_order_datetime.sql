-- Migration 003: ordered_at for orders + category cleanup
-- Run in Supabase SQL Editor

-- 1. Add ordered_at column to orders (data/hora do pedido na plataforma)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS ordered_at TIMESTAMPTZ;

-- 2. Index for ordered_at queries (production kanban ordering)
CREATE INDEX IF NOT EXISTS orders_ordered_at_idx
  ON orders(user_id, ordered_at ASC NULLS LAST);

-- 3. Mover Devolução para saída (despesa)
UPDATE categories
SET type = 'saida'
WHERE name = 'Devolução' AND is_default = true;

-- 4. Renomear Venda → Pedido (categoria de entrada que dispara criação de order)
--    Execute somente se ainda não foi feito:
UPDATE categories
SET name = 'Pedido'
WHERE name = 'Venda' AND is_default = true;
