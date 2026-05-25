// src/hooks/useEntityMap.js
//
// Provides id → { name, ... } lookup maps for employees and outlets.
//
// ── Problem ───────────────────────────────────────────────────
// Backend list endpoints (sales, attendance) return raw ObjectId strings
// for employeeId and outletId — they are NOT populated objects.
// Tables need names for display; fetching each record individually
// would cause N+1 requests.
//
// ── Solution ─────────────────────────────────────────────────
// Fetch all active employees + outlets once with a large limit.
// Build a Map<id_string, object> for O(1) lookup per row.
// TanStack Query caches the result — no re-fetch on every render.
// staleTime: 5 min for outlets (rarely change), 2 min for employees.
//
// ── Usage ────────────────────────────────────────────────────
//
//   const { employeeMap, outletMap, isLoading } = useEntityMap()
//
//   // In a table row:
//   const employee = employeeMap.get(sale.employeeId) // { name, position, ... }
//   const outlet   = outletMap.get(sale.outletId)     // { name, code, ... }
//   const empName  = employee?.name ?? '—'
//   const outName  = outlet?.name   ?? '—'

import { useEmployees } from '@/features/employee/hooks/useEmployees'
import { useOutlets }   from '@/features/outlets/hooks/useOutlets'

/**
 * @returns {{
 *   employeeMap: Map<string, Object>,
 *   outletMap:   Map<string, Object>,
 *   isLoading:   boolean,
 * }}
 */
const useEntityMap = () => {
  const { data: empData,    isLoading: empLoading  } = useEmployees({ limit: 500 })
  const { data: outletData, isLoading: outletLoading } = useOutlets({ limit: 500 })

  const employees = empData?.data    ?? []
  const outlets   = outletData?.data ?? []

  // Build Maps — O(n) once, then O(1) per lookup in table rows
  const employeeMap = new Map(employees.map((e) => [e._id.toString(), e]))
  const outletMap   = new Map(outlets.map((o)   => [o._id.toString(), o]))

  return {
    employeeMap,
    outletMap,
    isLoading: empLoading || outletLoading,
  }
}

export default useEntityMap