// src/components/shared/AsyncSearchSelect.jsx
//
// Reusable async searchable select (combobox) component.
//
// ── Design contract ───────────────────────────────────────────
//
//   • Controlled via React Hook Form's <Controller> — caller passes
//     `value` (the stored _id string) and `onChange` (_id string).
//   • The component maintains its own internal `query` state for
//     the debounced search input — this is intentionally separate
//     from RHF's field value (which is always just the _id).
//   • `items`        — array of objects from the parent (already fetched).
//   • `getLabel`     — (item) => string   — what to display in the list and trigger.
//   • `getValue`     — (item) => string   — what to store (always _id).
//   • `isLoading`    — shows spinner in dropdown while fetching.
//   • `onSearchChange` — called with the raw query string so the parent
//     can pass it to the API hook as the `search` param.
//   • `placeholder`  — shown in the closed trigger when nothing selected.
//   • `disabled`     — mirrors the isPending state of surrounding mutation.
//   • `error`        — boolean, controls border color (FormField displays message).
//
// ── Keyboard support ──────────────────────────────────────────
//
//   Enter / Space     → open dropdown
//   ArrowDown / Up    → move highlighted index
//   Enter (open)      → select highlighted item
//   Escape            → close without selecting
//   Tab               → close
//
// ── Accessibility ─────────────────────────────────────────────
//
//   role="combobox" on trigger, role="listbox" on dropdown,
//   role="option" on each item, aria-expanded, aria-activedescendant.
//
// ── Integration pattern ───────────────────────────────────────
//
//   <Controller
//     control={control}
//     name="outletId"
//     render={({ field }) => (
//       <AsyncSearchSelect
//         value={field.value}
//         onChange={field.onChange}
//         items={outlets}
//         getLabel={(o) => o.name}
//         getValue={(o) => o._id}
//         onSearchChange={setOutletSearch}
//         isLoading={outletsLoading}
//         placeholder="Search outlets..."
//         error={!!errors.outletId}
//         disabled={isPending}
//       />
//     )}
//   />

import { useState, useRef, useEffect, useId, useCallback } from 'react'
import { Search, X, ChevronDown, Loader2, CheckCheck }     from 'lucide-react'
import { cn }                                               from '@/lib/utils'

/**
 * @param {{
 *   value: string,
 *   onChange: (id: string) => void,
 *   items: Object[],
 *   getLabel: (item: Object) => string,
 *   getValue: (item: Object) => string,
 *   onSearchChange: (query: string) => void,
 *   isLoading?: boolean,
 *   placeholder?: string,
 *   error?: boolean,
 *   disabled?: boolean,
 *   className?: string,
 *   emptyMessage?: string,
 * }} props
 */
