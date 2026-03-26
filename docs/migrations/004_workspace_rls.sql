-- Migration 004: Workspace RLS + helper functions
-- Run in Supabase SQL Editor

-- ── Helper functions ──────────────────────────────────────────────────────

create or replace function my_workspace_id()
returns uuid language sql security definer stable as $$
  select workspace_id from profiles where id = auth.uid()
$$;

create or replace function my_workspace_owner_id()
returns uuid language sql security definer stable as $$
  select owner_id from workspaces
  where id = (select workspace_id from profiles where id = auth.uid())
$$;

-- ── RPC: get_workspace_members_with_email ─────────────────────────────────

create or replace function get_workspace_members_with_email(p_workspace_id uuid)
returns table (
  id        uuid,
  user_id   uuid,
  workspace_id uuid,
  role      text,
  invited_by uuid,
  joined_at timestamptz,
  is_active boolean,
  email     text,
  business_name text
)
language sql security definer stable as $$
  select
    wm.id,
    wm.user_id,
    wm.workspace_id,
    wm.role,
    wm.invited_by,
    wm.joined_at,
    wm.is_active,
    u.email::text,
    p.business_name
  from workspace_members wm
  join auth.users u on u.id = wm.user_id
  left join profiles p on p.id = wm.user_id
  where wm.workspace_id = p_workspace_id
    and wm.is_active = true
  order by wm.joined_at asc
$$;

-- ── Update RLS on transactions ────────────────────────────────────────────

drop policy if exists "users manage own transactions" on transactions;
drop policy if exists "users see own transactions" on transactions;

create policy "workspace read transactions"
  on transactions for select
  using (user_id = my_workspace_owner_id() or user_id = auth.uid());

create policy "owner write transactions"
  on transactions for insert
  with check (auth.uid() = user_id);

create policy "owner update transactions"
  on transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "owner delete transactions"
  on transactions for delete
  using (auth.uid() = user_id);

-- ── Update RLS on products ────────────────────────────────────────────────

drop policy if exists "users manage own products" on products;
drop policy if exists "users see own products" on products;

create policy "workspace read products"
  on products for select
  using (user_id = my_workspace_owner_id() or user_id = auth.uid());

create policy "owner write products"
  on products for insert
  with check (auth.uid() = user_id);

create policy "owner update products"
  on products for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "owner delete products"
  on products for delete
  using (auth.uid() = user_id);

-- ── Update RLS on orders ──────────────────────────────────────────────────

drop policy if exists "users manage own orders" on orders;
drop policy if exists "users see own orders" on orders;

create policy "workspace read orders"
  on orders for select
  using (user_id = my_workspace_owner_id() or user_id = auth.uid());

create policy "owner write orders"
  on orders for insert
  with check (auth.uid() = user_id);

create policy "owner update orders"
  on orders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "owner delete orders"
  on orders for delete
  using (auth.uid() = user_id);

-- ── Update RLS on order_items ─────────────────────────────────────────────

drop policy if exists "users manage own order_items" on order_items;
drop policy if exists "users see own order_items" on order_items;

create policy "workspace read order_items"
  on order_items for select
  using (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
        and (orders.user_id = my_workspace_owner_id() or orders.user_id = auth.uid())
    )
  );

create policy "owner write order_items"
  on order_items for insert
  with check (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );

create policy "owner update order_items"
  on order_items for update
  using (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );

create policy "owner delete order_items"
  on order_items for delete
  using (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );

-- ── profiles: ensure policy exists ───────────────────────────────────────

drop policy if exists "users manage own profile" on profiles;

create policy "users manage own profile"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);
