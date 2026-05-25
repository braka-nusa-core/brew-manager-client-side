// ============================================================
// store/authStore.js
// Zustand store for authentication state.
//
// Stores:
//   user        — sanitized user object from /auth/me or login response
//   accessToken — short-lived JWT (in memory ONLY, never localStorage)
//   isLoading   — true during initial auth check on app load
//
// Access token is in memory only. On page refresh, the app
// calls /auth/me using the httpOnly refresh cookie to rehydrate.
// If the refresh cookie is expired, clearAuth() is called and
// the user is redirected to /login.
// ============================================================

import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user:        null,
  accessToken: null,
  isLoading:   true,   // true until initial /auth/me check completes

  // ── Actions ────────────────────────────────────────────────

  /**
   * Called after successful login or token refresh.
   * Sets both user and access token together.
   */
  setAuth: (user, accessToken) => set({
    user,
    accessToken,
    isLoading: false,
  }),

  /**
   * Updates only the access token (used in refresh interceptor).
   */
  setAccessToken: (accessToken) => set({ accessToken }),

  /**
   * Marks initial auth check as complete without a user.
   * Called when /auth/me fails on page load (not logged in).
   */
  setNotAuthenticated: () => set({
    user:        null,
    accessToken: null,
    isLoading:   false,
  }),

  /**
   * Full logout — clears all auth state.
   * Called on logout action or when refresh token fails.
   */
  clearAuth: () => set({
    user:        null,
    accessToken: null,
    isLoading:   false,
  }),
}))

// ── Selectors (derived values) ─────────────────────────────
// Use these in components to avoid full store subscriptions.

export const selectUser        = (state) => state.user
export const selectAccessToken = (state) => state.accessToken
export const selectIsLoading   = (state) => state.isLoading
export const selectIsAuth      = (state) => !!state.user && !!state.accessToken
export const selectUserRole    = (state) => state.user?.role ?? null
