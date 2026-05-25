// src/features/expenses/api/expensesApi.js
// All expense HTTP calls — no logic, no state.
//
// Backend Expense model:
//   { tenantId, outletId, date, category, description, amount, recordedBy }
//
// Backend contract:
//   GET    /expenses             → { success, message, data: Expense[], pagination }
//   GET    /expenses/:expenseId  → { success, message, data: Expense }
//   POST   /expenses             → body: { outletId, date, category, description, amount }
//   PATCH  /expenses/:expenseId  → body: { date?, category?, description?, amount? }
//                                  NOTE: outletId + tenantId immutable
//   DELETE /expenses/:expenseId  → 204 No Content
//
// Filter params: outletId, category, startDate, endDate, page, limit

import apiClient from '@/lib/axios'

/**
 * Fetch paginated expenses list.
 * @param {Object} params - { page, limit, outletId, category, startDate, endDate }
 */
export const getExpenses = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  )
  const { data } = await apiClient.get('/expenses', { params: cleanParams })
  return data // { success, message, data, pagination }
}

/**
 * Fetch a single expense record by ID.
 * @param {string} expenseId
 */
export const getExpense = async (expenseId) => {
  const { data } = await apiClient.get(`/expenses/${expenseId}`)
  return data.data
}

/**
 * Create a new expense record.
 * @param {{ outletId: string, date: string, category: string, description: string, amount: number }} payload
 */
export const createExpense = async (payload) => {
  const { data } = await apiClient.post('/expenses', payload)
  return data.data
}

/**
 * Update an expense record.
 * outletId and tenantId are immutable — do NOT send them.
 * @param {string} expenseId
 * @param {{ date?: string, category?: string, description?: string, amount?: number }} payload
 */
export const updateExpense = async (expenseId, payload) => {
  const { data } = await apiClient.patch(`/expenses/${expenseId}`, payload)
  return data.data
}

/**
 * Delete an expense record. Returns 204 — no body.
 * @param {string} expenseId
 */
export const deleteExpense = async (expenseId) => {
  await apiClient.delete(`/expenses/${expenseId}`)
}