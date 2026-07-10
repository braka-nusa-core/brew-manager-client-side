// src/pages/UsersPage.jsx
// User account management. Requires MANAGE_USERS (tenant_admin + super_admin).
// Backend returns 403 for other roles — handled by ErrorState.
// Filters: search (name/email), role, isActive

import { useState }         from 'react'
import { Users, PlusCircle } from 'lucide-react'

import PageHeader            from '@/components/shared/PageHeader'
import SearchInput           from '@/components/shared/SearchInput'
import Pagination            from '@/components/shared/Pagination'
import EmptyState            from '@/components/shared/EmptyState'
import ErrorState            from '@/components/shared/ErrorState'
import UserTable             from '@/features/user/components/UserTable'
import UserTableSkeleton     from '@/features/user/components/UserTableSkeleton'
import UserFormModal         from '@/features/user/components/UserFormModal'
import { useUsers }          from '@/features/user/hooks/useUsers'
import { CREATABLE_ROLES, ROLE_LABELS } from '@/features/user/components/UserRoleBadge'
import useDebounce           from '@/hooks/useDebounce'
import { cn }                from '@/lib/utils'

const PAGE_SIZE = 15

const ROLE_FILTER_OPTIONS = [
  { value: '',             label: 'All Roles' },
  ...CREATABLE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] })),
  { value: 'tenant_admin', label: 'Tenant Admin' },
]

const ACTIVE_FILTERS = [
  { label: 'Active',   value: 'true'      },
  { label: 'All',      value: undefined   },
  { label: 'Inactive', value: 'false'     },
]

const UsersPage = () => {
  const [page,            setPage]            = useState(1)
  const [search,          setSearch]          = useState('')
  const [roleFilter,      setRoleFilter]      = useState('')
  const [isActiveFilter,  setIsActiveFilter]  = useState('true')
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 400)

  const resetPage = () => setPage(1)

  const { data, isLoading, isError, error, refetch, isFetching } = useUsers({
    page,
    limit:    PAGE_SIZE,
    search:   debouncedSearch || undefined,
    role:     roleFilter      || undefined,
    isActive: isActiveFilter,
  })

  const users      = data?.data       ?? []
  const pagination = data?.pagination ?? { total: 0, totalPages: 1, page: 1, limit: PAGE_SIZE }

  return (
    <>
      <div>
        <PageHeader title="Users" description="Manage login accounts for managers, cashiers, and viewers.">
          <button onClick={() => setCreateModalOpen(true)}
            className={cn('inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors')}>
            <PlusCircle className="w-4 h-4" />Create User
          </button>
        </PageHeader>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4 flex-wrap">
          <SearchInput value={search} onChange={(v) => { setSearch(v); resetPage() }}
            placeholder="Search by name or email…" className="w-full sm:w-72" disabled={isLoading} />

          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); resetPage() }}
            disabled={isLoading}
            className="h-9 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50">
            {ROLE_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <div className="flex items-center p-1 bg-muted rounded-lg gap-0.5">
            {ACTIVE_FILTERS.map(({ label, value }) => (
              <button key={label} onClick={() => { setIsActiveFilter(value); resetPage() }}
                className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  isActiveFilter === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {label}
              </button>
            ))}
          </div>

          {isFetching && !isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:ml-auto">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              Refreshing…
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading && <UserTableSkeleton rows={8} />}

          {!isLoading && isError && (
            <ErrorState
              title={error?.response?.status === 403 ? 'Access denied' : 'Failed to load users'}
              message={
                error?.response?.status === 403
                  ? 'User management requires admin permissions.'
                  : (error?.response?.data?.message ?? 'Could not reach the server.')
              }
              onRetry={error?.response?.status !== 403 ? refetch : undefined}
            />
          )}

          {!isLoading && !isError && users.length === 0 && (
            <EmptyState icon={<Users className="w-5 h-5 text-muted-foreground" />}
              title="No users found"
              description={debouncedSearch || roleFilter ? 'Try clearing the filters.' : 'Create the first login account.'}
              action={!debouncedSearch && !roleFilter ? (
                <button onClick={() => setCreateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors">
                  <PlusCircle className="w-4 h-4" />Create User
                </button>
              ) : null}
            />
          )}

          {!isLoading && !isError && users.length > 0 && (
            <>
              <UserTable users={users} />
              <div className="px-4 py-3 border-t border-border">
                <Pagination page={pagination.page ?? page} totalPages={pagination.totalPages ?? 1}
                  total={pagination.total ?? 0} limit={PAGE_SIZE} onPageChange={setPage} isLoading={isFetching} />
              </div>
            </>
          )}
        </div>
      </div>

      <UserFormModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </>
  )
}

export default UsersPage