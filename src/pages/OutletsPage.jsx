// src/pages/OutletsPage.jsx
// Outlet management page.
// Uses card grid layout (not table) — outlets are few, cards show more context.
// Wired to: useOutlets → GET /api/v1/outlets (tenant-scoped by backend)
//
// Access:
//   tenant_admin / super_admin → can create, edit, toggle, delete
//   manager / cashier          → view only (their outlet only, backend enforces)

import { useState }                       from 'react'
import { Plus, Store, LayoutGrid }        from 'lucide-react'

import PageHeader                         from '@/components/shared/PageHeader'
import SearchInput                        from '@/components/shared/SearchInput'
import EmptyState                         from '@/components/shared/EmptyState'
import ErrorState                         from '@/components/shared/ErrorState'

import OutletCard                         from '@/features/outlets/components/OutletCard'
import OutletCardSkeletonGrid             from '@/features/outlets/components/OutletCardSkeleton'
import OutletFormModal                    from '@/features/outlets/components/OutletFormModal'
import { useOutlets }                     from '@/features/outlets/hooks/useOutlets'
import { useAuthStore, selectUserRole }   from '@/store/authStore'
import useDebounce                        from '@/hooks/useDebounce'
import { cn }                             from '@/lib/utils'

// Roles that can manage (create/edit/delete) outlets
const MANAGE_ROLES = ['super_admin', 'tenant_admin']

const STATUS_FILTERS = [
  { label: 'All',      value: undefined  },
  { label: 'Active',   value: 'true'     },
  { label: 'Inactive', value: 'false'    },
]

// ── Page ──────────────────────────────────────────────────────

const OutletsPage = () => {
  const role      = useAuthStore(selectUserRole)
  const canManage = MANAGE_ROLES.includes(role)

  const [search,          setSearch]         = useState('')
  const [statusFilter,    setStatusFilter]   = useState(undefined)
  const [createOpen,      setCreateOpen]     = useState(false)
  const [editTarget,      setEditTarget]     = useState(null)

  const debouncedSearch = useDebounce(search, 400)

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useOutlets({
    search:   debouncedSearch || undefined,
    isActive: statusFilter,
    limit:    50, // outlets are few — load all at once, no pagination needed for MVP
  })

  const outlets = data?.data ?? []

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      <div>
        {/* Header */}
        <PageHeader
          title="Outlets"
          description="Manage your coffee shop locations."
        >
          {canManage && (
            <button
              onClick={() => setCreateOpen(true)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2'
              )}
            >
              <Plus className="w-4 h-4" />
              Add Outlet
            </button>
          )}
        </PageHeader>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <SearchInput
            value={search}
            onChange={(v) => setSearch(v)}
            placeholder="Search outlet name or code…"
            className="w-full sm:w-64"
            disabled={isLoading}
          />

          {/* Status tabs */}
          <div className="flex items-center p-1 bg-muted rounded-lg gap-0.5">
            {STATUS_FILTERS.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => setStatusFilter(value)}
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

          {isFetching && !isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground self-center sm:ml-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              Refreshing…
            </div>
          )}
        </div>

        {/* Summary bar when data loaded */}
        {!isLoading && !isError && outlets.length > 0 && (
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LayoutGrid className="w-4 h-4" />
              <span>
                {outlets.length} outlet{outlets.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                {outlets.filter((o) => o.isActive).length} active
              </span>
              {outlets.filter((o) => !o.isActive).length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  {outlets.filter((o) => !o.isActive).length} inactive
                </span>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading && <OutletCardSkeletonGrid count={6} />}

        {!isLoading && isError && (
          <ErrorState
            title="Failed to load outlets"
            message={error?.response?.data?.message ?? 'Could not reach the server.'}
            onRetry={refetch}
          />
        )}

        {!isLoading && !isError && outlets.length === 0 && (
          <EmptyState
            icon={<Store className="w-5 h-5 text-muted-foreground" />}
            title={
              debouncedSearch
                ? `No outlets matching "${debouncedSearch}"`
                : statusFilter === 'false'
                ? 'No inactive outlets'
                : 'No outlets yet'
            }
            description={
              debouncedSearch
                ? 'Try a different search term.'
                : canManage
                ? 'Add your first outlet to get started.'
                : 'No outlets have been configured yet.'
            }
            action={
              canManage && !debouncedSearch ? (
                <button
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add First Outlet
                </button>
              ) : null
            }
          />
        )}

        {!isLoading && !isError && outlets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {outlets.map((outlet) => (
              <OutletCard
                key={outlet._id}
                outlet={outlet}
                onEdit={setEditTarget}
                canManage={canManage}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <OutletFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      {/* Edit modal */}
      <OutletFormModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        outlet={editTarget}
      />
    </>
  )
}

export default OutletsPage