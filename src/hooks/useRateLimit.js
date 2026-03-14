// src/hooks/useRateLimit.js
import { useRef, useCallback } from 'react'

/**
 * Hook para limitar la frecuencia de acciones (anti-spam)
 * @param {number} limitMs - Tiempo mínimo entre acciones en ms
 * @returns {{ check: () => boolean, reset: () => void }}
 */
export function useRateLimit(limitMs = 2000) {
  const lastRef = useRef(0)

  const check = useCallback(() => {
    const now = Date.now()
    if (now - lastRef.current < limitMs) return false
    lastRef.current = now
    return true
  }, [limitMs])

  const reset = useCallback(() => {
    lastRef.current = 0
  }, [])

  return { check, reset }
}
