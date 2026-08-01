import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore, selectIsAuth, selectIsLoading } from '@/store/authStore'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { Coffee }     from 'lucide-react'

/**
 * Layout for unauthenticated pages (login, etc.).
 * Redirects to /dashboard if already authenticated.
 * Renders a centered card on a subtle patterned background.
 */
const AuthLayout = () => {
  const isAuth    = useAuthStore(selectIsAuth)
  const isLoading = useAuthStore(selectIsLoading)

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (isAuth) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
      {/* Subtle background texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0,0,0) 1px, transparent 0)`,
          backgroundSize:  '24px 24px',
        }}
      />

      {/* Brand mark */}
      <div className="relative flex flex-col items-center mb-8">
        <img 
          src="/images/logo-mr-coffee.jpg" 
          alt="Hello Mr. Coffee Logo" 
          className="w-12 h-12 object-cover rounded-2xl shadow-lg mb-3" 
        />
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          Hello Mr. Coffee
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Management
        </p>
      </div>

      {/* Page content (LoginPage renders here) */}
      <div className="relative w-full max-w-md">
        <Outlet />
      </div>

      <p className="relative text-xs text-muted-foreground mt-8">
        © {new Date().getFullYear()} Hello Mr. Coffee. All rights reserved.
      </p>
    </div>
  )
}

export default AuthLayout
