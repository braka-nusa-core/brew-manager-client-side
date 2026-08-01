import { useEffect }                                from 'react'
import { useForm }                                  from 'react-hook-form'
import { zodResolver }                              from '@hookform/resolvers/zod'
import { z }                                        from 'zod'
import { Loader2, TriangleAlert }                   from 'lucide-react'

import Modal                                        from '@/components/shared/Modal'
import FormField, { Input, Select }                 from '@/components/shared/FormField'
import RupiahInput                                  from '@/components/shared/RupiahInput'
import { useCreateExpense, useUpdateExpense }        from '../hooks/useExpenses'
import { EXPENSE_CATEGORIES }                       from './ExpenseCategoryBadge'
import { useEffectiveOutletId }                     from '@/store/activeOutletStore'
import useToast                                     from '@/hooks/useToast'
import { cn }                                       from '@/lib/utils'


const createSchema = z.object({
  date:     z.string().min(1, 'Tanggal wajib diisi'),
  category: z.enum(EXPENSE_CATEGORIES, {
    required_error:  'Pilih kategori',
    invalid_type_error: 'Pilih kategori yang valid',
  }),
  description: z
    .string()
    .min(2, 'Deskripsi harus minimal 2 karakter')
    .max(255, 'Deskripsi terlalu panjang'),
  // RupiahInput stores integer | '' — require actual number on create
  amount: z
    .number({ required_error: 'Jumlah wajib diisi', invalid_type_error: 'Masukkan jumlah yang valid' })
    .min(0, 'Tidak boleh negatif'),
})

// On edit: outletId + tenantId immutable (never sent), at least one field required
const editSchema = z
  .object({
    date:        z.string().optional().or(z.literal('')),
    category:    z.enum(EXPENSE_CATEGORIES).optional(),
    description: z.string().min(2, 'Deskripsi harus minimal 2 karakter').max(255).optional().or(z.literal('')),
    amount:      z.union([z.number().min(0, 'Tidak boleh negatif'), z.literal('')]).optional(),
  })
  .refine(
    (d) => [d.date, d.category, d.description, d.amount].some((v) => v !== undefined && v !== ''),
    { message: 'Masukkan setidaknya satu field untuk update' }
  )


const today = () => new Date().toISOString().split('T')[0]

const toDateValue = (iso) => {
  if (!iso) return ''
  try { return new Date(iso).toISOString().split('T')[0] } catch { return '' }
}

const cleanPayload = (data) =>
  Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  )


const getCreateDefaults = () => ({
  date:        today(),
  category:    '',
  description: '',
  amount:      '',
})

const getEditDefaults = (expense) => ({
  date:        toDateValue(expense?.date),
  category:    expense?.category    ?? '',
  description: expense?.description ?? '',
  amount:      expense?.amount      ?? '',
})


const ExpenseFormModal = ({ open, onClose, expense = null }) => {
  const isEdit = Boolean(expense)
  const toast  = useToast()

  const effectiveOutletId = useEffectiveOutletId()
  const hasWorkingOutlet  = !!effectiveOutletId

  const createMutation = useCreateExpense()
  const updateMutation = useUpdateExpense()
  const isPending      = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: isEdit ? getEditDefaults(expense) : getCreateDefaults(),
  })

  useEffect(() => {
    if (!open) return
    if (isEdit) {
      reset(getEditDefaults(expense))
    } else {
      reset(getCreateDefaults())
    }
  }, [open, isEdit, expense, reset])

  const onSubmit = (data) => {
    if (!isEdit && !hasWorkingOutlet) return

    const payload = cleanPayload(data)
    if (isEdit) {
      updateMutation.mutate(
        { expenseId: expense._id, payload },
        {
          onSuccess: () => { toast.success('Pengeluaran berhasil diupdate'); onClose() },
          onError:   (err) => toast.error('Pembaruan Gagal', err?.response?.data?.message ?? 'Silahkan Coba Lagi'),
        }
      )
    } else {
      createMutation.mutate({ ...payload, outletId: effectiveOutletId }, {
        onSuccess: () => { toast.success('Pengeluaran berhasil dicatat'); onClose() },
        onError:   (err) => toast.error('Gagal Mencatat Pengeluaran', err?.response?.data?.message ?? 'Silahkan Coba Lagi'),
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Pengeluaran' : 'Catat Pengeluaran'}
      description={
        isEdit
          ? 'Perbarui catatan pengeluaran ini. Biarkan kolom kosong untuk mempertahankan nilai saat ini.'
          : 'Isi semua kolom yang diperlukan untuk mencatat pengeluaran baru.'
      }
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4">

          {!isEdit && !hasWorkingOutlet && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-sm text-amber-800 dark:text-amber-400">
              <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Pilih outlet tertentu dari switcher di atas untuk mencatat pengeluaran.</span>
            </div>
          )}

          <FormField label="Tanggal Pengeluaran" error={errors.date?.message} required={!isEdit}>
            <Input
              {...register('date')}
              type="date"
              error={!!errors.date?.message}
              disabled={isPending}
            />
          </FormField>

          <FormField label="Kategori" error={errors.category?.message} required={!isEdit}>
            <Select
              {...register('category')}
              error={!!errors.category?.message}
              disabled={isPending}
            >
              <option value="">Pilih Kategori…</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Deskripsi" error={errors.description?.message} required={!isEdit}>
            <Input
              {...register('description')}
              placeholder="Contoh: Pembelian biji kopi — 5kg"
              error={!!errors.description?.message}
              disabled={isPending}
            />
          </FormField>

          <FormField label="Jumlah (IDR)" error={errors.amount?.message} required={!isEdit}>
            <RupiahInput
              control={control}
              name="amount"
              placeholder="e.g. 250.000"
              error={!!errors.amount?.message}
              disabled={isPending}
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
            disabled={isPending || (!isEdit && !hasWorkingOutlet)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isPending
              ? (isEdit ? 'Menyimpan…' : 'Mencatat…')
              : (isEdit ? 'Simpan Perubahan' : 'Catat Pengeluaran')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ExpenseFormModal