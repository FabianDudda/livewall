/**
 * Utility functions for managing event authentication in localStorage
 */

const STORAGE_PREFIX = 'event_password_'

export const getStorageKey = (eventId: string) => `${STORAGE_PREFIX}${eventId}`

export const checkStoredPassword = (eventId: string): boolean => {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem(getStorageKey(eventId))
  return stored === 'authenticated'
}

export const storePasswordAuthentication = (eventId: string) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(getStorageKey(eventId), 'authenticated')
}

export const clearStoredPassword = (eventId: string) => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(getStorageKey(eventId))
}
