// src/features/bike/components/BikeTable.jsx
// Bike data table.
//
// Columns: Asset Code | Name | Outlet | Status | Active | Notes | Actions
//
// RowActions (portaled — table card has overflow:hidden):
//   Edit           → BikeFormModal
//   Change Status  → BikeStatusDialog (NEVER via edit form)
//   Remove         → DeleteConfirmDialog (soft delete)
//
// outletId resolution via useEntityMap outletMap.
// isActive display mirrors EmployeeStatusBadge pattern.

import { useState, useRef }       from 'react'
import { createPortal }           from 'react-dom'
import { MoreHorizontal, Pencil, RefreshCw, Trash2 } from 'lucide-react'

import DataTable                  from '@/components/shared/DataTable'
import BikeStatusBadge            from './BikeStatusBadge'
import BikeFormModal              from './BikeFormModal'
import BikeStatusDialog           from './BikeStatusDialog'
import DeleteConfirmDialog        from './DeleteConfirmDialog'
import useEntityMap               from '@/hooks/useEntityMap'
import { cn }                     from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────

const ActiveBadge = ({ isActive }) => (
  <span className={cn(
    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
    isActive
      ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-400'
      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
  )}>
    <span className={cn(
      'w-1.5 h-1.5 rounded-full',
      isActive ? 'bg-brand-500' : 'bg-zinc-400'
    )} />
    {isActive ? 'Active' : 'Inactive'}
  </span>
)

// ── RowActions ────────────────────────────────────────────────
// Portaled dropdown — table card has overflow:hidden which clips
// position:absolute dropdowns that extend below the last row.

const RowActions = ({ bike, onEdit, onStatus, onDelete }) => {
  const [open, setOpen]       = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const triggerRef            = useRef(null)

  const handleOpen = (e) => {
    e.stopPropagation()
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 176 })
    }
    setOpen((o) => !o)
  }

  const close = () => setOpen(false)

  const action = (fn) => (e) => {
    e.stopPropagation()
    close()
    fn(bike)
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
            <button
              onClick={action(onEdit)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              Edit Details
            </button>

            <button
              onClick={action(onStatus)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              Change Status
            </button>

            <div className="border-t border-border" />

            <button
              onClick={action(onDelete)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

// ── BikeTable ─────────────────────────────────────────────────

const BikeTable = ({ bikes, canManage }) => {
  const [editTarget,   setEditTarget]   = useState(null)
  const [statusTarget, setStatusTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { outletMap } = useEntityMap()

  return (
    <>
      <DataTable>
        <DataTable.Head>
          <DataTable.HeadRow>
            <DataTable.HeadCell>Asset Code</DataTable.HeadCell>
            <DataTable.HeadCell>Name</DataTable.HeadCell>
            <DataTable.HeadCell className="hidden sm:table-cell">Outlet</DataTable.HeadCell>
            <DataTable.HeadCell>Status</DataTable.HeadCell>
            <DataTable.HeadCell className="hidden md:table-cell">Active</DataTable.HeadCell>
            <DataTable.HeadCell className="hidden lg:table-cell">Notes</DataTable.HeadCell>
            {canManage && <DataTable.HeadCell className="w-10" />}
          </DataTable.HeadRow>
        </DataTable.Head>

        <DataTable.Body>
          {bikes.map((bike) => {
            const outletIdStr = bike.outletId?.toString?.() ?? bike.outletId ?? ''
            const outletName  = outletMap.get(outletIdStr)?.name ?? '—'

            return (
              <DataTable.Row key={bike._id}>
                {/* Asset Code */}
                <DataTable.Cell>
                  <span className="font-mono text-xs font-semibold px-2 py-1 rounded-md bg-muted text-foreground">
                    {bike.assetCode}
                  </span>
                </DataTable.Cell>

                {/* Name */}
                <DataTable.Cell>
                  <p className="text-sm font-medium text-foreground">{bike.name}</p>
                </DataTable.Cell>

                {/* Outlet */}
                <DataTable.Cell className="hidden sm:table-cell">
                  <span className="text-sm text-muted-foreground">{outletName}</span>
                </DataTable.Cell>

                {/* Operational Status */}
                <DataTable.Cell>
                  <BikeStatusBadge status={bike.status} />
                </DataTable.Cell>

                {/* isActive flag */}
                <DataTable.Cell className="hidden md:table-cell">
                  <ActiveBadge isActive={bike.isActive} />
                </DataTable.Cell>

                {/* Notes */}
                <DataTable.Cell className="hidden lg:table-cell">
                  {bike.notes ? (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                      {bike.notes}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </DataTable.Cell>

                {/* Actions */}
                {canManage && (
                  <DataTable.Cell>
                    <RowActions
                      bike={bike}
                      onEdit={setEditTarget}
                      onStatus={setStatusTarget}
                      onDelete={setDeleteTarget}
                    />
                  </DataTable.Cell>
                )}
              </DataTable.Row>
            )
          })}
        </DataTable.Body>
      </DataTable>

      {/* Modals outside table to avoid overflow clipping */}
      <BikeFormModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        bike={editTarget}
      />

      <BikeStatusDialog
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        bike={statusTarget}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        bike={deleteTarget}
      />
    </>
  )
}

export default BikeTable