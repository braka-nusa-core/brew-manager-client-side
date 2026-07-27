// src/pages/InventoryAdjustmentPage.jsx
//
// Sprint 7.5 — Inventory Adjustment & Stock Opname. Route: /inventory/adjustments
//
// Backend: GET /inventory/adjustments (Sprint 6.4) — reused as-is;
// search/reason/date filters + sort/order + pagination all live server-side,
// this page only wires SearchInput/Pagination/DataTable to those params —
// nothing is re-implemented client-side.
//
// "New Adjustment" opens InventoryAdjustmentModal (POST /inventory/adjustment).
// "Stock Opname" opens StockOpnameModal (POST /inventory/opname).
// Both modals live in features/inventory/components/ and are reused here,
// not redefined inline.
//
// ── Product/Outlet name (Sprint 7.6) ─────────────────────────
// GET /inventory/adjustments now returns populated `product: {_id, name}`
// / `outlet: {_id, name}` per row (backend enrichment, additive —
// productId/outletId/batchId are still present too). Rows show the real
// product name (with outlet as secondary text) instead of a raw id;
// batchId has no name of its own (InventoryBatch has no `name` field) so
// it's still shown truncated where relevant, matching Sprint 7.4's page.

import { useState }             from 'react'
import { useNavigate }          from 'react-router-dom'
import { SlidersHorizontal, ClipboardCheck, Boxes } from 'lucide-react'

import PageHeader        from '@/components/shared/PageHeader'
import SearchInput       from '@/components/shared/SearchInput'
import Pagination        from '@/components/shared/Pagination'
import DataTable         from '@/components/shared/DataTable'
import ErrorState        from '@/components/shared/ErrorState'
import EmptyState        from '@/components/shared/EmptyState'
import LoadingSpinner    from '@/components/shared/LoadingSpinner'

import InventoryAdjustmentModal from '@/features/inventory/components/InventoryAdjustmentModal'
import StockOpnameModal         from '@/features/inventory/components/StockOpnameModal'
import { useInventoryAdjustments } from '@/features/inventory/hooks/useInventory'
import useDebounce       from '@/hooks/useDebounce'
import { useAuthStore, selectUserRole } from '@/store/authStore'
import { hasPermission, PERMISSIONS }   from '@/constants/permissions'
import { cn }            from '@/lib/utils'

const PAGE_SIZE = 20

const REASON_OPTIONS = [
  { value: '',             label: 'Semua Alasan' },
  { value: 'damage',       label: 'Rusak' },
  { value: 'loss',         label: 'Hilang' },
  { value: 'correction',   label: 'Koreksi' },
  { value: 'other',        label: 'Lainnya' },
  { value: 'stock_opname', label: 'Stok Opname' },
]

const REASON_LABELS = {
  damage:       'Rusak',
  loss:         'Hilang',
  correction:   'Koreksi',
  other:        'Lainnya',
  stock_opname: 'Stok Opname',
}

