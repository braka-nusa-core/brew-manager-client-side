// src/features/inventory/components/ProductSearchSelect.jsx
//
// Shared by InventoryAdjustmentModal (Select Product → Select Batch),
// StockOpnameModal (Select Product), and RecordProductionModal (Select
// Product) — written ONCE here so every caller reuses the exact same
// search/select wiring instead of duplicating it.
//
// Sprint 8.2.1 — Bootstrap fix: supports two data `source`s instead of
// always reading from Inventory:
//   'inventory' (default, unchanged) — reuses useInventoryList (Sprint
//     7.2), the per-product overview endpoint. Only products that already
//     have inventory history appear. Correct for InventoryAdjustmentModal
//     and StockOpnameModal, which both require an existing batch to act
//     on.
//   'catalog' — reads straight from the Product catalog (useProducts /
//     GET /products, isActive-filtered). Used by RecordProductionModal,
//     which previously depended on 'inventory' and therefore could never
//     list a product until AFTER a first production batch existed for
//     it — a circular dependency (Product → Production → Inventory
//     instead of Inventory → Production) that made bootstrapping a fresh
//     tenant impossible. No new product-picker was created; this is the
//     same component, same AsyncSearchSelect wiring, switched to a
//     different existing query per source.
//
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
import { useProducts }       from '@/features/product/hooks/useProducts'

// Two thin internal variants, each calling exactly one query hook, so
// switching `source` never calls both hooks on every render (and never
// fires the unused source's request). `source` is expected to be fixed
// per call site (InventoryAdjustmentModal/StockOpnameModal always pass
// 'inventory' or omit it; RecordProductionModal always passes 'catalog'),
// so mounting a different inner component per source is safe and does
// not violate the rules of hooks.

const InventorySourcedSelect = ({ value, onChange, error, disabled, initialQuery }) => {
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

const CatalogSourcedSelect = ({ value, onChange, error, disabled, initialQuery }) => {
  const [query, setQuery] = useState(initialQuery)
  const { data, isLoading } = useProducts({ search: query || undefined, limit: 20, isActive: 'true' })
  const items = data?.data ?? []

  return (
    <AsyncSearchSelect
      value={value}
      onChange={onChange}
      items={items}
      getLabel={(item) => item.name}
      getValue={(item) => item._id}
      onSearchChange={setQuery}
      isLoading={isLoading}
      placeholder="Cari produk…"
      error={error}
      disabled={disabled}
      emptyMessage="Tidak ada produk ditemukan."
    />
  )
}

/**
 * @param {{
 *   value: string, onChange: (productId: string) => void,
 *   error?: boolean, disabled?: boolean, initialQuery?: string,
 *   source?: 'inventory' | 'catalog',
 * }} props
 */
const ProductSearchSelect = ({
  value, onChange, error, disabled, initialQuery = '', source = 'inventory',
}) => {
  const Variant = source === 'catalog' ? CatalogSourcedSelect : InventorySourcedSelect

  return (
    <Variant
      value={value}
      onChange={onChange}
      error={error}
      disabled={disabled}
      initialQuery={initialQuery}
    />
  )
}

export default ProductSearchSelect