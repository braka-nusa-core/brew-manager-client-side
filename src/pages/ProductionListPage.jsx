// src/pages/ProductionListPage.jsx
//
// Sprint 8.1 — Production Module. Route: /production
// Sprint 8.2 — quick period filters (today/thisWeek/thisMonth), improved
// search (product name OR batch id, resolved server-side).
//
// Backend: GET /production (thin alias over the existing Inventory
// listTransactions, type='production' forced — Sprint 8.1/8.2). Pagination/
// search/date-filter/sort all live server-side; this page only wires the
// existing shared UI controls to those params — nothing re-implemented.
//
// Pattern follows InventoryAdjustmentPage.jsx exactly (toolbar, table-card
// layout, skeleton/error/empty states, permission-gated write button).

import { useState }             from 'react'
import { useNavigate }          from 'react-router-dom'
import { PackagePlus, Boxes }    from 'lucide-react'

import PageHeader        from '@/components/shared/PageHeader'
import SearchInput       from '@/components/shared/SearchInput'
import Pagination        from '@/components/shared/Pagination'
import DataTable         from '@/components/shared/DataTable'
import ErrorState        from '@/components/shared/ErrorState'
import EmptyState        from '@/components/shared/EmptyState'
import LoadingSpinner    from '@/components/shared/LoadingSpinner'

import RecordProductionModal   from '@/features/production/components/RecordProductionModal'
import { useProductionList }   from '@/features/production/hooks/useProduction'
import useDebounce       from '@/hooks/useDebounce'
import { useAuthStore, selectUserRole } from '@/store/authStore'
import { hasPermission, PERMISSIONS } from '@/constants/permissions'
import { cn }             from '@/lib/utils'

const PAGE_SIZE = 20

const PERIOD_OPTIONS = [
  { value: '',          label: 'Semua' },
  { value: 'today',     label: 'Hari Ini' },
  { value: 'thisWeek',  label: 'Minggu Ini' },
  { value: 'thisMonth', label: 'Bulan Ini' },
]

const fmtNumber = (n) => (n == null ? '—' : n.toLocaleString('id-ID'))

const fmtDate = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

const shortId = (id) => {
  const str = id?.toString?.() ?? id
  if (!str) return '—'
  return str.length > 10 ? `…${str.slice(-8)}` : str
}

// ── Component ─────────────────────────────────────────────────

const ProductionListPage = () => {
  const navigate = useNavigate()
  const role = useAuthStore(selectUserRole)
  const canManage = hasPermission(role, PERMISSIONS.MANAGE_INVENTORY)

  const [page,     setPage]     = useState(1)
  const [search,   setSearch]   = useState('')
  const [period,   setPeriod]   = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 400)
  const resetPage = () => setPage(1)

  const { data, isLoading, isError, error, refetch, isFetching } = useProductionList({
    page,
    limit:    PAGE_SIZE,
    search:   debouncedSearch || undefined,
    // period is a quick-filter shortcut; a custom dateFrom/dateTo (below)
    // only takes effect once period is cleared back to "Semua" — matches
    // the backend's own precedence rule (period wins if both are set).
    period:   period || undefined,
    dateFrom: !period ? (dateFrom || undefined) : undefined,
    dateTo:   !period ? (dateTo || undefined) : undefined,
  })

  const rows       = data?.data       ?? []
  const pagination = data?.pagination ?? { total: 0, totalPages: 1, page: 1, limit: PAGE_SIZE }

  return (
    <div>
      <PageHeader
        title="Produksi"
        description="Riwayat produksi — setiap catatan membuat satu batch inventaris baru."
      >
        {canManage && (
          <button
            onClick={() => setModalOpen(true)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors'
            )}
          >
            <PackagePlus className="w-4 h-4" />
            Catat Produksi
          </button>
        )}
      </PageHeader>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); resetPage() }}
          placeholder="Cari nama produk atau ID batch…"
          className="w-full sm:w-64"
          disabled={isLoading}
        />

        <div className="flex items-center gap-1 rounded-md border border-input p-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setPeriod(opt.value); resetPage() }}
              disabled={isLoading}
              className={cn(
                'px-2.5 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50',
                period === opt.value
                  ? 'bg-brand-500 text-brand-950'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPeriod(''); resetPage() }}
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
            onChange={(e) => { setDateTo(e.target.value); setPeriod(''); resetPage() }}
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
            title="Gagal memuat riwayat produksi"
            message={error?.response?.data?.message ?? 'Tidak dapat terhubung ke server.'}
            onRetry={refetch}
          />
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <EmptyState
            icon={<Boxes className="w-5 h-5 text-muted-foreground" />}
            title="Belum ada produksi"
            description="Sesuaikan filter, atau catat produksi pertama Anda."
          />
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <>
            <DataTable>
              <DataTable.Head>
                <DataTable.HeadRow>
                  <DataTable.HeadCell>Tanggal Produksi</DataTable.HeadCell>
                  <DataTable.HeadCell>Produk</DataTable.HeadCell>
                  <DataTable.HeadCell className="text-right">Kuantitas</DataTable.HeadCell>
                  <DataTable.HeadCell>Batch</DataTable.HeadCell>
                  <DataTable.HeadCell>Outlet</DataTable.HeadCell>
                </DataTable.HeadRow>
              </DataTable.Head>
              <DataTable.Body>
                {rows.map((row) => (
                  <DataTable.Row
                    key={row._id}
                    onClick={() => navigate(`/production/${row._id}`)}
                    className="cursor-pointer"
                  >
                    <DataTable.Cell className="whitespace-nowrap text-muted-foreground">
                      {fmtDate(row.createdAt)}
                    </DataTable.Cell>
                    <DataTable.Cell className="font-medium text-foreground">
                      {row.product?.name ?? shortId(row.productId)}
                    </DataTable.Cell>
                    <DataTable.Cell className="text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      +{fmtNumber(row.quantityDelta)}
                    </DataTable.Cell>
                    <DataTable.Cell className="font-mono text-xs text-muted-foreground">
                      {shortId(row.batchId)}
                    </DataTable.Cell>
                    <DataTable.Cell className="text-muted-foreground">
                      {row.outlet?.name ?? shortId(row.outletId)}
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

      <RecordProductionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}

export default ProductionListPage