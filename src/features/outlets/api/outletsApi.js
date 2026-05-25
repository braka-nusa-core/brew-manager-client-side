// src/features/outlets/api/outletsApi.js
// Outlet HTTP calls — read-only for now.
// Full CRUD will be added when the Outlets module page is built.
//
// Backend: GET /outlets
//   Params: search, isActive, page, limit
//   Response: { success, message, data: Outlet[], pagination }
//
// Outlet shape: { _id, tenantId, name, code, address, phone, isActive }

import apiClient from '@/lib/axios'

/**
 * Fetch outlets list (optionally filtered/searched).
 * @param {Object} params - { search, isActive, page, limit }
 */
export const getOutlets = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  )
  const { data } = await apiClient.get('/outlets', { params: cleanParams })
  return data // { success, message, data: Outlet[], pagination }
}