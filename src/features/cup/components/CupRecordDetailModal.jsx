// src/features/cup/components/CupRecordDetailModal.jsx
// Read-only detail view for any cup record (draft or finalized).
// Available for all records regardless of status — see RowActions in CupRecordTable.
//
// Shows:
//   - Rider name, date, outlet, recorded by, status
//   - Items table: product | distributed | refill | carried | sold | returned | reject | accounted | balance
//     (balance = carried - accounted; server returns these computed fields on every read)
//   - Notes
//   - Close button only (all mutations go through separate dialogs/modals)
//
// productId resolution: fetches products locally (limit:100) to build a Map for name lookup,
// matching the pattern used in ProductRecipeEditor (which fetches rawMaterials inline).
// riderId resolution: uses useEntityMap which is already fetched at the app level.

import { Loader2, User, Calendar, Building2, FileText } from 'lucide-react'
import Modal                from '@/components/shared/Modal'
import CupRecordStatusBadge from './CupRecordStatusBadge'
import { useProducts }      from '@/features/product/hooks/useProducts'
import useEntityMap         from '@/hooks/useEntityMap'
import { cn }               from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────

const formatDate = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return '—' }
}

// ── InfoRow ───────────────────────────────────────────────────

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="text-xs">{label}</span>
    </div>
    <span className="text-sm font-medium text-foreground">{value}</span>
  </div>
)

// ── Balance cell ──────────────────────────────────────────────

const BalanceCell = ({ balance }) => (
  <span className={cn(
    'text-xs font-semibold tabular-nums',
    balance === 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-destructive'
  )}>
    {balance === 0 ? '✓ 0' : (balance > 0 ? `+${balance}` : balance)}
  </span>
)

// ── Component ─────────────────────────────────────────────────

/**
 * @param {{
 *   open:    boolean,
 *   onClose: () => void,
 *   record:  Object | null,
 * }} props
 */
const CupRecordDetailModal = ({ open, onClose, record }) => {
  const { employeeMap, outletMap } = useEntityMap()

  // Fetch products to resolve productId → name in the items table.
  // staleTime is generous since this is a reference list that changes rarely.
  const { data: productsData, isLoading: productsLoading } = useProducts(
    { limit: 100 },
    { enabled: open && !!record }
  )
  const products = productsData?.data ?? []
  const productMap = new Map(products.map((p) => [String(p._id), p.name]))

  if (!record) return null

  // Resolve ObjectIds → entity names
  const riderIdStr  = record.riderId?.toString?.() ?? record.riderId ?? ''
  const outletIdStr = record.outletId?.toString?.() ?? record.outletId ?? ''

  const riderName  = employeeMap.get(riderIdStr)?.name  ?? record.riderName  ?? riderIdStr  ?? '—'
  const outletName = outletMap.get(outletIdStr)?.name   ?? record.outletName ?? outletIdStr ?? '—'

  const items = record.items ?? []

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cup Record Detail"
      size="lg"
    >
      <div className="space-y-5">

        {/* Header: date + status */}
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold text-foreground">{formatDate(record.date)}</p>
          <CupRecordStatusBadge status={record.status} />
        </div>

        {/* Meta info */}
        <div className="bg-muted/40 rounded-lg px-1">
          <InfoRow icon={User}      label="Rider"  value={riderName} />
          <InfoRow icon={Building2} label="Outlet" value={outletName} />
          <InfoRow icon={Calendar}  label="Date"   value={formatDate(record.date)} />
          {record.finalizedAt && (
            <InfoRow
              icon={FileText}
              label="Finalized"
              value={formatDate(record.finalizedAt)}
            />
          )}
        </div>

        {/* Items table */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Products ({items.length})
          </p>

          {productsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No items.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Product</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Dist.</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Refill</th>
                    <th className="px-3 py-2 text-center font-medium text-brand-600 dark:text-brand-400">Carried</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Sold</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Ret.</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Rej.</th>
                    <th className="px-3 py-2 text-center font-medium text-brand-600 dark:text-brand-400">Acctd.</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, i) => {
                    const productIdStr = item.productId?.toString?.() ?? item.productId ?? ''
                    const productName  = productMap.get(productIdStr) ?? productIdStr ?? `Product ${i + 1}`

                    // carried / accounted / balance are server-computed and returned on every read
                    const carried   = item.carried   ?? (item.distributed + item.refill)
                    const accounted = item.accounted ?? (item.sold + item.returned + item.reject)
                    const balance   = item.balance   ?? (carried - accounted)

                    return (
                      <tr key={productIdStr || i} className="bg-card hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 font-medium text-foreground">{productName}</td>
                        <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">{item.distributed ?? 0}</td>
                        <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">{item.refill ?? 0}</td>
                        <td className="px-3 py-2 text-center tabular-nums font-semibold text-brand-600 dark:text-brand-400">{carried}</td>
                        <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">{item.sold ?? 0}</td>
                        <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">{item.returned ?? 0}</td>
                        <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">{item.reject ?? 0}</td>
                        <td className="px-3 py-2 text-center tabular-nums font-semibold text-brand-600 dark:text-brand-400">{accounted}</td>
                        <td className="px-3 py-2 text-center">
                          <BalanceCell balance={balance} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notes */}
        {record.notes && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Notes
            </p>
            <p className="text-sm text-foreground bg-muted/30 rounded-lg px-3 py-2 whitespace-pre-wrap">
              {record.notes}
            </p>
          </div>
        )}

        {/* Close */}
        <div className="flex justify-end pt-2 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default CupRecordDetailModal