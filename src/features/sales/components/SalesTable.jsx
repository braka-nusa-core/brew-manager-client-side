// src/features/sales/components/SalesTable.jsx
// Sales data table — matches actual backend Sale model:
//   { employeeId, outletId, date, totalCups, totalRevenue, notes }
//
// Fix: employeeId and outletId are raw ObjectId strings from backend
// (not populated). Names resolved via useEntityMap() lookup maps.

import { Coffee }                                 from 'lucide-react'

import DataTable                                  from '@/components/shared/DataTable'
import useEntityMap                               from '@/hooks/useEntityMap'
import { cn }                                     from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────

const formatCurrency = (amount) =>
  amount != null
    ? new Intl.NumberFormat('id-ID', {
        style:                 'currency',
        currency:              'IDR',
        maximumFractionDigits: 0,
      }).format(amount)
    : '—'

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—'

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

// ── Main Table ────────────────────────────────────────────────

const SalesTable = ({ sales }) => {
  // Resolve raw ObjectId strings → names via lookup maps
  const { employeeMap, outletMap } = useEntityMap()

  return (
    <>
      <DataTable>
        <DataTable.Head>
          <DataTable.HeadRow>
            <DataTable.HeadCell>Employee</DataTable.HeadCell>
            <DataTable.HeadCell>Date</DataTable.HeadCell>
            <DataTable.HeadCell>Cups</DataTable.HeadCell>
            <DataTable.HeadCell>Revenue</DataTable.HeadCell>
            <DataTable.HeadCell className="hidden lg:table-cell">Outlet</DataTable.HeadCell>
            <DataTable.HeadCell className="hidden xl:table-cell">Notes</DataTable.HeadCell>
          </DataTable.HeadRow>
        </DataTable.Head>

        <DataTable.Body>
          {sales.map((sale) => {
            // employeeId and outletId are raw ObjectId strings — resolve via map
            const employee   = employeeMap.get(sale.employeeId?.toString())
            const outlet     = outletMap.get(sale.outletId?.toString())
            const empName    = employee?.name     ?? '—'
            const empPos     = employee?.position ?? null
            const outletName = outlet?.name       ?? '—'

            return (
              <DataTable.Row key={sale._id}>
                {/* Employee */}
                <DataTable.Cell>
                  <div className="flex items-center gap-2.5">
                    <MiniAvatar name={empName} />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{empName}</p>
                      {empPos && (
                        <p className="text-xs text-muted-foreground truncate">{empPos}</p>
                      )}
                    </div>
                  </div>
                </DataTable.Cell>

                {/* Date */}
                <DataTable.Cell>
                  <span className="text-sm text-foreground tabular-nums">
                    {formatDate(sale.date)}
                  </span>
                </DataTable.Cell>

                {/* Cups */}
                <DataTable.Cell>
                  <div className="flex items-center gap-1.5">
                    <Coffee className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium tabular-nums">
                      {sale.totalCups ?? '—'}
                    </span>
                  </div>
                </DataTable.Cell>

                {/* Revenue */}
                <DataTable.Cell>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {formatCurrency(sale.totalRevenue)}
                  </span>
                </DataTable.Cell>

                {/* Outlet */}
                <DataTable.Cell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {outletName}
                </DataTable.Cell>

                {/* Notes */}
                <DataTable.Cell className="hidden xl:table-cell">
                  {sale.notes
                    ? <span className="text-xs text-muted-foreground truncate block max-w-[180px]" title={sale.notes}>{sale.notes}</span>
                    : <span className="text-xs text-muted-foreground/40">—</span>
                  }
                </DataTable.Cell>

              </DataTable.Row>
            )
          })}
        </DataTable.Body>
      </DataTable>
    </>
  )
}

export default SalesTable