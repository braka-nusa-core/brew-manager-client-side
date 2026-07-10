// ============================================================
// components/shared/Navbar.jsx
// Top navigation bar for the dashboard layout.
//
// Contains:
//   - Mobile sidebar toggle (hamburger)
//   - Outlet switcher placeholder (future feature)
//   - User avatar dropdown with role badge and logout
// ============================================================

import { Menu, ChevronDown, LogOut, User, Building2, Lock } from 'lucide-react'
import { useAuthStore, selectUser }  from '@/store/authStore'
import { useLogout }                 from '@/features/auth/hooks/useAuth'
import NotificationBell              from '@/features/notification/components/NotificationBell'
import ChangePasswordModal           from '@/features/auth/components/ChangePasswordModal'
import { cn }                        from '@/lib/utils'
import { useState }                  from 'react'

// Role badge colors
const ROLE_STYLES = {
  super_admin:  'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  tenant_admin: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  manager:      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  cashier:      'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

const formatRole = (role) =>
  role?.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? ''

/**
 * Top navigation bar.
 *
 * @param {{ onMobileMenuToggle: () => void }} props
 */
const Navbar = ({ onMobileMenuToggle }) => {
  const user          = useAuthStore(selectUser)
  const logoutMutation = useLogout()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [cpOpen,       setCpOpen]       = useState(false)

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '?'

  return (
    <>
      <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-border bg-background shrink-0">

      {/* ── Left: Mobile menu toggle ──────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-md hover:bg-muted transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Outlet switcher placeholder */}
        <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors text-sm">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground font-medium">All Outlets</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* ── Right: Notification bell + User dropdown ─────────── */}
      <div className="flex items-center gap-1">
        <NotificationBell />

        {/* User dropdown */}
        <div className="relative">
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-brand-950">{initials}</span>
          </div>

          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-foreground leading-none">
              {user?.name ?? 'User'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {user?.email ?? ''}
            </p>
          </div>

          <ChevronDown className={cn(
            'w-4 h-4 text-muted-foreground transition-transform duration-150',
            dropdownOpen && 'rotate-180'
          )} />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setDropdownOpen(false)}
            />

            <div className="absolute right-0 top-full mt-1 w-56 z-20 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-fade-in">
              {/* User info */}
              <div className="px-3 py-3 border-b border-border">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap',
                    ROLE_STYLES[user?.role] ?? ROLE_STYLES.cashier
                  )}>
                    {formatRole(user?.role)}
                  </span>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={() => { setDropdownOpen(false) }}
                >
                  <User className="w-4 h-4 text-muted-foreground" />
                  Profile
                </button>

                <button
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={() => { setDropdownOpen(false); setCpOpen(true) }}
                >
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  Change Password
                </button>

                <button
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={() => {
                    setDropdownOpen(false)
                    logoutMutation.mutate()
                  }}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="w-4 h-4" />
                  {logoutMutation.isPending ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      </div>
    </header>
    <ChangePasswordModal open={cpOpen} onClose={() => setCpOpen(false)} />
    </>
  )
}

export default Navbar