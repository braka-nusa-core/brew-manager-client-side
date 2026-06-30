// src/features/product/components/ProductTable.jsx
import { useState, useRef }          from 'react'
import { createPortal }              from 'react-dom'
import { MoreHorizontal, Pencil, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import DataTable                     from '@/components/shared/DataTable'
import ProductStatusBadge            from './ProductStatusBadge'
import ProductFormModal              from './ProductFormModal'
import ProductDeleteConfirmDialog    from './ProductDeleteConfirmDialog'
import { useUpdateProduct }          from '../hooks/useProducts'
import useToast                      from '@/hooks/useToast'
import { cn }                        from '@/lib/utils'

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(amount ?? 0)

// Mirrors backend product.service.js → getProductMargin formula exactly.
// Computed client-side from already-fetched list data — calling the
// dedicated /margin endpoint per row would be an N+1 request pattern
// not used anywhere else in this codebase.
const computeMargin = (sellingPrice, cachedHPP) => {
  const price = sellingPrice ?? 0
  const hpp   = cachedHPP ?? 0
  const marginAmount = price - hpp
  const marginPercentage = price > 0 ? Math.round((marginAmount / price) * 100) : 0
  return marginPercentage
}

// No dedicated toggle-active endpoint exists for Product on the backend —
// status changes go through the general PATCH via updateProduct.
const RowActions = ({ product, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const triggerRef     = useRef(null)
  const updateMutation    = useUpdateProduct()
  const toast              = useToast()

  const handleToggle = () => {
    setOpen(false)
    updateMutation.mutate(
      { productId: product._id, payload: { isActive: !product.isActive } },
      {
        onSuccess: (updated) => {
          toast.success(updated.isActive ? 'Product activated' : 'Product deactivated', updated.name)
        },
        onError: (err) => toast.error('Failed to update status', err.response?.data?.message),
      }
    )
  }

  // Dropdown is portaled to <body> and positioned via fixed coordinates
  // computed from the trigger's bounding rect, so it is never clipped by
  // a table/card ancestor's overflow-hidden/auto.
  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 192 }) // 192px = w-48
    }
    setOpen((o) => !o)
  }

  return (
    <div className="relative flex justify-end">
      <button
        ref={triggerRef}
        onClick={handleOpen}
        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            style={{ top: menuPos.top, left: menuPos.left }}
            className="fixed w-48 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-fade-in"
          >
            <button
              onClick={() => { setOpen(false); onEdit(product) }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              Edit Details
            </button>

            <button
              onClick={handleToggle}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              {product.isActive
                ? <ToggleLeft  className="w-3.5 h-3.5 text-muted-foreground" />
                : <ToggleRight className="w-3.5 h-3.5 text-brand-500" />}
              {product.isActive ? 'Deactivate' : 'Activate'}
            </button>

            <div className="border-t border-border" />

            <button
              onClick={() => { setOpen(false); onDelete(product) }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

/**
 * @param {{ products: Object[], canManage: boolean }} props
 */
const ProductTable = ({ products, canManage }) => {
  const [editTarget,   setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  return (
    <>
      <DataTable>
        <DataTable.Head>
          <DataTable.HeadRow>
            <DataTable.HeadCell>Product</DataTable.HeadCell>
            <DataTable.HeadCell>Selling Price</DataTable.HeadCell>
            <DataTable.HeadCell>Cost (HPP)</DataTable.HeadCell>
            <DataTable.HeadCell>Margin</DataTable.HeadCell>
            <DataTable.HeadCell>Status</DataTable.HeadCell>
            {canManage && <DataTable.HeadCell className="w-12" />}
          </DataTable.HeadRow>
        </DataTable.Head>

        <DataTable.Body>
          {products.map((p) => {
            const marginPercentage = computeMargin(p.sellingPrice, p.cachedHPP)
            return (
              <DataTable.Row key={p._id}>
                <DataTable.Cell>
                  <span className="font-medium text-foreground">{p.name}</span>
                </DataTable.Cell>

                <DataTable.Cell>
                  <span className="font-mono text-xs">{formatCurrency(p.sellingPrice)}</span>
                </DataTable.Cell>

                <DataTable.Cell>
                  <span className="font-mono text-xs text-muted-foreground">{formatCurrency(p.cachedHPP)}</span>
                </DataTable.Cell>

                <DataTable.Cell>
                  <span className={cn(
                    'font-mono text-xs',
                    marginPercentage < 0 ? 'text-destructive' : 'text-foreground'
                  )}>
                    {marginPercentage}%
                  </span>
                </DataTable.Cell>

                <DataTable.Cell>
                  <ProductStatusBadge isActive={p.isActive} />
                </DataTable.Cell>

                {canManage && (
                  <DataTable.Cell>
                    <RowActions product={p} onEdit={setEditTarget} onDelete={setDeleteTarget} />
                  </DataTable.Cell>
                )}
              </DataTable.Row>
            )
          })}
        </DataTable.Body>
      </DataTable>

      {canManage && (
        <>
          <ProductFormModal
            open={!!editTarget}
            onClose={() => setEditTarget(null)}
            product={editTarget}
          />

          <ProductDeleteConfirmDialog
            open={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            product={deleteTarget}
          />
        </>
      )}
    </>
  )
}

export default ProductTable