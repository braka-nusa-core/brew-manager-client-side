// src/pages/SalesPage.jsx
// Sales management page — daily employee sales records.
// Actual Sale model: { employeeId, outletId, date, totalCups, totalRevenue, notes }
//
// Filters: date range, per-employee search (future)
// Removed: paymentMethod filter (not in backend model)
// Page subtotal: sum of totalRevenue for current page

import { useState }                from 'react'
import { TrendingUp, PlusCircle, Coffee } from 'lucide-react'

import PageHeader                  from '@/components/shared/PageHeader'
import SearchInput                 from '@/components/shared/SearchInput'
import Pagination                  from '@/components/shared/Pagination'
import EmptyState                  from '@/components/shared/EmptyState'
import ErrorState                  from '@/components/shared/ErrorState'

import SalesTable                  from '@/features/sales/components/SalesTable'
import SalesTableSkeleton          from '@/features/sales/components/SalesTableSkeleton'
import SalesFormModal              from '@/features/sales/components/SalesFormModal'
import { useSales }                from '@/features/sales/hooks/useSales'
import useDebounce                 from '@/hooks/useDebounce'
import { cn }                      from '@/lib/utils'

const PAGE_SIZE = 20

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
  const [search,          setSearch]          = useState('')
  const [startDate,       setStartDate]       = useState(thirtyDaysAgo())
  const [endDate,         setEndDate]         = useState(today())
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 400)
  const resetPage       = () => setPage(1)

  const { data, isLoading, isError, error, refetch, isFetching } = useSales({
    page,
    limit:     PAGE_SIZE,
    startDate: startDate || undefined,
    endDate:   endDate   || undefined,
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
          title="Sales"
          description="Track daily sales contributions per employee across your outlets."
        >
          <button
            onClick={() => setCreateModalOpen(true)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2'
            )}
          >
            <PlusCircle className="w-4 h-4" />
            Record Sales
          </button>
        </PageHeader>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 mb-4">

          {/* Row 1: Date range + page totals */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">From</label>
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
              <label className="text-xs text-muted-foreground">to</label>
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
                  <span>cups</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>Page total:</span>
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
                Refreshing…
              </div>
            )}
          </div>
        </div>

        {/* Table card */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading && <SalesTableSkeleton rows={8} />}

          {!isLoading && isError && (
            <ErrorState
              title="Failed to load sales"
              message={error?.response?.data?.message ?? 'Could not reach the server.'}
              onRetry={refetch}
            />
          )}

          {!isLoading && !isError && sales.length === 0 && (
            <EmptyState
              icon={<TrendingUp className="w-5 h-5 text-muted-foreground" />}
              title="No sales records found"
              description="Adjust the date range or record the first sales entry."
              action={
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                    'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors'
                  )}
                >
                  <PlusCircle className="w-4 h-4" />
                  Record First Sales
                </button>
              }
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

      <SalesFormModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </>
  )
}

export default SalesPage