const fmtSignedNumber = (n) => {
  if (n == null) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toLocaleString('id-ID')}`
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

const InventoryAdjustmentPage = () => {
  const navigate = useNavigate()
  const role = useAuthStore(selectUserRole)
  const canManage = hasPermission(role, PERMISSIONS.MANAGE_INVENTORY)

  const [page,      setPage]      = useState(1)
  const [search,    setSearch]    = useState('')
  const [reason,    setReason]    = useState('')
  const [dateFrom,  setDateFrom]  = useState('')
  const [dateTo,    setDateTo]    = useState('')

  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false)
  const [opnameModalOpen,     setOpnameModalOpen]     = useState(false)

  const debouncedSearch = useDebounce(search, 400)
  const resetPage = () => setPage(1)

  const { data, isLoading, isError, error, refetch, isFetching } = useInventoryAdjustments({
    page,
    limit:    PAGE_SIZE,
    search:   debouncedSearch || undefined,
    reason:   reason || undefined,
    dateFrom: dateFrom || undefined,
    dateTo:   dateTo || undefined,
  })

  const rows       = data?.data       ?? []
  const pagination = data?.pagination ?? { total: 0, totalPages: 1, page: 1, limit: PAGE_SIZE }

  return (
    <div>
      <PageHeader
        title="Penyesuaian Inventaris"
        description="Riwayat koreksi manual dan stok opname pada batch inventaris."
      >
        {canManage && (
          <>
            <button
              onClick={() => setOpnameModalOpen(true)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                'border border-input hover:bg-muted transition-colors'
              )}
            >
              <ClipboardCheck className="w-4 h-4" />
              Stok Opname
            </button>
            <button
              onClick={() => setAdjustmentModalOpen(true)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors'
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Penyesuaian Baru
            </button>
          </>
        )}
      </PageHeader>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); resetPage() }}
          placeholder="Cari catatan…"
          className="w-full sm:w-56"
          disabled={isLoading}
        />

        <select
          value={reason}
          onChange={(e) => { setReason(e.target.value); resetPage() }}
          disabled={isLoading}
          className={cn(
            'h-9 px-2 rounded-md border border-input bg-background text-xs',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500'
          )}
        >
          {REASON_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); resetPage() }}
            disabled={isLoading}
            className={cn(
              'h-9 px-2 rounded-md border border-input bg-background text-xs',
              'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500'
            )}
          />
          <span className="text-xs text-muted-foreground">s/d</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); resetPage() }}
            disabled={isLoading}
            className={cn(
              'h-9 px-2 rounded-md border border-input bg-background text-xs',
              'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500'
            )}
          />
        </div>

        {isFetching && !isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:ml-auto">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            Memuat ulang…
          </div>
        )}
      </div>

      {/* Table card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {!isLoading && isError && (
          <ErrorState
            title="Gagal memuat penyesuaian inventaris"
            message={error?.response?.data?.message ?? 'Tidak dapat terhubung ke server.'}
            onRetry={refetch}
          />
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <EmptyState
            icon={<Boxes className="w-5 h-5 text-muted-foreground" />}
            title="Belum ada penyesuaian"
            description="Sesuaikan filter, atau catat penyesuaian/stok opname pertama Anda."
          />
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <>
            <DataTable>
              <DataTable.Head>
                <DataTable.HeadRow>
                  <DataTable.HeadCell>Tanggal</DataTable.HeadCell>
                  <DataTable.HeadCell>Produk</DataTable.HeadCell>
                  <DataTable.HeadCell className="text-right">Kuantitas</DataTable.HeadCell>
                  <DataTable.HeadCell>Alasan</DataTable.HeadCell>
                  <DataTable.HeadCell>Catatan</DataTable.HeadCell>
                </DataTable.HeadRow>
              </DataTable.Head>
              <DataTable.Body>
                {rows.map((row) => (
                  <DataTable.Row
                    key={row._id}
                    onClick={() => navigate(`/inventory/adjustments/${row._id}`)}
                    className="cursor-pointer"
                  >
                    <DataTable.Cell className="whitespace-nowrap text-muted-foreground">
                      {fmtDateTime(row.createdAt)}
                    </DataTable.Cell>
                    <DataTable.Cell>
                      <p className="font-medium text-foreground">
                        {row.product?.name ?? shortId(row.productId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.outlet?.name ?? shortId(row.outletId)}
                      </p>
                    </DataTable.Cell>
                    <DataTable.Cell
                      className={cn(
                        'text-right tabular-nums font-semibold',
                        row.quantityDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {fmtSignedNumber(row.quantityDelta)}
                    </DataTable.Cell>
                    <DataTable.Cell>
                      {REASON_LABELS[row.reason] ?? row.reason ?? '—'}
                    </DataTable.Cell>
                    <DataTable.Cell className="text-muted-foreground max-w-[240px] truncate" title={row.notes ?? ''}>
                      {row.notes || '—'}
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

      <InventoryAdjustmentModal
        open={adjustmentModalOpen}
        onClose={() => setAdjustmentModalOpen(false)}
      />
      <StockOpnameModal
        open={opnameModalOpen}
        onClose={() => setOpnameModalOpen(false)}
      />
    </div>
  )
}

export default InventoryAdjustmentPage