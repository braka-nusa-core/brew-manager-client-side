// src/pages/InventoryListPage.jsx
//
// Sprint 7.2 — Inventory List ONLY. Route: /inventory/list
//
// Backend: GET /inventory (per-product stock overview) — Sprint 6.3.
// Params: search, sort ('name'|'remaining'|'oldest'), order ('asc'|'desc'),
// outletId (admin tiers only), page, limit. Pagination/search/sort/filter
// logic all lives server-side — this page only wires the existing shared
// UI controls (SearchInput, Pagination, DataTable) to those params;
// nothing is re-implemented client-side.
//
// Pattern follows CupRecordsPage/SalesPage exactly (search/debounce,
// page state, effective-outlet scoping, table-card layout with
// skeleton/error/empty states).
//
// ── Outlet column caveat ─────────────────────────────────────
// GET /inventory groups by productId only — it does not return an
// outletId per row (a row can represent stock aggregated across ALL
// outlets when an admin has "All Outlets" selected). So the Outlet
// column here shows:
//   - the resolved name of the single outlet currently in scope
//     (useEffectiveOutletId + useEntityMap — same lookup pattern as
//     every other table in this app), when the view IS single-outlet
//     scoped (manager/cashier/viewer, or an admin with one outlet picked)
//   - "Semua Outlet" when an admin is viewing "All Outlets" (no single
//     outlet applies to the whole list)
// This is a read of the existing backend response as-is — no backend
// change was made or needed to display this column.
//
// ── Last Updated column caveat ───────────────────────────────
// The backend does not return a genuine "last modified" timestamp for a
// product's inventory rollup. The closest available field is
// `newestProducedAt` (the most recently produced batch for that
// product) — used here for the "Last Updated" column since it's the
// only date-like signal the existing endpoint provides.

import { useState }             from 'react'
import { useNavigate }          from 'react-router-dom'
import { Boxes, Eye }            from 'lucide-react'

import PageHeader                from '@/components/shared/PageHeader'
import SearchInput               from '@/components/shared/SearchInput'
import Pagination                from '@/components/shared/Pagination'
import EmptyState                from '@/components/shared/EmptyState'
import ErrorState                from '@/components/shared/ErrorState'
import DataTable                 from '@/components/shared/DataTable'
import LoadingSpinner            from '@/components/shared/LoadingSpinner'

import { useInventoryList }      from '@/features/inventory/hooks/useInventory'
import { useEffectiveOutletId }  from '@/store/activeOutletStore'
import useEntityMap              from '@/hooks/useEntityMap'
import useDebounce               from '@/hooks/useDebounce'
import { cn }                    from '@/lib/utils'

const PAGE_SIZE = 20

const SORT_OPTIONS = [
  { value: 'remaining', label: 'Stok Terbanyak' },
  { value: 'name',      label: 'Nama Produk' },
  { value: 'oldest',    label: 'Batch Tertua' },
]

const ORDER_OPTIONS = [
  { value: 'desc', label: 'Menurun' },
  { value: 'asc',  label: 'Menaik' },
]

const fmtNumber = (n) => (n == null ? '—' : n.toLocaleString('id-ID'))

const fmtDate = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '—' }
}

// ── Component ─────────────────────────────────────────────────

