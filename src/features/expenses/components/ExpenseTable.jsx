// src/features/expenses/components/ExpenseTable.jsx
// Expense data table.
// outletId is a raw ObjectId string — resolved to name via useEntityMap().
// Row click → opens ExpenseFormModal in edit mode.

import { useState, useRef }                      from 'react'
import { createPortal }                          from 'react-dom'
import { MoreHorizontal, Pencil, Trash2 }        from 'lucide-react'

import DataTable                                 from '@/components/shared/DataTable'
import ExpenseCategoryBadge                      from './ExpenseCategoryBadge'
import ExpenseFormModal                          from './ExpenseFormModal'
import { useDeleteExpense }                      from '../hooks/useExpenses'
import useEntityMap                              from '@/hooks/useEntityMap'
import useToast                                  from '@/hooks/useToast'
import { cn }                                    from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────

const formatCurrency = (amount) =>
  amount != null
    ? new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
      }).format(amount)
    : '—'

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—'

// ── Row Actions ───────────────────────────────────────────────

const RowActions = ({ expense, onEdit }) => {
  const [open,       setOpen]       = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [menuPos,    setMenuPos]    = useState({ top: 0, left: 0 })
  const triggerRef                  = useRef(null)
  const deleteMutation              = useDeleteExpense()
  const toast                       = useToast()

  const handleDelete = () => {
    if (!confirmDel) { setConfirmDel(true); return }
    setOpen(false); setConfirmDel(false)
    deleteMutation.mutate(expense._id, {
      onSuccess: () => toast.success('Expense deleted'),
      onError:   (err) => toast.error('Delete failed', err?.response?.data?.message),
    })
  }

  // Dropdown is portaled to <body> and positioned via fixed coordinates
  // computed from the trigger's bounding rect, so it is never clipped by
  // a table/card ancestor's overflow-hidden/auto.
  const handleOpen = (e) => {
    e.stopPropagation()
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 176 }) // 176px = w-44
    }
    setOpen((o) => !o)
  }

  return (
    <div className="relative flex justify-end">
      <button
        ref={triggerRef}
        onClick={handleOpen}
        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && createPortal(
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => { setOpen(false); setConfirmDel(false) }}
          />
          <div
            style={{ top: menuPos.top, left: menuPos.left }}
            className="fixed w-44 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-fade-in"
          >
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(expense) }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              Edit Expense
            </button>
            <div className="border-t border-border" />
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete() }}
              disabled={deleteMutation.isPending}
              className={cn(
                'flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors disabled:opacity-50',
                confirmDel
                  ? 'text-destructive bg-destructive/10 font-semibold'
                  : 'text-destructive hover:bg-destructive/10'
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {confirmDel ? 'Confirm delete?' : 'Delete'}
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

// ── Main Table ────────────────────────────────────────────────

/**
 * @param {{ expenses: Object[] }} props
 */
const ExpenseTable = ({ expenses }) => {
  const [editExpense, setEditExpense] = useState(null)
  const { outletMap } = useEntityMap()

  return (
    <>
      <div className="w-full overflow-x-auto">
        <DataTable>
          <DataTable.Head>
            <DataTable.HeadRow>
              <DataTable.HeadCell>Date</DataTable.HeadCell>
              <DataTable.HeadCell>Category</DataTable.HeadCell>
              <DataTable.HeadCell>Description</DataTable.HeadCell>
              <DataTable.HeadCell>Amount</DataTable.HeadCell>
              <DataTable.HeadCell className="hidden lg:table-cell">Outlet</DataTable.HeadCell>
              <DataTable.HeadCell className="w-10" />
            </DataTable.HeadRow>
          </DataTable.Head>

          <DataTable.Body>
            {expenses.map((expense) => {
              const outlet     = outletMap.get(expense.outletId?.toString())
              const outletName = outlet?.name ?? '—'

              return (
                <DataTable.Row
                  key={expense._id}
                  onClick={() => setEditExpense(expense)}
                  className="cursor-pointer"
                >
                  {/* Date */}
                  <DataTable.Cell>
                    <span className="text-sm text-foreground tabular-nums whitespace-nowrap">
                      {formatDate(expense.date)}
                    </span>
                  </DataTable.Cell>

                  {/* Category */}
                  <DataTable.Cell>
                    <ExpenseCategoryBadge category={expense.category} />
                  </DataTable.Cell>

                  {/* Description */}
                  <DataTable.Cell>
                    <span
                      className="text-sm text-foreground truncate block max-w-[220px]"
                      title={expense.description}
                    >
                      {expense.description}
                    </span>
                  </DataTable.Cell>

                  {/* Amount */}
                  <DataTable.Cell>
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {formatCurrency(expense.amount)}
                    </span>
                  </DataTable.Cell>

                  {/* Outlet — hidden on small screens */}
                  <DataTable.Cell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {outletName}
                  </DataTable.Cell>

                  {/* Actions */}
                  <DataTable.Cell onClick={(e) => e.stopPropagation()}>
                    <RowActions expense={expense} onEdit={setEditExpense} />
                  </DataTable.Cell>
                </DataTable.Row>
              )
            })}
          </DataTable.Body>
        </DataTable>
      </div>

      <ExpenseFormModal
        open={!!editExpense}
        onClose={() => setEditExpense(null)}
        expense={editExpense}
      />
    </>
  )
}

export default ExpenseTable