// src/features/cup/components/CupRecordTable.jsx
// Cup record table with:
//   - Rider name resolved via useEntityMap (riderId → employee)
//   - Row click → CupRecordDetailModal
//   - RowActions dropdown:
//       Draft    → View | Edit | Finalize | Delete
//       Finalized → View only  (edit/finalize/delete hidden per product decision)
//
// Follows PayrollTable pattern exactly (portaled dropdown, portal-positioned menu).

import { useState, useRef }       from 'react'
import { createPortal }           from 'react-dom'
import {
  MoreHorizontal, Eye, Pencil, Lock, Trash2,
} from 'lucide-react'

import DataTable                  from '@/components/shared/DataTable'
import CupRecordStatusBadge       from './CupRecordStatusBadge'
import CupRecordDetailModal       from './CupRecordDetailModal'
import CupRecordFormModal         from './CupRecordFormModal'
import FinalizeConfirmDialog      from './FinalizeConfirmDialog'
import DeleteConfirmDialog        from './DeleteConfirmDialog'
import useEntityMap               from '@/hooks/useEntityMap'
import { cn }                     from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────

const formatDate = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return '—' }
}

const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-brand-100 text-brand-700',
]

const RiderAvatar = ({ name }) => {
  const color = AVATAR_COLORS[(name?.length ?? 0) % AVATAR_COLORS.length]
  return (
    <div className={cn(
      'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
      color
    )}>
      {getInitials(name)}
    </div>
  )
}

// Balance summary for a record's items[]
// Returns { allBalanced, unbalancedCount } — server always computes balance per item.
const getBalanceSummary = (items = []) => {
  const unbalancedCount = items.filter((item) => {
    const balance = item.balance ?? ((item.distributed + item.refill) - (item.sold + item.returned + item.reject))
    return balance !== 0
  }).length
  return { allBalanced: unbalancedCount === 0, unbalancedCount }
}

// ── RowActions ────────────────────────────────────────────────

const RowActions = ({ record, onView, onEdit, onFinalize, onDelete, canManage }) => {
  const [open, setOpen]       = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const triggerRef            = useRef(null)

  const isDraft = record.status === 'draft'

  const handleOpen = (e) => {
    e.stopPropagation()
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 176 }) // w-44 = 176px
    }
    setOpen((o) => !o)
  }

  const close = () => setOpen(false)

  const action = (fn) => (e) => {
    e.stopPropagation()
    close()
    fn(record)
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
          <div className="fixed inset-0 z-40" onClick={close} />

          <div
            style={{ top: menuPos.top, left: menuPos.left }}
            className="fixed w-44 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-fade-in"
          >
            {/* View — always available */}
            <button
              onClick={action(onView)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              View Detail
            </button>

            {/* Draft-only actions — managing roles only */}
            {canManage && isDraft && (
              <>
                <div className="border-t border-border" />

                <button
                  onClick={action(onEdit)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  Edit
                </button>

                <button
                  onClick={action(onFinalize)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Finalize
                </button>

                <div className="border-t border-border" />

                <button
                  onClick={action(onDelete)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

// ── CupRecordTable ────────────────────────────────────────────

/**
 * @param {{ records: Object[] }} props
 */
const CupRecordTable = ({ records, canManage }) => {
  const [viewTarget,     setViewTarget]     = useState(null)
  const [editTarget,     setEditTarget]     = useState(null)
  const [finalizeTarget, setFinalizeTarget] = useState(null)
  const [deleteTarget,   setDeleteTarget]   = useState(null)

  const { employeeMap } = useEntityMap()

  return (
    <>
      <DataTable>
        <DataTable.Head>
          <DataTable.HeadRow>
            <DataTable.HeadCell>Rider</DataTable.HeadCell>
            <DataTable.HeadCell>Date</DataTable.HeadCell>
            <DataTable.HeadCell className="hidden sm:table-cell">Products</DataTable.HeadCell>
            <DataTable.HeadCell className="hidden md:table-cell">Balance</DataTable.HeadCell>
            <DataTable.HeadCell>Status</DataTable.HeadCell>
            <DataTable.HeadCell className="hidden lg:table-cell">Notes</DataTable.HeadCell>
            <DataTable.HeadCell className="w-10" />
          </DataTable.HeadRow>
        </DataTable.Head>

        <DataTable.Body>
          {records.map((record) => {
            const riderIdStr = record.riderId?.toString?.() ?? record.riderId ?? ''
            const rider      = employeeMap.get(riderIdStr)
            const riderName  = rider?.name ?? '—'

            const { allBalanced, unbalancedCount } = getBalanceSummary(record.items)
            const itemCount = record.items?.length ?? 0

            return (
              <DataTable.Row
                key={record._id}
                onClick={() => setViewTarget(record)}
                className="cursor-pointer"
              >
                {/* Rider */}
                <DataTable.Cell>
                  <div className="flex items-center gap-2.5">
                    <RiderAvatar name={riderName} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{riderName}</p>
                      {rider?.position && (
                        <p className="text-xs text-muted-foreground truncate">{rider.position}</p>
                      )}
                    </div>
                  </div>
                </DataTable.Cell>

                {/* Date */}
                <DataTable.Cell>
                  <span className="text-sm text-foreground tabular-nums">{formatDate(record.date)}</span>
                </DataTable.Cell>

                {/* Products count */}
                <DataTable.Cell className="hidden sm:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {itemCount} {itemCount === 1 ? 'product' : 'products'}
                  </span>
                </DataTable.Cell>

                {/* Balance summary */}
                <DataTable.Cell className="hidden md:table-cell">
                  {record.status === 'finalized' ? (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Finalized</span>
                  ) : allBalanced ? (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ All balanced</span>
                  ) : (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      {unbalancedCount} unbalanced
                    </span>
                  )}
                </DataTable.Cell>

                {/* Status */}
                <DataTable.Cell>
                  <CupRecordStatusBadge status={record.status} />
                </DataTable.Cell>

                {/* Notes */}
                <DataTable.Cell className="hidden lg:table-cell">
                  {record.notes ? (
                    <span className="text-xs text-muted-foreground truncate max-w-[180px] block">
                      {record.notes}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </DataTable.Cell>

                {/* Actions */}
                <DataTable.Cell onClick={(e) => e.stopPropagation()}>
                  <RowActions
                    record={record}
                    onView={setViewTarget}
                    onEdit={setEditTarget}
                    onFinalize={setFinalizeTarget}
                    onDelete={setDeleteTarget}
                    canManage={canManage}
                  />
                </DataTable.Cell>
              </DataTable.Row>
            )
          })}
        </DataTable.Body>
      </DataTable>

      {/* Modals — rendered outside the table to avoid overflow clipping */}
      <CupRecordDetailModal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        record={viewTarget}
      />

      <CupRecordFormModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        record={editTarget}
      />

      <FinalizeConfirmDialog
        open={!!finalizeTarget}
        onClose={() => setFinalizeTarget(null)}
        record={finalizeTarget}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        record={deleteTarget}
      />
    </>
  )
}

export default CupRecordTable