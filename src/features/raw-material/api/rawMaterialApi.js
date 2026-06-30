// src/features/raw-material/api/rawMaterialApi.js
// All raw material HTTP calls — no logic, no state.
// Mirrors src/features/product/api/productApi.js exactly — backend
// rawMaterial.* modules are explicitly documented as mirroring product.* .

//
// Backend RawMaterial model:
//   { _id, tenantId, name, unit, costPerUnit, isActive, createdAt, updatedAt }
//
// Backend contract (confirmed from rawMaterial.routes.js + controller + service):
//   GET    /raw-materials              → { success, message, data: RawMaterial[], pagination }
//   POST   /raw-materials              → body: { name, unit, costPerUnit }
//   GET    /raw-materials/:id          → { success, message, data: RawMaterial }
//   PATCH  /raw-materials/:id          → body: { name?, unit?, costPerUnit?, isActive? } (at least one required)
//   DELETE /raw-materials/:id          → 204 No Content (soft delete — isActive = false)
//
// Filter params: page, limit, search, isActive
//
// Field rules:
//   tenantId — NEVER send. Derived from JWT server-side. Rejected with 400 if present on update.
//   unit     — must be one of: 'g', 'kg', 'ml', 'l', 'pcs'. Required on create.
//   costPerUnit — required on create (unlike Product's sellingPrice, this has no
//                 default — backend rejects create with no fallback to 0).
//   isActive — settable on update only (not accepted on create; defaults to true server-side).
//
// Access:
//   MANAGE_RAW_MATERIALS → create, update, delete (tenant_admin only)
//   VIEW_RAW_MATERIALS   → list, detail (tenant_admin, manager, cashier)

import apiClient from '@/lib/axios'

/**
 * Fetch paginated raw material list.
 * @param {{ page?: number, limit?: number, search?: string, isActive?: string }} params
 */
export const getRawMaterials = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  )
  const { data } = await apiClient.get('/raw-materials', { params: cleanParams })
  return data // { success, message, data: RawMaterial[], pagination }
}

/**
 * Fetch a single raw material by ID.
 * @param {string} rawMaterialId
 */
export const getRawMaterial = async (rawMaterialId) => {
  const { data } = await apiClient.get(`/raw-materials/${rawMaterialId}`)
  return data.data
}

/**
 * Create a new raw material.
 * costPerUnit is required — backend has no default unlike Product.sellingPrice.
 * @param {{ name: string, unit: string, costPerUnit: number }} payload
 */
export const createRawMaterial = async (payload) => {
  const { data } = await apiClient.post('/raw-materials', payload)
  return data.data
}

/**
 * Update a raw material.
 * tenantId is immutable — do NOT send it.
 * At least one of name/unit/costPerUnit/isActive required.
 * @param {string} rawMaterialId
 * @param {{ name?: string, unit?: string, costPerUnit?: number, isActive?: boolean }} payload
 */
export const updateRawMaterial = async (rawMaterialId, payload) => {
  const { data } = await apiClient.patch(`/raw-materials/${rawMaterialId}`, payload)
  return data.data
}

/**
 * Soft-delete a raw material (sets isActive = false).
 * Returns 204 — no body. Record preserved for ProductRecipe history.
 * @param {string} rawMaterialId
 */
export const deleteRawMaterial = async (rawMaterialId) => {
  await apiClient.delete(`/raw-materials/${rawMaterialId}`)
}