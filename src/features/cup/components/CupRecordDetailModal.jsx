// src/features/cup/components/CupRecordDetailModal.jsx
// Read-only detail view for any cup record (draft or finalized).
// Available for all records regardless of status — see RowActions in CupRecordTable.
//
// Shows:
//   - Rider name, date, outlet, recorded by, status
//   - Items table: product | distributed | refill | carried | sold | returned | reject | accounted | balance
//     (balance = carried - accounted; server returns these computed fields on every read)
//   - Per-item expandable Audit History (Phase 3): dispatchLogs[] / refillLogs[] as
//     already returned inline on each item by the existing CupRecord endpoint —
//     no new API calls, read-only, no editing.
//   - Notes
//   - Close button only (all mutations go through separate dialogs/modals)
//
// productId resolution: fetches products locally (limit:100) to build a Map for name lookup,
// matching the pattern used in ProductRecipeEditor (which fetches rawMaterials inline).
// riderId resolution: uses useEntityMap which is already fetched at the app level.
//
// createdBy resolution (dispatchLogs/refillLogs): backend only returns the raw User
// ObjectId here (not populated), and there is no user lookup map available in this
// app without adding a new fetch — which Phase 3 explicitly disallows. So "Created By"
// shows a shortened version of the raw id. This is a known/intentional limitation,
// not a bug — see "Anything suspicious found" in the implementation write-up.

import { useState, useEffect, Fragment } from 'react'
import { Loader2, User, Calendar, Building2, FileText, ChevronDown, PackagePlus, RefreshCw } from 'lucide-react'
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

const formatDateTime = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return '—' }
}

// createdBy is a raw ObjectId string on dispatchLogs/refillLogs (not populated by the
// backend). No user-lookup map exists in this app without a new fetch, which Phase 3
// disallows — so we just shorten the raw id for a compact, still-useful display.
const shortId = (id) => {
  const str = id?.toString?.() ?? id
  if (!str) return '—'
  return str.length > 10 ? `…${str.slice(-6)}` : str
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

// ── Log table (dispatch/refill history) ─────────────────────────

const LogTable = ({ logs, emptyLabel }) => {
  if (!logs || logs.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic py-2 px-1">{emptyLabel}</p>
    )
  }

  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="text-muted-foreground">
          <th className="px-2 py-1 text-left font-medium">Qty</th>
          <th className="px-2 py-1 text-left font-medium">Created At</th>
          <th className="px-2 py-1 text-left font-medium">Created By</th>
          <th className="px-2 py-1 text-left font-medium">Notes</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/60">
        {logs.map((log, i) => (
          <tr key={i}>
            <td className="px-2 py-1 tabular-nums font-medium text-foreground">{log.quantity ?? 0}</td>
            <td className="px-2 py-1 text-muted-foreground whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
            <td className="px-2 py-1 text-muted-foreground font-mono">{shortId(log.createdBy)}</td>
            <td className="px-2 py-1 text-muted-foreground">{log.notes || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

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

  // Phase 3: which items' Audit History section is expanded (by productId string).
  // Purely local UI state — no API calls, no data mutation.
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Reset expand/collapse state whenever a different record is opened
  // (the modal component stays mounted between opens, so state would
  // otherwise leak from the previously viewed record).
  const recordId = record?._id
  useEffect(() => {
    setExpandedIds(new Set())
  }, [recordId])

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

                    const isExpanded = expandedIds.has(productIdStr || String(i))

                    return (
                      <Fragment key={productIdStr || i}>
                        <tr className="bg-card hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2 font-medium text-foreground">
                            <button
                              type="button"
                              onClick={() => toggleExpanded(productIdStr || String(i))}
                              className="flex items-center gap-1.5 text-left hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                              aria-expanded={isExpanded}
                            >
                              <ChevronDown
                                className={cn(
                                  'w-3 h-3 shrink-0 text-muted-foreground transition-transform',
                                  isExpanded && 'rotate-180'
                                )}
                              />
                              {productName}
                            </button>
                          </td>
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

                        {/* Phase 3: expandable Audit History — read-only, sourced
                            entirely from item.dispatchLogs/item.refillLogs, already
                            present on the existing CupRecord response. */}
                        {isExpanded && (
                          <tr className="bg-muted/20">
                            <td colSpan={9} className="px-3 py-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1.5 text-muted-foreground">
                                    <PackagePlus className="w-3 h-3" />
                                    <p className="text-[10px] font-semibold uppercase tracking-wide">
                                      Dispatch History
                                    </p>
                                  </div>
                                  <div className="rounded-md border border-border/60 bg-card overflow-x-auto">
                                    <LogTable
                                      logs={item.dispatchLogs}
                                      emptyLabel="No dispatch history."
                                    />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1.5 text-muted-foreground">
                                    <RefreshCw className="w-3 h-3" />
                                    <p className="text-[10px] font-semibold uppercase tracking-wide">
                                      Refill History
                                    </p>
                                  </div>
                                  <div className="rounded-md border border-border/60 bg-card overflow-x-auto">
                                    <LogTable
                                      logs={item.refillLogs}
                                      emptyLabel="No refill history."
                                    />
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
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