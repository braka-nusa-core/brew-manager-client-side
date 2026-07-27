// ============================================================
// constants/permissions.js
// Frontend mirror of the backend's constants/permissions.js.
//
// The frontend and backend are separate codebases and cannot share a
// literal JS module, so this file is a deliberate, faithful copy of
// the backend's ROLES / PERMISSIONS / ROLE_PERMISSIONS — kept in sync
// by hand. Backend is the source of truth; this file exists so route
// guarding, Sidebar visibility, and any future permission-aware UI all
// check against ONE place instead of scattering hardcoded role arrays
// across pages (which is exactly what earlier sprints did per-page for
// mutation-button gating, e.g. `MANAGE_ROLES = ['super_admin', ...]`
// inline in each page — this file is the generalization of that
// pattern for route-level VIEW access).
//
// If the backend's permissions.js changes, this file must be updated
// to match by hand.
//
// ------------------------------------------------------------
// ⚠️  SYNCHRONIZATION CONTRACT — READ BEFORE EDITING THIS FILE  ⚠️
// ------------------------------------------------------------
// This file MUST always be a byte-for-byte functional mirror of the
// backend's src/constants/permissions.js (ROLES, PERMISSIONS, and
// ROLE_PERMISSIONS specifically — the actual role→permission grants).
// It must NEVER be edited independently to "fix," "improve," or add
// to the frontend's idea of what a role can do. The frontend has no
// authority over permissions — it only reflects them, for UX purposes
// (hiding buttons/routes a role could never use anyway). The backend's
// authorize() middleware is, and will always remain, the only real
// enforcement boundary; nothing in this file — or anything built on
// top of it (routeAccess.js, ProtectedRoute, Sidebar, per-page
// MANAGE_ROLES arrays) — is a security control.
//
// Consequences of drift between this file and the backend:
//   - If this file grants MORE than the backend: the UI will show
//     buttons/routes/nav-links that the backend will still correctly
//     reject with a 403 — a confusing but not unsafe inconsistency.
//   - If this file grants LESS than the backend: a role will be
//     denied access to something the backend would have allowed — a
//     functional regression (the role can no longer do their job
//     through the UI), even though nothing is actually unsafe.
//   - Either direction is a bug to fix immediately, not a design
//     choice to work around.
//
// Whenever the backend's constants/permissions.js is modified (a role
// gains/loses a permission, a new permission is added, a new role is
// introduced), this file — and only this file, on the frontend side —
// must be updated to match in the SAME change/PR. Do not let the two
// diverge "temporarily." Do not add frontend-only roles or
// permissions here that don't exist on the backend. Do not rename
// anything here without renaming it identically on the backend first.
// ------------------------------------------------------------
// ============================================================

export const ROLES = {
  SUPER_ADMIN:  'super_admin',
  TENANT_ADMIN: 'tenant_admin',
  MANAGER:      'manager',
  CASHIER:      'cashier',
  VIEWER:       'viewer',
}

export const PERMISSIONS = {
  MANAGE_TENANTS:    'manage:tenants',

  MANAGE_OUTLETS:    'manage:outlets',
  VIEW_OUTLETS:      'view:outlets',

  MANAGE_USERS:      'manage:users',
  VIEW_USERS:        'view:users',

  MANAGE_EMPLOYEES:  'manage:employees',
  VIEW_EMPLOYEES:    'view:employees',

  MANAGE_ATTENDANCE: 'manage:attendance',
  RECORD_ATTENDANCE: 'record:attendance',
  VIEW_ATTENDANCE:   'view:attendance',

  MANAGE_SALES:      'manage:sales',
  VIEW_SALES:        'view:sales',

  MANAGE_EXPENSES:   'manage:expenses',
  VIEW_EXPENSES:     'view:expenses',

  MANAGE_PAYROLL:    'manage:payroll',
  VIEW_PAYROLL:      'view:payroll',

  VIEW_DASHBOARD:    'view:dashboard',

  MANAGE_PRODUCTS:   'manage:products',
  VIEW_PRODUCTS:     'view:products',

  MANAGE_CUPS:       'manage:cups',
  VIEW_CUPS:         'view:cups',

  MANAGE_RAW_MATERIALS: 'manage:raw_materials',
  VIEW_RAW_MATERIALS:   'view:raw_materials',

  // Inventory / Production Batches (Sprint 6.2 addition)
  MANAGE_INVENTORY: 'manage:inventory',
  VIEW_INVENTORY:   'view:inventory',

  MANAGE_BIKES: 'manage:bikes',
  VIEW_BIKES:   'view:bikes',

  MANAGE_PLANS:            'manage:plans',
  VIEW_PLANS:              'view:plans',
  MANAGE_SUBSCRIPTIONS:    'manage:subscriptions',
  VIEW_SUBSCRIPTIONS:      'view:subscriptions',
  MANAGE_UPGRADE_REQUESTS: 'manage:upgrade_requests',
}

