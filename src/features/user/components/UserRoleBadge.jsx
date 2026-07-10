// src/features/user/components/UserRoleBadge.jsx
// Displays user role as a colored badge.
// Backend roles (confirmed User.model.js): super_admin | tenant_admin | manager | cashier | viewer

import { cn } from '@/lib/utils'

const ROLE_CONFIG = {
  super_admin:  { label: 'Super Admin',   badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400' },
  tenant_admin: { label: 'Tenant Admin',  badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' },
  manager:      { label: 'Manager',       badge: 'bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400' },
  cashier:      { label: 'Cashier',       badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  viewer:       { label: 'Viewer',        badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
}

const DEFAULT = { label: 'Unknown', badge: 'bg-zinc-100 text-zinc-500' }

const UserRoleBadge = ({ role, className }) => {
  const config = ROLE_CONFIG[role] ?? DEFAULT
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
      config.badge,
      className
    )}>
      {config.label}
    </span>
  )
}

export default UserRoleBadge

export const CREATABLE_ROLES = ['manager', 'cashier', 'viewer']
export const ROLE_LABELS = Object.fromEntries(
  Object.entries(ROLE_CONFIG).map(([k, v]) => [k, v.label])
)