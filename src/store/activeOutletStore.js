// ============================================================
// store/activeOutletStore.js
// Zustand store for the currently-active outlet (Outlet Switcher).
//
// This is a SEPARATE store from authStore on purpose: authStore's
// accessToken is deliberately memory-only for security (never
// persisted — see authStore.js's own comments). An outlet ID is not
// sensitive, so it can be safely persisted across page refreshes.
//
// Persistence: plain localStorage read/write, mirroring the exact
// pattern already used in DashboardLayout.jsx for the sidebar-collapse
// preference (COLLAPSED_KEY) — this codebase does not use zustand's
// `persist` middleware anywhere, so a plain localStorage key is used
// here for consistency rather than introducing a new mechanism.
//
// activeOutletId semantics:
//   null   → "All Outlets" (no outlet scoping — only meaningful for
//            super_admin / tenant_admin, who are allowed to switch)
//   string → a specific outlet's _id
//
// Manager/cashier (and any other non-switching role) should NEVER
// read this store to decide their working outlet — their outlet is
// always their own user.outletId, fixed, never user-selectable. See
// useEffectiveOutletId() below, which encodes that branching in one
// place so it isn't duplicated by every future consumer.
// ============================================================

import { create } from 'zustand'
import { useAuthStore, selectUser } from './authStore'

const STORAGE_KEY = 'active_outlet_id'

const readPersisted = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || null
  } catch {
    return null
  }
}

export const useActiveOutletStore = create((set) => ({
  activeOutletId: readPersisted(),

  /**
   * @param {string|null} outletId - null clears back to "All Outlets"
   */
  setActiveOutletId: (outletId) => {
    try {
      if (outletId) localStorage.setItem(STORAGE_KEY, outletId)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // localStorage unavailable (e.g. private browsing) — state still
      // updates in-memory for this session, it just won't survive a refresh.
    }
    set({ activeOutletId: outletId })
  },
}))

export const selectActiveOutletId = (state) => state.activeOutletId

// ── Effective outlet resolver ─────────────────────────────────
// Single source of truth for "what outlet should this request/query
// be scoped to right now" — combines the user's role with the
// switcher's stored selection, so this branching logic is written
// once and can be reused by any feature that wants to respect the
// active outlet, without duplicating the role check everywhere.
//
// super_admin / tenant_admin → whatever is stored (null = All Outlets)
// everyone else (manager, cashier, viewer, ...)  → always their own
//   assigned outlet; the store's value is never consulted for them.
const SWITCHABLE_ROLES = ['super_admin', 'tenant_admin']

export const useEffectiveOutletId = () => {
  const user           = useAuthStore(selectUser)
  const activeOutletId = useActiveOutletStore(selectActiveOutletId)

  if (SWITCHABLE_ROLES.includes(user?.role)) {
    return activeOutletId // may be null → "All Outlets"
  }
  return user?.outletId ?? null
}

export { SWITCHABLE_ROLES }