export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),

  [ROLES.TENANT_ADMIN]: [
    PERMISSIONS.MANAGE_OUTLETS,
    PERMISSIONS.VIEW_OUTLETS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_EMPLOYEES,
    PERMISSIONS.VIEW_EMPLOYEES,
    PERMISSIONS.MANAGE_ATTENDANCE,
    PERMISSIONS.RECORD_ATTENDANCE,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.MANAGE_SALES,
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.MANAGE_EXPENSES,
    PERMISSIONS.VIEW_EXPENSES,
    PERMISSIONS.MANAGE_PAYROLL,
    PERMISSIONS.VIEW_PAYROLL,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.MANAGE_CUPS,
    PERMISSIONS.VIEW_CUPS,
    PERMISSIONS.MANAGE_RAW_MATERIALS,
    PERMISSIONS.VIEW_RAW_MATERIALS,
    PERMISSIONS.MANAGE_BIKES,
    PERMISSIONS.VIEW_BIKES,
    // Sprint 6.2 — production batch management
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.VIEW_SUBSCRIPTIONS,
    PERMISSIONS.MANAGE_UPGRADE_REQUESTS,
  ],

  [ROLES.MANAGER]: [
    PERMISSIONS.VIEW_OUTLETS,
    PERMISSIONS.MANAGE_EMPLOYEES,
    PERMISSIONS.VIEW_EMPLOYEES,
    PERMISSIONS.MANAGE_ATTENDANCE,
    PERMISSIONS.RECORD_ATTENDANCE,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.MANAGE_SALES,
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.MANAGE_EXPENSES,
    PERMISSIONS.VIEW_EXPENSES,
    PERMISSIONS.VIEW_PAYROLL,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.MANAGE_CUPS,
    PERMISSIONS.VIEW_CUPS,
    PERMISSIONS.VIEW_RAW_MATERIALS,
    PERMISSIONS.MANAGE_BIKES,
    PERMISSIONS.VIEW_BIKES,
    // Sprint 6.2 — production batch management
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.VIEW_INVENTORY,
  ],

  [ROLES.CASHIER]: [
    PERMISSIONS.VIEW_EMPLOYEES,
    PERMISSIONS.MANAGE_SALES,
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.MANAGE_CUPS,
    PERMISSIONS.VIEW_CUPS,
    PERMISSIONS.VIEW_RAW_MATERIALS,
    PERMISSIONS.VIEW_BIKES,
    // Sprint 6.2 — view-only inventory visibility
    PERMISSIONS.VIEW_INVENTORY,
  ],

  [ROLES.VIEWER]: [
    PERMISSIONS.VIEW_OUTLETS,
    PERMISSIONS.VIEW_EMPLOYEES,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.VIEW_EXPENSES,
    PERMISSIONS.VIEW_PAYROLL,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.VIEW_CUPS,
    PERMISSIONS.VIEW_RAW_MATERIALS,
    PERMISSIONS.VIEW_BIKES,
    // Sprint 6.2 — view-only inventory visibility
    PERMISSIONS.VIEW_INVENTORY,
  ],
}

/**
 * @param {string} role
 * @param {string|string[]} permission - a single permission, or a list
 *   where holding ANY one of them is sufficient (mirrors backend's
 *   authorize(PERM_A, PERM_B) "OR" semantics).
 * @returns {boolean}
 */
export const hasPermission = (role, permission) => {
  const granted = ROLE_PERMISSIONS[role] ?? []
  const required = Array.isArray(permission) ? permission : [permission]
  return required.some((p) => granted.includes(p))
}