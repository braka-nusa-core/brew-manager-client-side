// src/features/raw-material/components/RawMaterialTable.jsx
// Mirrors src/features/product/components/ProductTable.jsx exactly,
// adapted for RawMaterial's field set (no margin/cachedHPP equivalent).

import { useState }                  from 'react'
import { MoreHorizontal, Pencil, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import DataTable                     from '@/components/shared/DataTable'
import RawMaterialStatusBadge        from './RawMaterialStatusBadge'
import RawMaterialFormModal          from './RawMaterialFormModal'
import RawMaterialDeleteConfirmDialog from './RawMaterialDeleteConfirmDialog'
import { useUpdateRawMaterial }      from '../hooks/useRawMaterials'
import useToast                      from '@/hooks/useToast'

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(amount ?? 0)

const UNIT_LABELS = {
  g:   'g',
  kg:  'kg',
  ml:  'ml',
  l:   'l',
  pcs: 'pcs',
}

// No dedicated toggle-active endpoint exists for RawMaterial on the backend —
// status changes go through the general PATCH via updateRawMaterial.
const RowActions = ({ rawMaterial, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false)
  const updateMutation  = useUpdateRawMaterial()
  const toast           = useToast()

  const handleToggle = () => {
    setOpen(false)
    updateMutation.mutate(
      { rawMaterialId: rawMaterial._id, payload: { isActive: !rawMaterial.isActive } },
      {
        onSuccess: (updated) => {
          toast.success(updated.isActive ? 'Material activated' : 'Material deactivated', updated.name)
        },
        onError: (err) => toast.error('Failed to update status', err.response?.data?.message),
      }
    )
  }

  return (
    <div className="relative flex justify-end">
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 z-20 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-fade-in">
            <button
              onClick={() => { setOpen(false); onEdit(rawMaterial) }}
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
              {rawMaterial.isActive
                ? <ToggleLeft  className="w-3.5 h-3.5 text-muted-foreground" />
                : <ToggleRight className="w-3.5 h-3.5 text-brand-500" />}
              {rawMaterial.isActive ? 'Deactivate' : 'Activate'}
            </button>

            <div className="border-t border-border" />

            <button
              onClick={() => { setOpen(false); onDelete(rawMaterial) }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * @param {{ rawMaterials: Object[], canManage: boolean }} props
 */
const RawMaterialTable = ({ rawMaterials, canManage }) => {
  const [editTarget,   setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  return (
    <>
      <DataTable>
        <DataTable.Head>
          <DataTable.HeadRow>
            <DataTable.HeadCell>Material</DataTable.HeadCell>
            <DataTable.HeadCell>Unit</DataTable.HeadCell>
            <DataTable.HeadCell>Cost / Unit</DataTable.HeadCell>
            <DataTable.HeadCell>Status</DataTable.HeadCell>
            {canManage && <DataTable.HeadCell className="w-12" />}
          </DataTable.HeadRow>
        </DataTable.Head>

        <DataTable.Body>
          {rawMaterials.map((m) => (
            <DataTable.Row key={m._id}>
              <DataTable.Cell>
                <span className="font-medium text-foreground">{m.name}</span>
              </DataTable.Cell>

              <DataTable.Cell>
                <span className="text-xs text-muted-foreground uppercase">{UNIT_LABELS[m.unit] ?? m.unit}</span>
              </DataTable.Cell>

              <DataTable.Cell>
                <span className="font-mono text-xs">{formatCurrency(m.costPerUnit)}</span>
              </DataTable.Cell>

              <DataTable.Cell>
                <RawMaterialStatusBadge isActive={m.isActive} />
              </DataTable.Cell>

              {canManage && (
                <DataTable.Cell>
                  <RowActions rawMaterial={m} onEdit={setEditTarget} onDelete={setDeleteTarget} />
                </DataTable.Cell>
              )}
            </DataTable.Row>
          ))}
        </DataTable.Body>
      </DataTable>

      {canManage && (
        <>
          <RawMaterialFormModal
            open={!!editTarget}
            onClose={() => setEditTarget(null)}
            rawMaterial={editTarget}
          />

          <RawMaterialDeleteConfirmDialog
            open={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            rawMaterial={deleteTarget}
          />
        </>
      )}
    </>
  )
}

export default RawMaterialTable