const AsyncSearchSelect = ({
  value,
  onChange,
  items = [],
  getLabel,
  getValue,
  onSearchChange,
  isLoading   = false,
  placeholder = 'Search…',
  error       = false,
  disabled    = false,
  className,
  emptyMessage = 'No results found.',
}) => {
  const [open,          setOpen]          = useState(false)
  const [query,         setQuery]         = useState('')
  const [highlightedIdx, setHighlightedIdx] = useState(0)

  const containerRef  = useRef(null)
  const inputRef      = useRef(null)
  const listRef       = useRef(null)
  const instanceId    = useId()

  // ── Derived: label for the currently selected value ──────────
  const selectedItem  = items.find((item) => getValue(item) === value) ?? null
  const selectedLabel = selectedItem ? getLabel(selectedItem) : null

  // ── Open the dropdown ─────────────────────────────────────────
  const openDropdown = useCallback(() => {
    if (disabled) return
    setOpen(true)
    setHighlightedIdx(0)
    // Focus search input on next tick (after render)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [disabled])

  // ── Close the dropdown ────────────────────────────────────────
  const closeDropdown = useCallback(() => {
    setOpen(false)
    setQuery('')
    onSearchChange('')
  }, [onSearchChange])

  // ── Select an item ────────────────────────────────────────────
  const selectItem = useCallback((item) => {
    onChange(getValue(item))
    closeDropdown()
  }, [onChange, getValue, closeDropdown])

  // ── Clear selection ───────────────────────────────────────────
  const clearSelection = useCallback((e) => {
    e.stopPropagation()
    onChange('')
    setQuery('')
    onSearchChange('')
  }, [onChange, onSearchChange])

  // ── Handle query input change ─────────────────────────────────
  const handleQueryChange = (e) => {
    const q = e.target.value
    setQuery(q)
    onSearchChange(q)
    setHighlightedIdx(0)
  }

  // ── Keyboard navigation ───────────────────────────────────────
  const handleTriggerKeyDown = (e) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openDropdown()
    }
  }

  const handleListKeyDown = (e) => {
    if (!open) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIdx((i) => Math.min(i + 1, items.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIdx((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (items[highlightedIdx]) selectItem(items[highlightedIdx])
        break
      case 'Escape':
      case 'Tab':
        e.preventDefault()
        closeDropdown()
        break
      default:
        break
    }
  }

  // ── Scroll highlighted option into view ───────────────────────
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.querySelector(`[data-idx="${highlightedIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIdx, open])

  // ── Close on outside click ────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) closeDropdown()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, closeDropdown])

  // ── Close on Escape at document level (e.g. inside a Modal) ──
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') closeDropdown() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, closeDropdown])

  // ── Ids for aria ──────────────────────────────────────────────
  const listboxId    = `${instanceId}-listbox`
  const activeOptId  = open && items[highlightedIdx]
    ? `${instanceId}-opt-${highlightedIdx}`
    : undefined

  return (
    <div ref={containerRef} className={cn('relative', className)}>

      {/* ── Closed trigger ───────────────────────────────────── */}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-activedescendant={activeOptId}
        tabIndex={disabled ? -1 : 0}
        onClick={openDropdown}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          'flex items-center justify-between gap-2',
          'w-full h-9 px-3 rounded-md border bg-background text-sm',
          'cursor-pointer select-none transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          error   ? 'border-destructive focus:ring-destructive/50' : 'border-input',
          open    && 'ring-2 ring-brand-500 border-brand-500',
        )}
      >
        {/* Selected label or placeholder */}
        <span className={cn(
          'truncate leading-none',
          selectedLabel ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {selectedLabel ?? placeholder}
        </span>

        {/* Right-side icons */}
        <span className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={clearSelection}
              aria-label="Clear selection"
              className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={cn(
            'w-3.5 h-3.5 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180'
          )} />
        </span>
      </div>

      {/* ── Open dropdown panel ───────────────────────────────── */}
      {open && (
        <div
          className={cn(
            'absolute z-50 w-full mt-1',
            'bg-popover border border-border rounded-lg shadow-lg',
            'overflow-hidden animate-fade-in'
          )}
          // Stop mouse events from bubbling to the document handler prematurely
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Search input inside dropdown */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleQueryChange}
                onKeyDown={handleListKeyDown}
                placeholder={placeholder}
                aria-label="Search"
                className={cn(
                  'w-full h-8 pl-8 pr-3 rounded-md border border-input bg-background',
                  'text-sm placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
                  'transition-colors'
                )}
              />
            </div>
          </div>

          {/* Options list */}
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={placeholder}
            className="max-h-52 overflow-y-auto py-1"
          >
            {/* Loading state */}
            {isLoading && (
              <li className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching…
              </li>
            )}

            {/* Empty state */}
            {!isLoading && items.length === 0 && (
              <li className="px-3 py-6 text-sm text-muted-foreground text-center">
                {emptyMessage}
              </li>
            )}

            {/* Items */}
            {!isLoading && items.map((item, idx) => {
              const itemValue   = getValue(item)
              const itemLabel   = getLabel(item)
              const isSelected  = itemValue === value
              const isHighlight = idx === highlightedIdx

              return (
                <li
                  key={itemValue}
                  id={`${instanceId}-opt-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  data-idx={idx}
                  onMouseEnter={() => setHighlightedIdx(idx)}
                  onMouseDown={() => selectItem(item)}
                  className={cn(
                    'flex items-center justify-between gap-2',
                    'px-3 py-2 text-sm cursor-pointer transition-colors select-none',
                    isHighlight  && 'bg-muted',
                    isSelected   && 'text-brand-700 dark:text-brand-400',
                    !isHighlight && !isSelected && 'text-foreground',
                  )}
                >
                  <span className="truncate">{itemLabel}</span>
                  {isSelected && (
                    <CheckCheck className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default AsyncSearchSelect