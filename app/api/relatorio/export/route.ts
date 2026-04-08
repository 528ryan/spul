import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMonthRange, formatMonthFull } from '@/lib/date-helpers'
import type { Transaction } from '@/lib/types'
import { PLATFORM_LABELS } from '@/lib/types'

export async function GET(request: Request): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const mes = searchParams.get('mes')
  const formato = searchParams.get('formato') ?? 'csv'

  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
    return NextResponse.json({ error: 'Mês inválido' }, { status: 400 })
  }

  const range = getMonthRange(mes)

  const { data: txData, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', range.start)
    .lte('date', range.end)
    .order('date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const txs = (txData ?? []) as Transaction[]

  if (formato === 'csv') {
    return buildCSV(txs, mes)
  }

  return buildPDF(txs, mes)
}

// ── CSV ────────────────────────────────────────────────────────────────────

function esc(v: string | null | undefined): string {
  if (v == null) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function buildCSV(txs: Transaction[], mes: string): NextResponse {
  const headers = [
    'Data', 'Tipo', 'Descrição', 'Categoria', 'Plataforma',
    'Valor Bruto', 'Desconto', 'Taxas', 'Valor Líquido',
    'Rastreio', 'SKU', 'Notas',
  ]

  const rows = txs.map((t) => [
    esc(t.date),
    esc(t.type === 'entrada' ? 'Receita' : 'Saída'),
    esc(t.description),
    esc(t.category_name),
    esc(t.platform ? (PLATFORM_LABELS[t.platform] ?? t.platform) : ''),
    esc(formatDecimal(t.gross_amount ?? t.amount)),
    esc(formatDecimal(t.discount ?? 0)),
    esc(formatDecimal(t.platform_fee_total ?? 0)),
    esc(formatDecimal(t.amount)),
    esc(t.tracking_code),
    esc(t.sku),
    esc(t.notes),
  ])

  const BOM = '\uFEFF'
  const csv = BOM + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="spul-${mes}.csv"`,
    },
  })
}

function formatDecimal(n: number | null): string {
  if (n == null) return '0,00'
  return n.toFixed(2).replace('.', ',')
}

// ── PDF (HTML para impressão) ──────────────────────────────────────────────

function formatBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function buildPDF(txs: Transaction[], mes: string): NextResponse {
  const entradas = txs.filter((t) => t.type === 'entrada').reduce((s, t) => s + t.amount, 0)
  const saidas = txs.filter((t) => t.type === 'saida').reduce((s, t) => s + t.amount, 0)
  const saldo = entradas - saidas
  const margem = entradas > 0 ? ((saldo / entradas) * 100).toFixed(1) : '0.0'
  const mesLabel = formatMonthFull(mes)
  const generatedAt = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date())

  const rows = txs.map((t) => `
    <tr>
      <td>${t.date}</td>
      <td>${t.type === 'entrada' ? 'Receita' : 'Saída'}</td>
      <td>${escHtml(t.description)}</td>
      <td>${escHtml(t.category_name)}</td>
      <td>${escHtml(t.platform ? (PLATFORM_LABELS[t.platform] ?? t.platform) : '—')}</td>
      <td class="${t.type === 'entrada' ? 'pos' : 'neg'}">${formatBRL(t.amount)}</td>
      <td>${escHtml(t.sku ?? '—')}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Spul — Relatório ${mesLabel}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; font-size: 13px; color: #1e293b; background: #fff; padding: 32px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { color: #64748b; margin-bottom: 32px; font-size: 14px; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .kpi { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
    .kpi-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 4px; }
    .kpi-value { font-size: 20px; font-weight: 700; }
    .pos { color: #059669; }
    .neg { color: #dc2626; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; color: #94a3b8; padding: 8px 10px; border-bottom: 2px solid #e2e8f0; }
    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
    tr:last-child td { border-bottom: none; }
    .footer { margin-top: 48px; color: #94a3b8; font-size: 11px; text-align: center; }
    @media print {
      body { padding: 16px; }
      @page { margin: 20mm; }
    }
  </style>
</head>
<body>
  <h1>sp<span style="color:#7c3aed">u</span>l — Relatório</h1>
  <p class="subtitle">${mesLabel}</p>

  <div class="kpis">
    <div class="kpi">
      <div class="kpi-label">Receita</div>
      <div class="kpi-value pos">${formatBRL(entradas)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Saídas</div>
      <div class="kpi-value neg">${formatBRL(saidas)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Saldo</div>
      <div class="kpi-value ${saldo >= 0 ? 'pos' : 'neg'}">${formatBRL(saldo)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Margem</div>
      <div class="kpi-value">${margem}%</div>
    </div>
  </div>

  <h2 style="margin-bottom:12px;font-size:15px;">Transações do mês (${txs.length})</h2>
  <table>
    <thead>
      <tr>
        <th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th>
        <th>Plataforma</th><th>Valor</th><th>SKU</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">Gerado pelo Spul em ${generatedAt}</div>

  <script>window.onload = () => window.print()</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function escHtml(s: string | null | undefined): string {
  if (s == null) return '—'
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
