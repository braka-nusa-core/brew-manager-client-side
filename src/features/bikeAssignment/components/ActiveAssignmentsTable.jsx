// src/features/bikeAssignment/components/ActiveAssignmentsTable.jsx
// Renders the denormalized /bike-assignments/active response.
//
// IMPORTANT: GET /active does not return _id on items.
// To end an assignment we need the _id — the page fetches
// GET /?active=true in parallel and passes an assignmentIdMap
// (Map<bikeId.toString(), assignmentId>) so this table can
// open EndAssignmentDialog with the correct ID.
//
// Response item shape: { bikeId, bikeName, assetCode, riderId, riderName, startDate }

import { useState }         from 'react'
import { LogOut }            from 'lucide-react'
import DataTable             from '@/components/shared/DataTable'
import EndAssignmentDialog   from './EndAssignmentDialog'
import { cn }                from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────

const formatDate = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return '—' }
}

const getDaysActive = (startDate) => {
  if (!startDate) return null
  const diff = Date.now() - new Date(startDate).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// ── Component ─────────────────────────────────────────────────

/**
 * @param {{
 *   assignments:     Object[],      // from GET /active
 *   assignmentIdMap: Map<string, string>, // bikeId.toString() → assignmentId (_id)
 * }} props
 */
const ActiveAssignmentsTable = ({ assignments, assignmentIdMap }) => {
  const [endTarget, setEndTarget] = useState(null) // { meta, assignmentId }

  const handleEndClick = (item) => {
    const bikeIdStr    = item.bikeId?.toString?.() ?? item.bikeId ?? ''
    const assignmentId = assignmentIdMap.get(bikeIdStr) ?? null
    setEndTarget({
      assignmentId,
      meta: {
        bikeName:  item.bikeName  ?? '—',
        assetCode: item.assetCode ?? '—',
        riderName: item.riderName ?? '—',
        startDate: item.startDate,
      },
    })
  }

  return (
    <>
      <DataTable>
        <DataTable.Head>
          <DataTable.HeadRow>
            <DataTable.HeadCell>Asset Code</DataTable.HeadCell>
            <DataTable.HeadCell>Bike</DataTable.HeadCell>
            <DataTable.HeadCell>Rider</DataTable.HeadCell>
            <DataTable.HeadCell>Start Date</DataTable.HeadCell>
            <DataTable.HeadCell className="hidden sm:table-cell">Days Active</DataTable.HeadCell>
            <DataTable.HeadCell className="w-28" />
          </DataTable.HeadRow>
        </DataTable.Head>

        <DataTable.Body>
          {assignments.map((item) => {
            const bikeIdStr = item.bikeId?.toString?.() ?? item.bikeId ?? ''
            const days      = getDaysActive(item.startDate)

            return (
              <DataTable.Row key={bikeIdStr}>
                {/* Asset Code */}
                <DataTable.Cell>
                  <span className="font-mono text-xs font-semibold px-2 py-1 rounded-md bg-muted text-foreground">
                    {item.assetCode ?? '—'}
                  </span>
                </DataTable.Cell>

                {/* Bike Name */}
                <DataTable.Cell>
                  <p className="text-sm font-medium text-foreground">
                    {item.bikeName ?? '—'}
                  </p>
                </DataTable.Cell>

                {/* Rider Name */}
                <DataTable.Cell>
                  <p className="text-sm text-foreground">{item.riderName ?? '—'}</p>
                </DataTable.Cell>

                {/* Start Date */}
                <DataTable.Cell>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {formatDate(item.startDate)}
                  </span>
                </DataTable.Cell>

                {/* Days active */}
                <DataTable.Cell className="hidden sm:table-cell">
                  {days !== null && (
                    <span className={cn(
                      'text-xs font-medium tabular-nums',
                      days > 30 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                    )}>
                      {days === 0 ? 'Today' : `${days}d`}
                    </span>
                  )}
                </DataTable.Cell>

                {/* End action */}
                <DataTable.Cell>
                  <button
                    onClick={() => handleEndClick(item)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md',
                      'border border-input hover:bg-muted text-muted-foreground hover:text-foreground',
                      'transition-colors'
                    )}
                  >
                    <LogOut className="w-3 h-3" />
                    End
                  </button>
                </DataTable.Cell>
              </DataTable.Row>
            )
          })}
        </DataTable.Body>
      </DataTable>

      <EndAssignmentDialog
        open={!!endTarget}
        onClose={() => setEndTarget(null)}
        assignmentId={endTarget?.assignmentId ?? null}
        meta={endTarget?.meta ?? null}
      />
    </>
  )
}

export default ActiveAssignmentsTable