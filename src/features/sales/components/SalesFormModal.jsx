import { useEffect, useState }                   from 'react'
import { useForm, Controller }                   from 'react-hook-form'
import { zodResolver }                           from '@hookform/resolvers/zod'
import { z }                                     from 'zod'
import { Loader2 }                               from 'lucide-react'

import Modal                                     from '@/components/shared/Modal'
import FormField, { Input }                      from '@/components/shared/FormField'
import AsyncSearchSelect                         from '@/components/shared/AsyncSearchSelect'
import RupiahInput                               from '@/components/shared/RupiahInput'
import { useCreateSale, useUpdateSale }          from '../hooks/useSales'
import { useEmployees }                          from '@/features/employee/hooks/useEmployees'
import useToast                                  from '@/hooks/useToast'
import useDebounce                               from '@/hooks/useDebounce'
import { cn }                                    from '@/lib/utils'

// ── Zod schemas ───────────────────────────────────────────────

const OBJECT_ID_RE = /^[a-f\d]{24}$/i

const createSchema = z.object({
  employeeId:   z.string().regex(OBJECT_ID_RE, 'Pilih karyawan'),
  date:         z.string().min(1, 'Tanggal is required'),
  totalCups:    z
    .number({ required_error: 'Total cup is required', invalid_type_error: 'Enter a valid number' })
    .min(0, 'Tidak boleh negatif'),
  totalRevenue: z
    .number({ required_error: 'Total revenue is required', invalid_type_error: 'Enter a valid amount' })
    .min(0, 'Tidak boleh negatif'),
  notes: z.string().max(500, 'Notes too long').optional().or(z.literal('')),
})

// On edit: employeeId immutable, at least one of date/totalCups/totalRevenue/notes required
const editSchema = z.object({
  date:         z.string().optional().or(z.literal('')),
  totalCups:    z.union([z.number().min(0, 'Cannot be negative'), z.literal('')]).optional(),
  totalRevenue: z.union([z.number().min(0, 'Cannot be negative'), z.literal('')]).optional(),
  notes:        z.string().max(500).optional().or(z.literal('')),
}).refine(
  (data) => [data.date, data.totalCups, data.totalRevenue, data.notes]
    .some((v) => v !== undefined && v !== ''),
  { message: 'Provide at least one field to update' }
)

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

const getCreateDefaults = () => ({
  employeeId:   '',
  date:         today(),
  totalCups:    '',   // RHF number field — '' = empty
  totalRevenue: '',   // RupiahInput — '' = empty display
  notes:        '',
})

const getEditDefaults = (sale) => ({
  date:         toDateValue(sale?.date),
  totalCups:    sale?.totalCups    ?? '',
  totalRevenue: sale?.totalRevenue ?? '',
  notes:        sale?.notes        ?? '',
})

// ── TotalCupsInput — plain number, Controller-wrapped for reset sync ──

const TotalCupsInner = ({ field, error, disabled, placeholder }) => (
  <Input
    type="number"
    min="0"
    step="1"
    value={field.value === '' || field.value === null || field.value === undefined ? '' : field.value}
    onChange={(e) => {
      const v = e.target.value
      field.onChange(v === '' ? '' : parseInt(v, 10))
    }}
    placeholder={placeholder}
    error={error}
    disabled={disabled}
  />
)

const TotalCupsInput = ({ control, name, error, disabled, placeholder }) => (
  <Controller
    control={control}
    name={name}
    render={({ field }) => (
      <TotalCupsInner
        field={field}
        error={error}
        disabled={disabled}
        placeholder={placeholder}
      />
    )}
  />
)

// ── Component ─────────────────────────────────────────────────

