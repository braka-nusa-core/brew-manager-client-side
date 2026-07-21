// ============================================================
// router/routeAccess.js
// Maps each dashboard route to the permission(s) required to VIEW it
// (not manage it — a role can see a page read-only without holding
// the corresponding MANAGE_* permission). Consumed by both
// ProtectedRoute (route guarding) and Sidebar (nav-link visibility) —
// one definition, no duplicated role checks.
//
// A route with NO entry here is treated as open to any authenticated
// user (e.g. /settings — see file header note below). This is a safe
// default: an unlisted route is never MORE restricted than intended,
// only potentially less — so adding a new route without updating this
// map cannot accidentally lock everyone out.
//
// Each entry lists every permission that grants access — mirrors the
// backend's authorize(PERM_A, PERM_B) "OR" semantics exactly, verified
// against each module's actual .routes.js GET middleware.
//
// /settings has no backend module of its own — it's a composition of
// Account (open to all), Subscription, and Admin Panel tabs that
// already cosmetically gate themselves internally (pre-dating this
// sprint, left untouched). It is deliberately NOT restricted here,
// since blocking the route would also block the Account tab, which
// every authenticated role needs.
// ============================================================

import { PERMISSIONS } from '@/constants/permissions'

export const ROUTE_PERMISSIONS = {
  '/dashboard':          [PERMISSIONS.VIEW_DASHBOARD],
  '/employees':          [PERMISSIONS.VIEW_EMPLOYEES, PERMISSIONS.MANAGE_EMPLOYEES],
  '/attendance':         [PERMISSIONS.VIEW_ATTENDANCE, PERMISSIONS.MANAGE_ATTENDANCE],
  '/sales':              [PERMISSIONS.VIEW_SALES, PERMISSIONS.MANAGE_SALES],
  '/expenses':           [PERMISSIONS.VIEW_EXPENSES, PERMISSIONS.MANAGE_EXPENSES],
  '/payroll':            [PERMISSIONS.VIEW_PAYROLL, PERMISSIONS.MANAGE_PAYROLL],
  '/outlets':            [PERMISSIONS.VIEW_OUTLETS, PERMISSIONS.MANAGE_OUTLETS],
  '/products':           [PERMISSIONS.VIEW_PRODUCTS, PERMISSIONS.MANAGE_PRODUCTS],
  '/raw-materials':      [PERMISSIONS.VIEW_RAW_MATERIALS, PERMISSIONS.MANAGE_RAW_MATERIALS],
  '/cup-records':        [PERMISSIONS.VIEW_CUPS, PERMISSIONS.MANAGE_CUPS],
  '/bikes':              [PERMISSIONS.VIEW_BIKES, PERMISSIONS.MANAGE_BIKES],
  '/bike-assignments':   [PERMISSIONS.VIEW_BIKES, PERMISSIONS.MANAGE_BIKES],
  '/bike-maintenance':   [PERMISSIONS.VIEW_BIKES, PERMISSIONS.MANAGE_BIKES],
  '/users':              [PERMISSIONS.MANAGE_USERS],
  // '/settings' intentionally omitted — see file header.
}

/**
 * Finds the permission requirement for a given pathname. Uses a
 * startsWith match (consistent with Sidebar's own existing active-link
 * matching logic) so nested/future sub-paths under a listed route
 * inherit its restriction automatically.
 *
 * @param {string} pathname
 * @returns {string[] | null} required permissions, or null if unrestricted
 */
export const getRequiredPermissions = (pathname) => {
  const match = Object.keys(ROUTE_PERMISSIONS).find(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  return match ? ROUTE_PERMISSIONS[match] : null
}