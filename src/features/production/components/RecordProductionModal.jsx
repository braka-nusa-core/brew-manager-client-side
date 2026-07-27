// src/features/production/components/RecordProductionModal.jsx
//
// POST /production — records a NEW production batch (never merges with
// an existing one). Reuses ProductSearchSelect from features/inventory
// (the exact same product-search component already used by
// InventoryAdjustmentModal/StockOpnameModal) — not duplicated here.
//
// Sprint 8.2.1 — passes source="catalog" so the picker reads from the
// Product catalog (GET /products) instead of Inventory. Production is
// how the FIRST batch for a product gets created, so it must not depend
// on inventory already existing (that was a bootstrap circular
// dependency: Product → Production → Inventory instead of
// Inventory → Production). InventoryAdjustmentModal/StockOpnameModal are
// unaffected — they keep the default source="inventory".
//
// Pattern follows InventoryAdjustmentModal.jsx / StockOpnameModal.jsx
// (react-hook-form + zod, Modal shared component, useToast on success/error).

import { useEffect }             from 'react'
import { useForm, Controller }   from 'react-hook-form'
import { zodResolver }           from '@hookform/resolvers/zod'
import { z }                     from 'zod'
import { Loader2, PackagePlus }  from 'lucide-react'

import Modal                from '@/components/shared/Modal'
import FormField, { Input } from '@/components/shared/FormField'
import ProductSearchSelect  from '@/features/inventory/components/ProductSearchSelect'
import { useCreateProduction } from '../hooks/useProduction'
import useToast              from '@/hooks/useToast'
import { cn }                from '@/lib/utils'

const today = () => new Date().toISOString().split('T')[0]

const schema = z.object({
  productId: z.string().min(1, 'Pilih produk terlebih dahulu'),
  quantity: z
    .union([z.number(), z.nan()])
    .transform((v) => (typeof v === 'number' && isNaN(v) ? undefined : Math.trunc(v)))
    .pipe(z.number({ required_error: 'Kuantitas wajib diisi' }).int('Harus bilangan bulat').positive('Harus lebih dari 0')),
  producedAt: z.string().min(1, 'Tanggal produksi wajib diisi'),
})

/**
 * @param {{ open: boolean, onClose: () => void }} props
 */
const RecordProductionModal = ({ open, onClose }) => {
  const toast = useToast()
  const productionMutation = useCreateProduction()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(schema),
    defaultValues: { productId: '', quantity: '', producedAt: today() },
  })

  useEffect(() => {
    if (open) reset({ productId: '', quantity: '', producedAt: today() })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (values) => {
    productionMutation.mutate(
      {
        productId:  values.productId,
        quantity:   values.quantity,
        producedAt: values.producedAt,
      },
      {
        onSuccess: () => {
          toast.success('Produksi tercatat', 'Batch inventaris baru telah dibuat.')
          onClose()
        },
        onError: (err) => {
          const msg = err?.response?.data?.message ?? 'Periksa kembali input Anda'
          toast.error('Gagal mencatat produksi', msg)
        },
      }
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Catat Produksi"
      description="Setiap produksi membuat batch inventaris baru — tidak pernah digabung dengan batch yang sudah ada."
      size="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="Produk" required error={errors.productId?.message}>
          <Controller
            name="productId"
            control={control}
            render={({ field }) => (
              <ProductSearchSelect
                value={field.value}
                onChange={field.onChange}
                error={!!errors.productId}
                disabled={productionMutation.isPending}
                source="catalog"
              />
            )}
          />
        </FormField>

        <FormField label="Kuantitas" required error={errors.quantity?.message}>
          <Input
            {...register('quantity', { valueAsNumber: true })}
            type="number"
            min="1"
            step="1"
            placeholder="Jumlah unit diproduksi"
            error={!!errors.quantity}
            disabled={productionMutation.isPending}
          />
        </FormField>

        <FormField label="Tanggal Produksi" required error={errors.producedAt?.message}>
          <Input
            {...register('producedAt')}
            type="date"
            max={today()}
            error={!!errors.producedAt}
            disabled={productionMutation.isPending}
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={productionMutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={productionMutation.isPending}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {productionMutation.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <PackagePlus className="w-3.5 h-3.5" />}
            {productionMutation.isPending ? 'Menyimpan…' : 'Catat Produksi'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default RecordProductionModal