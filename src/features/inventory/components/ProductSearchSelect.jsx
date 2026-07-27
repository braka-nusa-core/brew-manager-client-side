// src/features/inventory/components/ProductSearchSelect.jsx
//
// Shared by InventoryAdjustmentModal (Select Product → Select Batch) and
// StockOpnameModal (Select Product) — written ONCE here so both modals
// reuse the exact same search wiring instead of duplicating it.
//
// Reuses useInventoryList (Sprint 7.2) — the existing per-product overview
// endpoint already supports `search` — rather than adding a new "list
// products" API call. Only products that already have inventory history
// will appear (consistent with this endpoint's existing behavior
// elsewhere in the app); this is a deliberate reuse choice, not a new
// product-picker.

// Sprint 8.2: accepts an optional `initialQuery` to seed the internal
// search term — used by RecordProductionModal's "remember last selected
// product" so the remembered product's name resolves correctly in the
// dropdown immediately (AsyncSearchSelect can only display a label for
// an item present in its current `items` list). Defaults to '' —
// existing callers (InventoryAdjustmentModal, StockOpnameModal) are
// unaffected.

import { useState } from 'react'
import AsyncSearchSelect     from '@/components/shared/AsyncSearchSelect'
import { useInventoryList }  from '../hooks/useInventory'

/**
 * @param {{
 *   value: string, onChange: (productId: string) => void,
 *   error?: boolean, disabled?: boolean, initialQuery?: string,
 * }} props
 */
const ProductSearchSelect = ({ value, onChange, error, disabled, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery)

  const { data, isLoading } = useInventoryList({ search: query || undefined, limit: 20 })
  const items = data?.data ?? []

  return (
    <AsyncSearchSelect
      value={value}
      onChange={onChange}
      items={items}
      getLabel={(item) => item.productName}
      getValue={(item) => item.productId}
      onSearchChange={setQuery}
      isLoading={isLoading}
      placeholder="Cari produk…"
      error={error}
      disabled={disabled}
      emptyMessage="Tidak ada produk dengan riwayat inventaris ditemukan."
    />
  )
}

export default ProductSearchSelect