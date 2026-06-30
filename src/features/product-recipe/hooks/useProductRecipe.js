// src/features/product-recipe/hooks/useProductRecipe.js
// TanStack Query hooks for product recipe data.
// Mirrors the query/mutation hook shape used by useProducts.js /
// useRawMaterials.js, with one necessary addition: recipe mutations
// must also invalidate Product's own query keys, since every successful
// PUT/DELETE here changes Product.cachedHPP server-side (and therefore
// the margin derived from it) — confirmed by tracing productRecipe.service.js's
// recalculateCachedHPP() write path.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProductRecipe,
  upsertProductRecipe,
  deleteProductRecipe,
} from '../api/productRecipeApi'
import { productKeys } from '@/features/product/hooks/useProducts'

// ── Query key factory ─────────────────────────────────────────
// No list/lists key — ProductRecipe is a nested sub-resource with no
// independent list use case (matches the backend's own architecture
// decision, documented in productRecipe.routes.js).

export const productRecipeKeys = {
  detail: (productId) => ['productRecipe', 'detail', productId],
}

// ── useProductRecipe — fetch recipe for a product ─────────────
//
// Resolves to `null` (not isError) when no recipe exists yet — the API
// layer already converts a 404 into a null return value, so a missing
// recipe is normal, successful "empty" data here, not a query error.

export const useProductRecipe = (productId) =>
  useQuery({
    queryKey:  productRecipeKeys.detail(productId),
    queryFn:   () => getProductRecipe(productId),
    enabled:   !!productId,
    staleTime: 1000 * 60 * 2,
  })

// ── useUpsertProductRecipe ──────────────────────────────────────
//
// On success, invalidates:
//   - this recipe's own detail key (items[] changed)
//   - the product's detail key (cachedHPP changed)
//   - the product list key (table's cost/margin columns are stale)
//   - the product's margin key (marginAmount/marginPercentage derived from cachedHPP)
// so cachedHPP and margin update everywhere automatically without a
// manual page refresh.

export const useUpsertProductRecipe = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, items }) => upsertProductRecipe(productId, items),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: productRecipeKeys.detail(productId) })
      queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) })
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
      queryClient.invalidateQueries({ queryKey: productKeys.margin(productId) })
    },
  })
}

// ── useDeleteProductRecipe ───────────────────────────────────────
//
// Same invalidation set as upsert — deleting a recipe resets
// cachedHPP to 0 server-side, which is just as much a cachedHPP
// change as any other value.

export const useDeleteProductRecipe = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteProductRecipe,
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: productRecipeKeys.detail(productId) })
      queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) })
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
      queryClient.invalidateQueries({ queryKey: productKeys.margin(productId) })
    },
  })
}