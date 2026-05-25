// src/hooks/useRupiahInput.js
//
// Custom hook for Rupiah currency inputs inside React Hook Form.
//
// ── Problem it solves ─────────────────────────────────────────
// HTML <input type="number"> gives no formatting.
// We want: user sees "45.000" (Indonesian thousand-separator) while typing,
// but RHF stores and sends 45000 (raw number) to the backend.
//
// ── Strategy ─────────────────────────────────────────────────
// Use <input type="text"> (not number) so we can control the display value.
// The hook maintains a `displayValue` string for the input,
// and calls `rhfOnChange` with the parsed raw number (or '' if empty).
//
// ── Usage ────────────────────────────────────────────────────
//
//   const rupiahProps = useRupiahInput({ value: field.value, onChange: field.onChange })
//   <input {...rupiahProps} placeholder="0" />
//
// ── Integration with Controller ──────────────────────────────
//
//   <Controller
//     control={control}
//     name="baseSalary"
//     render={({ field }) => {
//       const rupiahProps = useRupiahInput(field)
//       return <Input {...rupiahProps} placeholder="e.g. 3.000.000" error={!!errors.baseSalary} />
//     }}
//   />
//
// NOTE: Because hooks cannot be called inside render callbacks per Rules of Hooks,
// use the companion <RupiahInput> component instead — it wraps Controller + this hook.
// See RupiahInput.jsx.

import { useState, useCallback } from 'react'

/**
 * Format a raw number (or numeric string) to Indonesian thousand-separated display.
 * 3000000 → "3.000.000"
 * ''      → ''
 * @param {number|string} raw
 * @returns {string}
 */
export const formatRupiah = (raw) => {
  if (raw === '' || raw === null || raw === undefined) return ''
  const n = typeof raw === 'string' ? parseFloat(raw.replace(/\./g, '')) : raw
  if (isNaN(n)) return ''
  // Indonesian locale uses '.' as thousand separator
  return new Intl.NumberFormat('id-ID').format(n)
}

/**
 * Parse a display string back to a raw number.
 * "3.000.000" → 3000000
 * ""          → ''  (empty — lets Zod treat as missing)
 * @param {string} display
 * @returns {number|''}
 */
export const parseRupiah = (display) => {
  const stripped = display.replace(/\./g, '').replace(/,/g, '').trim()
  if (stripped === '') return ''
  const n = parseFloat(stripped)
  return isNaN(n) ? '' : n
}

/**
 * @param {{
 *   value: number | string | '',
 *   onChange: (raw: number | '') => void,
 * }} field - RHF field object (or compatible { value, onChange })
 * @returns {React.InputHTMLAttributes} props to spread onto <input>
 */
const useRupiahInput = ({ value, onChange }) => {
  // displayValue drives what the user sees
  const [displayValue, setDisplayValue] = useState(() => formatRupiah(value))

  const handleChange = useCallback((e) => {
    const raw = e.target.value
    // Allow only digits and dots (Indonesian separator) while typing
    const digitsOnly = raw.replace(/[^\d]/g, '')
    // Re-format for display
    const formatted = digitsOnly === '' ? '' : formatRupiah(parseInt(digitsOnly, 10))
    setDisplayValue(formatted)
    // Tell RHF the raw number (or '' so Zod knows it's empty)
    onChange(digitsOnly === '' ? '' : parseInt(digitsOnly, 10))
  }, [onChange])

  // Sync displayValue if RHF value is reset externally (e.g. modal reset)
  // We use a layout effect would be ideal, but keeping it simple:
  // If value is '' and display is not '' → reset display.
  // This covers the reset() call from useEffect([open]).
  if ((value === '' || value === null || value === undefined) && displayValue !== '') {
    setDisplayValue('')
  } else if (value !== '' && value !== null && value !== undefined) {
    const expected = formatRupiah(value)
    // Only sync if display doesn't already represent the same number
    // (avoid resetting while user is typing)
    const currentRaw = parseRupiah(displayValue)
    if (currentRaw !== value && displayValue !== expected) {
      setDisplayValue(expected)
    }
  }

  return {
    type:         'text',
    inputMode:    'numeric',   // mobile: show numeric keyboard
    value:        displayValue,
    onChange:     handleChange,
    autoComplete: 'off',
  }
}

export default useRupiahInput