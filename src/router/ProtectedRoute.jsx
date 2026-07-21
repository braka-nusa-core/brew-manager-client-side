// ============================================================
// router/ProtectedRoute.jsx
// Guards routes that require authentication AND, where applicable,
// a specific permission (see routeAccess.js).
//
// Behavior:
//   - While isLoading (initial auth check): shows a spinner.
//   - If not authenticated: redirects to /login, preserving
//     the originally requested path in location state.
//   - If authenticated but the current route requires a permission
//     the user's role doesn't hold (per ROUTE_PERMISSIONS): renders
//     AccessDeniedPage instead of the requested page. The requested
//     page's own component is never mounted, so no data fetch for
//     it is ever attempted.
//   - If authenticated and authorized (or the route is unrestricted):
//     renders the child route.
//
// The location state allows LoginPage to redirect back to
// the originally requested page after successful login.
// ============================================================

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore, selectIsAuth, selectIsLoading, selectUserRole } from '@/store/authStore'
import { hasPermission } from '@/constants/permissions'
import { getRequiredPermissions } from './routeAccess'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import AccessDeniedPage from '@/pages/AccessDeniedPage'

const ProtectedRoute = () => {
  const isAuth    = useAuthStore(selectIsAuth)
  const isLoading = useAuthStore(selectIsLoading)
  const role      = useAuthStore(selectUserRole)
  const location  = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuth) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    )
  }

  const requiredPermissions = getRequiredPermissions(location.pathname)
  if (requiredPermissions && !hasPermission(role, requiredPermissions)) {
    return <AccessDeniedPage />
  }

  return <Outlet />
}

export default ProtectedRoute