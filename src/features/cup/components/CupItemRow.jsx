// src/features/cup/components/CupItemRow.jsx
// Single repeatable item row: product selector + quantity fields +
// live balance preview + remove button.
//
// Balance formula (mirrored from cup.service.js):
//   carried   = distributed + refill
//   accounted = sold + returned + reject
//   balance   = carried - accounted  (must be 0 to finalize)
//
// `refill` is READ-ONLY here — real refill events go exclusively through
// the dedicated Refill action (POST /cups/:id/refill), which the backend
// appends as separate logged events. This row still submits the current
// refill value (as a hidden field) so a PATCH save never overwrites it.
//
// Remaining numeric fields are non-negative integers (0 is valid — backend
// default). Initialised to 0 so the user can simply clear/type a new value.
//
// Duplicate productId prevention: parent passes `selectedIds` (other rows' ids)
// so this row's own dropdown excludes them but keeps its current selection.

import { Trash2, Loader2 } from 'lucide-react'
import { Select, Input } from '@/components/shared/FormField'
import { useInventoryProductDetail } from '@/features/inventory/hooks/useInventory'
import { cn } from '@/lib/utils'

/**
 * @param {{
 *   index:            number,
 *   register:         Function,           // react-hook-form register
 *   errors:           Object | undefined, // errors.items[index]
 *   products:         Object[],           // active products list
 *   selectedIds:      Set<string>,        // productIds chosen by OTHER rows
 *   currentProductId: string,
 *   watchedItem:      Object,             // current field values for live balance
 *   disabled:         boolean,
 *   canRemove:        boolean,
 *   onRemove:         () => void,
 *   isEdit:           boolean,            // true = editing an existing draft (refill has a real value to show)
 * }} props
 */
const CupItemRow = ({
  index,
  register,
  errors,
  products,
  selectedIds,
  currentProductId,
  watchedItem,
  disabled,
  canRemove,
  onRemove,
  isEdit = false,
}) => {
  // Exclude products chosen by other rows; keep this row's own selection visible
  const availableProducts = products.filter(
    (p) => !selectedIds.has(p._id) || p._id === currentProductId
  )

  // Live balance preview — mirrors backend formula exactly
  const dist    = Number(watchedItem?.distributed) || 0
  const refill  = Number(watchedItem?.refill)      || 0
  const sold    = Number(watchedItem?.sold)         || 0
  const returned = Number(watchedItem?.returned)   || 0
  const reject  = Number(watchedItem?.reject)      || 0

  const carried   = dist + refill
  const accounted = sold + returned + reject
  const balance   = carried - accounted
  const isBalanced = balance === 0

  const hasError = !!errors?.productId

  // Available stock for the currently selected product — backend-computed
  // (InventoryOverview.summary.totalRemaining), not calculated here.
  // Reuses the exact same hook/endpoint as the Inventory feature
  // (useInventoryProductDetail) — no new API surface introduced.
  // `enabled: !!currentProductId` keeps this from firing until a
  // product is actually chosen; React Query caches by productId, so
  // re-selecting an already-seen product across rows does not refetch.
  const { data: stockDetail, isLoading: stockLoading } =
    useInventoryProductDetail(currentProductId)
  const availableStock = stockDetail?.summary?.totalRemaining

  return (
    <div className={cn(
      'rounded-lg border bg-card p-3 space-y-2.5',
      hasError ? 'border-destructive/50' : 'border-border'
    )}>

      {/* Row 1: row number + product selector + remove */}
      <div className="flex items-start gap-2">
        <span className="w-6 flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0 pt-2">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <Select
            {...register(`items.${index}.productId`)}
            error={!!errors?.productId}
            disabled={disabled}
          >
            <option value="">Select product…</option>
            {availableProducts.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </Select>
          {errors?.productId && (
            <p className="text-[11px] text-destructive mt-1">{errors.productId.message}</p>
          )}
          {currentProductId && (
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              {stockLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>Available Stock: <strong className="text-foreground">{availableStock ?? 0} cup</strong></>
              )}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove || disabled}
          className={cn(
            'w-8 h-8 shrink-0 flex items-center justify-center rounded-md transition-colors mt-0.5',
            canRemove
              ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
              : 'text-muted-foreground/20 cursor-not-allowed'
          )}
          title={canRemove ? 'Remove product' : 'At least one product required'}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Row 2: quantity inputs — distributed is editable (dispatch), refill
          is READ-ONLY here (real refills only happen via the dedicated
          Refill action, appended as separate logged events server-side).
          A hidden input keeps the current refill value in the form payload
          so a PATCH save never accidentally overwrites it. */}
      <div className="pl-8 grid grid-cols-5 gap-2">
        {/* Distributed — editable (this is the dispatch quantity) */}
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
            Dist.
          </p>
          <Input
            {...register(`items.${index}.distributed`, { valueAsNumber: true })}
            type="number"
            min="0"
            step="1"
            placeholder="0"
            error={!!errors?.distributed}
            disabled={disabled}
            className="text-center"
          />
          {errors?.distributed && (
            <p className="text-[10px] text-destructive mt-0.5">{errors.distributed.message}</p>
          )}
        </div>

        {/* Refill — read-only display. Real refills go through the
            dedicated "Refill" action (POST /cups/:id/refill), never PATCH. */}
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
            Refill
          </p>
          <input type="hidden" {...register(`items.${index}.refill`, { valueAsNumber: true })} />
          <div
            className="h-9 flex items-center justify-center rounded-md border border-input bg-muted/40 text-sm text-muted-foreground tabular-nums"
            title={isEdit ? 'Use the Refill action to add more' : 'Set via the Refill action after dispatch'}
          >
            {Number(watchedItem?.refill) || 0}
          </div>
        </div>

        {/* OUT group */}
        {[
          { name: 'sold',     label: 'Sold' },
          { name: 'returned', label: 'Ret.' },
          { name: 'reject',   label: 'Rej.' },
        ].map(({ name, label }) => (
          <div key={name}>
            <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
              {label}
            </p>
            <Input
              {...register(`items.${index}.${name}`, { valueAsNumber: true })}
              type="number"
              min="0"
              step="1"
              placeholder="0"
              error={!!errors?.[name]}
              disabled={disabled}
              className="text-center"
            />
            {errors?.[name] && (
              <p className="text-[10px] text-destructive mt-0.5">{errors[name].message}</p>
            )}
          </div>
        ))}
      </div>

      {/* Row 3: live balance — only show when product is selected */}
      {currentProductId && (
        <div className={cn(
          'pl-8 flex items-center gap-3 text-xs rounded-md px-2.5 py-1.5',
          isBalanced
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
        )}>
          <span>Carried: <strong>{carried}</strong></span>
          <span className="text-current/40">·</span>
          <span>Accounted: <strong>{accounted}</strong></span>
          <span className="text-current/40">·</span>
          <span className={cn('font-semibold', !isBalanced && 'underline')}>
            {isBalanced ? '✓ Balanced' : `Balance: ${balance > 0 ? '+' : ''}${balance}`}
          </span>
        </div>
      )}
    </div>
  )
}

export default CupItemRow