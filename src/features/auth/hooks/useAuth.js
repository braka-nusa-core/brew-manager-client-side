// src/features/auth/hooks/useAuth.js
import { useMutation }   from '@tanstack/react-query'
import { useNavigate }   from 'react-router-dom'
import { useAuthStore }  from '@/store/authStore'
import { login, logout, refreshToken } from '../api/authApi'

// ── useInitAuth ───────────────────────────────────────────────
// Called ONCE in App.jsx on mount to rehydrate session from
// the httpOnly refresh cookie.
//
// Flow:
//   refreshToken() [raw axios, no interceptor]
//     ├── success → setAuth(user, accessToken) → ProtectedRoute renders dashboard
//     └── failure → setNotAuthenticated() → ProtectedRoute redirects to /login
//
// No window.location.href anywhere — the router handles navigation.

export const useInitAuth = () => {
  const { setAuth, setNotAuthenticated } = useAuthStore()

  const initialize = async () => {
    try {
      // refreshToken uses raw axios — cannot trigger the interceptor loop
      const { user, accessToken } = await refreshToken()
      setAuth(user, accessToken)
    } catch {
      // 401 = no cookie / expired = not logged in. This is the normal
      // state after logout. Just mark as not authenticated.
      setNotAuthenticated()
    }
  }

  return { initialize }
}

// ── useLogin ──────────────────────────────────────────────────

export const useLogin = () => {
  const navigate    = useNavigate()
  const { setAuth } = useAuthStore()

  return useMutation({
    mutationFn: login,
    onSuccess: ({ user, accessToken }) => {
      setAuth(user, accessToken)
      navigate('/dashboard', { replace: true })
    },
    // Error surfaces to the component via mutation.error — no toast here.
    // LoginForm displays it inline.
  })
}

// ── useLogout ─────────────────────────────────────────────────

export const useLogout = () => {
  const navigate      = useNavigate()
  const { clearAuth } = useAuthStore()

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      // Always clear local state even if the server call fails.
      // onSettled fires for both success and error.
      clearAuth()
      navigate('/login', { replace: true })
    },
  })
}