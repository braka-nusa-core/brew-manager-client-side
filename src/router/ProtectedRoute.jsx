// ============================================================
// router/ProtectedRoute.jsx
// Guards routes that require authentication.
//
// Behavior:
//   - While isLoading (initial auth check): shows a spinner.
//   - If not authenticated: redirects to /login, preserving
//     the originally requested path in location state.
//   - If authenticated: renders the child route.
//
// The location state allows LoginPage to redirect back to
// the originally requested page after successful login.
// ============================================================

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore, selectIsAuth, selectIsLoading } from '@/store/authStore'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

const ProtectedRoute = () => {
  const isAuth    = useAuthStore(selectIsAuth)
  const isLoading = useAuthStore(selectIsLoading)
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

  return <Outlet />
}

export default ProtectedRoute
