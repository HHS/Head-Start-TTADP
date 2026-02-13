import { useMemo, useState, useEffect } from 'react'
import { storageAvailable } from './helpers'
import { HTTPError } from '../fetchers'

export function setConnectionActiveWithError(e, setConnectionActive) {
  let connection = false
  // if we get an "unauthorized" or "not found" responce back from the API, we DON'T
  // display the "network is unavailable" message
  if (e instanceof HTTPError && [403, 404].includes(e.status)) {
    connection = true
  }
  setConnectionActive(connection)
  return connection
}

/**
 * Wraps around useState by saving to local storage as a side effect
 * Accepts an optional "save" parameter that skips saving to local storage
 * (useful when you want to save in some circumstances, and skip in other, since hooks can't
 * be called conditionally)
 *
 * @param {string} key
 * @param {string} defaultValue
 * @param {boolean} save
 * @returns [getter, setter, boolean: isLocalStorageAvailable]
 */
export default function useLocalStorage(key, defaultValue, save = true) {
  const localStorageAvailable = useMemo(() => storageAvailable('localStorage'), [])
  const value = useMemo(() => {
    try {
      const curr = window.localStorage.getItem(key)
      if (curr) {
        return JSON.parse(curr)
      }
    } catch (error) {
      return defaultValue
    }

    return defaultValue
  }, [defaultValue, key])

  const [storedValue, setStoredValue] = useState(value)

  useEffect(() => {
    if (save && localStorageAvailable) {
      try {
        window.localStorage.setItem(key, JSON.stringify(storedValue))
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log('local storage unavailable', error)
      }
    }
  }, [key, localStorageAvailable, save, storedValue])

  return [storedValue, setStoredValue, localStorageAvailable]
}