const SalesFormModal = ({ open, onClose, sale = null }) => {
  const isEdit = Boolean(sale)
  const toast  = useToast()

  const [employeeSearch, setEmployeeSearch] = useState('')
  const debouncedEmployeeSearch = useDebounce(employeeSearch, 300)

  const { data: employeesData, isLoading: employeesLoading } = useEmployees(
    { search: debouncedEmployeeSearch, isActive: true, limit: 20 },
    { enabled: open && !isEdit }
  )
  const employees = employeesData?.data ?? []

  const createMutation = useCreateSale()
  const updateMutation = useUpdateSale()
  const isPending      = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: isEdit ? getEditDefaults(sale) : getCreateDefaults(),
  })

  useEffect(() => {
    if (!open) return
    if (isEdit) {
      reset(getEditDefaults(sale))
    } else {
      reset(getCreateDefaults())
      setEmployeeSearch('')
    }
  }, [open, isEdit, sale, reset])

  const onSubmit = (data) => {
    const payload = cleanPayload(data)

    if (isEdit) {
      updateMutation.mutate(
        { saleId: sale._id, payload },
        {
          onSuccess: () => { toast.success('Penjualan berhasil diperbarui.'); onClose() },
          onError:   (err) => toast.error('Gagal memperbarui penjualan', err?.response?.data?.message ?? 'Silahkan coba lagi'),
        }
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { toast.success('Penjualan berhasil ditambahkan'); onClose() },
        onError:   (err) => toast.error('Gagal menambahkan penjualan', err?.response?.data?.message ?? 'Silahkan coba lagi'),
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Catatan Penjualan' : 'Tambah Catatan Penjualan'}
      description={
        isEdit
          ? 'Perbarui catatan penjualan ini. Biarkan kolom kosong untuk mempertahankan nilai saat ini.'
          : 'Catat kontribusi penjualan harian karyawan.'
      }
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4">

          {/* Employee selector — create only (immutable on edit) */}
          {!isEdit && (
            <FormField label="Employee" error={errors.employeeId?.message} required>
              <Controller
                control={control}
                name="employeeId"
                render={({ field }) => (
                  <AsyncSearchSelect
                    value={field.value}
                    onChange={field.onChange}
                    items={employees}
                    getLabel={(e) => e.position ? `${e.name} — ${e.position}` : e.name}
                    getValue={(e) => e._id}
                    onSearchChange={setEmployeeSearch}
                    isLoading={employeesLoading}
                    placeholder="Cari karyawan…"
                    error={!!errors.employeeId?.message}
                    disabled={isPending}
                    emptyMessage={
                      debouncedEmployeeSearch
                        ? `Tidak ada karyawan yang cocok dengan "${debouncedEmployeeSearch}"`
                        : 'Mulai mengetik untuk mencari karyawan...'
                    }
                  />
                )}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Outlet akan ditambahkan secara otomatis dari data karyawan.
              </p>
            </FormField>
          )}

          {/* Date */}
          <FormField label="Sale Date" error={errors.date?.message} required={!isEdit}>
            <Input
              {...register('date')}
              type="date"
              error={!!errors.date?.message}
              disabled={isPending}
            />
          </FormField>

          {/* Total Cups + Total Revenue side by side */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Total Cups" error={errors.totalCups?.message} required={!isEdit}>
              <TotalCupsInput
                control={control}
                name="totalCups"
                placeholder="e.g. 42"
                error={!!errors.totalCups?.message}
                disabled={isPending}
              />
            </FormField>

            <FormField label="Total Pendapatan (IDR)" error={errors.totalRevenue?.message} required={!isEdit}>
              <RupiahInput
                control={control}
                name="totalRevenue"
                placeholder="e.g. 630.000"
                error={!!errors.totalRevenue?.message}
                disabled={isPending}
              />
            </FormField>
          </div>

          {/* Notes */}
          <FormField label="Catatan" error={errors.notes?.message}>
            <textarea
              {...register('notes')}
              placeholder="Catatan opsional tentang catatan penjualan ini…"
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
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isPending
              ? (isEdit ? 'Menyimpan…' : 'Mencatat…')
              : (isEdit ? 'Simpan Perubahan' : 'Catat Penjualan')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default SalesFormModal