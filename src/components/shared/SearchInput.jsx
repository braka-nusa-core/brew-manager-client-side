// src/components/shared/SearchInput.jsx
import { Search, X } from 'lucide-react'
import { cn }        from '@/lib/utils'

/**
 * Reusable search input.
 * Parent controls value state. This component is purely presentational.
 *
 * @param {{
 *   value: string,
 *   onChange: (val: string) => void,
 *   placeholder?: string,
 *   className?: string,
 *   disabled?: boolean
 * }} props
 */
const SearchInput = ({
  value,
  onChange,
  placeholder = 'Cari...',
  className,
  disabled = false,
}) => (
  <div className={cn('relative', className)}>
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />

    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'w-full h-9 pl-9 pr-8 rounded-md border border-input bg-background',
        'text-sm placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors'
      )}
    />

    {value && (
      <button
        onClick={() => onChange('')}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Hapus pencarian"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
)

export default SearchInput