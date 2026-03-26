'use client'

import { useState, useTransition } from 'react'
import { deleteTransaction } from '@/app/actions/transactions'
import { EditTransactionModal } from './EditTransactionModal'
import { useToast } from '@/components/ui/ToastProvider'
import type { Category, Transaction } from '@/lib/types'
import { PLATFORM_LABELS } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

type TabFilter = 'all' | 'entrada' | 'saida'

// Parse YYYY-MM-DD without UTC shift
function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDatePt(s: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(parseDate(s))
}

interface TransactionListProps {
  transactions: Transaction[]
  categories: Category[]
}

export function TransactionList({ transactions, categories }: TransactionListProps) {
  const [tab, setTab] = useState<TabFilter>('all')
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { showToast } = useToast()

  const filtered = transactions.filter((t) =>
    tab === 'all' ? true : t.type === tab,
  )

  function handleDelete(id: string, description: string) {
    if (!window.confirm(`Deletar "${description}"? Esta ação não pode ser desfeita.`)) return
    setDeletingId(id)
    startTransition(async () => {
      const result = await deleteTransaction(id)
      setDeletingId(null)
      if (result.success) {
        showToast(
          result.linkedOrder
            ? 'Lançamento e pedido de produção removidos'
            : 'Lançamento removido',
          'success',
        )
      } else {
        showToast(result.error ?? 'Erro ao remover lançamento', 'error')
      }
    })
  }

  const tabCls = (t: TabFilter) =>
    [
      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
      tab === t
        ? 'bg-accent-muted text-accent'
        : 'text-muted hover:text-text hover:bg-surface-2',
    ].join(' ')

  return (
    <>
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text">Lançamentos</h2>
            <span className="text-xs text-muted bg-surface-2 px-2 py-0.5 rounded-full">
              {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button className={tabCls('all')}    onClick={() => setTab('all')}>Todos</button>
            <button className={tabCls('entrada')} onClick={() => setTab('entrada')}>Entradas</button>
            <button className={tabCls('saida')}   onClick={() => setTab('saida')}>Saídas</button>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted">
              {transactions.length === 0
                ? 'Nenhum lançamento ainda. Registre o primeiro acima.'
                : 'Nenhum lançamento para o filtro selecionado.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-6 px-5 py-3" />
                  <th className="text-left px-3 py-3 text-xs font-medium text-muted uppercase tracking-wide">Descrição</th>
                  <th className="hidden md:table-cell text-left px-3 py-3 text-xs font-medium text-muted uppercase tracking-wide">Categoria</th>
                  <th className="hidden md:table-cell text-left px-3 py-3 text-xs font-medium text-muted uppercase tracking-wide">Plataforma</th>
                  <th className="hidden md:table-cell text-left px-3 py-3 text-xs font-medium text-muted uppercase tracking-wide">Data</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-muted uppercase tracking-wide">Valor</th>
                  <th className="px-5 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => {
                  const isEntrada = tx.type === 'entrada'
                  const isDeleting = deletingId === tx.id
                  return (
                    <tr
                      key={tx.id}
                      className={[
                        'border-b border-border last:border-0 transition-colors',
                        isDeleting ? 'opacity-40' : 'hover:bg-surface-2',
                      ].join(' ')}
                    >
                      {/* Dot */}
                      <td className="px-5 py-3">
                        <span
                          className={[
                            'block w-2 h-2 rounded-full',
                            isEntrada ? 'bg-success' : 'bg-danger',
                          ].join(' ')}
                          aria-label={isEntrada ? 'Entrada' : 'Saída'}
                        />
                      </td>

                      {/* Descrição */}
                      <td className="px-3 py-3">
                        <p className="text-text font-medium truncate max-w-[180px]">{tx.description}</p>
                        <p className="text-muted text-xs md:hidden">{tx.category_name}</p>
                      </td>

                      {/* Categoria — desktop */}
                      <td className="hidden md:table-cell px-3 py-3 text-muted">{tx.category_name}</td>

                      {/* Plataforma — desktop */}
                      <td className="hidden md:table-cell px-3 py-3 text-muted">
                        {tx.platform ? PLATFORM_LABELS[tx.platform] ?? tx.platform : '—'}
                      </td>

                      {/* Data — desktop */}
                      <td className="hidden md:table-cell px-3 py-3 text-muted whitespace-nowrap">
                        {formatDatePt(tx.date)}
                      </td>

                      {/* Valor */}
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <span className={isEntrada ? 'text-success font-medium' : 'text-danger font-medium'}>
                          {isEntrada ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingTx(tx)}
                            title="Editar"
                            className="p-1.5 rounded text-muted hover:text-text hover:bg-surface-2 transition-colors"
                          >
                            <IconPencil />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tx.id, tx.description)}
                            disabled={isDeleting || isPending}
                            title="Deletar"
                            className="p-1.5 rounded text-muted hover:text-danger hover:bg-danger-dim transition-colors disabled:opacity-50"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTx && (
        <EditTransactionModal
          transaction={editingTx}
          categories={categories}
          onClose={() => setEditingTx(null)}
        />
      )}
    </>
  )
}

function IconPencil() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
