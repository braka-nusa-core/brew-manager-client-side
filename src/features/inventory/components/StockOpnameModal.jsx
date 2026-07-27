// src/features/inventory/components/StockOpnameModal.jsx
//
// POST /inventory/opname — physical stock count reconciliation.
// Backend automatically computes the delta and creates the necessary
// adjustment transaction(s) (reason='stock_opname', reserved/system-only —
// never user-selectable here or in InventoryAdjustmentModal).
//
// Reuses ProductSearchSelect (same component as InventoryAdjustmentModal
// — written once, imported by both, not duplicated).

import { useEffect }            from 'react'
import { useForm, Controller }  from 'react-hook-form'
import { zodResolver }          from '@hookform/resolvers/zod'
import { z }                    from 'zod'
import { Loader2, ClipboardCheck } from 'lucide-react'

import Modal                from '@/components/shared/Modal'
import FormField, { Input } from '@/components/shared/FormField'
import ProductSearchSelect  from './ProductSearchSelect'
import { useCreateStockOpname } from '../hooks/useInventory'
import useToast              from '@/hooks/useToast'
import { cn }                from '@/lib/utils'

const schema = z.object({
  productId:   z.string().min(1, 'Pilih produk terlebih dahulu'),
  physicalQty: z
    .union([z.number(), z.nan()])
    .transform((v) => (typeof v === 'number' && isNaN(v) ? undefined : Math.trunc(v)))
    .pipe(z.number({ required_error: 'Kuantitas fisik wajib diisi' }).int('Harus bilangan bulat').min(0, 'Tidak boleh negatif')),
  notes: z.string().max(500, 'Catatan maksimal 500 karakter').optional().or(z.literal('')),
})

/**
 * @param {{ open: boolean, onClose: () => void }} props
 */
const StockOpnameModal = ({ open, onClose }) => {
  const toast = useToast()
  const opnameMutation = useCreateStockOpname()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(schema),
    defaultValues: { productId: '', physicalQty: '', notes: '' },
  })

  useEffect(() => {
    if (open) reset({ productId: '', physicalQty: '', notes: '' })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (values) => {
    opnameMutation.mutate(
      {
        productId:   values.productId,
        physicalQty: values.physicalQty,
        notes:       values.notes || undefined,
      },
      {
        onSuccess: (result) => {
          if (result.delta === 0) {
            toast.success('Stok opname selesai', 'Jumlah fisik sesuai dengan sistem — tidak ada penyesuaian.')
          } else {
            const direction = result.delta > 0 ? 'ditambahkan' : 'dikurangi'
            toast.success(
              'Stok opname tercatat',
              `Stok ${direction} sebanyak ${Math.abs(result.delta)} unit (${result.transactions.length} batch terpengaruh).`
            )
          }
          onClose()
        },
        onError: (err) => {
          const msg = err?.response?.data?.message ?? 'Periksa kembali input Anda'
          toast.error('Gagal memproses stok opname', msg)
        },
      }
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Stok Opname"
      description="Catat hasil hitung fisik — sistem akan otomatis menyesuaikan selisih terhadap batch yang ada."
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
                disabled={opnameMutation.isPending}
              />
            )}
          />
        </FormField>

        <FormField label="Kuantitas Fisik" required error={errors.physicalQty?.message}>
          <Input
            {...register('physicalQty', { valueAsNumber: true })}
            type="number"
            min="0"
            step="1"
            placeholder="Jumlah hasil hitung fisik"
            error={!!errors.physicalQty}
            disabled={opnameMutation.isPending}
          />
        </FormField>

        <FormField label="Catatan" error={errors.notes?.message}>
          <Input
            {...register('notes')}
            placeholder="Opsional"
            error={!!errors.notes}
            disabled={opnameMutation.isPending}
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={opnameMutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={opnameMutation.isPending}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {opnameMutation.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <ClipboardCheck className="w-3.5 h-3.5" />}
            {opnameMutation.isPending ? 'Memproses…' : 'Proses Opname'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default StockOpnameModal