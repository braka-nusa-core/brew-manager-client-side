import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  TriangleAlert,
  Lock,
  Eye,
} from 'lucide-react'

import Modal from '@/components/shared/Modal'
import DataTable from '@/components/shared/DataTable'
import FormField, {
  Input,
  Select,
} from '@/components/shared/FormField'

import { usePreviewPayroll, useGeneratePayroll } from '../hooks/usePayroll'
import { useEffectiveOutletId } from '@/store/activeOutletStore'

import useToast from '@/hooks/useToast'

import { cn } from '@/lib/utils'

const formatIDR = (val) =>
  val != null
    ? new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(val)
    : '—'

// ── Zod schema ────────────────────────────────────────────────
//
// outletId is intentionally NOT a field here — see file header.

const schema = z.object({
  month: z.coerce
    .number()
    .min(1)
    .max(12),

  year: z.coerce
    .number()
    .min(2000)
    .max(2100),

  workingDays: z.coerce
    .number()
    .min(1, 'Harus minimal 1')
    .max(31),
})

// ── Month names helper ────────────────────────────────────────

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

// ── Result summary ────────────────────────────────────────────

const GenerateResult = ({ result, onClose }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900">
        <CheckCircle2 className="w-5 h-5 text-brand-500 shrink-0" />

        <div>
          <p className="text-2xl font-bold text-brand-700 dark:text-brand-400">
            {result.generated}
          </p>

          <p className="text-xs text-brand-600 dark:text-brand-500">
            Berhasil Dibuat
          </p>
        </div>
      </div>

      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border',
          result.skipped > 0
            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
            : 'bg-muted border-border'
        )}
      >
        <AlertTriangle
          className={cn(
            'w-5 h-5 shrink-0',
            result.skipped > 0
              ? 'text-amber-500'
              : 'text-muted-foreground'
          )}
        />

        <div>
          <p
            className={cn(
              'text-2xl font-bold',
              result.skipped > 0
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-muted-foreground'
            )}
          >
            {result.skipped}
          </p>

          <p className="text-xs text-muted-foreground">
            Dilewati
          </p>
        </div>
      </div>
    </div>

    {result.skippedItems?.length > 0 && (
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Karyawan yang Dilewati
        </p>

        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {result.skippedItems.map((item, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-2 text-xs p-2 rounded bg-muted"
            >
              <span className="font-medium text-foreground truncate">
                {item.employeeName ?? item.employeeId}
              </span>

              <span className="text-muted-foreground shrink-0 text-right">
                {item.reason}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="flex justify-end pt-2 border-t border-border">
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-semibold rounded-md bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors"
      >
        Selesai
      </button>
    </div>
  </div>
)

// ── Preview screen ────────────────────────────────────────────

const PreviewScreen = ({ preview, onBack, onConfirm, isConfirming }) => {
  const employees = preview?.employees ?? []
  const summary    = preview?.summary ?? { totalEmployees: 0, totalPayrollCost: 0 }

  return (
    <div className="space-y-4">
      <div className="max-h-[45vh] overflow-y-auto border border-border rounded-lg">
        <DataTable>
          <DataTable.Head>
            <DataTable.HeadRow>
              <DataTable.HeadCell>Karyawan</DataTable.HeadCell>
              <DataTable.HeadCell>Kehadiran</DataTable.HeadCell>
              <DataTable.HeadCell>Pendapatan</DataTable.HeadCell>
              <DataTable.HeadCell>Gaji</DataTable.HeadCell>
              <DataTable.HeadCell>Uang Makan</DataTable.HeadCell>
              <DataTable.HeadCell>Bonus Tingkat Harian</DataTable.HeadCell>
              <DataTable.HeadCell>Bonus Mingguan</DataTable.HeadCell>
              <DataTable.HeadCell>Total Gaji</DataTable.HeadCell>
            </DataTable.HeadRow>
          </DataTable.Head>

          <DataTable.Body>
            {employees.map((emp) => (
              <DataTable.Row key={emp.employeeId}>
                <DataTable.Cell>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {emp.employeeName}
                    </p>

                    {emp.alreadyLocked && (
                      <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                        <Lock className="w-2.5 h-2.5" />
                        Dikunci
                      </span>
                    )}
                  </div>
                </DataTable.Cell>

                <DataTable.Cell>
                  <div className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                    <span className="text-brand-600 font-medium">
                      {emp.presentDays}P
                    </span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-muted-foreground">
                      {emp.absentDays}A
                    </span>
                  </div>
                </DataTable.Cell>

                <DataTable.Cell>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatIDR(emp.totalRevenue)}
                  </span>
                </DataTable.Cell>

                <DataTable.Cell>
                  <span className="text-sm tabular-nums text-foreground">
                    {formatIDR(emp.salaryEarned)}
                  </span>
                </DataTable.Cell>

                <DataTable.Cell>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatIDR(emp.mealAllowanceTotal)}
                  </span>
                </DataTable.Cell>

                <DataTable.Cell>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatIDR(emp.dailyTierBonus)}
                  </span>
                </DataTable.Cell>

                <DataTable.Cell>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatIDR(emp.weeklyAttendanceBonus)}
                  </span>
                </DataTable.Cell>

                <DataTable.Cell>
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {formatIDR(emp.totalPay)}
                  </span>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable.Body>
        </DataTable>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted border border-border">
          <p className="text-2xl font-bold text-foreground">
            {summary.totalEmployees}
          </p>
          <p className="text-xs text-muted-foreground">Total Karyawan</p>
        </div>

        <div className="p-3 rounded-lg bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900">
          <p className="text-2xl font-bold text-brand-700 dark:text-brand-400">
            {formatIDR(summary.totalPayrollCost)}
          </p>
          <p className="text-xs text-brand-600 dark:text-brand-500">Total Gaji</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onBack}
          disabled={isConfirming}
          className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50"
        >
          Kembali
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={isConfirming}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
            'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
            'disabled:opacity-60 disabled:cursor-not-allowed'
          )}
        >
          {isConfirming && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isConfirming ? 'Membuat…' : 'Konfirmasi & Buat Gaji'}
        </button>
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────

const GeneratePayrollModal = ({ open, onClose }) => {
  const toast = useToast()

  // The single source of truth for outlet — no local outlet state, no
  // form field, no AsyncSearchSelect. Same store the Navbar's Outlet
  // Switcher writes to. null = "All Outlets".
  const effectiveOutletId = useEffectiveOutletId()
  const hasWorkingOutlet  = !!effectiveOutletId

  const previewMutation  = usePreviewPayroll()
  const generateMutation = useGeneratePayroll()

  // step: 'form' | 'preview' | 'result'
  const [step, setStep] = useState('form')
  const [previewData, setPreviewData] = useState(null)
  const [result, setResult] = useState(null)

  // Payload built at Preview time, reused unchanged for Generate —
  // Generate re-runs the same calculation server-side regardless,
  // this is just what the confirm button sends.
  const [pendingPayload, setPendingPayload] = useState(null)

  // ── Form ───────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),

    defaultValues: {
      month: currentMonth,
      year: currentYear,
      workingDays: 26,
    },
  })

  // ── Reset on open ──────────────────────────────────────────

  useEffect(() => {
    if (!open) return

    reset({
      month: currentMonth,
      year: currentYear,
      workingDays: 26,
    })

    setStep('form')
    setPreviewData(null)
    setResult(null)
    setPendingPayload(null)
  }, [open, reset])

  // ── Close handler ──────────────────────────────────────────

  const handleClose = () => {
    reset()

    setStep('form')
    setPreviewData(null)
    setResult(null)
    setPendingPayload(null)

    onClose()
  }

  // ── Step 1 → Preview ──────────────────────────────────────

  const onSubmit = (data) => {
    // No Working Outlet selected ("All Outlets") — not a valid context
    // for preview/generation. Blocked in the UI below, but guard here
    // too in case of a stray submit.
    if (!hasWorkingOutlet) return

    const payload = {
      outletId: effectiveOutletId,
      month: Number(data.month),
      year: Number(data.year),
      workingDays: Number(data.workingDays),
    }

    previewMutation.mutate(payload, {
      onSuccess: (res) => {
        setPendingPayload(payload)
        setPreviewData(res.data ?? null)
        setStep('preview')
      },

      onError: (err) => {
        toast.error(
          'Gagal membuat preview',
          err?.response?.data?.message ??
            'Silahkan cek kembali inputan Anda'
        )
      },
    })
  }

  // ── Preview → Back ────────────────────────────────────────

  const handleBackToForm = () => {
    setStep('form')
  }

  // ── Preview → Confirm & Generate ─────────────────────────

  const handleConfirmGenerate = () => {
    if (!pendingPayload) return

    generateMutation.mutate(pendingPayload, {
      onSuccess: (res) => {
        const resData = res.data ?? {}

        setResult({
          generated: resData.generated ?? 0,
          skipped: resData.skipped ?? 0,
          skippedItems: resData.skippedItems ?? [],
        })

        setStep('result')

        if ((resData.generated ?? 0) > 0) {
          toast.success(
            'Gaji berhasil dibuat',
            `${resData.generated} record${
              resData.generated !== 1 ? 's' : ''
            } berhasil dibuat`
          )
        }
      },

      onError: (err) => {
        toast.error(
          'Gagal membuat gaji',
          err?.response?.data?.message ??
            'Silahkan cek kembali inputan Anda'
        )
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={step === 'preview' ? 'Preview Gaji' : 'Generate Gaji'}
      description={
        step === 'preview'
          ? 'Tinjau kembali perhitungan penggajian sebelum dibuat. Ini belum disimpan.'
          : 'Buat record penggajian untuk semua karyawan aktif di outlet.'
      }
      size={step === 'preview' ? 'lg' : 'md'}
    >
      {step === 'result' && result ? (
        <GenerateResult
          result={result}
          onClose={handleClose}
        />
      ) : step === 'preview' ? (
        <PreviewScreen
          preview={previewData}
          onBack={handleBackToForm}
          onConfirm={handleConfirmGenerate}
          isConfirming={generateMutation.isPending}
        />
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="space-y-4">

            {/* No Working Outlet selected ("All Outlets") — generation
                requires exactly one outlet to generate for. */}
            {!hasWorkingOutlet && (
              <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-sm text-amber-800 dark:text-amber-400">
                <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Pilih outlet spesifik dari switcher di atas untuk membuat penggajian.</span>
              </div>
            )}

            {/* Month + Year */}
            <div className="grid grid-cols-2 gap-3">

              <FormField
                label="Bulan"
                error={errors.month?.message}
                required
              >
                <Select
                  {...register('month')}
                  error={!!errors.month?.message}
                  disabled={previewMutation.isPending}
                >
                  {MONTHS.map((m, i) => (
                    <option
                      key={m}
                      value={i + 1}
                    >
                      {m}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField
                label="Tahun"
                error={errors.year?.message}
                required
              >
                <Select
                  {...register('year')}
                  error={!!errors.year?.message}
                  disabled={previewMutation.isPending}
                >
                  {[
                    currentYear - 1,
                    currentYear,
                    currentYear + 1,
                  ].map((y) => (
                    <option
                      key={y}
                      value={y}
                    >
                      {y}
                    </option>
                  ))}
                </Select>
              </FormField>

            </div>

            {/* Working days */}
            <FormField
              label="Hari Kerja Periode Ini"
              error={errors.workingDays?.message}
              required
            >
              <Input
                {...register('workingDays')}
                type="number"
                min="1"
                max="31"
                error={!!errors.workingDays?.message}
                disabled={previewMutation.isPending}
              />

              <p className="text-[11px] text-muted-foreground mt-1">
                Jumlah hari kerja dalam periode ini
                (misalnya 26 untuk bulan biasa).
                Digunakan untuk menghitung prorata gaji bulanan.
              </p>
            </FormField>

          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              disabled={previewMutation.isPending}
              className="px-4 py-2 text-sm font-medium rounded-md border border-input hover:bg-muted transition-colors disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={previewMutation.isPending || !hasWorkingOutlet}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
                'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            >
              {previewMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}

              {previewMutation.isPending
                ? 'Memuat Preview…'
                : 'Preview Gaji'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default GeneratePayrollModal