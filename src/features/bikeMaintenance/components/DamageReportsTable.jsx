// src/features/bikeMaintenance/components/DamageReportsTable.jsx
// Damage report table.
// Columns: Bike, Damage Type, Severity, Status, Reported At, Notes, Actions
// Row Actions: Change Status | Add Repair Record
//
// bikeId resolved via local useBikes map (same pattern as AssignmentHistoryTable).
// Severity display: colored badge inline.

import { useState, useRef }                from 'react'
import { createPortal }                    from 'react-dom'
import { MoreHorizontal, RefreshCw, Wrench } from 'lucide-react'

import DataTable                           from '@/components/shared/DataTable'
import DamageReportStatusBadge             from './DamageReportStatusBadge'
import DamageReportStatusDialog            from './DamageReportStatusDialog'
import RepairRecordFormModal               from './RepairRecordFormModal'
import { DAMAGE_TYPE_LABELS }              from './DamageReportFormModal'
import { useBikes }                        from '@/features/bike/hooks/useBikes'
import { cn }                              from '@/lib/utils'

// ── Helpers ────────────────────────────────────────────────────

const formatDate = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return '—' }
}

const SEVERITY_CONFIG = {
  LOW:    'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  MEDIUM: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  HIGH:   'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
}

const SeverityBadge = ({ severity }) => (
  <span className={cn(
    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
    SEVERITY_CONFIG[severity] ?? 'bg-zinc-100 text-zinc-500'
  )}>
    {severity ?? '—'}
  </span>
)

// ── RowActions ─────────────────────────────────────────────────

const RowActions = ({ report, onStatus, onAddRepair }) => {
  const [open, setOpen]       = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const triggerRef            = useRef(null)

  const handleOpen = (e) => {
    e.stopPropagation()
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 192 })
    }
    setOpen((o) => !o)
  }

  const close = () => setOpen(false)
  const action = (fn) => (e) => { e.stopPropagation(); close(); fn(report) }

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
            className="fixed w-48 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-fade-in"
          >
            <button
              onClick={action(onStatus)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              Change Status
            </button>
            <button
              onClick={action(onAddRepair)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
              Add Repair Record
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

// ── DamageReportsTable ─────────────────────────────────────────

const DamageReportsTable = ({ reports }) => {
  const [statusTarget, setStatusTarget]   = useState(null)
  const [repairTarget, setRepairTarget]   = useState(null) // { damageReportId, label }

  const { data: bikesData } = useBikes({ limit: 200 })
  const bikeMap = new Map((bikesData?.data ?? []).map((b) => [b._id.toString(), b]))

  const handleAddRepair = (report) => {
    const bikeIdStr  = report.bikeId?.toString?.() ?? report.bikeId ?? ''
    const bike       = bikeMap.get(bikeIdStr)
    const bikeCode   = bike?.assetCode ?? bikeIdStr.slice(-6)
    const typeLabel  = DAMAGE_TYPE_LABELS[report.damageType] ?? report.damageType
    const label      = `${bikeCode} — ${typeLabel} (${report.status})`
    setRepairTarget({ damageReportId: report._id, label })
  }

  const handleStatus = (report) => {
    const bikeIdStr = report.bikeId?.toString?.() ?? report.bikeId ?? ''
    const bike      = bikeMap.get(bikeIdStr)
    const bikeCode  = bike?.assetCode ?? bikeIdStr.slice(-6)
    setStatusTarget({
      ...report,
      bikeLabel: `${bikeCode} — ${DAMAGE_TYPE_LABELS[report.damageType] ?? report.damageType}`,
    })
  }

  return (
    <>
      <DataTable>
        <DataTable.Head>
          <DataTable.HeadRow>
            <DataTable.HeadCell>Bike</DataTable.HeadCell>
            <DataTable.HeadCell>Damage Type</DataTable.HeadCell>
            <DataTable.HeadCell className="hidden sm:table-cell">Severity</DataTable.HeadCell>
            <DataTable.HeadCell>Status</DataTable.HeadCell>
            <DataTable.HeadCell className="hidden md:table-cell">Reported</DataTable.HeadCell>
            <DataTable.HeadCell className="hidden lg:table-cell">Notes</DataTable.HeadCell>
            <DataTable.HeadCell className="w-10" />
          </DataTable.HeadRow>
        </DataTable.Head>

        <DataTable.Body>
          {reports.map((report) => {
            const bikeIdStr = report.bikeId?.toString?.() ?? report.bikeId ?? ''
            const bike      = bikeMap.get(bikeIdStr)
            const bikeName  = bike
              ? `${bike.assetCode} — ${bike.name}`
              : bikeIdStr.slice(-8)

            return (
              <DataTable.Row key={report._id}>
                <DataTable.Cell>
                  <p className="text-sm font-medium text-foreground">{bikeName}</p>
                </DataTable.Cell>

                <DataTable.Cell>
                  <span className="text-sm text-foreground">
                    {DAMAGE_TYPE_LABELS[report.damageType] ?? report.damageType}
                  </span>
                </DataTable.Cell>

                <DataTable.Cell className="hidden sm:table-cell">
                  <SeverityBadge severity={report.severity} />
                </DataTable.Cell>

                <DataTable.Cell>
                  <DamageReportStatusBadge status={report.status} />
                </DataTable.Cell>

                <DataTable.Cell className="hidden md:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(report.reportedAt)}
                  </span>
                </DataTable.Cell>

                <DataTable.Cell className="hidden lg:table-cell">
                  {report.notes ? (
                    <span className="text-xs text-muted-foreground truncate max-w-[160px] block">
                      {report.notes}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </DataTable.Cell>

                <DataTable.Cell>
                  <RowActions
                    report={report}
                    onStatus={handleStatus}
                    onAddRepair={handleAddRepair}
                  />
                </DataTable.Cell>
              </DataTable.Row>
            )
          })}
        </DataTable.Body>
      </DataTable>

      {/* Modals */}
      <DamageReportStatusDialog
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        report={statusTarget}
      />

      <RepairRecordFormModal
        open={!!repairTarget}
        onClose={() => setRepairTarget(null)}
        damageReportId={repairTarget?.damageReportId}
        damageReportLabel={repairTarget?.label}
      />
    </>
  )
}

export default DamageReportsTable