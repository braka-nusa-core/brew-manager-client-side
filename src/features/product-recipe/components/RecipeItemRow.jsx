// src/features/product-recipe/components/RecipeItemRow.jsx
// Single repeatable recipe-line row: raw material selector + quantity +
// live subtotal + remove button. Mirrors the per-entry card pattern
// established in BulkAttendanceModal.jsx's EntryCard, adapted to a
// compact single-line layout since a recipe item only has two fields
// (unlike attendance's employee+status+notes).

import { Trash2 } from 'lucide-react'
import { Select, Input } from '@/components/shared/FormField'
import { cn } from '@/lib/utils'

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(amount ?? 0)

/**
 * @param {{
 *   index:            number,
 *   register:         Function,                // react-hook-form register
 *   error:            { rawMaterialId?: Object, quantityUsed?: Object } | undefined,
 *   rawMaterials:     Object[],                 // full active raw material list
 *   selectedIds:      Set<string>,              // rawMaterialIds chosen by OTHER rows
 *   currentRawMaterialId: string,               // this row's currently selected value
 *   currentQuantity:  number | string,
 *   disabled:         boolean,
 *   canRemove:        boolean,
 *   onRemove:         () => void,
 * }} props
 */
const RecipeItemRow = ({
  index,
  register,
  error,
  rawMaterials,
  selectedIds,
  currentRawMaterialId,
  currentQuantity,
  disabled,
  canRemove,
  onRemove,
}) => {
  // Duplicate prevention: exclude materials already chosen by OTHER rows,
  // but always keep this row's own current selection visible in its list.
  const availableMaterials = rawMaterials.filter(
    (m) => !selectedIds.has(m._id) || m._id === currentRawMaterialId
  )

  const selectedMaterial = rawMaterials.find((m) => m._id === currentRawMaterialId)
  const quantity   = typeof currentQuantity === 'number' ? currentQuantity : Number(currentQuantity) || 0
  const subtotal   = selectedMaterial ? quantity * selectedMaterial.costPerUnit : 0

  return (
    <div className={cn(
      'flex items-start gap-2 p-3 rounded-lg border bg-card',
      error?.rawMaterialId || error?.quantityUsed ? 'border-destructive/50' : 'border-border'
    )}>
      {/* Row number */}
      <span className="w-6 h-9 flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">
        {index + 1}
      </span>

      {/* Raw material selector */}
      <div className="flex-1 min-w-0">
        <Select
          {...register(`items.${index}.rawMaterialId`)}
          error={!!error?.rawMaterialId}
          disabled={disabled}
        >
          <option value="">Select material…</option>
          {availableMaterials.map((m) => (
            <option key={m._id} value={m._id}>
              {m.name} ({m.unit})
            </option>
          ))}
        </Select>
        {error?.rawMaterialId && (
          <p className="text-[11px] text-destructive mt-1">{error.rawMaterialId.message}</p>
        )}
      </div>

      {/* Quantity used */}
      <div className="w-28 shrink-0">
        <Input
          {...register(`items.${index}.quantityUsed`, { valueAsNumber: true })}
          type="number"
          step="any"
          min="0.0001"
          placeholder={selectedMaterial ? selectedMaterial.unit : 'qty'}
          error={!!error?.quantityUsed}
          disabled={disabled}
        />
        {error?.quantityUsed && (
          <p className="text-[11px] text-destructive mt-1">{error.quantityUsed.message}</p>
        )}
      </div>

      {/* Live subtotal */}
      <div className="w-24 shrink-0 h-9 flex items-center justify-end font-mono text-xs text-muted-foreground">
        {selectedMaterial ? formatCurrency(subtotal) : '—'}
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove || disabled}
        className={cn(
          'w-9 h-9 shrink-0 flex items-center justify-center rounded-md transition-colors',
          canRemove
            ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
            : 'text-muted-foreground/20 cursor-not-allowed'
        )}
        title={canRemove ? 'Remove item' : 'At least one item required'}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

export default RecipeItemRow