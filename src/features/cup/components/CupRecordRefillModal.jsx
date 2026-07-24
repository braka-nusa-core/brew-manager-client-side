// src/features/cup/components/CupRecordRefillModal.jsx
// Records ONE refill event for a DRAFT cup record.
//
// This is the ONLY supported way to add refill quantity in the new workflow —
// it calls POST /cups/:id/refill, which appends to the backend's refillLogs
// (never overwrites the previous refill total). Multiple refills in a day
// means calling this modal multiple times, once per event.
//
// Only products already dispatched on the record can be refilled — the
// quantity input list is built from record.items, not from the full
// product catalog.
//
// Pattern follows CupRecordFormModal (react-hook-form + zod) but scoped
// down to just { quantity, notes } per already-dispatched product.

import { useEffect }                          from 'react'
import { useForm, useFieldArray }             from 'react-hook-form'
import { zodResolver }                        from '@hookform/resolvers/zod'
import { z }                                  from 'zod'
import { Loader2, RefreshCw }                 from 'lucide-react'

import Modal                from '@/components/shared/Modal'
import { Input }            from '@/components/shared/FormField'
import { useProducts }      from '@/features/product/hooks/useProducts'
import { useAddCupRefill }  from '../hooks/useCupRecords'
import useToast              from '@/hooks/useToast'
import { cn }                from '@/lib/utils'

// ── Zod schema ───────────────────────────────────────────────────
// quantity is optional per row (0/blank = "not refilling this product
// this time") but at least one row must have a positive quantity.

const refillItemSchema = z.object({
  productId: z.string(),
  quantity: z
    .union([z.number(), z.nan()])
    .transform((v) => (typeof v === 'number' && isNaN(v) ? 0 : Math.floor(v)))
    .pipe(z.number().int('Must be a whole number').min(0, 'Cannot be negative')),
  notes: z.string().max(200, 'Notes too long').optional().or(z.literal('')),
})

const refillSchema = z.object({
  items: z.array(refillItemSchema),
}).refine(
  (d) => d.items.some((i) => i.quantity > 0),
  { message: 'Enter a refill quantity for at least one product', path: ['items'] }
)

// ── Component ─────────────────────────────────────────────────

/**
 * @param {{
 *   open:    boolean,
 *   onClose: () => void,
 *   record:  Object | null,  // draft cup record being refilled
 * }} props
 */
const CupRecordRefillModal = ({ open, onClose, record }) => {
  const toast = useToast()

  // Product names for the already-dispatched items on this record.
  const { data: productsData, isLoading: productsLoading } = useProducts(
    { limit: 100 },
    { enabled: open && !!record }
  )
  const productMap = new Map((productsData?.data ?? []).map((p) => [String(p._id), p.name]))

  const refillMutation = useAddCupRefill()

  const getDefaults = () => ({
    items: (record?.items ?? []).map((item) => ({
      productId: item.productId?.toString?.() ?? item.productId ?? '',
      quantity:  0,
      notes:     '',
    })),
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(refillSchema),
    defaultValues: getDefaults(),
  })

  const { fields } = useFieldArray({ control, name: 'items' })

  useEffect(() => {
    if (open && record) reset(getDefaults())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record])

  if (!record) return null

  const onSubmit = (data) => {
    // Only send products the user actually entered a quantity for —
    // quantity must be > 0 on the backend (one call = one real event).
    const items = data.items
      .filter((i) => i.quantity > 0)
      .map((i) => ({
        productId: i.productId,
        quantity:  i.quantity,
        notes:     i.notes || undefined,
      }))

    refillMutation.mutate(
      { cupRecordId: record._id, payload: { items } },
      {
        onSuccess: () => {
          toast.success('Refill recorded', 'This refill event has been added to the record.')
          onClose()
        },
        onError: (err) => {
          const msg = err?.response?.data?.message ?? 'Please check your inputs'
          toast.error('Failed to record refill', msg)
        },
      }
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Refill"
      description="Each submission is logged as a separate refill event — it adds to, and never replaces, previous refills."
      size="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-3">
          {productsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {typeof errors.items?.root?.message === 'string' && (
                <p className="text-xs text-destructive">{errors.items.root.message}</p>
              )}
              {typeof errors.items?.message === 'string' && (
                <p className="text-xs text-destructive">{errors.items.message}</p>
              )}

              <div className="space-y-2">
                {fields.map((field, index) => {
                  const productName = productMap.get(field.productId) ?? field.productId
                  return (
                    <div key={field.id} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center gap-3">
                        <p className="flex-1 text-sm font-medium text-foreground truncate">
                          {productName}
                        </p>
                        <div className="w-24">
                          <Input
                            {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            error={!!errors.items?.[index]?.quantity}
                            disabled={refillMutation.isPending}
                            className="text-center"
                          />
                        </div>
                      </div>
                      {errors.items?.[index]?.quantity && (
                        <p className="text-[11px] text-destructive mt-1">
                          {errors.items[index].quantity.message}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={refillMutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={refillMutation.isPending || productsLoading}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {refillMutation.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
            {refillMutation.isPending ? 'Recording…' : 'Record Refill'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CupRecordRefillModal