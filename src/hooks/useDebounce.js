// src/hooks/useDebounce.js
import { useState, useEffect } from 'react'

/**
 * Debounces a value by the given delay (default 400ms).
 * Used for search inputs to avoid firing a query on every keystroke.
 *
 * @param {*}      value
 * @param {number} delay - ms
 * @returns debounced value
 */
const useDebounce = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

export default useDebounce