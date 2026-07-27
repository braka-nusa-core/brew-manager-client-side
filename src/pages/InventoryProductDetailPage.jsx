// src/pages/InventoryProductDetailPage.jsx
//
// Sprint 7.3 — Inventory Product Detail ONLY. Route: /inventory/products/:productId
//
// Backend: GET /inventory/products/:productId (Sprint 6.3).
// Returns { product, summary, batches: InventoryBatch[] (freshness-annotated), pagination }.
// Pagination/filtering all lives server-side (page/limit query params) —
// reused via the existing Pagination component exactly like every other
// list-bearing page in this app.
//
// Pattern follows InventoryListPage.jsx / CupRecordsPage.jsx (table-card
// layout with skeleton/error/empty states, page state wired straight to
// the query params).
//
// ── Freshness Summary caveat ──────────────────────────────────
// Unlike GET /inventory (the list endpoint), GET /inventory/products/:id's
// `summary` block does NOT include a freshnessBreakdown for the whole
// product — only totalRemaining/activeBatchCount/depletedBatchCount.
// The freshness summary shown here is therefore computed client-side from
// `batches`, which is the CURRENT PAGE of batches only (paginated
// server-side) — not the product's full history. This is accurate for
// products with ≤ PAGE_SIZE batches, but on later pages it reflects only
// that page. Documented here rather than silently presented as a
// whole-product figure; no backend change was made or needed.

import { useState }        from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Boxes, PackageCheck, PackageX } from 'lucide-react'

import PageHeader           from '@/components/shared/PageHeader'
import DataTable            from '@/components/shared/DataTable'
import Pagination           from '@/components/shared/Pagination'
import ErrorState           from '@/components/shared/ErrorState'
import EmptyState           from '@/components/shared/EmptyState'
import LoadingSpinner       from '@/components/shared/LoadingSpinner'

import { useInventoryProductDetail } from '@/features/inventory/hooks/useInventory'
import { useEffectiveOutletId }      from '@/store/activeOutletStore'
import { cn }                        from '@/lib/utils'

const PAGE_SIZE = 20

const fmtNumber = (n) => (n == null ? '—' : n.toLocaleString('id-ID'))

const fmtDate = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '—' }
}

const FRESHNESS_META = {
  safe:    { label: 'Aman',        className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  warning: { label: 'Peringatan',  className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  expired: { label: 'Kedaluwarsa', className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' },
}

const FreshnessBadge = ({ freshness }) => {
  const meta = FRESHNESS_META[freshness] ?? { label: freshness ?? '—', className: 'bg-muted text-muted-foreground' }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', meta.className)}>
      {meta.label}
    </span>
  )
}

const STATUS_META = {
  active:   { label: 'Aktif', className: 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400' },
  depleted: { label: 'Habis', className: 'bg-muted text-muted-foreground' },
}

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] ?? { label: status ?? '—', className: 'bg-muted text-muted-foreground' }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', meta.className)}>
      {meta.label}
    </span>
  )
}

// ── Component ─────────────────────────────────────────────────

