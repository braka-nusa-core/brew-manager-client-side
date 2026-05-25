// src/features/auth/api/authApi.js
// All authentication API calls.
//
// CRITICAL: refreshToken() uses raw axios (not apiClient).
// This prevents the axios interceptor from catching its 401
// and triggering another refresh — which would cause an
// infinite loop when the user has no valid refresh cookie.

import axios     from 'axios'
import apiClient from '@/lib/axios'

export const login = async (credentials) => {
  const { data } = await apiClient.post('/auth/login', credentials)
  return data.data  // { accessToken, user }
}

export const logout = async () => {
  // Use apiClient so the Bearer token is sent for proper server-side cleanup.
  // The interceptor skips /auth/logout URLs so no refresh loop can occur.
  await apiClient.post('/auth/logout')
}

export const getMe = async () => {
  const { data } = await apiClient.get('/auth/me')
  return data.data  // user object
}

/**
 * Refreshes the access token using the httpOnly refresh cookie.
 *
 * Uses RAW axios — NOT apiClient — so the response interceptor
 * never sees this request. If the cookie is missing/expired and
 * this returns 401, the error propagates cleanly to the caller
 * (useInitAuth.initialize or the interceptor's catch block)
 * without triggering another refresh attempt.
 *
 * Returns { accessToken, user }
 */
export const refreshToken = async () => {
  const { data } = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL}/auth/refresh-token`,
    {},
    { withCredentials: true }
  )
  return data.data  // { accessToken, user }
}