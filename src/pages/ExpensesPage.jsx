import { useState }                   from 'react'
import { Receipt, PlusCircle }        from 'lucide-react'

import PageHeader                     from '@/components/shared/PageHeader'
import Pagination                     from '@/components/shared/Pagination'
import EmptyState                     from '@/components/shared/EmptyState'
import ErrorState                     from '@/components/shared/ErrorState'

import ExpenseTable                   from '@/features/expenses/components/ExpenseTable'
import ExpenseTableSkeleton           from '@/features/expenses/components/ExpenseTableSkeleton'
import ExpenseFormModal               from '@/features/expenses/components/ExpenseFormModal'
import { EXPENSE_CATEGORIES, CATEGORY_CONFIG } from '@/features/expenses/components/ExpenseCategoryBadge'
import { useExpenses }                from '@/features/expenses/hooks/useExpenses'
import { useEffectiveOutletId }       from '@/store/activeOutletStore'
import { useAuthStore, selectUserRole } from '@/store/authStore'
import { cn }                         from '@/lib/utils'

const PAGE_SIZE = 20


const MANAGE_ROLES = ['super_admin', 'tenant_admin', 'manager']

const today        = () => new Date().toISOString().split('T')[0]
const thirtyDaysAgo = () => {
  const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]
}

// ── Category filter tabs ──────────────────────────────────────

const CATEGORY_FILTERS = [
  { label: 'Semua', value: '' },
  ...EXPENSE_CATEGORIES.map((cat) => ({
    label: CATEGORY_CONFIG[cat]?.label ?? cat,
    value: cat,
  })),
]

// ── Component ─────────────────────────────────────────────────

const ExpensesPage = () => {
  const role      = useAuthStore(selectUserRole)
  const canManage = MANAGE_ROLES.includes(role)
  const [page,            setPage]           = useState(1)
  const [categoryFilter,  setCategoryFilter] = useState('')
  const [startDate,       setStartDate]      = useState(thirtyDaysAgo())
  const [endDate,         setEndDate]        = useState(today())
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const effectiveOutletId = useEffectiveOutletId()

  const resetPage = () => setPage(1)

  const handleCategory  = (val) => { setCategoryFilter(val); resetPage() }
  const handleStartDate = (val) => { setStartDate(val);      resetPage() }
  const handleEndDate   = (val) => { setEndDate(val);        resetPage() }

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useExpenses({
    page,
    limit:     PAGE_SIZE,
    category:  categoryFilter || undefined,
    startDate: startDate      || undefined,
    endDate:   endDate        || undefined,
    outletId:  effectiveOutletId || undefined,
  })

  const expenses   = data?.data       ?? []
  const pagination = data?.pagination ?? { total: 0, totalPages: 1, page: 1, limit: PAGE_SIZE }

  // Page-level totals (client-side, current page only)
  const pageTotal = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0)
  const formatCurrency = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

  return (
    <>
      <div>
        {/* Header */}
        <PageHeader
          title="Pengeluaran"
          description="Pantau dan kelola semua pengeluaran outlet."
        >
          {canManage && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2'
              )}
            >
              <PlusCircle className="w-4 h-4" />
              Catat Pengeluaran
            </button>
          )}
        </PageHeader>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 mb-4">

          {/* Row 1: Category filter tabs + refresh indicator */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Scrollable category tabs */}
            <div className="flex items-center p-1 bg-muted rounded-lg gap-0.5 overflow-x-auto max-w-full">
              {CATEGORY_FILTERS.map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => handleCategory(value)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap shrink-0',
                    categoryFilter === value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {isFetching && !isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:ml-auto shrink-0">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                Memuat ulang…
              </div>
            )}
          </div>

          {/* Row 2: Date range + page total */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Dari</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDate(e.target.value)}
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
                onChange={(e) => handleEndDate(e.target.value)}
                disabled={isLoading}
                className={cn(
                  'h-8 px-2 rounded-md border border-input bg-background text-xs',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              />
            </div>

            {!isLoading && !isError && expenses.length > 0 && (
              <div className="sm:ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Total Pengeluaran:</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {formatCurrency(pageTotal)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Table card */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">

          {isLoading && <ExpenseTableSkeleton rows={8} />}

          {!isLoading && isError && (
            <ErrorState
              title="Gagal memuat data pengeluaran"
              message={
                error?.response?.data?.message
                  ?? 'Tidak dapat terhubung ke server. Periksa koneksi Anda.'
              }
              onRetry={refetch}
            />
          )}

          {!isLoading && !isError && expenses.length === 0 && (
            <EmptyState
              icon={<Receipt className="w-5 h-5 text-muted-foreground" />}
              title={
                categoryFilter
                  ? `Belum ada pengeluaran ${categoryFilter} pada periode ini`
                  : 'Belum ada data pengeluaran'
              }
              description={
                categoryFilter
                  ? 'Coba kategori lain atau sesuaikan rentang tanggal.'
                  : canManage
                  ? 'Sesuaikan rentang tanggal atau catat pengeluaran pertama Anda.'
                  : 'Sesuaikan rentang tanggal untuk melihat pengeluaran lainnya.'
              }
              action={
                canManage && !categoryFilter ? (
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                      'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors'
                    )}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Catat Pengeluaran Pertama
                  </button>
                ) : null
              }
            />
          )}

          {!isLoading && !isError && expenses.length > 0 && (
            <>
              <ExpenseTable expenses={expenses} canManage={canManage} />
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

      {/* Create modal */}
      <ExpenseFormModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </>
  )
}

export default ExpensesPage