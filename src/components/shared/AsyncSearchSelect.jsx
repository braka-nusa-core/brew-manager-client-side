// src/components/shared/AsyncSearchSelect.jsx
//
// Reusable async searchable select (combobox) component.
// v2 — larger touch targets, bigger trigger height, more readable list items.

import { useState, useRef, useEffect, useId, useCallback } from 'react'
import { Search, X, ChevronDown, Loader2, CheckCheck }     from 'lucide-react'
import { cn }                                               from '@/lib/utils'

const AsyncSearchSelect = ({
  value,
  onChange,
  items = [],
  getLabel,
  getValue,
  onSearchChange,
  isLoading    = false,
  placeholder  = 'Cari…',
  error        = false,
  disabled     = false,
  className,
  emptyMessage = 'Tidak ada hasil ditemukan.',
}) => {
  const [open,           setOpen]          = useState(false)
  const [query,          setQuery]         = useState('')
  const [highlightedIdx, setHighlightedIdx] = useState(0)

  const containerRef = useRef(null)
  const inputRef     = useRef(null)
  const listRef      = useRef(null)
  const instanceId   = useId()

  const selectedItem  = items.find((item) => getValue(item) === value) ?? null
  const selectedLabel = selectedItem ? getLabel(selectedItem) : null

  const openDropdown = useCallback(() => {
    if (disabled) return
    setOpen(true)
    setHighlightedIdx(0)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [disabled])

  const closeDropdown = useCallback(() => {
    setOpen(false)
    setQuery('')
    onSearchChange('')
  }, [onSearchChange])

  const selectItem = useCallback((item) => {
    onChange(getValue(item))
    closeDropdown()
  }, [onChange, getValue, closeDropdown])

  const clearSelection = useCallback((e) => {
    e.stopPropagation()
    onChange('')
    setQuery('')
    onSearchChange('')
  }, [onChange, onSearchChange])

  const handleQueryChange = (e) => {
    const q = e.target.value
    setQuery(q)
    onSearchChange(q)
    setHighlightedIdx(0)
  }

  const handleTriggerKeyDown = (e) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDropdown() }
  }

  const handleListKeyDown = (e) => {
    if (!open) return
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setHighlightedIdx(i => Math.min(i + 1, items.length - 1)); break
      case 'ArrowUp':   e.preventDefault(); setHighlightedIdx(i => Math.max(i - 1, 0)); break
      case 'Enter':     e.preventDefault(); if (items[highlightedIdx]) selectItem(items[highlightedIdx]); break
      case 'Escape':
      case 'Tab':       e.preventDefault(); closeDropdown(); break
    }
  }

  useEffect(() => {
    if (!open || !listRef.current) return
    listRef.current.querySelector(`[data-idx="${highlightedIdx}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIdx, open])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (!containerRef.current?.contains(e.target)) closeDropdown() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, closeDropdown])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') closeDropdown() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, closeDropdown])

  const listboxId   = `${instanceId}-listbox`
  const activeOptId = open && items[highlightedIdx] ? `${instanceId}-opt-${highlightedIdx}` : undefined

  return (
    <div ref={containerRef} className={cn('relative', className)}>

      {/* ── Trigger button ─────────────────────────────── */}
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
          // ↑ h-11 (44px) instead of h-9 — easier to click
          'flex items-center justify-between gap-2 w-full h-11 px-3.5 rounded-lg border bg-background',
          'text-sm cursor-pointer select-none transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          error    ? 'border-destructive' : 'border-input hover:border-zinc-400',
          open     && 'ring-2 ring-brand-500 border-brand-500',
        )}
      >
        <span className={cn(
          'truncate text-sm leading-none',
          selectedLabel ? 'text-foreground font-medium' : 'text-muted-foreground'
        )}>
          {selectedLabel ?? placeholder}
        </span>

        <span className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={clearSelection}
              aria-label="Hapus pilihan"
              // ↑ bigger hit area for the clear button
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={cn(
            'w-4 h-4 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180'
          )} />
        </span>
      </div>

      {/* ── Dropdown panel ─────────────────────────────── */}
      {open && (
        <div
          className={cn(
            'absolute z-50 w-full mt-1.5 min-w-[220px]',
            'bg-popover border border-border rounded-xl shadow-xl',
            'overflow-hidden animate-fade-in'
          )}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="p-2.5 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleQueryChange}
                onKeyDown={handleListKeyDown}
                placeholder={placeholder}
                aria-label="Cari"
                className={cn(
                  // ↑ h-9 search field inside dropdown (was h-8)
                  'w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-background',
                  'text-sm placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
                  'transition-colors'
                )}
              />
            </div>
          </div>

          {/* Options */}
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={placeholder}
            className="max-h-56 overflow-y-auto py-1.5"
          >
            {isLoading && (
              <li className="flex items-center justify-center gap-2 px-4 py-5 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Mencari…
              </li>
            )}

            {!isLoading && items.length === 0 && (
              <li className="px-4 py-5 text-sm text-muted-foreground text-center">
                {emptyMessage}
              </li>
            )}

            {!isLoading && items.map((item, idx) => {
              const itemValue   = getValue(item)
              const itemLabel   = getLabel(item)
              const isSelected  = itemValue === value
              const isHighlight = idx === highlightedIdx

              // Split label by " — " to show name + position on two lines
              const parts = itemLabel.split(' — ')
              const name  = parts[0]
              const sub   = parts[1]

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
                    // ↑ py-2.5 instead of py-2 — more vertical padding per item
                    'flex items-center justify-between gap-3 px-3.5 py-2.5',
                    'cursor-pointer transition-colors select-none',
                    isHighlight && 'bg-muted',
                    isSelected  && 'bg-brand-50 dark:bg-brand-950/30',
                  )}
                >
                  <div className="min-w-0">
                    <p className={cn(
                      'text-sm leading-snug truncate',
                      isSelected ? 'text-brand-700 dark:text-brand-400 font-semibold' : 'text-foreground font-medium'
                    )}>
                      {name}
                    </p>
                    {sub && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{sub}</p>
                    )}
                  </div>
                  {isSelected && (
                    <CheckCheck className="w-4 h-4 text-brand-500 shrink-0" />
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