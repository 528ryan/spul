# Deploy Guide — Vercel + Supabase

Supabase project ID: `jaokqvecsshtbzdzefyd`

## Prerequisites

- Vercel account with the project connected to this repository
- Supabase project running (ID above)
- Bun installed locally for running migrations

---

## 1. Environment Variables

Set these in Vercel → Project → Settings → Environment Variables (all environments):

| Variable | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role (server-only) |
| `NEXT_PUBLIC_SITE_URL` | Your production domain, e.g. `https://spul.app` |

---

## 2. Run Database Migrations

Run migrations in order in the Supabase SQL Editor (Dashboard → SQL Editor):

1. `docs/migrations/001_*.sql` — initial schema
2. `docs/migrations/002_*.sql`
3. `docs/migrations/003_*.sql`
4. `docs/migrations/004_workspace_rls.sql` — workspace tables, RLS policies, RPC functions

### Migration 004 creates

- Helper functions: `my_workspace_id()`, `my_workspace_owner_id()`
- RPC: `get_workspace_members_with_email(p_workspace_id uuid)`
- Updated RLS policies on `transactions`, `products`, `orders`, `order_items` to allow workspace viewers to read the owner's data

### Required tables (must exist before 004)

```sql
-- workspaces
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

-- workspace_members
create table workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'viewer')),
  invited_by uuid not null references auth.users(id),
  joined_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique(workspace_id, user_id)
);

-- invites
create table invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- profiles: add columns if not present
alter table profiles
  add column if not exists workspace_id uuid references workspaces(id),
  add column if not exists plan_expires_at timestamptz;
```

---

## 3. Supabase Auth Settings

In Supabase → Authentication → URL Configuration:

- **Site URL**: `https://spul.app`
- **Redirect URLs**: add `https://spul.app/auth/callback`

For Google OAuth (if enabled):
- Add OAuth credentials in Supabase → Authentication → Providers → Google
- Set authorized redirect URI in Google Cloud Console: `https://<supabase-project>.supabase.co/auth/v1/callback`

---

## 4. Deploy to Vercel

```bash
# Push to main branch — Vercel auto-deploys
git push origin main
```

Or trigger manually in Vercel dashboard → Deployments → Redeploy.

---

## 5. Post-Deploy Checklist

- [ ] Visit `https://spul.app` — landing page loads
- [ ] Sign up a new user — redirected to `/onboarding`
- [ ] Complete onboarding — redirected to `/dashboard`
- [ ] Open `/configuracoes` — settings page loads, plan usage shows
- [ ] Generate an invite code — 8-char code starting with `SPUL` appears
- [ ] Open `/convite?code=SPULXXXX` in another browser — invite page loads
- [ ] Accept invite as a second user — redirected to `/dashboard`
- [ ] Back in owner account — new member appears in members list
- [ ] Revoke member — member removed from list
