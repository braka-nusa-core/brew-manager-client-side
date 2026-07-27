// src/pages/InventoryBatchDetailPage.jsx
//
// Sprint 7.4 — Inventory Batch Detail ONLY. Route: /inventory/batches/:batchId
//
// Backend (Sprint 6.3, unmodified):
//   GET /inventory/batches/:batchId               — batch info (freshness-annotated)
//   GET /inventory/batches/:batchId/transactions   — full movement ledger for that batch
//
// Pattern follows InventoryProductDetailPage.jsx (table-card layout with
// skeleton/error/empty states, page state wired straight to query params).
//
// ── Product/Outlet name (Sprint 7.6) ─────────────────────────
// Both GET /inventory/batches/:batchId and its /transactions endpoint now
// return populated `product: {_id, name}` / `outlet: {_id, name}` objects
// (backend enrichment, additive — productId/outletId are still present
// too). This page shows the real name, falling back to the shortened raw
// id only if the backend ever returns product/outlet as null (e.g. a
// dangling reference) — not treated as an error case, just a graceful
// fallback.
//
// ── Sort/Order caveat ─────────────────────────────────────────
// GET /inventory/batches/:batchId/transactions only supports an `order`
// param (asc/desc on createdAt) — unlike GET /inventory/transactions,
// it has no separate `sort` field selector (there is only one sortable
// dimension here: time). So this page exposes a single "Urutan"
// (chronological order) control, not two — reusing exactly what the
// endpoint supports rather than fabricating a control with nothing behind it.

import { useState }               from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Package }      from 'lucide-react'

import PageHeader      from '@/components/shared/PageHeader'
import DataTable        from '@/components/shared/DataTable'
import Pagination       from '@/components/shared/Pagination'
import ErrorState       from '@/components/shared/ErrorState'
import EmptyState       from '@/components/shared/EmptyState'
import LoadingSpinner   from '@/components/shared/LoadingSpinner'

import { useInventoryBatchDetail, useBatchTransactions } from '@/features/inventory/hooks/useInventory'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

const TRANSACTION_TYPES = ['production', 'dispatch', 'refill', 'return', 'reject', 'adjustment']

const TRANSACTION_TYPE_LABELS = {
  production: 'Produksi',
  dispatch:   'Dispatch',
  refill:     'Refill',
  return:     'Retur',
  reject:     'Reject',
  adjustment: 'Penyesuaian',
}

const REASON_LABELS = {
  damage:       'Rusak',
  loss:         'Hilang',
  correction:   'Koreksi',
  other:        'Lainnya',
  stock_opname: 'Stok Opname',
}

