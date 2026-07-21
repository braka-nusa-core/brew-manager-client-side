// ============================================================
// features/outlets/components/OutletSwitcher.jsx
// Navbar outlet switcher — replaces the old static placeholder.
//
// Permission model (mirrors backend outlet-scoping exactly):
//   super_admin / tenant_admin → can switch to any outlet (tenant_admin
//     is further scoped to their own tenant by the backend's own
//     tenantGuard/GET /outlets query — never duplicated here).
//   manager / cashier / anyone else → read-only, always their own
//     assigned outlet (user.outletId). Rendered as a plain <div>,
//     not a <button> — no dropdown, no click affordance at all.
//
// This is a UI convenience only. Even if a future bug somehow let a
// manager/cashier select a different outlet here, the backend already
// independently re-derives and enforces their outlet scope from the
// JWT on every request (buildBaseQuery forces query.outletId back to
// user.outletId for these roles, ignoring any client-supplied value —
// confirmed across the Employee/Outlet module audits). Hiding the UI
// here is a convenience, not the actual security boundary.
//
// All hooks are called unconditionally (Rules of Hooks) — only the
// JSX branches on canSwitch.
// ============================================================

import { useState, useRef, useEffect } from 'react'
import { Building2, ChevronDown, Search, Check } from 'lucide-react'
import { useAuthStore, selectUser }        from '@/store/authStore'
import { useActiveOutletStore, selectActiveOutletId, SWITCHABLE_ROLES } from '@/store/activeOutletStore'
import { useOutlets }                      from '../hooks/useOutlets'
import useEntityMap                        from '@/hooks/useEntityMap'
import useDebounce                         from '@/hooks/useDebounce'
import { cn }                              from '@/lib/utils'

const OutletSwitcher = () => {
  const user      = useAuthStore(selectUser)
  const canSwitch = SWITCHABLE_ROLES.includes(user?.role)

  const activeOutletId    = useActiveOutletStore(selectActiveOutletId)
  const setActiveOutletId = useActiveOutletStore((s) => s.setActiveOutletId)

  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery    = useDebounce(query, 300)
  const containerRef      = useRef(null)

  // Reused abstraction (same one used elsewhere, e.g. UserTable/
  // EmployeeFormModal) — resolves outlet names without a dedicated fetch.
  const { outletMap } = useEntityMap()

  // Reused query architecture — same hook/params shape already used by
  // every other outlet picker in the app (e.g. EmployeeFormModal).
  const { data, isLoading } = useOutlets({ search: debouncedQuery, isActive: true, limit: 20 })
  const outlets = data?.data ?? []

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Resolve the currently active outlet's display name. Prefer the
  // entity map (covers outlets outside the current search page) and
  // fall back to the live search results.
  const activeOutlet = activeOutletId
    ? (outletMap.get(activeOutletId) ?? outlets.find((o) => o._id === activeOutletId))
    : null

  const ownOutlet = outletMap.get(user?.outletId)

  const handleSelect = (outletId) => {
    setActiveOutletId(outletId) // null = "All Outlets" — reactive, no reload
    setOpen(false)
    setQuery('')
  }

  // ── Non-switchable roles: read-only, no dropdown, no interaction ──
  if (!canSwitch) {
    return (
      <div
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm cursor-default select-none"
        aria-label="Your assigned outlet"
        title="Your outlet is fixed and cannot be changed"
      >
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <span className="text-foreground font-medium truncate max-w-[10rem]">
          {ownOutlet?.name ?? 'My Outlet'}
        </span>
      </div>
    )
  }

  // ── Switchable roles: searchable dropdown ─────────────────────
  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors text-sm"
      >
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <span className={cn(
          'font-medium truncate max-w-[10rem]',
          activeOutlet ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {activeOutlet ? activeOutlet.name : 'All Outlets'}
        </span>
        <ChevronDown className={cn(
          'w-3.5 h-3.5 text-muted-foreground transition-transform duration-150 shrink-0',
          open && 'rotate-180'
        )} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-64 z-20 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-fade-in">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search outlets…"
                className="w-full h-8 pl-8 pr-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <ul className="max-h-64 overflow-y-auto py-1">
            <li>
              <button
                onClick={() => handleSelect(null)}
                className={cn(
                  'flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted transition-colors',
                  !activeOutletId && 'bg-brand-50 dark:bg-brand-950/30'
                )}
              >
                All Outlets
                {!activeOutletId && <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />}
              </button>
            </li>

            {isLoading && (
              <li className="px-3 py-4 text-xs text-muted-foreground text-center">Searching…</li>
            )}

            {!isLoading && outlets.map((o) => (
              <li key={o._id}>
                <button
                  onClick={() => handleSelect(o._id)}
                  className={cn(
                    'flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted transition-colors',
                    activeOutletId === o._id && 'bg-brand-50 dark:bg-brand-950/30'
                  )}
                >
                  <span className="truncate">
                    {o.name}{o.code ? <span className="text-muted-foreground"> ({o.code})</span> : null}
                  </span>
                  {activeOutletId === o._id && <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />}
                </button>
              </li>
            ))}

            {!isLoading && outlets.length === 0 && (
              <li className="px-3 py-4 text-xs text-muted-foreground text-center">No outlets found.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export default OutletSwitcher