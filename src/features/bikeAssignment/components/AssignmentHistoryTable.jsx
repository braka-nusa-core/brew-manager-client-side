// src/features/bikeAssignment/components/AssignmentHistoryTable.jsx
// Renders paginated GET /bike-assignments results.
// Raw ObjectIds — names resolved via:
//   employeeId → useEntityMap().employeeMap
//   bikeId     → local useBikes({ limit: 200 }) map (same pattern as
//                CupRecordDetailModal using useProducts for productId resolution)
//
// Columns: Asset Code | Bike | Rider | Start Date | End Date | Status
// No actions — history is read-only. Ended assignments cannot be restarted;
// create a new assignment instead.
//
// "Status" column: open (endDate: null) or ended (endDate set).
// The `active` query param filters these server-side; this table
// receives the filtered data from the parent.

import DataTable       from '@/components/shared/DataTable'
import useEntityMap    from '@/hooks/useEntityMap'
import { useBikes }    from '@/features/bike/hooks/useBikes'
import { cn }          from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────

const formatDate = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return '—' }
}

const StatusBadge = ({ endDate }) => {
  const isActive = endDate === null || endDate === undefined
  return (
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
      {isActive ? 'Active' : 'Ended'}
    </span>
  )
}

// ── Component ─────────────────────────────────────────────────

/**
 * @param {{ assignments: Object[] }} props
 */
const AssignmentHistoryTable = ({ assignments }) => {
  const { employeeMap } = useEntityMap()

  // Fetch bikes (up to 200) to build a bikeId → bike map for name resolution.
  // Default useBikes shows only isActive:true bikes; names for soft-deleted bikes
  // fall back to showing the ID substring — same accepted pattern as Cup Record.
  const { data: bikesData } = useBikes({ limit: 200 })
  const bikes    = bikesData?.data ?? []
  const bikeMap  = new Map(bikes.map((b) => [b._id.toString(), b]))

  return (
    <DataTable>
      <DataTable.Head>
        <DataTable.HeadRow>
          <DataTable.HeadCell>Asset Code</DataTable.HeadCell>
          <DataTable.HeadCell>Bike</DataTable.HeadCell>
          <DataTable.HeadCell>Rider</DataTable.HeadCell>
          <DataTable.HeadCell>Start Date</DataTable.HeadCell>
          <DataTable.HeadCell className="hidden sm:table-cell">End Date</DataTable.HeadCell>
          <DataTable.HeadCell>Status</DataTable.HeadCell>
        </DataTable.HeadRow>
      </DataTable.Head>

      <DataTable.Body>
        {assignments.map((a) => {
          const bikeIdStr = a.bikeId?.toString?.() ?? a.bikeId ?? ''
          const empIdStr  = a.employeeId?.toString?.() ?? a.employeeId ?? ''

          const bike       = bikeMap.get(bikeIdStr)
          const rider      = employeeMap.get(empIdStr)

          const assetCode  = bike?.assetCode ?? bikeIdStr.slice(-6)
          const bikeName   = bike?.name      ?? '—'
          const riderName  = rider?.name     ?? '—'

          return (
            <DataTable.Row key={a._id}>
              {/* Asset Code */}
              <DataTable.Cell>
                <span className="font-mono text-xs font-semibold px-2 py-1 rounded-md bg-muted text-foreground">
                  {assetCode}
                </span>
              </DataTable.Cell>

              {/* Bike Name */}
              <DataTable.Cell>
                <p className="text-sm font-medium text-foreground">{bikeName}</p>
              </DataTable.Cell>

              {/* Rider */}
              <DataTable.Cell>
                <p className="text-sm text-foreground">{riderName}</p>
              </DataTable.Cell>

              {/* Start Date */}
              <DataTable.Cell>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {formatDate(a.startDate)}
                </span>
              </DataTable.Cell>

              {/* End Date */}
              <DataTable.Cell className="hidden sm:table-cell">
                <span className="text-sm text-muted-foreground tabular-nums">
                  {a.endDate ? formatDate(a.endDate) : '—'}
                </span>
              </DataTable.Cell>

              {/* Status */}
              <DataTable.Cell>
                <StatusBadge endDate={a.endDate} />
              </DataTable.Cell>
            </DataTable.Row>
          )
        })}
      </DataTable.Body>
    </DataTable>
  )
}

export default AssignmentHistoryTable