// src/features/attendance/api/attendanceApi.js
// All attendance HTTP calls — no logic, no state.
//
// Backend contract (from Step 6 implementation):
//   GET    /attendance           → { success, data: Attendance[], pagination }
//   GET    /attendance/:id       → { success, data: Attendance }
//   POST   /attendance           → body: { employeeId, date, status, notes? }
//   POST   /attendance/bulk      → body: { date, attendances: [{ employeeId, status, notes? }] }
//   PATCH  /attendance/:id       → body: { status?, notes? }  (only these two are mutable)
//   DELETE /attendance/:id       → 204 No Content (hard delete for corrections)
//
// Status enum: 'present' | 'absent' | 'late' | 'leave' | 'holiday'
// Filter params: employeeId, outletId, status, startDate, endDate, page, limit

import apiClient from '@/lib/axios'

/**
 * Fetch paginated attendance list.
 * @param {Object} params - { page, limit, employeeId, outletId, status, startDate, endDate }
 */
export const getAttendances = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  )
  const { data } = await apiClient.get('/attendance', { params: cleanParams })
  return data // { success, message, data, pagination }
}

/**
 * Fetch a single attendance record by ID.
 */
export const getAttendance = async (attendanceId) => {
  const { data } = await apiClient.get(`/attendance/${attendanceId}`)
  return data.data
}

/**
 * Create a single attendance record.
 * @param {{ employeeId: string, date: string, status: string, notes?: string }} payload
 */
export const createAttendance = async (payload) => {
  const { data } = await apiClient.post('/attendance', payload)
  return data.data
}

/**
 * Bulk create attendance records for one date.
 * @param {{ date: string, attendances: Array<{ employeeId: string, status: string, notes?: string }> }} payload
 */
export const bulkCreateAttendance = async (payload) => {
  const { data } = await apiClient.post('/attendance/bulk', payload)
  return data // returns { successCount, failedCount, failedItems }
}

/**
 * Update an attendance record (status and/or notes only).
 * Backend enforces: employeeId, date, outletId, tenantId are ALL immutable.
 * @param {string} attendanceId
 * @param {{ status?: string, notes?: string }} payload
 */
export const updateAttendance = async (attendanceId, payload) => {
  const { data } = await apiClient.patch(`/attendance/${attendanceId}`, payload)
  return data.data
}

/**
 * Hard delete an attendance record (used for corrections — re-submit after).
 * Returns 204 — no body.
 * @param {string} attendanceId
 */
export const deleteAttendance = async (attendanceId) => {
  await apiClient.delete(`/attendance/${attendanceId}`)
}