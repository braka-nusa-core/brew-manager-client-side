// ============================================================
// components/shared/Sidebar.jsx
// Collapsible dashboard sidebar navigation.
//
// Design:
//   - Dark sidebar (--sidebar-* CSS variables) in both themes.
//   - Active route highlighted with brand lime green.
//   - Collapsed state shows icons only with tooltip labels.
//   - Mobile: renders as a drawer overlay.
//   - Collapsible state managed by parent (DashboardLayout).
//
// Permission-aware navigation (Sprint 4):
//   NAV_ITEMS are filtered against ROUTE_PERMISSIONS (routeAccess.js)
//   using the current role — a nav link is only rendered if the role
//   actually holds the VIEW permission for that route. This is the
//   same map ProtectedRoute uses to guard the route itself, so the
//   Sidebar can never show a link that would lead to Access Denied.
// ============================================================

import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore, selectUserRole } from '@/store/authStore'
import { hasPermission } from '@/constants/permissions'
import { ROUTE_PERMISSIONS } from '@/router/routeAccess'
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  TrendingUp,
  Receipt,
  Banknote,
  Store,
  Package,
  Beaker,
  Settings,
  ChevronLeft,
  Coffee,
  Bike,
  UserCheck,
  Wrench,
  KeyRound,
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/dashboard',  label: 'Dasbor',              icon: LayoutDashboard },
  { path: '/employees',  label: 'Karyawan',            icon: Users },
  { path: '/attendance', label: 'Absensi',             icon: ClipboardCheck },
  { path: '/sales',      label: 'Penjualan',           icon: TrendingUp },
  { path: '/expenses',   label: 'Pengeluaran',         icon: Receipt },
  { path: '/payroll',    label: 'Penggajian',          icon: Banknote },
  { path: '/outlets',    label: 'Outlet',              icon: Store },
  { path: '/products',   label: 'Produk',              icon: Package },
  { path: '/raw-materials', label: 'Bahan Baku',       icon: Beaker },
  { path: '/cup-records', label: 'Catatan Cup',        icon: Coffee },
  { path: '/bikes',            label: 'Sepeda',             icon: Bike },
  { path: '/bike-assignments', label: 'Penugasan Sepeda',   icon: UserCheck },
  { path: '/bike-maintenance', label: 'Perawatan Sepeda',   icon: Wrench },
  { path: '/users',            label: 'Pengguna',           icon: KeyRound },
  { path: '/settings',         label: 'Pengaturan',         icon: Settings },
]

/**
 * Sidebar navigation component.
 *
 * @param {{ collapsed: boolean, onToggle: () => void }} props
 */
const Sidebar = ({ collapsed, onToggle }) => {
  const location = useLocation()
  const role     = useAuthStore(selectUserRole)

  // A nav item with no entry in ROUTE_PERMISSIONS (e.g. /settings) is
  // shown to everyone — same "unrestricted by default" rule ProtectedRoute
  // uses, so Sidebar and the route guard never disagree.
  const visibleItems = NAV_ITEMS.filter(({ path }) => {
    const required = ROUTE_PERMISSIONS[path]
    return !required || hasPermission(role, required)
  })

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* ── Logo ──────────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-sidebar-border shrink-0',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500 shrink-0">
          <Coffee className="w-4 h-4 text-brand-950" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-none">
              Braka Nusa
            </p>
            <p className="text-[10px] text-sidebar-foreground/60 truncate mt-0.5">
              Core
            </p>
          </div>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────── */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-0.5 px-2">
          {visibleItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path ||
              (path !== '/dashboard' && location.pathname.startsWith(path))

            return (
              <li key={path}>
                <NavLink
                  to={path}
                  title={collapsed ? label : undefined}
                  className={cn(
                    'flex items-center gap-3 px-2 py-2.5 rounded-md text-sm font-medium transition-colors duration-150',
                    'hover:bg-white/5 hover:text-white',
                    isActive
                      ? 'bg-brand-500 text-brand-950 hover:bg-brand-500 hover:text-brand-950'
                      : 'text-sidebar-foreground',
                    collapsed && 'justify-center px-0'
                  )}
                >
                  <Icon className={cn(
                    'shrink-0 transition-none',
                    collapsed ? 'w-5 h-5' : 'w-4 h-4'
                  )} />
                  {!collapsed && (
                    <span className="truncate">{label}</span>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* ── Collapse Toggle ───────────────────────────────────── */}
      <div className="p-2 border-t border-sidebar-border shrink-0">
        <button
          onClick={onToggle}
          className={cn(
            'flex items-center gap-2 w-full px-2 py-2 rounded-md text-sidebar-foreground/70',
            'hover:bg-white/5 hover:text-white transition-colors text-sm',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
        >
          <ChevronLeft className={cn(
            'w-4 h-4 transition-transform duration-300',
            collapsed && 'rotate-180'
          )} />
          {!collapsed && <span>Ciutkan</span>}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar