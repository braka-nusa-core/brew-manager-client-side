// src/features/cup/components/CupRecordFormModal.jsx
// Handles both CREATE and EDIT (draft only) in one modal.
//
// Backend contract confirmed from cup.routes.js + cup.validation.js + cup.service.js:
//
// CREATE body: { riderId, date, items: [{productId, distributed?, refill?, sold?, returned?, reject?}], notes? }
//   - riderId must reference an active rider (isRider:true) — selector filtered accordingly.
//   - outletId is derived server-side from the rider's Employee record — never sent by client.
//   - items[] must be non-empty; each productId must be unique within the array.
//   - Numeric fields are optional non-negative integers (backend defaults to 0).
//   - A duplicate riderId+date for the same tenant returns 409.
//
// EDIT body: { items?, notes? } — at least one required.
//   - riderId, date, tenantId, outletId, status are all IMMUTABLE — never send on PATCH.
//   - items (if sent) is a FULL REPLACE, not a delta.
//   - Only draft records can be edited (backend enforces; we hide the edit button for finalized records).
//   - `refill` is READ-ONLY in this form (see CupItemRow) — used here for "closing" a
//     draft (entering sold/returned/reject) or emergency correction of distributed/sold/
//     returned/reject. Real refill events go through CupRecordRefillModal + POST /refill.
//
// Pattern follows SalesFormModal + ProductRecipeEditor exactly.

import { useEffect, useState }                from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver }                        from '@hookform/resolvers/zod'
import { z }                                  from 'zod'
import { Loader2, Plus, Package }             from 'lucide-react'

import Modal                                  from '@/components/shared/Modal'
import FormField, { Input }                   from '@/components/shared/FormField'
import AsyncSearchSelect                      from '@/components/shared/AsyncSearchSelect'
import CupItemRow                             from './CupItemRow'
import { useCreateCupRecord, useUpdateCupRecord } from '../hooks/useCupRecords'
import { useEmployees }                       from '@/features/employee/hooks/useEmployees'
import { useProducts }                        from '@/features/product/hooks/useProducts'
import useEntityMap                           from '@/hooks/useEntityMap'
import useToast                               from '@/hooks/useToast'
import useDebounce                            from '@/hooks/useDebounce'
import { useEffectiveOutletId }               from '@/store/activeOutletStore'
import { cn }                                 from '@/lib/utils'

// ── Zod helpers ───────────────────────────────────────────────

const OBJECT_ID_RE = /^[a-f\d]{24}$/i

// Non-negative integer — NaN (from empty input) is treated as 0
// to match the backend's own default-0 behaviour for omitted fields.
const nonNegInt = z
  .union([z.number(), z.nan()])
  .transform((v) => (typeof v === 'number' && isNaN(v) ? 0 : Math.floor(v)))
  .pipe(z.number().int('Must be a whole number').min(0, 'Cannot be negative'))

const itemSchema = z.object({
  productId:   z.string().regex(OBJECT_ID_RE, 'Select a product'),
  distributed: nonNegInt,
  refill:      nonNegInt,
  sold:        nonNegInt,
  returned:    nonNegInt,
  reject:      nonNegInt,
})

const noDuplicateProducts = (d) => {
  const ids = d.items?.map((i) => i.productId).filter(Boolean) ?? []
  return ids.length === new Set(ids).size
}

const createSchema = z.object({
  riderId: z.string().regex(OBJECT_ID_RE, 'Select a rider'),
  date:    z.string().min(1, 'Date is required'),
  items:   z.array(itemSchema).min(1, 'Add at least one product'),
  notes:   z.string().max(500, 'Notes too long').optional().or(z.literal('')),
}).refine(noDuplicateProducts, {
  message: 'Each product can only appear once',
  path: ['items'],
})

const editSchema = z.object({
  items: z.array(itemSchema).min(1, 'Add at least one product'),
  notes: z.string().max(500, 'Notes too long').optional().or(z.literal('')),
}).refine(noDuplicateProducts, {
  message: 'Each product can only appear once',
  path: ['items'],
})

// ── Helpers ───────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0]

