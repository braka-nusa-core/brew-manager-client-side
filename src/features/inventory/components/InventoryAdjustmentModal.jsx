// src/features/inventory/components/InventoryAdjustmentModal.jsx
//
// POST /inventory/adjustment — manual, single-batch adjustment.
//
// Batch selection is two-step: pick a Product (ProductSearchSelect, reused
// from StockOpnameModal), then pick one of THAT product's batches — the
// batch list comes from useInventoryProductDetail (Sprint 7.3's existing
// hook), NOT a new "list all batches" call, per this sprint's API scope.
//
// `reason` is restricted to the manual set the backend actually accepts
// here (damage/loss/correction/other) — 'stock_opname' is reserved and
// only ever set by the Stock Opname flow (see StockOpnameModal.jsx),
// mirroring the backend's own validateCreateAdjustment/ADJUSTMENT_REASONS.
//
// Pattern follows CupRecordRefillModal.jsx (react-hook-form + zod, Modal
// shared component, useToast on success/error).

import { useEffect }              from 'react'
import { useForm, Controller }    from 'react-hook-form'
import { zodResolver }            from '@hookform/resolvers/zod'
import { z }                      from 'zod'
import { Loader2, SlidersHorizontal } from 'lucide-react'

import Modal                       from '@/components/shared/Modal'
import FormField, { Input, Select } from '@/components/shared/FormField'
import ProductSearchSelect         from './ProductSearchSelect'
import { useInventoryProductDetail, useCreateInventoryAdjustment } from '../hooks/useInventory'
import useToast                    from '@/hooks/useToast'
import { cn }                      from '@/lib/utils'

const REASON_OPTIONS = [
  { value: 'damage',     label: 'Rusak' },
  { value: 'loss',       label: 'Hilang' },
  { value: 'correction', label: 'Koreksi' },
  { value: 'other',      label: 'Lainnya' },
]

const schema = z.object({
  productId:     z.string().min(1, 'Pilih produk terlebih dahulu'),
  batchId:       z.string().min(1, 'Pilih batch terlebih dahulu'),
  quantityDelta: z
    .union([z.number(), z.nan()])
    .transform((v) => (typeof v === 'number' && isNaN(v) ? undefined : Math.trunc(v)))
    .pipe(z.number({ required_error: 'Kuantitas wajib diisi' }).int('Harus bilangan bulat').refine((v) => v !== 0, 'Kuantitas tidak boleh 0')),
  reason: z.string().min(1, 'Pilih alasan'),
  notes:  z.string().max(500, 'Catatan maksimal 500 karakter').optional().or(z.literal('')),
})

const fmtDate = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

/**
 * @param {{ open: boolean, onClose: () => void }} props
 */
const InventoryAdjustmentModal = ({ open, onClose }) => {
  const toast = useToast()
  const adjustmentMutation = useCreateInventoryAdjustment()

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(schema),
    defaultValues: { productId: '', batchId: '', quantityDelta: '', reason: '', notes: '' },
  })

  const selectedProductId = watch('productId')

  // Batches for the selected product — reused from Sprint 7.3, not a new call.
  const { data: productDetail, isLoading: batchesLoading } = useInventoryProductDetail(
    selectedProductId || undefined,
    { limit: 100 }
  )
  const batches = productDetail?.batches ?? []

  useEffect(() => {
    if (open) reset({ productId: '', batchId: '', quantityDelta: '', reason: '', notes: '' })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Selecting a different product invalidates the previously chosen batch.
  useEffect(() => {
    setValue('batchId', '')
  }, [selectedProductId]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (values) => {
    adjustmentMutation.mutate(
      {
        batchId:       values.batchId,
        quantityDelta: values.quantityDelta,
        reason:        values.reason,
        notes:         values.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Penyesuaian tercatat', 'Stok batch telah diperbarui.')
          onClose()
        },
        onError: (err) => {
          const msg = err?.response?.data?.message ?? 'Periksa kembali input Anda'
          toast.error('Gagal mencatat penyesuaian', msg)
        },
      }
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Penyesuaian Inventaris"
      description="Koreksi manual terhadap kuantitas satu batch (misal: rusak, hilang, atau koreksi hitung)."
      size="md"
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
                disabled={adjustmentMutation.isPending}
              />
            )}
          />
        </FormField>

        <FormField label="Batch" required error={errors.batchId?.message}>
          {!selectedProductId ? (
            <p className="text-xs text-muted-foreground py-2">Pilih produk terlebih dahulu.</p>
          ) : batchesLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memuat batch…
            </div>
          ) : batches.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Produk ini belum memiliki batch.</p>
          ) : (
            <Select
              {...register('batchId')}
              error={!!errors.batchId}
              disabled={adjustmentMutation.isPending}
            >
              <option value="">Pilih batch…</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>
                  Diproduksi {fmtDate(b.producedAt)} — Sisa {b.quantityRemaining} ({b.status})
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="Kuantitas (+/-)"
            required
            error={errors.quantityDelta?.message}
          >
            <Input
              {...register('quantityDelta', { valueAsNumber: true })}
              type="number"
              step="1"
              placeholder="cth. -5 atau 10"
              error={!!errors.quantityDelta}
              disabled={adjustmentMutation.isPending}
            />
          </FormField>

          <FormField label="Alasan" required error={errors.reason?.message}>
            <Select {...register('reason')} error={!!errors.reason} disabled={adjustmentMutation.isPending}>
              <option value="">Pilih alasan…</option>
              {REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField label="Catatan" error={errors.notes?.message}>
          <Input
            {...register('notes')}
            placeholder="Opsional"
            error={!!errors.notes}
            disabled={adjustmentMutation.isPending}
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={adjustmentMutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={adjustmentMutation.isPending}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {adjustmentMutation.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <SlidersHorizontal className="w-3.5 h-3.5" />}
            {adjustmentMutation.isPending ? 'Menyimpan…' : 'Simpan Penyesuaian'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default InventoryAdjustmentModal