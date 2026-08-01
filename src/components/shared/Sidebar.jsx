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
  Boxes,
  PackagePlus,
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/dashboard',  label: 'Dashboard',              icon: LayoutDashboard },
  { path: '/employees',  label: 'Karyawan',            icon: Users },
  { path: '/attendance', label: 'Absensi',             icon: ClipboardCheck },
  { path: '/sales',      label: 'Penjualan',           icon: TrendingUp },
  { path: '/expenses',   label: 'Pengeluaran',         icon: Receipt },
  { path: '/payroll',    label: 'Penggajian',          icon: Banknote },
  { path: '/outlets',    label: 'Outlet',              icon: Store },
  { path: '/products',   label: 'Produk',              icon: Package },
  { path: '/raw-materials', label: 'Bahan Baku',       icon: Beaker },
  { path: '/cup-records', label: 'Catatan Cup',        icon: Coffee },
  { path: '/inventory',   label: 'Inventaris',          icon: Boxes },
  { path: '/production',  label: 'Produksi',            icon: PackagePlus },
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
        <img 
          src="/images/logo-mr-coffee.jpg" 
          alt="Logo" 
          className="w-8 h-8 object-cover rounded-md shrink-0 block" 
        />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-none">
              Hello Mr. Coffee
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