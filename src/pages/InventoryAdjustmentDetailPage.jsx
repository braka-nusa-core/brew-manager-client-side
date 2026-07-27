// src/pages/InventoryAdjustmentDetailPage.jsx
//
// Sprint 7.5 — Adjustment Detail. Route: /inventory/adjustments/:adjustmentId
//
// Backend: GET /inventory/adjustments/:adjustmentId (Sprint 6.4) — reused as-is.
//
// ── Product/Outlet name (Sprint 7.6) ─────────────────────────
// GET /inventory/adjustments/:adjustmentId now returns populated
// `product: {_id, name}` / `outlet: {_id, name}` (backend enrichment,
// additive — productId/outletId are still present too). The Batch field
// still has no name of its own (InventoryBatch has no `name` field) and
// links through to Batch Detail as before.

import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, SlidersHorizontal } from 'lucide-react'

import PageHeader     from '@/components/shared/PageHeader'
import ErrorState     from '@/components/shared/ErrorState'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

import { useInventoryAdjustmentDetail } from '@/features/inventory/hooks/useInventory'
import { cn } from '@/lib/utils'

const REASON_LABELS = {
  damage:       'Rusak',
  loss:         'Hilang',
  correction:   'Koreksi',
  other:        'Lainnya',
  stock_opname: 'Stok Opname',
}

const fmtDateTime = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return '—' }
}

const fmtSignedNumber = (n) => {
  if (n == null) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toLocaleString('id-ID')}`
}

const shortId = (id) => {
  const str = id?.toString?.() ?? id
  if (!str) return '—'
  return str.length > 10 ? `…${str.slice(-8)}` : str
}

// ── Component ─────────────────────────────────────────────────

const InventoryAdjustmentDetailPage = () => {
  const { adjustmentId } = useParams()
  const navigate = useNavigate()

  const { data: adjustment, isLoading, isError, error, refetch } = useInventoryAdjustmentDetail(adjustmentId)

  return (
    <div>
      <PageHeader
        title={isLoading ? 'Memuat…' : `Penyesuaian ${shortId(adjustmentId)}`}
        description="Detail satu transaksi penyesuaian inventaris."
      >
        <button
          onClick={() => navigate('/inventory/adjustments')}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
            'border border-input hover:bg-muted transition-colors'
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>
      </PageHeader>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {!isLoading && isError && (
        <ErrorState
          title="Gagal memuat detail penyesuaian"
          message={error?.response?.data?.message ?? 'Tidak dapat terhubung ke server.'}
          onRetry={refetch}
        />
      )}

      {!isLoading && !isError && adjustment && (
        <div className="rounded-lg border border-border bg-card p-5 max-w-2xl">
          <div className="flex items-center gap-2 mb-5">
            <SlidersHorizontal size={16} className="text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Rincian Penyesuaian</h3>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Batch</p>
              <button
                onClick={() => navigate(`/inventory/batches/${adjustment.batchId}`)}
                className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline font-mono"
              >
                {shortId(adjustment.batchId)}
              </button>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Produk</p>
              <button
                onClick={() => navigate(`/inventory/products/${adjustment.productId}`)}
                className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline"
              >
                {adjustment.product?.name ?? shortId(adjustment.productId)}
              </button>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Outlet</p>
              <p className="text-sm font-medium text-foreground">
                {adjustment.outlet?.name ?? shortId(adjustment.outletId)}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Kuantitas Delta</p>
              <p
                className={cn(
                  'text-sm font-semibold tabular-nums',
                  adjustment.quantityDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {fmtSignedNumber(adjustment.quantityDelta)}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Alasan</p>
              <p className="text-sm font-medium text-foreground">
                {REASON_LABELS[adjustment.reason] ?? adjustment.reason ?? '—'}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Sebelum</p>
              <p className="text-sm font-medium text-foreground tabular-nums">{adjustment.beforeQuantity ?? '—'}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Sesudah</p>
              <p className="text-sm font-medium text-foreground tabular-nums">{adjustment.afterQuantity ?? '—'}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Dibuat Pada</p>
              <p className="text-sm font-medium text-foreground">{fmtDateTime(adjustment.createdAt)}</p>
            </div>

            <div className="col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Catatan</p>
              <p className="text-sm text-foreground">{adjustment.notes || '—'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryAdjustmentDetailPage