// src/features/product/components/ProductFormModal.jsx
// Handles both CREATE and EDIT in one modal.
//
// Backend contract:
//   CREATE POST /products: { name, sellingPrice? }. isActive NOT accepted on create (defaults true).
//   UPDATE PATCH /products/:id: { name?, isActive?, sellingPrice? } — at least one required.
//   tenantId and cachedHPP are immutable — NEVER included in any schema, default, or payload here.
//   cachedHPP is shown read-only only — it is server-computed exclusively by
//   productRecipe.service.js and must never be sent in any request.

import { useEffect }                          from 'react'
import { useForm }                            from 'react-hook-form'
import { zodResolver }                        from '@hookform/resolvers/zod'
import { z }                                  from 'zod'
import { Loader2 }                            from 'lucide-react'

import Modal                                  from '@/components/shared/Modal'
import FormField, { Input }                   from '@/components/shared/FormField'
import RupiahInput                            from '@/components/shared/RupiahInput'
import ProductRecipeEditor                    from '@/features/product-recipe/components/ProductRecipeEditor'
import { useCreateProduct, useUpdateProduct } from '../hooks/useProducts'
import useToast                               from '@/hooks/useToast'
import { cn }                                 from '@/lib/utils'

// ── Zod schemas ───────────────────────────────────────────────
//
// sellingPrice is z.number() (not z.coerce.number()) because RupiahInput
// stores an actual integer into RHF — no string coercion needed.
// cachedHPP and tenantId are intentionally never present in either schema.

const optionalNumber = z
  .union([z.number().min(0, 'Cannot be negative'), z.literal('')])
  .optional()

const createSchema = z.object({
  name:         z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  sellingPrice: optionalNumber,
})

const editSchema = z.object({
  name:         z.string().min(2, 'At least 2 characters').max(100).optional().or(z.literal('')),
  sellingPrice: optionalNumber,
  isActive:     z.boolean().optional(),
}).refine(
  (d) => d.name !== '' && d.name !== undefined
      || d.sellingPrice !== '' && d.sellingPrice !== undefined
      || d.isActive !== undefined,
  { message: 'At least one field must be changed' }
)

// ── Helpers ───────────────────────────────────────────────────

// Strip '' / undefined / null — RupiahInput may return '' on empty.
// cachedHPP / tenantId are never keys on `data` in the first place, so
// this filter never needs to special-case them — they cannot leak.
const cleanPayload = (data) =>
  Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  )

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(amount ?? 0)

// Mirrors backend product.service.js → getProductMargin formula exactly.
const computeMargin = (sellingPrice, cachedHPP) => {
  const price = sellingPrice ?? 0
  const hpp   = cachedHPP ?? 0
  const marginAmount = price - hpp
  const marginPercentage = price > 0 ? Math.round((marginAmount / price) * 100) : 0
  return { marginAmount, marginPercentage }
}

// ── Default values ────────────────────────────────────────────

const getCreateDefaults = () => ({
  name:         '',
  sellingPrice: '',
})

const getEditDefaults = (product) => ({
  name:         product?.name         ?? '',
  sellingPrice: product?.sellingPrice ?? '',
  isActive:     product?.isActive     ?? true,
})

// ── Component ─────────────────────────────────────────────────

const ProductFormModal = ({ open, onClose, product = null }) => {
  const isEdit = Boolean(product)
  const toast  = useToast()

  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
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
    defaultValues: isEdit ? getEditDefaults(product) : getCreateDefaults(),
  })

  useEffect(() => {
    if (!open) return
    if (isEdit) {
      reset(getEditDefaults(product))
    } else {
      reset(getCreateDefaults())
    }
  }, [open, isEdit, product, reset])

  // Live-watch sellingPrice so the read-only margin preview updates as the
  // user types, without ever making cachedHPP an editable/registered field.
  const watchedSellingPrice = watch('sellingPrice')
  const { marginAmount, marginPercentage } = computeMargin(
    typeof watchedSellingPrice === 'number' ? watchedSellingPrice : product?.sellingPrice,
    product?.cachedHPP
  )

  const onSubmit = (data) => {
    const payload = cleanPayload(data)
    if (isEdit) {
      updateMutation.mutate(
        { productId: product._id, payload },
        {
          onSuccess: () => { toast.success('Product updated', product.name); onClose() },
          onError:   (err) => toast.error('Update failed', err?.response?.data?.message ?? 'Please try again'),
        }
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { toast.success('Product created successfully'); onClose() },
        onError:   (err) => toast.error('Failed to create product', err?.response?.data?.message ?? 'Check your inputs'),
      })
    }
  }

  const formId = isEdit ? `product-edit-form-${product?._id}` : 'product-create-form'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Product' : 'Add New Product'}
      size={isEdit ? 'lg' : 'md'}
      description={
        isEdit
          ? 'Update product details. Leave fields blank to keep current values.'
          : 'Fill in the product details below.'
      }
      footer={
        <div className="flex justify-end gap-3">
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
            form={formId}
            disabled={isPending}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isPending ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Product')}
          </button>
        </div>
      }
    >
      {/* The <form> wraps only the body fields. Submission is still
          triggered by the footer's submit button via the `form={formId}`
          attribute (a button doesn't need to be a DOM descendant of its
          <form> to submit it) — this lets Modal render the footer outside
          the scrollable body region while submit behavior is unchanged. */}
      <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4">

          {/* Name */}
          <FormField label="Product Name" error={errors.name?.message} required={!isEdit}>
            <Input
              {...register('name')}
              placeholder="e.g. Iced Caramel Latte"
              error={!!errors.name?.message}
              disabled={isPending}
            />
          </FormField>

          {/* Selling Price */}
          <FormField label="Selling Price (IDR)" error={errors.sellingPrice?.message}>
            <RupiahInput
              control={control}
              name="sellingPrice"
              placeholder="e.g. 25.000"
              error={!!errors.sellingPrice?.message}
              disabled={isPending}
            />
          </FormField>

          {/* Active status — edit only. Sent via PATCH body; no dedicated
              toggle-active endpoint exists for Product on the backend. */}
          {isEdit && (
            <FormField label="Status" error={errors.isActive?.message}>
              <label className="flex items-center gap-2 text-sm text-foreground select-none">
                <input
                  type="checkbox"
                  {...register('isActive')}
                  disabled={isPending}
                  className="w-4 h-4 rounded border-input accent-brand-500 disabled:opacity-50"
                />
                Active
              </label>
            </FormField>
          )}

          {/* Read-only cost/margin context — edit only.
              cachedHPP and margin are NEVER registered as form fields and
              can never enter the submit payload under any code path. */}
          {isEdit && (
            <div className="rounded-md bg-muted/30 px-3 py-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Cost (HPP)</span>
                <span className="font-mono text-foreground">{formatCurrency(product?.cachedHPP)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Margin</span>
                <span className={cn(
                  'font-mono',
                  marginAmount < 0 ? 'text-destructive' : 'text-foreground'
                )}>
                  {formatCurrency(marginAmount)} ({marginPercentage}%)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground/80 leading-snug pt-0.5">
                Cost is calculated from the product recipe and cannot be edited here.
              </p>
            </div>
          )}

          {/* Recipe editor — edit only. A recipe can only be attached to a
              product that already exists; cachedHPP is never editable here,
              only ever set by saving a recipe below. */}
          {isEdit && (
            <ProductRecipeEditor productId={product._id} productName={product.name} />
          )}

        </div>
      </form>
    </Modal>
  )
}

export default ProductFormModal