const toDateValue = (iso) => {
  if (!iso) return ''
  try { return new Date(iso).toISOString().split('T')[0] } catch { return '' }
}

const cleanPayload = (data) =>
  Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  )

// ── Default values ────────────────────────────────────────────

const BLANK_ITEM = () => ({
  productId: '', distributed: 0, refill: 0, sold: 0, returned: 0, reject: 0,
})

const getCreateDefaults = () => ({
  riderId: '',
  date:    today(),
  items:   [BLANK_ITEM()],
  notes:   '',
})

const getEditDefaults = (record) => ({
  items: (record?.items ?? []).map((item) => ({
    productId:   typeof item.productId === 'object' ? (item.productId._id ?? String(item.productId)) : (item.productId ?? ''),
    distributed: item.distributed ?? 0,
    refill:      item.refill      ?? 0,
    sold:        item.sold        ?? 0,
    returned:    item.returned    ?? 0,
    reject:      item.reject      ?? 0,
  })),
  notes: record?.notes ?? '',
})

// ── Component ─────────────────────────────────────────────────

/**
 * @param {{
 *   open:     boolean,
 *   onClose:  () => void,
 *   record:   Object | null,  // null = create mode; existing draft = edit mode
 * }} props
 */
const CupRecordFormModal = ({ open, onClose, record = null }) => {
  const isEdit = Boolean(record)
  const toast  = useToast()

  // Resolve riderId → name for the read-only edit panel.
  // useEntityMap fetches all employees once and caches — zero extra requests.
  const { employeeMap } = useEntityMap()

  // Rider search (create only — immutable on edit)
  const [riderSearch, setRiderSearch]       = useState('')
  const debouncedRiderSearch                = useDebounce(riderSearch, 300)

  const effectiveOutletId = useEffectiveOutletId()

  const { data: ridersData, isLoading: ridersLoading } = useEmployees(
    {
      search:    debouncedRiderSearch,
      isRider:   true,
      isActive:  true,
      outletId:  effectiveOutletId || undefined,
      limit:     20,
    },
    { enabled: open && !isEdit }
  )
  const riders = ridersData?.data ?? []

  // Products — fetched once for the item row selectors
  const { data: productsData, isLoading: productsLoading } = useProducts(
    { isActive: 'true', limit: 100 },
    { enabled: open }
  )
  const products = productsData?.data ?? []

  const createMutation = useCreateCupRecord()
  const updateMutation = useUpdateCupRecord()
  const isPending      = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: isEdit ? getEditDefaults(record) : getCreateDefaults(),
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items') ?? []

  // Re-seed form when modal opens or record changes
  useEffect(() => {
    if (!open) return
    if (isEdit) {
      reset(getEditDefaults(record))
    } else {
      reset(getCreateDefaults())
      setRiderSearch('')
    }
  }, [open, isEdit, record, reset])

  // ProductIds already chosen by rows OTHER than `index` — for duplicate prevention
  const selectedIdsFor = (index) =>
    new Set(
      watchedItems
        .filter((_, i) => i !== index)
        .map((item) => item.productId)
        .filter(Boolean)
    )

  const onSubmit = (data) => {
    if (isEdit) {
      // Do NOT use cleanPayload here — notes:null must be sent as-is to clear
      // existing notes. cleanPayload strips null values, which would leave old
      // notes intact when the user deliberately empties the field.
      const payload = { items: data.items, notes: data.notes || null }
      updateMutation.mutate(
        { cupRecordId: record._id, payload },
        {
          onSuccess: () => { toast.success('Cup record updated'); onClose() },
          onError:   (err) => toast.error('Update failed', err?.response?.data?.message ?? 'Please try again'),
        }
      )
    } else {
      const payload = cleanPayload({ ...data, notes: data.notes || undefined })
      createMutation.mutate(payload, {
        onSuccess: () => { toast.success('Cup record created'); onClose() },
        onError:   (err) => {
          const msg = err?.response?.data?.message ?? 'Please check your inputs'
          // 409 = duplicate riderId+date for this tenant
          toast.error(err?.response?.status === 409 ? 'Record already exists' : 'Failed to create', msg)
        },
      })
    }
  }

  const isLoadingDeps = productsLoading || (open && !isEdit && ridersLoading)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Cup Record' : 'New Cup Record'}
      description={
        isEdit
          ? 'Update the items or notes on this draft record. Rider and date cannot be changed.'
          : 'Record daily cup distribution and sales for a rider.'
      }
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4">

          {/* ── CREATE ONLY: Rider selector ──────────────────── */}
          {!isEdit && (
            <FormField label="Rider" error={errors.riderId?.message} required>
              <Controller
                control={control}
                name="riderId"
                render={({ field }) => (
                  <AsyncSearchSelect
                    value={field.value}
                    onChange={field.onChange}
                    items={riders}
                    getLabel={(r) => r.position ? `${r.name} — ${r.position}` : r.name}
                    getValue={(r) => r._id}
                    onSearchChange={setRiderSearch}
                    isLoading={ridersLoading}
                    placeholder="Search riders…"
                    error={!!errors.riderId?.message}
                    disabled={isPending}
                    emptyMessage={
                      debouncedRiderSearch
                        ? `No riders matching "${debouncedRiderSearch}"`
                        : 'Start typing to search riders.'
                    }
                  />
                )}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Only active riders are shown. Outlet is assigned automatically from the rider's record.
              </p>
            </FormField>
          )}

          {/* ── EDIT ONLY: show rider+date as read-only ───────── */}
          {isEdit && record && (
            <div className="flex gap-3 p-3 rounded-lg bg-muted/40 text-sm">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Rider</p>
                <p className="font-medium text-foreground truncate">
                  {employeeMap.get(record.riderId?.toString?.() ?? record.riderId)?.name ?? '—'}
                </p>
              </div>
              <div className="shrink-0">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Date</p>
                <p className="font-medium text-foreground">{toDateValue(record.date)}</p>
              </div>
            </div>
          )}

          {/* ── CREATE ONLY: Date ─────────────────────────────── */}
          {!isEdit && (
            <FormField label="Date" error={errors.date?.message} required>
              <Input
                {...register('date')}
                type="date"
                error={!!errors.date?.message}
                disabled={isPending}
              />
            </FormField>
          )}

          {/* ── Items field array ─────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-muted-foreground" />
                Products
              </p>
              {typeof errors.items?.message === 'string' && (
                <p className="text-xs text-destructive">{errors.items.message}</p>
              )}
              {typeof errors.items?.root?.message === 'string' && (
                <p className="text-xs text-destructive">{errors.items.root.message}</p>
              )}
            </div>

            {isLoadingDeps ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-md bg-muted/30 px-3 py-4 text-center">
                <p className="text-sm text-foreground font-medium">No products yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add at least one active product before creating a cup record.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <CupItemRow
                      key={field.id}
                      index={index}
                      register={register}
                      errors={errors.items?.[index]}
                      products={products}
                      selectedIds={selectedIdsFor(index)}
                      currentProductId={watchedItems[index]?.productId}
                      watchedItem={watchedItems[index]}
                      disabled={isPending}
                      canRemove={fields.length > 1}
                      onRemove={() => remove(index)}
                      isEdit={isEdit}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => append(BLANK_ITEM())}
                  disabled={isPending || fields.length >= products.length}
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg',
                    'bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Product
                </button>
              </>
            )}
          </div>

          {/* ── Notes ─────────────────────────────────────────── */}
          <FormField label="Notes" error={errors.notes?.message}>
            <textarea
              {...register('notes')}
              placeholder="Optional notes about this cup record…"
              disabled={isPending}
              rows={2}
              className={cn(
                'w-full px-3 py-2 rounded-md border bg-background text-sm',
                'placeholder:text-muted-foreground resize-none',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
                'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                errors.notes?.message ? 'border-destructive' : 'border-input'
              )}
            />
          </FormField>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || isLoadingDeps}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isPending
              ? (isEdit ? 'Saving…' : 'Creating…')
              : (isEdit ? 'Save Changes' : 'Create Record')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CupRecordFormModal