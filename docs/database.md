# Spul — Aprendizados do MVP v1

## O que funcionou
- Next.js 16 + Tailwind v4 + Bun: stack sólida, bun dev em ~1s
- Supabase RLS com user_id: isolamento de dados funciona perfeitamente
- Server Components + Server Actions: padrão certo, zero API routes
- Split login (IYSES-style): visualmente aprovado
- Design system com tokens @theme no CSS (Tailwind v4)
- Skill customizada do Spul: contexto persistente entre sessões
- Agentes por tela: abordagem correta

## O que não funcionou / causou retrabalho
- Schema sem documentação → nomes de colunas errados (categoria vs category)
- Scaffold sem pensar em multi-tenant desde o início
- Categorias hardcoded no form → impossível adaptar por business_type
- payment_method obrigatório → fricção desnecessária no form
- Prompt único pra 4 telas → perda de coerência visual

## Decisões técnicas validadas
- Tailwind v4: cores via @theme no globals.css, não tailwind.config.ts
- Next.js 16: proxy.ts em vez de middleware.ts
- Supabase: tabela transactions (não lancamentos)
- DM Sans: tipografia aprovada

## Schema validado (transactions)
- Colunas em inglês: type, description, amount, category,
  platform, payment_method, sku, notes, date
- type: 'entrada' | 'saida'
- platform e payment_method: opcionais

## Identidade visual aprovada
- Logo: spul com "u" em roxo (#a78bfa)
- Dark mode absoluto: fundo #0a0a0c
- Login split 50/50 (ref: IYSES)
- Dashboard denso (ref: Vaulto)
- Landing hero full-bleed (ref: S2)

---

## Schema do Banco (referência completa)

### Tabela: transactions
| Coluna | Tipo | Nullable |
|--------|------|----------|
| id | uuid | NO |
| user_id | uuid | NO |
| type | text | NO — 'entrada' \| 'saida' |
| description | text | NO |
| amount | numeric(12,2) | NO |
| category_id | uuid | YES |
| category_name | text | NO |
| platform | text | YES |
| payment_method | text | YES |
| sku | text | YES |
| notes | text | YES |
| date | date | NO |
| gross_amount | numeric(12,2) | YES |
| discount | numeric(12,2) | YES — default 0 |
| net_amount | numeric(12,2) | YES |
| platform_fee_pct | numeric(5,2) | YES |
| platform_fee_fixed | numeric(8,2) | YES |
| platform_fee_total | numeric(8,2) | YES |
| tracking_code | text | YES |
| created_at | timestamptz | NO |

### Tabela: orders
| Coluna | Tipo | Nullable |
|--------|------|----------|
| id | uuid | NO |
| user_id | uuid | NO |
| order_ref | text | YES |
| platform | text | YES |
| status | text | NO — received→queued→printed→packed→shipped |
| notes | text | YES |
| transaction_id | uuid | YES |
| tracking_code | text | YES |
| ordered_at | timestamptz | YES — data/hora do pedido na plataforma |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

Índice: `orders_ordered_at_idx ON orders(user_id, ordered_at ASC NULLS LAST)` — usado para ordenar kanban por urgência.

### Tabela: order_items
| Coluna | Tipo | Nullable |
|--------|------|----------|
| id | uuid | NO |
| order_id | uuid | NO — cascade delete |
| sku | text | NO |
| quantity | int | NO |
| variant_id | uuid | YES — FK product_variants(id) set null |
| variant_attributes | jsonb | YES — snapshot dos atributos |
| created_at | timestamptz | NO |

### Tabela: products
| Coluna | Tipo | Nullable |
|--------|------|----------|
| id | uuid | NO |
| user_id | uuid | NO |
| sku | text | NO — unique por usuário |
| name | text | NO |
| cost_price | numeric(10,2) | YES |
| avg_print_minutes | int | YES |
| platform | text | YES |
| photo_url | text | YES |
| notes | text | YES |
| created_at | timestamptz | NO |

### Tabela: product_variants
Variações de produto. Cada produto pai pode ter N variações.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | uuid | NO | gen_random_uuid() |
| product_id | uuid | NO | FK products(id), cascade delete |
| user_id | uuid | NO | FK auth.users |
| sku | text | NO | único por usuário |
| attributes | jsonb | NO | ex: {"Cor":"Branco","Tamanho":"G"} |
| cost_price | numeric(10,2) | YES | sobrescreve custo do produto pai |
| sale_price | numeric(10,2) | YES | preço de venda desta variação |
| is_active | boolean | NO | default true |
| created_at | timestamptz | NO | default now() |

Constraint: unique(user_id, sku)
RLS: habilitado, usuário gerencia só suas variações

### Relacionamentos
- products → product_variants (1:N, cascade delete)
- product_variants → order_items.variant_id (set null on delete)
- Atributos jsonb: sempre tipar como Record\<string, string\>
- Formatar para exibição: Object.values(attributes).join(' | ')

---

### Tabela: workspaces
Empresa/negócio do usuário. Criada automaticamente pelo trigger `on_onboarding_complete` ou por `ensureWorkspace()`.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | uuid | NO | gen_random_uuid() |
| owner_id | uuid | NO | FK auth.users |
| name | text | YES | business_name do profile |
| created_at | timestamptz | NO | default now() |

RLS: owner gerencia seu próprio workspace (`auth.uid() = owner_id`)

### Tabela: workspace_members
Membros do workspace. Criada junto com workspace (owner) ou ao aceitar convite (viewer).

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | uuid | NO | gen_random_uuid() |
| workspace_id | uuid | NO | FK workspaces(id), cascade delete |
| user_id | uuid | NO | FK auth.users |
| role | text | NO | 'owner' \| 'viewer' — default 'viewer' |
| invited_by | uuid | NO | FK auth.users |
| joined_at | timestamptz | NO | default now() |
| is_active | boolean | NO | default true |

Constraint: unique(workspace_id, user_id)
RLS: membro vê seus próprios registros ou registros do workspace que ele é dono; owner insere/atualiza/deleta membros

### Tabela: invites
Códigos de convite para um workspace. Formato do código: `SPULXXXX` (8 chars, prefixo SPUL + 4 alfanuméricos).

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | uuid | NO | gen_random_uuid() |
| workspace_id | uuid | NO | FK workspaces(id), cascade delete |
| code | text | NO | UNIQUE — ex: SPUL7X3K |
| created_by | uuid | NO | FK auth.users |
| expires_at | timestamptz | NO | default now() + 7 days |
| used_at | timestamptz | YES | preenchido ao usar o convite |
| used_by | uuid | YES | FK auth.users |
| is_active | boolean | NO | default true |
| created_at | timestamptz | NO | default now() |

RLS: owner gerencia todos os convites; qualquer um pode SELECT (para aceitar por código)

### profiles — coluna nova
| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| workspace_id | uuid | YES | FK workspaces(id), set null on delete |
| plan_expires_at | timestamptz | YES | data de expiração do plano Pro |

### Relacionamentos workspace
auth.users → profiles (1:1)
profiles → workspaces (workspace_id, set null on delete)
workspaces → workspace_members (1:N, cascade delete)
workspaces → invites (1:N, cascade delete)

### RLS multi-workspace (migration 004)
Após rodar `docs/migrations/004_workspace_rls.sql`:
- Viewers podem **ler** dados do owner do seu workspace
- Apenas o owner pode **escrever** (insert/update/delete) dados
- RPC `get_workspace_members_with_email(p_workspace_id)` retorna membros com email de auth.users
