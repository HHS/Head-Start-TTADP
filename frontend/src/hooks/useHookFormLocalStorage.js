import { useEffect, useRef, useMemo, useCallback } from 'react'
import { debounce } from 'lodash'
import { REPORT_STATUSES } from '@ttahub/common'
import { LOCAL_STORAGE_AR_DATA_KEY } from '../Constants'
import { storageAvailable } from './helpers'

const STORAGE_KEYS_TO_IGNORE = [LOCAL_STORAGE_AR_DATA_KEY('new')]

const DEBOUNCE_DELAY = 500 // milliseconds

/**
 * Hook to auto-save react-hook-form state to localStorage
 * Handles network interruptions by storing form data locally with debouncing
 * Note: Loading from localStorage should be handled in the fetch logic
 * to properly compare timestamps
 *
 * @param {string} storageKey - The localStorage key to use
 * @param {Object} hookForm - The react-hook-form instance
 * @param {Object} options - Optional configuration
 * @param {number} options.debounceDelay - Delay for debouncing saves (default: 500ms)
 * @returns {boolean} - Whether localStorage is available
 */
export default function useHookFormLocalStorage(storageKey, hookForm, options = {}) {
  const { debounceDelay = DEBOUNCE_DELAY } = options
  const { watch, subscribe } = hookForm

  // Check if localStorage is available
  const localStorageAvailable = useMemo(() => storageAvailable('localStorage'), [])

  // Track if data was created in localStorage (set once, persists)
  const createdInLocalStorageRef = useRef(null)

  // Load existing createdInLocalStorage timestamp on mount
  useEffect(() => {
    if (!localStorageAvailable) return

    try {
      const stored = window.localStorage.getItem(storageKey)
      if (stored) {
        const localData = JSON.parse(stored)
        if (localData && localData.createdInLocalStorage) {
          createdInLocalStorageRef.current = localData.createdInLocalStorage
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error loading createdInLocalStorage timestamp:', err)
    }
  }, [localStorageAvailable, storageKey])

  /**
   * Determines if we should save to localStorage
   */
  const shouldSave = useCallback(
    (formData) => {
      // Don't save if localStorage is not available
      if (!localStorageAvailable) return false

      // Don't save if key is in ignore list
      if (STORAGE_KEYS_TO_IGNORE.includes(storageKey)) return false

      // Don't save if report status is not DRAFT
      if (formData?.calculatedStatus && formData.calculatedStatus !== REPORT_STATUSES.DRAFT) {
        return false
      }

      return true
    },
    [localStorageAvailable, storageKey]
  )

  /**
   * Save form data to localStorage with timestamp
   */
  const saveToLocalStorage = useCallback(
    (formData) => {
      if (!shouldSave(formData)) return

      try {
        const now = new Date().toISOString()

        // Preserve createdInLocalStorage timestamp if it exists
        if (createdInLocalStorageRef.current === null) {
          createdInLocalStorageRef.current = now
        }

        const dataToStore = {
          ...formData,
          savedToStorageTime: now,
          createdInLocalStorage: createdInLocalStorageRef.current,
        }

        window.localStorage.setItem(storageKey, JSON.stringify(dataToStore))
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error saving to localStorage:', err)
      }
    },
    [storageKey, shouldSave]
  )

  // Create debounced save function
  const debouncedSave = useRef(
    debounce((formData) => {
      saveToLocalStorage(formData)
    }, debounceDelay)
  ).current

  /**
   * Watch form changes and save to localStorage
   */
  useEffect(() => {
    if (!localStorageAvailable) return undefined

    watch((formData) => {
      debouncedSave(formData)
    })

    return () => {
      debouncedSave.cancel()
    }
  }, [watch, debouncedSave, localStorageAvailable, subscribe])

  return localStorageAvailable
}
