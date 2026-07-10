// src/features/bikeMaintenance/api/bikeMaintenanceApi.js
// HTTP calls for the two bikeMaintenance resources.
// Two separate base paths (confirmed from bikeMaintenance.routes.js):
//   /api/v1/bike-damage-reports
//   /api/v1/bike-repair-records
//
// ── BikeDamageReport ────────────────────────────────────────────
// Fields: { _id, tenantId, bikeId, reportedBy, damageType, severity,
//           reportedAt, status, notes, createdAt, updatedAt }
//
// POST  body:     { bikeId, damageType, severity, notes? }
//   NEVER send:   tenantId, reportedBy (from JWT), reportedAt, status (defaults OPEN)
//
// PATCH /:id/status body: { status: 'OPEN'|'IN_REPAIR'|'RESOLVED' }
//   Status ONLY via this dedicated endpoint — never via a generic update.
//   No generic PATCH exists on damage reports.
//
// GET query:      { bikeId?, status?, page, limit }
//
// ── BikeRepairRecord ────────────────────────────────────────────
// Fields: { _id, tenantId, damageReportId, repairDate, cost,
//           repairStatus, notes, createdAt, updatedAt }
//
// POST  body:     { damageReportId, repairDate, cost, notes? }
//   NEVER send:   tenantId, repairStatus (defaults IN_PROGRESS)
//
// PATCH /:id body: { repairStatus?, cost?, notes? } — at least one required
//   repairStatus can be changed via generic PATCH (unlike damageReport.status)
//
// GET query:      { damageReportId?, repairStatus?, page, limit }

import apiClient from '@/lib/axios'

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  )

// ── Damage Reports ─────────────────────────────────────────────

export const getDamageReports = async (params = {}) => {
  const { data } = await apiClient.get('/bike-damage-reports', { params: cleanParams(params) })
  return data // { success, message, data: DamageReport[], pagination }
}

/**
 * @param {{ bikeId, damageType, severity, notes? }} payload
 */
export const createDamageReport = async (payload) => {
  const { data } = await apiClient.post('/bike-damage-reports', payload)
  return data.data
}

/**
 * Dedicated status endpoint only — no generic PATCH exists for damage reports.
 * @param {string} damageReportId
 * @param {'OPEN'|'IN_REPAIR'|'RESOLVED'} status
 */
export const updateDamageReportStatus = async (damageReportId, status) => {
  const { data } = await apiClient.patch(`/bike-damage-reports/${damageReportId}/status`, { status })
  return data.data
}

// ── Repair Records ─────────────────────────────────────────────

export const getRepairRecords = async (params = {}) => {
  const { data } = await apiClient.get('/bike-repair-records', { params: cleanParams(params) })
  return data // { success, message, data: RepairRecord[], pagination }
}

/**
 * @param {{ damageReportId, repairDate, cost, notes? }} payload
 */
export const createRepairRecord = async (payload) => {
  const { data } = await apiClient.post('/bike-repair-records', payload)
  return data.data
}

/**
 * @param {string} repairRecordId
 * @param {{ repairStatus?, cost?, notes? }} payload — at least one required
 */
export const updateRepairRecord = async (repairRecordId, payload) => {
  const { data } = await apiClient.patch(`/bike-repair-records/${repairRecordId}`, payload)
  return data.data
}