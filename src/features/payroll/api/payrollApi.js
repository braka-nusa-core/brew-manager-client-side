// src/features/payroll/api/payrollApi.js
// All payroll HTTP calls — no logic, no state.
//
// Backend endpoints (confirmed from payroll.routes.js):
//   POST   /payroll/generate          → body: { outletId, month, year, workingDays }
//   GET    /payroll                   → query: { page, limit, outletId, month, year, status, employeeId }
//   GET    /payroll/:id               → single record
//   PATCH  /payroll/:id/adjust        → body: { manualBonus?, deductions? }
//   PATCH  /payroll/:id/approve       → no body
//   PATCH  /payroll/:id/reject        → no body
//   PATCH  /payroll/:id/paid          → no body
//
// Status machine: draft → approved → paid
//                 approved → draft (reject)
//
// Payroll fields (snapshot — all from model):
//   tenantId, outletId, employeeId, period: { month, year }
//   salaryType, baseSalary (snapshot)
//   workingDays, presentDays, absentDays
//   totalCupsSold, cupsBonus
//   manualBonus, deductions
//   salaryEarned, totalPay
//   status, generatedBy, approvedBy, generatedAt, approvedAt

import apiClient from '@/lib/axios'

/**
 * Generate payroll for all active employees in an outlet for a period.
 * @param {{ outletId: string, month: number, year: number, workingDays: number }} payload
 */
export const generatePayroll = async (payload) => {
  const { data } = await apiClient.post('/payroll/generate', payload)
  return data // { success, message, data: { generated, skipped, skippedItems } }
}

/**
 * Fetch paginated payroll list.
 * @param {{ page?, limit?, outletId?, month?, year?, status?, employeeId? }} params
 */
export const getPayrolls = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  )
  const { data } = await apiClient.get('/payroll', { params: cleanParams })
  return data // { success, message, data: Payroll[], pagination }
}

/**
 * Fetch a single payroll record.
 */
export const getPayroll = async (payrollId) => {
  const { data } = await apiClient.get(`/payroll/${payrollId}`)
  return data.data
}

/**
 * Adjust manualBonus and/or deductions on a draft/approved payroll.
 * Backend recalculates totalPay after adjustment.
 * Cannot adjust paid payrolls.
 * @param {string} payrollId
 * @param {{ manualBonus?: number, deductions?: number }} payload
 */
export const adjustPayroll = async (payrollId, payload) => {
  const { data } = await apiClient.patch(`/payroll/${payrollId}/adjust`, payload)
  return data.data
}

/**
 * Approve a draft payroll → status becomes 'approved'.
 */
export const approvePayroll = async (payrollId) => {
  const { data } = await apiClient.patch(`/payroll/${payrollId}/approve`)
  return data.data
}

/**
 * Reject/revert an approved payroll → status becomes 'draft'.
 * Clears approvedBy + approvedAt.
 */
export const rejectPayroll = async (payrollId) => {
  const { data } = await apiClient.patch(`/payroll/${payrollId}/reject`)
  return data.data
}

/**
 * Mark an approved payroll as paid → status becomes 'paid' (terminal).
 */
export const markPayrollPaid = async (payrollId) => {
  const { data } = await apiClient.patch(`/payroll/${payrollId}/paid`)
  return data.data
}