// src/features/bikeMaintenance/components/RepairRecordsTable.jsx
// Repair records table. Edit action only — no delete.
// Columns: Damage Report (shortened ID), Repair Date, Cost, Status, Notes, Actions
// cost displayed with formatRupiah.

import { useState, useRef }                 from 'react'
import { createPortal }                     from 'react-dom'
import { MoreHorizontal, Pencil }           from 'lucide-react'

import DataTable                            from '@/components/shared/DataTable'
import RepairStatusBadge                    from './RepairStatusBadge'
import RepairRecordFormModal                from './RepairRecordFormModal'
import { formatRupiah }                     from '@/hooks/useRupiahInput'
import { cn }                               from '@/lib/utils'

// ── Helpers ────────────────────────────────────────────────────

const formatDate = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return '—' }
}

// ── RowActions ─────────────────────────────────────────────────

const RowActions = ({ record, onEdit }) => {
  const [open, setOpen]       = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const triggerRef            = useRef(null)

  const handleOpen = (e) => {
    e.stopPropagation()
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 })
    }
    setOpen((o) => !o)
  }

  const close = () => setOpen(false)
  const action = (fn) => (e) => { e.stopPropagation(); close(); fn(record) }

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
            className="fixed w-40 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-fade-in"
          >
            <button
              onClick={action(onEdit)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              Edit Record
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

// ── RepairRecordsTable ─────────────────────────────────────────

const RepairRecordsTable = ({ records, canManage }) => {
  const [editTarget, setEditTarget] = useState(null)

  return (
    <>
      <DataTable>
        <DataTable.Head>
          <DataTable.HeadRow>
            <DataTable.HeadCell>Damage Report</DataTable.HeadCell>
            <DataTable.HeadCell>Repair Date</DataTable.HeadCell>
            <DataTable.HeadCell>Cost</DataTable.HeadCell>
            <DataTable.HeadCell>Status</DataTable.HeadCell>
            <DataTable.HeadCell className="hidden lg:table-cell">Notes</DataTable.HeadCell>
            {canManage && <DataTable.HeadCell className="w-10" />}
          </DataTable.HeadRow>
        </DataTable.Head>

        <DataTable.Body>
          {records.map((record) => {
            const drIdStr  = record.damageReportId?.toString?.() ?? record.damageReportId ?? ''
            const drShort  = drIdStr.slice(-8)

            return (
              <DataTable.Row key={record._id}>
                <DataTable.Cell>
                  <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                    …{drShort}
                  </span>
                </DataTable.Cell>

                <DataTable.Cell>
                  <span className="text-sm text-foreground tabular-nums">
                    {formatDate(record.repairDate)}
                  </span>
                </DataTable.Cell>

                <DataTable.Cell>
                  <span className="text-sm font-medium text-foreground tabular-nums">
                    {record.cost != null ? `Rp ${formatRupiah(record.cost)}` : '—'}
                  </span>
                </DataTable.Cell>

                <DataTable.Cell>
                  <RepairStatusBadge status={record.repairStatus} />
                </DataTable.Cell>

                <DataTable.Cell className="hidden lg:table-cell">
                  {record.notes ? (
                    <span className="text-xs text-muted-foreground truncate max-w-[180px] block">
                      {record.notes}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </DataTable.Cell>

                {canManage && (
                  <DataTable.Cell>
                    <RowActions record={record} onEdit={setEditTarget} />
                  </DataTable.Cell>
                )}
              </DataTable.Row>
            )
          })}
        </DataTable.Body>
      </DataTable>

      <RepairRecordFormModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        record={editTarget}
      />
    </>
  )
}

export default RepairRecordsTable