// src/pages/ProductionDetailPage.jsx
//
// Sprint 8.1 — Production Module. Route: /production/:productionId
//
// Backend: GET /production/:productionId → { transaction, batch } (both
// product/outlet populated, same enrichment as Inventory Sprint 7.6).
//
// Pattern follows InventoryAdjustmentDetailPage.jsx (single-record info
// card, Back button in PageHeader's children slot).

import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, PackagePlus } from 'lucide-react'

import PageHeader     from '@/components/shared/PageHeader'
import ErrorState     from '@/components/shared/ErrorState'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

import { useProductionDetail } from '@/features/production/hooks/useProduction'
import { cn } from '@/lib/utils'

const fmtNumber = (n) => (n == null ? '—' : n.toLocaleString('id-ID'))

const fmtDate = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

const fmtDateTime = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return '—' }
}

const shortId = (id) => {
  const str = id?.toString?.() ?? id
  if (!str) return '—'
  return str.length > 10 ? `…${str.slice(-8)}` : str
}

// ── Component ─────────────────────────────────────────────────

const ProductionDetailPage = () => {
  const { productionId } = useParams()
  const navigate = useNavigate()

  const { data, isLoading, isError, error, refetch } = useProductionDetail(productionId)
  const transaction = data?.transaction
  const batch       = data?.batch

  return (
    <div>
      <PageHeader
        title={isLoading ? 'Memuat…' : `Produksi ${shortId(productionId)}`}
        description="Detail satu catatan produksi — transaksi dan batch yang dibuat."
      >
        <button
          onClick={() => navigate('/production')}
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
          title="Gagal memuat detail produksi"
          message={error?.response?.data?.message ?? 'Tidak dapat terhubung ke server.'}
          onRetry={refetch}
        />
      )}

      {!isLoading && !isError && transaction && (
        <div className="rounded-lg border border-border bg-card p-5 max-w-2xl">
          <div className="flex items-center gap-2 mb-5">
            <PackagePlus size={16} className="text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Rincian Produksi</h3>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Produk</p>
              <button
                onClick={() => navigate(`/inventory/products/${transaction.productId}`)}
                className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline"
              >
                {transaction.product?.name ?? shortId(transaction.productId)}
              </button>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Outlet</p>
              <p className="text-sm font-medium text-foreground">
                {transaction.outlet?.name ?? shortId(transaction.outletId)}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Kuantitas</p>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{fmtNumber(transaction.quantityDelta)}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Tanggal Produksi</p>
              <p className="text-sm font-medium text-foreground">{fmtDate(batch?.producedAt)}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Batch</p>
              <button
                onClick={() => navigate(`/inventory/batches/${transaction.batchId}`)}
                className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline font-mono"
              >
                {shortId(transaction.batchId)}
              </button>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Sisa Kuantitas Batch</p>
              <p className="text-sm font-medium text-foreground tabular-nums">{fmtNumber(batch?.quantityRemaining)}</p>
            </div>

            <div className="col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Dicatat Pada</p>
              <p className="text-sm text-foreground">{fmtDateTime(transaction.createdAt)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductionDetailPage