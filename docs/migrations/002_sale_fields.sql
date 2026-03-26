-- Migration 002: Sale fields for transactions + tracking_code for orders
-- Run this in Supabase SQL Editor

-- Adicionar colunas na tabela transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS gross_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS discount numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS platform_fee_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS platform_fee_fixed numeric(8,2),
  ADD COLUMN IF NOT EXISTS platform_fee_total numeric(8,2),
  ADD COLUMN IF NOT EXISTS tracking_code text;

-- Adicionar coluna tracking_code na tabela orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_code text;
