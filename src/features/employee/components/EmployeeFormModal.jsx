import { useEffect }                          from 'react'
import { useForm }                            from 'react-hook-form'
import { zodResolver }                        from '@hookform/resolvers/zod'
import { z }                                  from 'zod'
import { Loader2, TriangleAlert }             from 'lucide-react'

import Modal                                  from '@/components/shared/Modal'
import FormField, { Input, Select }           from '@/components/shared/FormField'
import RupiahInput                            from '@/components/shared/RupiahInput'
import { useCreateEmployee, useUpdateEmployee } from '../hooks/useEmployees'
import { useEffectiveOutletId }               from '@/store/activeOutletStore'
import useEntityMap                           from '@/hooks/useEntityMap'
import useToast                               from '@/hooks/useToast'
import { cn }                                 from '@/lib/utils'

export const EMPLOYEE_TYPES = ['barista', 'cashier', 'supervisor', 'rider']

const EMPLOYEE_TYPE_LABELS = {
  barista:    'Barista',
  cashier:    'Kasir',
  supervisor: 'Supervisor',
  rider:      'Rider',
}

export const KTP_STATUSES = ['pending', 'received']

const KTP_STATUS_LABELS = {
  pending:  'Tertunda',
  received: 'Diterima',
}

const optionalNumber = z
  .union([z.number().min(0, 'Tidak mungkin negatif'), z.literal('')])
  .optional()

const createSchema = z.object({
  name:         z.string().min(2, 'Nama harus terdiri minimal 2 karakter.').max(100, 'Nama terlalu panjang'),
  phone:        z.string().max(20, 'Nomor telepon terlalu panjang').optional().or(z.literal('')),
  position:     z.string().min(2, 'Posisi harus minimal 2 karakter').max(50, 'Posisi terlalu panjang'),
  employeeType: z.enum(EMPLOYEE_TYPES, { required_error: 'Pilih jenis karyawan' }),
  
  salaryType:   z.enum(['monthly', 'daily']).optional().or(z.literal('')),
  baseSalary:   optionalNumber,
  joinDate:     z.string().min(1, 'Tanggal bergabung wajib diisi.'),
  ktpStatus:    z.enum(KTP_STATUSES, { required_error: 'Pilih status KTP' }),
})

const editSchema = z.object({
  name:         z.string().min(2, 'Minimal 2 karakter').max(100).optional().or(z.literal('')),
  phone:        z.string().max(20).optional().or(z.literal('')),
  position:     z.string().min(2, 'Minimal 2 karakter').max(50).optional().or(z.literal('')),
  employeeType: z.enum(EMPLOYEE_TYPES).optional(),
  salaryType:   z.enum(['monthly', 'daily']).optional().or(z.literal('')),
  baseSalary:   optionalNumber,
  joinDate:     z.string().optional().or(z.literal('')),
  ktpStatus:    z.enum(KTP_STATUSES).optional(),
})

// ── Helpers ───────────────────────────────────────────────────

const toDateInputValue = (iso) => {
  if (!iso) return ''
  try { return new Date(iso).toISOString().split('T')[0] } catch { return '' }
}

// Strip '' / undefined / null — RupiahInput may return '' on empty
const cleanPayload = (data) =>
  Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  )

// ── Default values ────────────────────────────────────────────

const getCreateDefaults = () => ({
  name:         '',
  phone:        '',
  position:     '',
  employeeType: 'barista',
  salaryType:   'monthly',
  baseSalary:   '',
  joinDate:     '',
  ktpStatus:    'pending',
})

const getEditDefaults = (employee) => ({
  name:         employee?.name         ?? '',
  phone:        employee?.phone        ?? '',
  position:     employee?.position     ?? '',
  employeeType: employee?.employeeType ?? 'barista',
  salaryType:   employee?.salaryType   ?? 'monthly',
  baseSalary:   employee?.baseSalary   ?? '',
  joinDate:     toDateInputValue(employee?.joinDate),
  ktpStatus:    employee?.ktpStatus    ?? 'pending',
})

// ── Component ─────────────────────────────────────────────────

