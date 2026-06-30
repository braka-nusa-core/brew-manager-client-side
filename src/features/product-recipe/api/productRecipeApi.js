// src/features/product-recipe/api/productRecipeApi.js
// All product recipe HTTP calls — no logic, no state.
//
// Backend ProductRecipe model:
//   { _id, tenantId, productId, items: [{rawMaterialId, quantityUsed}], createdAt, updatedAt }
//
// Backend contract (confirmed from productRecipe.routes.js + controller + service):
//   GET    /products/:productId/recipe   → { success, message, data: ProductRecipe } or 404 if none exists
//   PUT    /products/:productId/recipe   → body: { items: [{rawMaterialId, quantityUsed}] }
//                                           FULL REPLACE — always submit the complete desired item list,
//                                           never a delta. 201 if created, 200 if replaced.
//   DELETE /products/:productId/recipe   → 204 No Content. Removes the recipe entirely and resets
//                                           Product.cachedHPP to 0 server-side.
//
// Nested sub-resource only — no top-level list/search endpoint exists or is planned
// (approved backend architecture decision, see productRecipe.routes.js).
//
// Business rules enforced server-side (mirrored in the Zod schema, not re-validated here):
//   items must be a non-empty array
//   items[].rawMaterialId must be a valid ObjectId belonging to the same tenant
//   items[].quantityUsed must be a number strictly greater than 0 (zero rejected)
//   no duplicate rawMaterialId within items[]
//
// Field rules:
//   tenantId — NEVER send. Derived from JWT server-side.
//   PUT always replaces items[] in full — there is no incremental add/remove endpoint.

import apiClient from '@/lib/axios'

/**
 * Fetch the recipe for a product.
 * Returns `null` (not an error) when no recipe exists yet — a 404 here
 * means "recipe not created yet", not an application error, per the
 * backend's own getRecipe() contract. Any other error status is
 * re-thrown normally so genuine failures still surface to the caller.
 *
 * @param {string} productId
 * @returns {Promise<Object|null>}
 */
export const getProductRecipe = async (productId) => {
  try {
    const { data } = await apiClient.get(`/products/${productId}/recipe`)
    return data.data
  } catch (err) {
    if (err.response?.status === 404) return null
    throw err
  }
}

/**
 * Create or fully replace the recipe for a product.
 * FULL REPLACE — always submit the complete desired items array,
 * never a partial/delta update. The backend has no PATCH for recipes.
 *
 * @param {string} productId
 * @param {Array<{ rawMaterialId: string, quantityUsed: number }>} items
 */
export const upsertProductRecipe = async (productId, items) => {
  const { data } = await apiClient.put(`/products/${productId}/recipe`, { items })
  return data.data
}

/**
 * Delete the recipe for a product entirely.
 * Backend resets Product.cachedHPP to 0 as part of this operation.
 *
 * @param {string} productId
 */
export const deleteProductRecipe = async (productId) => {
  await apiClient.delete(`/products/${productId}/recipe`)
}