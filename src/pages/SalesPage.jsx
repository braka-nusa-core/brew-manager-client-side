// src/pages/SalesPage.jsx
// Sales management page — daily employee sales records.
// Actual Sale model: { employeeId, outletId, date, totalCups, totalRevenue, notes }
//
// Filters: date range, per-employee search (future)
// Removed: paymentMethod filter (not in backend model)
// Page subtotal: sum of totalRevenue for current page

import { useState }                from 'react'
import { TrendingUp, Coffee }      from 'lucide-react'

import PageHeader                  from '@/components/shared/PageHeader'
import Pagination                  from '@/components/shared/Pagination'
import EmptyState                  from '@/components/shared/EmptyState'
import ErrorState                  from '@/components/shared/ErrorState'

import SalesTable                  from '@/features/sales/components/SalesTable'
import SalesTableSkeleton          from '@/features/sales/components/SalesTableSkeleton'
import { useSales }                from '@/features/sales/hooks/useSales'
import { useEffectiveOutletId }    from '@/store/activeOutletStore'
import { cn }                      from '@/lib/utils'

const PAGE_SIZE = 20

// Phase 2: Sales is now a read-only ledger — Sale records are generated
// automatically by CupRecord finalize (backend). Manual create/edit/delete
// is intentionally removed from this page for every role. Access to VIEW
// the page is unchanged and still follows the backend's VIEW_SALES /
// MANAGE_SALES grant via router/routeAccess.js — only the write UI is gone.

const today       = () => new Date().toISOString().split('T')[0]
const thirtyDaysAgo = () => {
  const d = new Date(); d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}

const formatCurrency = (n) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(n)

// ── Component ─────────────────────────────────────────────────

const SalesPage = () => {
  const [page,            setPage]            = useState(1)
  const [startDate,       setStartDate]       = useState(thirtyDaysAgo())
  const [endDate,         setEndDate]         = useState(today())

  const effectiveOutletId = useEffectiveOutletId()
  const resetPage       = () => setPage(1)

  const { data, isLoading, isError, error, refetch, isFetching } = useSales({
    page,
    limit:     PAGE_SIZE,
    startDate: startDate || undefined,
    endDate:   endDate   || undefined,
    outletId:  effectiveOutletId || undefined,
    // employeeId filter: future — when backend supports name search
  })

  const sales      = data?.data       ?? []
  const pagination = data?.pagination ?? { total: 0, totalPages: 1, page: 1, limit: PAGE_SIZE }

  // Page-level totals (client-side, current page only)
  const pageTotalRevenue = sales.reduce((s, r) => s + (r.totalRevenue ?? 0), 0)
  const pageTotalCups    = sales.reduce((s, r) => s + (r.totalCups    ?? 0), 0)

  return (
    <>
      <div>
        {/* Header */}
        <PageHeader
          title="Penjualan"
          description="Pantau kontribusi penjualan harian per karyawan di semua outlet Anda."
        />

        {/* Toolbar */}
        <div className="flex flex-col gap-3 mb-4">

          {/* Row 1: Date range + page totals */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Dari</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); resetPage() }}
                disabled={isLoading}
                className={cn(
                  'h-8 px-2 rounded-md border border-input bg-background text-xs',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              />
              <label className="text-xs text-muted-foreground">sampai</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); resetPage() }}
                disabled={isLoading}
                className={cn(
                  'h-8 px-2 rounded-md border border-input bg-background text-xs',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              />
            </div>

            {/* Page subtotals */}
            {!isLoading && !isError && sales.length > 0 && (
              <div className="sm:ml-auto flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Coffee className="w-3.5 h-3.5" />
                  <span className="font-semibold text-foreground tabular-nums">{pageTotalCups}</span>
                  <span>cup</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>Total halaman:</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatCurrency(pageTotalRevenue)}
                  </span>
                </div>
              </div>
            )}

            {/* Refresh indicator */}
            {isFetching && !isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                Memuat ulang…
              </div>
            )}
          </div>
        </div>

        {/* Table card */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading && <SalesTableSkeleton rows={8} />}

          {!isLoading && isError && (
            <ErrorState
              title="Gagal memuat data penjualan"
              message={error?.response?.data?.message ?? 'Tidak dapat terhubung ke server.'}
              onRetry={refetch}
            />
          )}

          {!isLoading && !isError && sales.length === 0 && (
            <EmptyState
              icon={<TrendingUp className="w-5 h-5 text-muted-foreground" />}
              title="Tidak ada data penjualan"
              description="Sesuaikan rentang tanggal untuk melihat data penjualan lainnya."
            />
          )}

          {!isLoading && !isError && sales.length > 0 && (
            <>
              <SalesTable sales={sales} />
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
    </>
  )
}

export default SalesPage