const EmployeeFormModal = ({ open, onClose, employee = null }) => {
  const isEdit = Boolean(employee)
  const toast  = useToast()

  
  const effectiveOutletId = useEffectiveOutletId()

  
  const { outletMap } = useEntityMap()

  const createMutation = useCreateEmployee()
  const updateMutation = useUpdateEmployee()
  const isPending      = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors },
  } = useForm({
    resolver:      zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: isEdit ? getEditDefaults(employee) : getCreateDefaults(),
  })

  
  const payrollOutlet    = outletMap.get(effectiveOutletId)
  const payrollType      = payrollOutlet?.payrollType ?? 'fixed'
  const showSalaryFields = payrollType === 'fixed'

  
  const hasWorkingOutlet = !!effectiveOutletId

  useEffect(() => {
    if (!open) return
    if (isEdit) {
      reset(getEditDefaults(employee))
    } else {
      reset(getCreateDefaults())
    }
  }, [open, isEdit, employee, reset])

  const onSubmit = (data) => {
   
    if (!hasWorkingOutlet) return

    
    if (payrollType === 'fixed') {
      let hasError = false
      if (!data.salaryType) {
        setError('salaryType', { message: 'Jenis gaji wajib diisi untuk outlet dengan sistem penggajian tetap.' })
        hasError = true
      }
      if (data.baseSalary === '' || data.baseSalary === undefined || data.baseSalary === null) {
        setError('baseSalary', { message: 'Gaji pokok diperlukan untuk outlet dengan sistem penggajian tetap.' })
        hasError = true
      }
      if (hasError) return
    }

    const payload = cleanPayload(data)


    if (payrollType === 'commission') {
      delete payload.salaryType
      delete payload.baseSalary
    }


    const payloadWithOutlet = { ...payload, outletId: effectiveOutletId }

    if (isEdit) {
      updateMutation.mutate(
        { employeeId: employee._id, payload: payloadWithOutlet },
        {
          onSuccess: () => { toast.success('Karyawan berhasil diupdate', employee.name); onClose() },
          onError:   (err) => toast.error('Update gagal', err?.response?.data?.message ?? 'Coba lagi!'),
        }
      )
    } else {
      createMutation.mutate(payloadWithOutlet, {
        onSuccess: () => { toast.success('Karyawan berhasil dibuat'); onClose() },
        onError:   (err) => toast.error('Gagal membuat karyawan', err?.response?.data?.message ?? 'Coba lagi!'),
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
      description={
        isEdit
          ? 'Update detail karyawan. Biarkan kolom kosong untuk mempertahankan nilai saat ini.'
          : 'Isi semua kolom yang diperlukan untuk menambahkan karyawan baru.'
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4">

          {/* No Working Outlet selected ("All Outlets") — not a valid
              context for this form in either mode. */}
          {!hasWorkingOutlet && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-sm text-amber-800 dark:text-amber-400">
              <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Pilih outlet spesifik dari switcher di atas untuk {isEdit ? 'mengedit karyawan ini' : 'menambahkan karyawan baru'}.</span>
            </div>
          )}

          {/* Name */}
          <FormField label="Nama Lengkap" error={errors.name?.message} required={!isEdit}>
            <Input
              {...register('name')}
              placeholder="e.g. Sari Dewi"
              error={!!errors.name?.message}
              disabled={isPending}
            />
          </FormField>

          {/* Phone */}
          <FormField label="Nomor Telepon" error={errors.phone?.message}>
            <Input
              {...register('phone')}
              placeholder="e.g. 0812-3456-7890"
              error={!!errors.phone?.message}
              disabled={isPending}
            />
          </FormField>

          {/* Position + Employee Type side by side */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Posisi" error={errors.position?.message} required={!isEdit}>
              <Input
                {...register('position')}
                placeholder="e.g. Barista, Cashier, Supervisor"
                error={!!errors.position?.message}
                disabled={isPending}
              />
            </FormField>

            <FormField label="Tipe Karyawan" error={errors.employeeType?.message} required={!isEdit}>
              <Select
                {...register('employeeType')}
                error={!!errors.employeeType?.message}
                disabled={isPending}
              >
                {EMPLOYEE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {EMPLOYEE_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {/* Salary Type + Base Salary — ONLY for fixed-payroll outlets.
              Not rendered at all (not disabled) for commission outlets,
              and reacts immediately when a different outlet is selected. */}
          {showSalaryFields && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tipe Gaji" error={errors.salaryType?.message} required>
                <Select
                  {...register('salaryType')}
                  error={!!errors.salaryType?.message}
                  disabled={isPending}
                >
                  <option value="monthly">Bulanan</option>
                  <option value="daily">Harian</option>
                </Select>
              </FormField>

              <FormField label="Gaji Pokok (IDR)" error={errors.baseSalary?.message} required>
                <RupiahInput
                  control={control}
                  name="baseSalary"
                  placeholder="e.g. 3.000.000"
                  error={!!errors.baseSalary?.message}
                  disabled={isPending}
                />
              </FormField>
            </div>
          )}

          {/* Join Date + KTP Status side by side */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tanggal Bergabung" error={errors.joinDate?.message} required={!isEdit}>
              <Input
                {...register('joinDate')}
                type="date"
                error={!!errors.joinDate?.message}
                disabled={isPending}
              />
            </FormField>

            <FormField label="Status KTP" error={errors.ktpStatus?.message} required>
              <Select
                {...register('ktpStatus')}
                error={!!errors.ktpStatus?.message}
                disabled={isPending}
              >
                {KTP_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {KTP_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

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
            disabled={isPending || !hasWorkingOutlet}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
              'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isPending ? (isEdit ? 'Menyimpan…' : 'Membuat…') : (isEdit ? 'Simpan Perubahan' : 'Buat Karyawan')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default EmployeeFormModal