// src/pages/BikesPage.jsx
// Bike management page.
//
// Filters:
//   search    — backend searches name + assetCode via $or (confirmed bike.service.js)
//   status    — operational status: all | ACTIVE | MAINTENANCE | RETIRED
//   isActive  — soft-delete flag: all | true | false
//
// Default: isActive=true (hides soft-deleted records by default, like
// how employees default to showing all but inactive are easily found).
// User can switch to "All" or "Inactive" to find soft-deleted bikes.
//
// Pattern follows EmployeesPage exactly.

import { useState }             from 'react'
import { Bike, PlusCircle }     from 'lucide-react'

import PageHeader               from '@/components/shared/PageHeader'
import SearchInput              from '@/components/shared/SearchInput'
import Pagination               from '@/components/shared/Pagination'
import EmptyState               from '@/components/shared/EmptyState'
import ErrorState               from '@/components/shared/ErrorState'

import BikeTable                from '@/features/bike/components/BikeTable'
import BikeTableSkeleton        from '@/features/bike/components/BikeTableSkeleton'
import BikeFormModal            from '@/features/bike/components/BikeFormModal'
import { useBikes }             from '@/features/bike/hooks/useBikes'
import useDebounce              from '@/hooks/useDebounce'
import { cn }                   from '@/lib/utils'

const PAGE_SIZE = 15

// Operational status filter — '' means no filter sent to backend
const STATUS_FILTERS = [
  { label: 'All Statuses', value: ''            },
  { label: 'Active',       value: 'ACTIVE'      },
  { label: 'Maintenance',  value: 'MAINTENANCE' },
  { label: 'Retired',      value: 'RETIRED'     },
]

// isActive filter — mirrors EmployeesPage STATUS_FILTERS tab pattern
const ACTIVE_FILTERS = [
  { label: 'Active',   value: 'true'      },
  { label: 'All',      value: undefined   },
  { label: 'Inactive', value: 'false'     },
]

const BikesPage = () => {
  const [page,            setPage]            = useState(1)
  const [search,          setSearch]          = useState('')
  const [statusFilter,    setStatusFilter]    = useState('')
  const [isActiveFilter,  setIsActiveFilter]  = useState('true')  // show active by default
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 400)

  const handleSearch = (val) => { setSearch(val); setPage(1) }
  const handleStatus = (val) => { setStatusFilter(val); setPage(1) }
  const handleActive = (val) => { setIsActiveFilter(val); setPage(1) }

  const { data, isLoading, isError, error, refetch, isFetching } = useBikes({
    page,
    limit:    PAGE_SIZE,
    search:   debouncedSearch || undefined,
    status:   statusFilter    || undefined,
    isActive: isActiveFilter,
  })

  const bikes      = data?.data       ?? []
  const pagination = data?.pagination ?? { total: 0, totalPages: 1, page: 1, limit: PAGE_SIZE }

  const showingInactive = isActiveFilter === 'false'
  const hasFilters      = debouncedSearch || statusFilter || showingInactive

  return (
    <>
      <div>
        {/* Header */}
        <PageHeader
          title="Bikes"
          description="Manage bikes registered to your outlets."
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
            Add Bike
          </button>
        </PageHeader>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4 flex-wrap">

          {/* Search */}
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="Search by name or asset code…"
            className="w-full sm:w-72"
            disabled={isLoading}
          />

          {/* Operational status filter — select on narrow viewports */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatus(e.target.value)}
            disabled={isLoading}
            className={cn(
              'h-9 px-2 rounded-md border border-input bg-background text-sm',
              'focus:outline-none focus:ring-2 focus:ring-brand-500',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          {/* isActive tabs — mirrors EmployeesPage */}
          <div className="flex items-center p-1 bg-muted rounded-lg gap-0.5">
            {ACTIVE_FILTERS.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => handleActive(value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  isActiveFilter === value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Background-refetch indicator */}
          {isFetching && !isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:ml-auto">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              Refreshing…
            </div>
          )}
        </div>

        {/* Table card */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">

          {isLoading && <BikeTableSkeleton rows={8} />}

          {!isLoading && isError && (
            <ErrorState
              title="Failed to load bikes"
              message={error?.response?.data?.message ?? 'Could not reach the server.'}
              onRetry={refetch}
            />
          )}

          {!isLoading && !isError && bikes.length === 0 && (
            <EmptyState
              icon={<Bike className="w-5 h-5 text-muted-foreground" />}
              title={
                debouncedSearch
                  ? `No bikes found for "${debouncedSearch}"`
                  : statusFilter
                  ? `No ${statusFilter.toLowerCase()} bikes`
                  : showingInactive
                  ? 'No inactive bikes'
                  : 'No bikes yet'
              }
              description={
                hasFilters
                  ? 'Try clearing the filters to see all bikes.'
                  : 'Add your first bike to get started.'
              }
              action={
                !hasFilters ? (
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                      'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors'
                    )}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add First Bike
                  </button>
                ) : null
              }
            />
          )}

          {!isLoading && !isError && bikes.length > 0 && (
            <>
              <BikeTable bikes={bikes} />
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

      {/* Create modal — outside main div */}
      <BikeFormModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </>
  )
}

export default BikesPage