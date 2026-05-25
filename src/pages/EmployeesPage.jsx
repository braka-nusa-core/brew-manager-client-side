// src/pages/EmployeesPage.jsx
// Employee management page.
// Wired to: useEmployees (TanStack Query) → employeeApi → GET /api/v1/employees
// All CRUD actions: Add (EmployeeFormModal), Edit (EmployeeTable → EmployeeFormModal),
//                  Toggle-active (RowActions), Delete (DeleteConfirmDialog)

import { useState }          from 'react'
import { UserPlus, Users }   from 'lucide-react'

import PageHeader             from '@/components/shared/PageHeader'
import SearchInput            from '@/components/shared/SearchInput'
import Pagination             from '@/components/shared/Pagination'
import EmptyState             from '@/components/shared/EmptyState'
import ErrorState             from '@/components/shared/ErrorState'

import EmployeeTable          from '@/features/employee/components/EmployeeTable'
import EmployeeTableSkeleton  from '@/features/employee/components/EmployeeTableSkeleton'
import EmployeeFormModal      from '@/features/employee/components/EmployeeFormModal'
import { useEmployees }       from '@/features/employee/hooks/useEmployees'
import useDebounce            from '@/hooks/useDebounce'
import { cn }                 from '@/lib/utils'

const PAGE_SIZE = 15

const STATUS_FILTERS = [
  { label: 'All',      value: undefined },
  { label: 'Active',   value: 'true'    },
  { label: 'Inactive', value: 'false'   },
]

const EmployeesPage = () => {
  // ── State ──────────────────────────────────────────────────
  const [page,            setPage]            = useState(1)
  const [search,          setSearch]          = useState('')
  const [statusFilter,    setStatusFilter]    = useState(undefined)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 400)

  const handleSearch = (val) => {
    setSearch(val)
    setPage(1)
  }

  const handleStatusFilter = (val) => {
    setStatusFilter(val)
    setPage(1)
  }

  // ── Data ───────────────────────────────────────────────────
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useEmployees({
    page,
    limit:    PAGE_SIZE,
    search:   debouncedSearch || undefined,
    isActive: statusFilter,
  })

  const employees  = data?.data       ?? []
  const pagination = data?.pagination ?? { total: 0, totalPages: 1, page: 1, limit: PAGE_SIZE }

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      {/* Page content */}
      <div>

        {/* Header */}
        <PageHeader
          title="Employees"
          description="Manage your team members across all outlets."
        >
          <button
            onClick={() => setCreateModalOpen(true)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2'
            )}
          >
            <UserPlus className="w-4 h-4" />
            Add Employee
          </button>
        </PageHeader>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">

          {/* Search */}
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="Search by name..."
            className="w-full sm:w-72"
            disabled={isLoading}
          />

          {/* Status filter tabs */}
          <div className="flex items-center p-1 bg-muted rounded-lg gap-0.5">
            {STATUS_FILTERS.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => handleStatusFilter(value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  statusFilter === value
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

          {/* ── Loading state ──────────────────────────────── */}
          {isLoading && (
            <EmployeeTableSkeleton rows={8} />
          )}

          {/* ── Error state ─────────────────────────────────── */}
          {!isLoading && isError && (
            <ErrorState
              title="Failed to load employees"
              message={
                error?.response?.data?.message
                ?? 'Could not reach the server. Check your connection.'
              }
              onRetry={refetch}
            />
          )}

          {/* ── Empty state ─────────────────────────────────── */}
          {!isLoading && !isError && employees.length === 0 && (
            <EmptyState
              icon={<Users className="w-5 h-5 text-muted-foreground" />}
              title={
                debouncedSearch
                  ? `No employees found for "${debouncedSearch}"`
                  : statusFilter === 'false'
                  ? 'No inactive employees'
                  : 'No employees yet'
              }
              description={
                debouncedSearch
                  ? 'Try a different search term or clear the filter.'
                  : statusFilter
                  ? 'Change the status filter to see other employees.'
                  : 'Add your first employee to get started.'
              }
              action={
                !debouncedSearch && !statusFilter ? (
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                      'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors'
                    )}
                  >
                    <UserPlus className="w-4 h-4" />
                    Add First Employee
                  </button>
                ) : null
              }
            />
          )}

          {/* ── Data table ──────────────────────────────────── */}
          {!isLoading && !isError && employees.length > 0 && (
            <>
              <EmployeeTable employees={employees} />

              {/* Pagination */}
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

      {/* ── Create Employee modal ──────────────────────────── */}
      {/* Rendered outside main div so it mounts/unmounts cleanly */}
      <EmployeeFormModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </>
  )
}

export default EmployeesPage