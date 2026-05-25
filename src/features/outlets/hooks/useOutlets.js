// src/features/outlets/hooks/useOutlets.js
// TanStack Query hooks for outlet data.
// Follows the exact same query key factory pattern as useEmployees, useSales, etc.

import { useQuery } from '@tanstack/react-query'
import { getOutlets } from '../api/outletsApi'

// ── Query key factory ─────────────────────────────────────────

export const outletKeys = {
  all:   () => ['outlets'],
  lists: () => ['outlets', 'list'],
  list:  (params) => ['outlets', 'list', params],
}

// ── useOutlets — paginated / filtered list ────────────────────

/**
 * @param {{
 *   search?: string,
 *   isActive?: boolean,
 *   page?: number,
 *   limit?: number,
 * }} params
 * @param {{ enabled?: boolean }} options
 */
export const useOutlets = (params = {}, { enabled = true } = {}) =>
  useQuery({
    queryKey:        outletKeys.list(params),
    queryFn:         () => getOutlets(params),
    enabled,
    placeholderData: (prev) => prev,
    staleTime:       1000 * 60 * 5, // outlets change infrequently — 5 min
  })