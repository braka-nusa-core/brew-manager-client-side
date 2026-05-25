// src/components/shared/RupiahInput.jsx
//
// Drop-in replacement for <Input> on currency fields inside React Hook Form.
//
// ── Why a separate component? ────────────────────────────────
// React's Rules of Hooks forbid calling hooks inside render callbacks.
// Because RHF's <Controller render={...}> is a render callback,
// useRupiahInput must live in a child component — not inline.
//
// ── Usage ────────────────────────────────────────────────────
//
//   <FormField label="Base Salary (IDR)" error={errors.baseSalary?.message} required>
//     <RupiahInput
//       control={control}
//       name="baseSalary"
//       placeholder="e.g. 3.000.000"
//       error={!!errors.baseSalary?.message}
//       disabled={isPending}
//     />
//   </FormField>
//
// ── What it does ─────────────────────────────────────────────
// • Renders a text input displaying formatted Rupiah (e.g. "3.000.000")
// • Stores the raw integer in RHF (e.g. 3000000)
// • Backend receives: { baseSalary: 3000000 } — correct
// • Zod sees: 3000000 (number) — no coerce needed, no empty-string edge case

import { Controller } from 'react-hook-form'
import { Input }      from '@/components/shared/FormField'
import useRupiahInput from '@/hooks/useRupiahInput'

// Inner component so the hook is called at the component level (not in a callback)
const RupiahInputInner = ({ field, error, disabled, placeholder, className }) => {
  const rupiahProps = useRupiahInput(field)
  return (
    <Input
      {...rupiahProps}
      placeholder={placeholder}
      error={error}
      disabled={disabled}
      className={className}
    />
  )
}

/**
 * @param {{
 *   control: import('react-hook-form').Control,
 *   name: string,
 *   error?: boolean,
 *   disabled?: boolean,
 *   placeholder?: string,
 *   className?: string,
 * }} props
 */
const RupiahInput = ({ control, name, error, disabled, placeholder, className }) => (
  <Controller
    control={control}
    name={name}
    render={({ field }) => (
      <RupiahInputInner
        field={field}
        error={error}
        disabled={disabled}
        placeholder={placeholder}
        className={className}
      />
    )}
  />
)

export default RupiahInput