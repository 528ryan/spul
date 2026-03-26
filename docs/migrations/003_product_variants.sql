-- Migration 003: product_variants table + order_items variant columns
-- Run this in Supabase SQL Editor

-- Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  sku TEXT NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}',
  cost_price NUMERIC(10,2),
  sale_price NUMERIC(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT product_variants_user_sku_key UNIQUE (user_id, sku)
);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own variants" ON product_variants;
CREATE POLICY "users manage own variants" ON product_variants
  FOR ALL USING (auth.uid() = user_id);

-- Add variant columns to order_items
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_attributes JSONB;