const InventoryListPage = () => {
  const navigate = useNavigate()

  const [page,   setPage]   = useState(1)
  const [search, setSearch] = useState('')
  const [sort,   setSort]   = useState('remaining')
  const [order,  setOrder]  = useState('desc')

  const debouncedSearch  = useDebounce(search, 400)
  const effectiveOutletId = useEffectiveOutletId()
  const { outletMap }      = useEntityMap()

  const resetPage = () => setPage(1)

  const { data, isLoading, isError, error, refetch, isFetching } = useInventoryList({
    page,
    limit:    PAGE_SIZE,
    search:   debouncedSearch || undefined,
    sort,
    order,
    outletId: effectiveOutletId || undefined,
  })

  const rows       = data?.data       ?? []
  const pagination = data?.pagination ?? { total: 0, totalPages: 1, page: 1, limit: PAGE_SIZE }

  // Single resolved outlet name for the whole list, when scoped (see
  // file header for why this can't be per-row from the current API).
  const scopedOutletName = effectiveOutletId
    ? outletMap.get(effectiveOutletId)?.name ?? '—'
    : null

  return (
    <div>
      <PageHeader
        title="Daftar Inventaris"
        description="Ringkasan stok per produk — total stok, batch aktif, dan kesegaran."
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); resetPage() }}
          placeholder="Cari produk..."
          className="w-full sm:w-64"
          disabled={isLoading}
        />

        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); resetPage() }}
          disabled={isLoading}
          className={cn(
            'h-9 px-2 rounded-md border border-input bg-background text-xs',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          value={order}
          onChange={(e) => { setOrder(e.target.value); resetPage() }}
          disabled={isLoading}
          className={cn(
            'h-9 px-2 rounded-md border border-input bg-background text-xs',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {ORDER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

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
            title="Gagal memuat daftar inventaris"
            message={error?.response?.data?.message ?? 'Tidak dapat terhubung ke server.'}
            onRetry={refetch}
          />
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <EmptyState
            icon={<Boxes className="w-5 h-5 text-muted-foreground" />}
            title="Belum ada data inventaris"
            description="Sesuaikan pencarian, atau catat produksi pertama Anda untuk mulai melacak stok."
          />
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <>
            <DataTable>
              <DataTable.Head>
                <DataTable.HeadRow>
                  <DataTable.HeadCell>Produk</DataTable.HeadCell>
                  <DataTable.HeadCell className="text-right">Total Stok</DataTable.HeadCell>
                  <DataTable.HeadCell className="text-right">Batch Aktif</DataTable.HeadCell>
                  <DataTable.HeadCell className="text-right">Aman</DataTable.HeadCell>
                  <DataTable.HeadCell className="text-right">Peringatan</DataTable.HeadCell>
                  <DataTable.HeadCell className="text-right">Kedaluwarsa</DataTable.HeadCell>
                  <DataTable.HeadCell>Outlet</DataTable.HeadCell>
                  <DataTable.HeadCell>Terakhir Diperbarui</DataTable.HeadCell>
                  <DataTable.HeadCell className="w-10" />
                </DataTable.HeadRow>
              </DataTable.Head>
              <DataTable.Body>
                {rows.map((row) => (
                  <DataTable.Row
                    key={row.productId}
                    onClick={() => navigate(`/inventory/products/${row.productId}`)}
                    className="cursor-pointer"
                  >
                    <DataTable.Cell>
                      <span className="font-medium text-foreground">{row.productName}</span>
                      {row.productIsActive === false && (
                        <span className="ml-2 text-xs text-muted-foreground italic">(nonaktif)</span>
                      )}
                    </DataTable.Cell>
                    <DataTable.Cell className="text-right tabular-nums">{fmtNumber(row.totalRemaining)}</DataTable.Cell>
                    <DataTable.Cell className="text-right tabular-nums">{fmtNumber(row.activeBatchCount)}</DataTable.Cell>
                    <DataTable.Cell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {fmtNumber(row.freshnessBreakdown?.safe)}
                    </DataTable.Cell>
                    <DataTable.Cell className="text-right tabular-nums text-amber-600 dark:text-amber-400">
                      {fmtNumber(row.freshnessBreakdown?.warning)}
                    </DataTable.Cell>
                    <DataTable.Cell className="text-right tabular-nums text-rose-600 dark:text-rose-400">
                      {fmtNumber(row.freshnessBreakdown?.expired)}
                    </DataTable.Cell>
                    <DataTable.Cell className="text-muted-foreground">
                      {scopedOutletName ?? 'Semua Outlet'}
                    </DataTable.Cell>
                    <DataTable.Cell className="text-muted-foreground whitespace-nowrap">
                      {fmtDate(row.newestProducedAt)}
                    </DataTable.Cell>
                    <DataTable.Cell onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/inventory/products/${row.productId}`)}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        aria-label="Lihat detail"
                        title="Lihat detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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
  )
}

export default InventoryListPage