// src/features/attendance/components/AttendanceTable.jsx
// Attendance data table.
// Row click → opens AttendanceDetailModal for view/edit.
//
// Fix: employeeId and outletId are raw ObjectId strings from the backend
// (not populated objects). Names are resolved via useEntityMap() which
// fetches all employees + outlets once and builds id → object lookup maps.

import { useState, useRef }                from 'react'
import { createPortal }                    from 'react-dom'
import { MoreHorizontal, Pencil, Trash2 }  from 'lucide-react'

import DataTable                           from '@/components/shared/DataTable'
import AttendanceStatusBadge               from './AttendanceStatusBadge'
import AttendanceDetailModal               from './AttendanceDetailModal'
import { useDeleteAttendance }             from '../hooks/useAttendance'
import useEntityMap                        from '@/hooks/useEntityMap'
import useToast                            from '@/hooks/useToast'
import { cn }                              from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────

const formatDate = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—'

const formatDay = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short' })
    : ''

const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

// ── Employee Avatar ───────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-brand-100 text-brand-700',
]

const MiniAvatar = ({ name }) => {
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

// ── Row Actions ───────────────────────────────────────────────

const RowActions = ({ record, onEdit }) => {
  const [open,       setOpen]       = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [menuPos,    setMenuPos]    = useState({ top: 0, left: 0 })
  const triggerRef                  = useRef(null)
  const deleteMutation              = useDeleteAttendance()
  const toast                       = useToast()

  const handleDelete = () => {
    if (!confirmDel) { setConfirmDel(true); return }
    setOpen(false)
    setConfirmDel(false)
    deleteMutation.mutate(record._id, {
      onSuccess: () => toast.success('Record deleted', 'Re-submit to correct it.'),
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
              onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(record) }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              Edit Record
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
 * @param {{ records: Object[], canManage: boolean }} props
 */
const AttendanceTable = ({ records, canManage }) => {
  const [selectedRecord, setSelectedRecord] = useState(null)

  // Resolve raw ObjectId strings → names via lookup maps
  const { employeeMap, outletMap } = useEntityMap()

  return (
    <>
      <DataTable>
        <DataTable.Head>
          <DataTable.HeadRow>
            <DataTable.HeadCell>Employee</DataTable.HeadCell>
            <DataTable.HeadCell>Date</DataTable.HeadCell>
            <DataTable.HeadCell>Status</DataTable.HeadCell>
            <DataTable.HeadCell className="hidden md:table-cell">Outlet</DataTable.HeadCell>
            <DataTable.HeadCell className="hidden lg:table-cell">Notes</DataTable.HeadCell>
            <DataTable.HeadCell className="hidden xl:table-cell">Recorded</DataTable.HeadCell>
            {canManage && <DataTable.HeadCell className="w-10" />}
          </DataTable.HeadRow>
        </DataTable.Head>

        <DataTable.Body>
          {records.map((rec) => {
            // employeeId and outletId are raw ObjectId strings — resolve via map
            const employee = employeeMap.get(rec.employeeId?.toString())
            const outlet   = outletMap.get(rec.outletId?.toString())
            const empName    = employee?.name     ?? '—'
            const empPos     = employee?.position ?? null
            const outletName = outlet?.name       ?? '—'

            return (
              <DataTable.Row
                key={rec._id}
                onClick={() => setSelectedRecord(rec)}
                className="cursor-pointer"
              >
                {/* Employee */}
                <DataTable.Cell>
                  <div className="flex items-center gap-2.5">
                    <MiniAvatar name={empName} />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm leading-none truncate">
                        {empName}
                      </p>
                      {empPos && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{empPos}</p>
                      )}
                    </div>
                  </div>
                </DataTable.Cell>

                {/* Date */}
                <DataTable.Cell>
                  <div className="leading-none">
                    <p className="text-sm text-foreground">{formatDate(rec.date)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDay(rec.date)}</p>
                  </div>
                </DataTable.Cell>

                {/* Status */}
                <DataTable.Cell>
                  <AttendanceStatusBadge status={rec.status} />
                </DataTable.Cell>

                {/* Outlet */}
                <DataTable.Cell className="hidden md:table-cell text-sm text-muted-foreground">
                  {outletName}
                </DataTable.Cell>

                {/* Notes */}
                <DataTable.Cell className="hidden lg:table-cell">
                  {rec.notes ? (
                    <span
                      className="text-xs text-muted-foreground truncate block max-w-[180px]"
                      title={rec.notes}
                    >
                      {rec.notes}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </DataTable.Cell>

                {/* Recorded at */}
                <DataTable.Cell className="hidden xl:table-cell text-xs text-muted-foreground whitespace-nowrap">
                  {rec.createdAt
                    ? new Date(rec.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })
                    : '—'}
                </DataTable.Cell>

                {/* Actions */}
                {canManage && (
                  <DataTable.Cell onClick={(e) => e.stopPropagation()}>
                    <RowActions record={rec} onEdit={setSelectedRecord} />
                  </DataTable.Cell>
                )}
              </DataTable.Row>
            )
          })}
        </DataTable.Body>
      </DataTable>

      <AttendanceDetailModal
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
        canManage={canManage}
      />
    </>
  )
}

export default AttendanceTable