const InventoryProductDetailPage = () => {
  const { productId } = useParams()
  const navigate       = useNavigate()

  const [page, setPage] = useState(1)
  const effectiveOutletId = useEffectiveOutletId()

  const { data, isLoading, isError, error, refetch, isFetching } = useInventoryProductDetail(productId, {
    page,
    limit:    PAGE_SIZE,
    outletId: effectiveOutletId || undefined,
  })

  const product    = data?.product
  const summary    = data?.summary    ?? { totalRemaining: 0, activeBatchCount: 0, depletedBatchCount: 0 }
  const batches    = data?.batches    ?? []
  const pagination = data?.pagination ?? { total: 0, totalPages: 1, page: 1, limit: PAGE_SIZE }

  const totalFresh = batches.reduce(
    (acc, b) => {
      if (b.freshness === 'safe')    acc.safe++
      if (b.freshness === 'warning') acc.warning++
      if (b.freshness === 'expired') acc.expired++
      return acc
    },
    { safe: 0, warning: 0, expired: 0 }
  )

  return (
    <div>
      <PageHeader
        title={isLoading ? 'Memuat…' : (product?.name ?? 'Detail Produk')}
        description="Detail stok, batch, dan kesegaran inventaris produk ini."
      >
        <button
          onClick={() => navigate('/inventory/list')}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
            'border border-input hover:bg-muted transition-colors'
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>
      </PageHeader>

      {!isLoading && isError && (
        <ErrorState
          title="Gagal memuat detail inventaris produk"
          message={error?.response?.data?.message ?? 'Tidak dapat terhubung ke server.'}
          onRetry={refetch}
        />
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {!isLoading && !isError && (
        <div className="space-y-6">
          {/* ── Product info + summary cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">Total Stok Tersisa</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-brand-50 dark:bg-brand-950/30">
                  <Boxes size={16} className="text-brand-600 dark:text-brand-400" />
                </div>
              </div>
              <p className="text-xl font-bold text-foreground tabular-nums">{fmtNumber(summary.totalRemaining)}</p>
              <p className="text-xs text-muted-foreground mt-1">unit</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">Batch Aktif</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-950/30">
                  <PackageCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <p className="text-xl font-bold text-foreground tabular-nums">{fmtNumber(summary.activeBatchCount)}</p>
              <p className="text-xs text-muted-foreground mt-1">batch</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">Batch Habis</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-rose-50 dark:bg-rose-950/30">
                  <PackageX size={16} className="text-rose-600 dark:text-rose-400" />
                </div>
              </div>
              <p className="text-xl font-bold text-foreground tabular-nums">{fmtNumber(summary.depletedBatchCount)}</p>
              <p className="text-xs text-muted-foreground mt-1">batch</p>
            </div>
          </div>

          {/* ── Freshness summary (current page's batches) ── */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Ringkasan Kesegaran</h3>
            <p className="text-xs text-muted-foreground mb-4">Berdasarkan batch pada halaman ini</p>
            {batches.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2 text-center">
                Belum ada batch untuk produk ini.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{totalFresh.safe}</p>
                  <p className="text-xs text-muted-foreground mt-1">Aman</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">{totalFresh.warning}</p>
                  <p className="text-xs text-muted-foreground mt-1">Peringatan</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">{totalFresh.expired}</p>
                  <p className="text-xs text-muted-foreground mt-1">Kedaluwarsa</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Batch list ── */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {batches.length === 0 ? (
              <EmptyState
                icon={<Boxes className="w-5 h-5 text-muted-foreground" />}
                title="Belum ada batch"
                description="Produk ini belum memiliki batch inventaris yang tercatat."
              />
            ) : (
              <>
                <DataTable>
                  <DataTable.Head>
                    <DataTable.HeadRow>
                      <DataTable.HeadCell>Tanggal Produksi</DataTable.HeadCell>
                      <DataTable.HeadCell className="text-right">Jumlah Awal</DataTable.HeadCell>
                      <DataTable.HeadCell className="text-right">Sisa</DataTable.HeadCell>
                      <DataTable.HeadCell>Kesegaran</DataTable.HeadCell>
                      <DataTable.HeadCell>Status Batch</DataTable.HeadCell>
                    </DataTable.HeadRow>
                  </DataTable.Head>
                  <DataTable.Body>
                    {batches.map((batch) => (
                      <DataTable.Row key={batch._id}>
                        <DataTable.Cell className="whitespace-nowrap">
                          {fmtDate(batch.producedAt)}
                          <span className="text-xs text-muted-foreground ml-2">
                            ({batch.ageInDays ?? 0} hari)
                          </span>
                        </DataTable.Cell>
                        <DataTable.Cell className="text-right tabular-nums text-muted-foreground">
                          {fmtNumber(batch.quantityInitial)}
                        </DataTable.Cell>
                        <DataTable.Cell className="text-right tabular-nums font-semibold text-foreground">
                          {fmtNumber(batch.quantityRemaining)}
                        </DataTable.Cell>
                        <DataTable.Cell>
                          <FreshnessBadge freshness={batch.freshness} />
                        </DataTable.Cell>
                        <DataTable.Cell>
                          <StatusBadge status={batch.status} />
                        </DataTable.Cell>
                      </DataTable.Row>
                    ))}
                  </DataTable.Body>
                </DataTable>

                <div className="px-4 py-3 border-t border-border">
                  <Pagination
                    page={pagination.page ?? page}
                    totalPages={pagination.totalPages ?? 1}
                    total={pagination.total ?? 0}
                    limit={PAGE_SIZE}
                    onPageChange={setPage}
                    isLoading={isFetching}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryProductDetailPage