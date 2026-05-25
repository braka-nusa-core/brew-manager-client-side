// src/features/employee/api/employeeApi.js
import apiClient from '@/lib/axios'

/**
 * Fetch paginated employee list.
 *
 * Backend: GET /api/v1/employees
 * Supported query params:
 *   page, limit, search, outletId, isActive, position, sortBy, sortOrder
 *
 * Response: { success, message, data: Employee[], pagination }
 */
export const getEmployees = async (params = {}) => {
  const { data } = await apiClient.get('/employees', { params })
  return data  // { success, message, data, pagination }
}

/**
 * Fetch a single employee by ID.
 * Response: { success, message, data: Employee }
 */
export const getEmployee = async (employeeId) => {
  const { data } = await apiClient.get(`/employees/${employeeId}`)
  return data.data
}

/**
 * Create a new employee.
 * @param {Object} payload - validated employee fields
 */
export const createEmployee = async (payload) => {
  const { data } = await apiClient.post('/employees', payload)
  return data.data
}

/**
 * Update an existing employee.
 * @param {string} employeeId
 * @param {Object} payload - partial update fields
 */
export const updateEmployee = async (employeeId, payload) => {
  const { data } = await apiClient.patch(`/employees/${employeeId}`, payload)
  return data.data
}

/**
 * Toggle employee active/inactive status.
 */
export const toggleEmployeeActive = async (employeeId) => {
  const { data } = await apiClient.patch(`/employees/${employeeId}/toggle-active`)
  return data.data
}

/**
 * Soft-delete an employee (sets isActive = false).
 * Returns 204 — no body.
 */
export const deleteEmployee = async (employeeId) => {
  await apiClient.delete(`/employees/${employeeId}`)
}