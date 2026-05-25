// src/lib/axios.js
// Configured Axios instance for all API requests.
//
// KEY DESIGN DECISIONS:
//
//   1. The response interceptor ONLY fires for protected API calls.
//      It explicitly skips /auth/refresh-token and /auth/login to
//      prevent infinite retry loops.
//
//   2. On 401 from a protected endpoint, the interceptor makes ONE
//      silent refresh attempt using raw axios (not apiClient) to
//      completely bypass this interceptor. If refresh also fails,
//      it calls clearAuth() and lets the ProtectedRoute handle
//      the /login redirect — NO window.location.href.
//
//   3. refreshToken() in authApi.js also uses raw axios directly,
//      not apiClient, so it can never trigger this interceptor.

import axios from 'axios'

// URLs that must NEVER trigger the refresh interceptor
const SKIP_INTERCEPTOR_URLS = [
  '/auth/refresh-token',
  '/auth/login',
  '/auth/logout',
]

const isSkippedUrl = (url = '') =>
  SKIP_INTERCEPTOR_URLS.some((skip) => url.includes(skip))

const apiClient = axios.create({
  baseURL:         import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  headers:         { 'Content-Type': 'application/json' },
  timeout:         15_000,
})
console.log(import.meta.env.VITE_API_BASE_URL)

// ── Request interceptor: attach access token ──────────────────

apiClient.interceptors.request.use(
  async (config) => {
    const { useAuthStore } = await import('@/store/authStore')
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor: silent token refresh on 401 ─────────

apiClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    const original = error.config

    // Never intercept auth endpoints — would cause infinite loops
    if (isSkippedUrl(original?.url)) {
      return Promise.reject(error)
    }

    // Only attempt refresh once per request
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      try {
        // Raw axios — completely bypasses this interceptor
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        )

        const newToken = data.data.accessToken

        const { useAuthStore } = await import('@/store/authStore')
        useAuthStore.getState().setAccessToken(newToken)

        // Retry the original failed request with the new token
        original.headers.Authorization = `Bearer ${newToken}`
        return apiClient(original)

      } catch {
        // Refresh failed — clear auth state.
        // Do NOT use window.location.href — that causes a full page
        // reload which re-mounts App.jsx and re-runs initialize(),
        // creating an infinite loop. Instead, let ProtectedRoute
        // detect isAuth === false and redirect to /login naturally.
        const { useAuthStore } = await import('@/store/authStore')
        useAuthStore.getState().clearAuth()

        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient  