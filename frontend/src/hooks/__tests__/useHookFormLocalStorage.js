import { waitFor } from '@testing-library/react'
import { renderHook } from '@testing-library/react-hooks'
import { REPORT_STATUSES } from '@ttahub/common'
import useHookFormLocalStorage from '../useHookFormLocalStorage'
import { LOCAL_STORAGE_AR_DATA_KEY } from '../../Constants'
import * as helpers from '../helpers'

// Mock the helpers module
jest.mock('../helpers')

// Mock lodash debounce to execute immediately
jest.mock('lodash', () => {
  const actualLodash = jest.requireActual('lodash')
  return {
    ...actualLodash,
    debounce: (fn) => {
      const debouncedFn = (...args) => fn(...args)
      debouncedFn.cancel = jest.fn()
      return debouncedFn
    },
  }
})

describe('useHookFormLocalStorage', () => {
  let mockWatch
  let mockSubscribe
  let mockHookForm
  let localStorageMock

  beforeEach(() => {
    // Setup localStorage mock
    localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    }
    global.window = Object.create(window)
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })

    // Setup mock hook form
    mockWatch = jest.fn((callback) => {
      // Store the callback for later use
      mockWatch.callback = callback
      return jest.fn() // Return unsubscribe function
    })
    mockSubscribe = jest.fn()
    mockHookForm = {
      watch: mockWatch,
      subscribe: mockSubscribe,
    }

    // Mock storageAvailable to return true by default
    helpers.storageAvailable.mockReturnValue(true)

    // Clear console mocks
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should check if localStorage is available on mount', () => {
      renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      expect(helpers.storageAvailable).toHaveBeenCalledWith('localStorage')
    })

    it('should return true when localStorage is available', () => {
      helpers.storageAvailable.mockReturnValue(true)

      const { result } = renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      expect(result.current).toBe(true)
    })

    it('should return false when localStorage is not available', () => {
      helpers.storageAvailable.mockReturnValue(false)

      const { result } = renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      expect(result.current).toBe(false)
    })

    it('should load existing createdInLocalStorage timestamp on mount', () => {
      const existingTimestamp = '2023-01-01T00:00:00.000Z'
      const storedData = {
        someField: 'value',
        createdInLocalStorage: existingTimestamp,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData))

      renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key')
    })

    it('should handle missing localStorage data on mount gracefully', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const { result } = renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      expect(result.current).toBe(true)
      // eslint-disable-next-line no-console
      expect(console.error).not.toHaveBeenCalled()
    })

    it('should handle invalid JSON in localStorage on mount', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')

      const { result } = renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      expect(result.current).toBe(true)
      // eslint-disable-next-line no-console
      expect(console.error).toHaveBeenCalledWith('Error loading createdInLocalStorage timestamp:', expect.any(Error))
    })

    it('should not attempt to load from localStorage when not available', () => {
      helpers.storageAvailable.mockReturnValue(false)

      renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      expect(localStorageMock.getItem).not.toHaveBeenCalled()
    })
  })

  describe('watching form changes', () => {
    it('should set up watch on mount', () => {
      renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      expect(mockWatch).toHaveBeenCalled()
    })
  })

  describe('saving to localStorage', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should save form data to localStorage when form changes', async () => {
      const formData = {
        title: 'Test Report',
        calculatedStatus: REPORT_STATUSES.DRAFT,
      }

      renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      // Trigger the watch callback
      if (mockWatch.callback) {
        mockWatch.callback(formData)
      }

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled()
      })

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(savedData).toMatchObject({
        title: 'Test Report',
        calculatedStatus: REPORT_STATUSES.DRAFT,
      })
      expect(savedData.savedToStorageTime).toBeDefined()
      expect(savedData.createdInLocalStorage).toBeDefined()
    })

    it('should preserve existing createdInLocalStorage timestamp', async () => {
      const existingTimestamp = '2023-01-01T00:00:00.000Z'
      const storedData = {
        someField: 'old value',
        createdInLocalStorage: existingTimestamp,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData))

      renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      const formData = {
        someField: 'new value',
        calculatedStatus: REPORT_STATUSES.DRAFT,
      }

      // Trigger the watch callback
      if (mockWatch.callback) {
        mockWatch.callback(formData)
      }

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled()
      })

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(savedData.createdInLocalStorage).toBe(existingTimestamp)
    })

    it('should create new createdInLocalStorage timestamp if none exists', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      const formData = {
        title: 'Test Report',
        calculatedStatus: REPORT_STATUSES.DRAFT,
      }

      // Trigger the watch callback
      if (mockWatch.callback) {
        mockWatch.callback(formData)
      }

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled()
      })

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(savedData.createdInLocalStorage).toBeDefined()
      expect(savedData.createdInLocalStorage).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('should include savedToStorageTime in saved data', async () => {
      const formData = {
        title: 'Test Report',
        calculatedStatus: REPORT_STATUSES.DRAFT,
      }

      renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      // Trigger the watch callback
      if (mockWatch.callback) {
        mockWatch.callback(formData)
      }

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled()
      })

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(savedData.savedToStorageTime).toBeDefined()
      expect(savedData.savedToStorageTime).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('should handle localStorage setItem errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full')
      })

      const formData = {
        title: 'Test Report',
        calculatedStatus: REPORT_STATUSES.DRAFT,
      }

      renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      // Trigger the watch callback
      if (mockWatch.callback) {
        mockWatch.callback(formData)
      }

      await waitFor(() => {
        // eslint-disable-next-line no-console
        expect(console.error).toHaveBeenCalledWith('Error saving to localStorage:', expect.any(Error))
      })
    })
  })

  describe('shouldSave conditions', () => {
    it('should not save when localStorage is not available', async () => {
      helpers.storageAvailable.mockReturnValue(false)

      const formData = {
        title: 'Test Report',
        calculatedStatus: REPORT_STATUSES.DRAFT,
      }

      renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      // Trigger the watch callback
      if (mockWatch.callback) {
        mockWatch.callback(formData)
      }

      await waitFor(() => {
        expect(localStorageMock.setItem).not.toHaveBeenCalled()
      })
    })

    it('should not save when storage key is in ignore list', async () => {
      const formData = {
        title: 'Test Report',
        calculatedStatus: REPORT_STATUSES.DRAFT,
      }

      const ignoredKey = LOCAL_STORAGE_AR_DATA_KEY('new')
      renderHook(() => useHookFormLocalStorage(ignoredKey, mockHookForm))

      // Trigger the watch callback
      if (mockWatch.callback) {
        mockWatch.callback(formData)
      }

      await waitFor(() => {
        expect(localStorageMock.setItem).not.toHaveBeenCalled()
      })
    })

    it('should not save when report status is SUBMITTED', async () => {
      const formData = {
        title: 'Test Report',
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
      }

      renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      // Trigger the watch callback
      if (mockWatch.callback) {
        mockWatch.callback(formData)
      }

      await waitFor(() => {
        expect(localStorageMock.setItem).not.toHaveBeenCalled()
      })
    })

    it('should not save when report status is APPROVED', async () => {
      const formData = {
        title: 'Test Report',
        calculatedStatus: REPORT_STATUSES.APPROVED,
      }

      renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      // Trigger the watch callback
      if (mockWatch.callback) {
        mockWatch.callback(formData)
      }

      await waitFor(() => {
        expect(localStorageMock.setItem).not.toHaveBeenCalled()
      })
    })

    it('should save when report status is DRAFT', async () => {
      const formData = {
        title: 'Test Report',
        calculatedStatus: REPORT_STATUSES.DRAFT,
      }

      renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      // Trigger the watch callback
      if (mockWatch.callback) {
        mockWatch.callback(formData)
      }

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled()
      })
    })

    it('should save when calculatedStatus is undefined', async () => {
      const formData = {
        title: 'Test Report',
      }

      renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      // Trigger the watch callback
      if (mockWatch.callback) {
        mockWatch.callback(formData)
      }

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled()
      })
    })
  })

  describe('debouncing', () => {
    it('should accept custom debounce delay option', () => {
      const customDelay = 1000
      const { result } = renderHook(() => useHookFormLocalStorage('test-key', mockHookForm, { debounceDelay: customDelay }))

      expect(result.current).toBe(true)
    })

    it('should use default debounce delay when not specified', () => {
      const { result } = renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      expect(result.current).toBe(true)
    })

    it('should use default debounce delay when options object is empty', () => {
      const { result } = renderHook(() => useHookFormLocalStorage('test-key', mockHookForm, {}))

      expect(result.current).toBe(true)
    })
  })

  describe('storage key handling', () => {
    it('should use provided storage key for saving', async () => {
      const storageKey = 'custom-storage-key'
      const formData = {
        title: 'Test Report',
        calculatedStatus: REPORT_STATUSES.DRAFT,
      }

      renderHook(() => useHookFormLocalStorage(storageKey, mockHookForm))

      // Trigger the watch callback
      if (mockWatch.callback) {
        mockWatch.callback(formData)
      }

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(storageKey, expect.any(String))
      })
    })

    it('should use provided storage key for loading', () => {
      const storageKey = 'custom-storage-key'
      const storedData = {
        title: 'Stored Report',
        createdInLocalStorage: '2023-01-01T00:00:00.000Z',
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData))

      renderHook(() => useHookFormLocalStorage(storageKey, mockHookForm))

      expect(localStorageMock.getItem).toHaveBeenCalledWith(storageKey)
    })
  })

  describe('edge cases', () => {
    it('should handle null form data', async () => {
      renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      // Trigger the watch callback with null
      if (mockWatch.callback) {
        mockWatch.callback(null)
      }

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled()
      })
    })

    it('should handle undefined form data', async () => {
      renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      // Trigger the watch callback with undefined
      if (mockWatch.callback) {
        mockWatch.callback(undefined)
      }

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled()
      })
    })

    it('should handle empty object form data', async () => {
      renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      // Trigger the watch callback with empty object
      if (mockWatch.callback) {
        mockWatch.callback({})
      }

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled()
      })

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(savedData.savedToStorageTime).toBeDefined()
      expect(savedData.createdInLocalStorage).toBeDefined()
    })

    it('should handle form data with nested objects', async () => {
      const formData = {
        title: 'Test Report',
        calculatedStatus: REPORT_STATUSES.DRAFT,
        nested: {
          level1: {
            level2: {
              value: 'deep value',
            },
          },
        },
      }

      renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      // Trigger the watch callback
      if (mockWatch.callback) {
        mockWatch.callback(formData)
      }

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled()
      })

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(savedData.nested.level1.level2.value).toBe('deep value')
    })

    it('should handle form data with arrays', async () => {
      const formData = {
        title: 'Test Report',
        calculatedStatus: REPORT_STATUSES.DRAFT,
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
      }

      renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      // Trigger the watch callback
      if (mockWatch.callback) {
        mockWatch.callback(formData)
      }

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled()
      })

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(savedData.items).toHaveLength(2)
      expect(savedData.items[0]).toEqual({ id: 1, name: 'Item 1' })
    })
  })

  describe('re-rendering behavior', () => {
    it('should not lose createdInLocalStorage on re-render', async () => {
      const formData = {
        title: 'Test Report',
        calculatedStatus: REPORT_STATUSES.DRAFT,
      }

      const { rerender } = renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      // Trigger the watch callback
      if (mockWatch.callback) {
        mockWatch.callback(formData)
      }

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled()
      })

      const firstSaveData = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      const firstCreatedTimestamp = firstSaveData.createdInLocalStorage

      // Clear the mock
      localStorageMock.setItem.mockClear()

      // Re-render the hook
      rerender()

      // Trigger another save
      if (mockWatch.callback) {
        mockWatch.callback({ ...formData, title: 'Updated Report' })
      }

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled()
      })

      const secondSaveData = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(secondSaveData.createdInLocalStorage).toBe(firstCreatedTimestamp)
    })

    it('should update savedToStorageTime on each save', async () => {
      const formData = {
        title: 'Test Report',
        calculatedStatus: REPORT_STATUSES.DRAFT,
      }

      renderHook(() => useHookFormLocalStorage('test-key', mockHookForm))

      // First save
      if (mockWatch.callback) {
        mockWatch.callback(formData)
      }

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled()
      })

      const firstSaveData = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      const firstSavedTime = firstSaveData.savedToStorageTime

      // Clear the mock
      localStorageMock.setItem.mockClear()

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Second save
      if (mockWatch.callback) {
        mockWatch.callback({ ...formData, title: 'Updated Report' })
      }

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled()
      })

      const secondSaveData = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      const secondSavedTime = secondSaveData.savedToStorageTime

      // savedToStorageTime should be updated
      expect(secondSavedTime).not.toBe(firstSavedTime)
    })
  })
})