const FRESHNESS_META = {
  safe:    { label: 'Aman',        className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  warning: { label: 'Peringatan',  className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  expired: { label: 'Kedaluwarsa', className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' },
}

const STATUS_META = {
  active:   { label: 'Aktif', className: 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400' },
  depleted: { label: 'Habis', className: 'bg-muted text-muted-foreground' },
}

const fmtNumber = (n) => (n == null ? '—' : n.toLocaleString('id-ID'))

const fmtSignedNumber = (n) => {
  if (n == null) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toLocaleString('id-ID')}`
}

const fmtDate = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '—' }
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

const Badge = ({ meta, fallback }) => {
  const m = meta ?? { label: fallback ?? '—', className: 'bg-muted text-muted-foreground' }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', m.className)}>
      {m.label}
    </span>
  )
}

// ── Component ─────────────────────────────────────────────────

const InventoryBatchDetailPage = () => {
  const { batchId } = useParams()
  const navigate     = useNavigate()

  const [page,  setPage]  = useState(1)
  const [type,  setType]  = useState('')
  const [order, setOrder] = useState('asc') // chronological — matches backend default

  const {
    data: batch,
    isLoading: batchLoading,
    isError: batchError,
    error: batchErrorObj,
    refetch: refetchBatch,
  } = useInventoryBatchDetail(batchId)

  const {
    data: txnData,
    isLoading: txnLoading,
    isError: txnIsError,
    error: txnErrorObj,
    refetch: refetchTxns,
    isFetching: txnFetching,
  } = useBatchTransactions(batchId, {
    page,
    limit: PAGE_SIZE,
    type:  type || undefined,
    order,
  })

  const transactions = txnData?.data       ?? []
  const pagination    = txnData?.pagination ?? { total: 0, totalPages: 1, page: 1, limit: PAGE_SIZE }

  const isLoading = batchLoading || txnLoading
  const isError   = batchError || txnIsError

  const handleBack = () => {
    if (batch?.productId) navigate(`/inventory/products/${batch.productId}`)
    else navigate(-1)
  }

  return (
    <div>
      <PageHeader
        title={batchLoading ? 'Memuat…' : `Batch ${shortId(batchId)}`}
        description="Informasi batch dan riwayat pergerakan inventaris."
      >
        <button
          onClick={handleBack}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
            'border border-input hover:bg-muted transition-colors'
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Produk
        </button>
      </PageHeader>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {!isLoading && isError && (
        <ErrorState
          title="Gagal memuat detail batch"
          message={
            batchErrorObj?.response?.data?.message
            ?? txnErrorObj?.response?.data?.message
            ?? 'Tidak dapat terhubung ke server.'
          }
          onRetry={() => { refetchBatch(); refetchTxns() }}
        />
      )}

      {!isLoading && !isError && (
        <div className="space-y-6">
          {/* ── A. Batch Information ── */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package size={16} className="text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Informasi Batch</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">ID Batch</p>
                <p className="text-sm font-medium text-foreground font-mono">{shortId(batch?._id)}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Produk</p>
                <button
                  onClick={() => batch?.productId && navigate(`/inventory/products/${batch.productId}`)}
                  className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline"
                >
                  {batch?.product?.name ?? shortId(batch?.productId)}
                </button>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Outlet</p>
                <p className="text-sm font-medium text-foreground">
                  {batch?.outlet?.name ?? shortId(batch?.outletId)}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Tanggal Produksi</p>
                <p className="text-sm font-medium text-foreground">{fmtDate(batch?.producedAt)}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Umur</p>
                <p className="text-sm font-medium text-foreground">{fmtNumber(batch?.ageInDays)} hari</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Jumlah Awal</p>
                <p className="text-sm font-medium text-foreground tabular-nums">{fmtNumber(batch?.quantityInitial)}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Sisa Kuantitas</p>
                <p className="text-sm font-semibold text-foreground tabular-nums">{fmtNumber(batch?.quantityRemaining)}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Status Batch</p>
                <Badge meta={STATUS_META[batch?.status]} fallback={batch?.status} />
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Kesegaran</p>
                <Badge meta={FRESHNESS_META[batch?.freshness]} fallback={batch?.freshness} />
              </div>
            </div>
          </div>

          {/* ── B. Transaction History ── */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-border">
              <select
                value={type}
                onChange={(e) => { setType(e.target.value); setPage(1) }}
                className={cn(
                  'h-9 px-2 rounded-md border border-input bg-background text-xs',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500'
                )}
              >
                <option value="">Semua Tipe</option>
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t} value={t}>{TRANSACTION_TYPE_LABELS[t]}</option>
                ))}
              </select>

              <select
                value={order}
                onChange={(e) => { setOrder(e.target.value); setPage(1) }}
                className={cn(
                  'h-9 px-2 rounded-md border border-input bg-background text-xs',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500'
                )}
              >
                <option value="asc">Terlama ke Terbaru</option>
                <option value="desc">Terbaru ke Terlama</option>
              </select>

              {txnFetching && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:ml-auto">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                  Memuat ulang…
                </div>
              )}
            </div>

            {transactions.length === 0 ? (
              <EmptyState
                icon={<Package className="w-5 h-5 text-muted-foreground" />}
                title="Belum ada transaksi"
                description="Belum ada pergerakan tercatat untuk batch ini."
              />
            ) : (
              <>
                <DataTable>
                  <DataTable.Head>
                    <DataTable.HeadRow>
                      <DataTable.HeadCell>Tanggal</DataTable.HeadCell>
                      <DataTable.HeadCell>Tipe</DataTable.HeadCell>
                      <DataTable.HeadCell className="text-right">Kuantitas</DataTable.HeadCell>
                      <DataTable.HeadCell>Alasan</DataTable.HeadCell>
                      <DataTable.HeadCell className="text-right">Sebelum</DataTable.HeadCell>
                      <DataTable.HeadCell className="text-right">Sesudah</DataTable.HeadCell>
                      <DataTable.HeadCell>Catatan</DataTable.HeadCell>
                    </DataTable.HeadRow>
                  </DataTable.Head>
                  <DataTable.Body>
                    {transactions.map((txn) => (
                      <DataTable.Row key={txn._id}>
                        <DataTable.Cell className="whitespace-nowrap text-muted-foreground">
                          {fmtDateTime(txn.createdAt)}
                        </DataTable.Cell>
                        <DataTable.Cell>
                          {TRANSACTION_TYPE_LABELS[txn.type] ?? txn.type}
                        </DataTable.Cell>
                        <DataTable.Cell
                          className={cn(
                            'text-right tabular-nums font-semibold',
                            txn.quantityDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          )}
                        >
                          {fmtSignedNumber(txn.quantityDelta)}
                        </DataTable.Cell>
                        <DataTable.Cell className="text-muted-foreground">
                          {txn.reason ? (REASON_LABELS[txn.reason] ?? txn.reason) : '—'}
                        </DataTable.Cell>
                        <DataTable.Cell className="text-right tabular-nums text-muted-foreground">
                          {txn.beforeQuantity ?? '—'}
                        </DataTable.Cell>
                        <DataTable.Cell className="text-right tabular-nums text-muted-foreground">
                          {txn.afterQuantity ?? '—'}
                        </DataTable.Cell>
                        <DataTable.Cell className="text-muted-foreground max-w-[200px] truncate" title={txn.notes ?? ''}>
                          {txn.notes || '—'}
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
                    isLoading={txnFetching}
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

export default InventoryBatchDetailPage