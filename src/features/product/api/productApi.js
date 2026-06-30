// src/features/product/api/productApi.js
// All product HTTP calls — no logic, no state.
//
// Backend Product model:
//   { _id, tenantId, name, isActive, sellingPrice, cachedHPP, createdAt, updatedAt }
//
// Backend contract (confirmed from product.routes.js + product.controller.js + product.service.js):
//   GET    /products              → { success, message, data: Product[], pagination }
//   POST   /products              → body: { name, sellingPrice? }
//   GET    /products/:id/margin   → { success, message, data: { productId, productName, sellingPrice, cachedHPP, marginAmount, marginPercentage } }
//   GET    /products/:id          → { success, message, data: Product }
//   PATCH  /products/:id          → body: { name?, isActive?, sellingPrice? } (at least one required)
//   DELETE /products/:id          → 204 No Content (soft delete — isActive = false)
//
// Filter params: page, limit, search, isActive
//
// Field rules:
//   tenantId    — NEVER send. Derived from JWT server-side. Rejected with 400 if present on update.
//   cachedHPP   — NEVER send. Server-computed exclusively by productRecipe.service.js. Rejected with 400 if present on update.
//   isActive    — settable on update only (not accepted on create; defaults to true server-side).
//
// Access:
//   MANAGE_PRODUCTS → create, update, delete (tenant_admin only)
//   VIEW_PRODUCTS   → list, detail, margin (tenant_admin, manager, cashier)

import apiClient from '@/lib/axios'

/**
 * Fetch paginated product list.
 * @param {{ page?: number, limit?: number, search?: string, isActive?: string }} params
 */
export const getProducts = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  )
  const { data } = await apiClient.get('/products', { params: cleanParams })
  return data // { success, message, data: Product[], pagination }
}

/**
 * Fetch a single product by ID.
 * @param {string} productId
 */
export const getProduct = async (productId) => {
  const { data } = await apiClient.get(`/products/${productId}`)
  return data.data
}

/**
 * Fetch margin breakdown for a single product.
 * Computed server-side from sellingPrice/cachedHPP only.
 * @param {string} productId
 */
export const getProductMargin = async (productId) => {
  const { data } = await apiClient.get(`/products/${productId}/margin`)
  return data.data
}

/**
 * Create a new product.
 * Do NOT include cachedHPP or tenantId — backend rejects/ignores them.
 * @param {{ name: string, sellingPrice?: number }} payload
 */
export const createProduct = async (payload) => {
  const { data } = await apiClient.post('/products', payload)
  return data.data
}

/**
 * Update a product.
 * tenantId and cachedHPP are immutable — do NOT send them.
 * At least one of name/isActive/sellingPrice required.
 * @param {string} productId
 * @param {{ name?: string, isActive?: boolean, sellingPrice?: number }} payload
 */
export const updateProduct = async (productId, payload) => {
  const { data } = await apiClient.patch(`/products/${productId}`, payload)
  return data.data
}

/**
 * Soft-delete a product (sets isActive = false).
 * Returns 204 — no body. Record preserved for CupRecord history.
 * @param {string} productId
 */
export const deleteProduct = async (productId) => {
  await apiClient.delete(`/products/${productId}`)
}