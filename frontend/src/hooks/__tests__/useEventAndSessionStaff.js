/* eslint-disable max-len */
/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import { renderHook } from '@testing-library/react-hooks'
import { useForm, FormProvider } from 'react-hook-form'
import useEventAndSessionStaff from '../useEventAndSessionStaff'
import { TRAINING_EVENT_ORGANIZER } from '../../Constants'
import useFetch from '../useFetch'

jest.mock('../useFetch')

// Mock data
const mockRegionalTrainers = [
  { id: 1, fullName: 'Regional Trainer 1', nameWithNationalCenters: 'Regional Trainer 1' },
  { id: 2, fullName: 'Regional Trainer 2', nameWithNationalCenters: 'Regional Trainer 2' },
]

// Mock data with roles for AA filtering tests
const mockRegionalTrainersWithRoles = [
  {
    id: 1,
    fullName: 'Regional Trainer 1',
    nameWithNationalCenters: 'Regional Trainer 1',
    roles: [{ name: 'HS' }],
  },
  {
    id: 2,
    fullName: 'Regional Trainer 2',
    nameWithNationalCenters: 'Regional Trainer 2',
    roles: [{ name: 'ECS' }],
  },
  {
    id: 5,
    fullName: 'AA User',
    nameWithNationalCenters: 'AA User',
    roles: [{ name: 'AA' }],
  },
]

const mockNationalCenterTrainers = [
  { id: 3, fullName: 'National Trainer 1', nameWithNationalCenters: 'National Trainer 1' },
  { id: 4, fullName: 'National Trainer 2', nameWithNationalCenters: 'National Trainer 2' },
]

// Wrapper component to provide form context
const createWrapper =
  (facilitation = null) =>
  ({ children }) => {
    const methods = useForm({
      defaultValues: {
        facilitation,
      },
    })
    return <FormProvider {...methods}>{children}</FormProvider>
  }

describe('useEventAndSessionStaff', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default useFetch mock setup
    useFetch.mockReturnValue({
      data: [],
      loading: false,
      error: null,
    })
  })

  describe('Event Organizer Extraction', () => {
    it('extracts eventOrganizer from event.data.eventOrganizer', () => {
      const event = {
        regionId: 1,
        data: {
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
        },
      }

      const wrapper = createWrapper()
      const { result } = renderHook(() => useEventAndSessionStaff(event), { wrapper })

      expect(result.current.trainerOptions).toEqual([])
      expect(result.current.optionsForValue).toEqual([])
    })

    it('falls back to event.eventOrganizer when event.data.eventOrganizer does not exist', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
      }

      const wrapper = createWrapper()
      const { result } = renderHook(() => useEventAndSessionStaff(event), { wrapper })

      expect(result.current.trainerOptions).toEqual([])
      expect(result.current.optionsForValue).toEqual([])
    })

    it('returns empty arrays when eventOrganizer does not exist', () => {
      const event = { regionId: 1 }

      const wrapper = createWrapper()
      const { result } = renderHook(() => useEventAndSessionStaff(event), { wrapper })

      expect(result.current.trainerOptions).toEqual([])
      expect(result.current.optionsForValue).toEqual([])
    })

    it('handles null event', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useEventAndSessionStaff(null), { wrapper })

      expect(result.current.trainerOptions).toEqual([])
      expect(result.current.optionsForValue).toEqual([])
    })

    it('handles undefined event', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useEventAndSessionStaff(undefined), { wrapper })

      expect(result.current.trainerOptions).toEqual([])
      expect(result.current.optionsForValue).toEqual([])
    })

    it('handles event.data being null', () => {
      const event = {
        regionId: 1,
        data: null,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
      }

      const wrapper = createWrapper()
      const { result } = renderHook(() => useEventAndSessionStaff(event), { wrapper })

      expect(result.current.trainerOptions).toEqual([])
      expect(result.current.optionsForValue).toEqual([])
    })
  })

  describe('Trainer Data Fetching', () => {
    it('fetches regional trainers when event.regionId exists', () => {
      const event = {
        regionId: 5,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
      }

      useFetch.mockReturnValue({
        data: mockRegionalTrainers,
        loading: false,
        error: null,
      })

      const wrapper = createWrapper()
      renderHook(() => useEventAndSessionStaff(event), { wrapper })

      expect(useFetch).toHaveBeenCalledWith([], expect.any(Function), [5])
    })

    it('fetches national center trainers when event.regionId exists', () => {
      const event = {
        regionId: 5,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch.mockReturnValue({
        data: mockNationalCenterTrainers,
        loading: false,
        error: null,
      })

      const wrapper = createWrapper('national_center')
      renderHook(() => useEventAndSessionStaff(event), { wrapper })

      expect(useFetch).toHaveBeenCalledWith([], expect.any(Function), [5])
    })

    it('returns empty arrays when event.regionId is null', () => {
      const event = {
        regionId: null,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
      }

      const wrapper = createWrapper()
      const { result } = renderHook(() => useEventAndSessionStaff(event), { wrapper })

      expect(result.current.trainerOptions).toEqual([])
      expect(result.current.optionsForValue).toEqual([])
    })

    it('returns empty arrays when event is null', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useEventAndSessionStaff(null), { wrapper })

      expect(result.current.trainerOptions).toEqual([])
      expect(result.current.optionsForValue).toEqual([])
    })

    it('handles populated trainer arrays', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
      }

      useFetch.mockReturnValue({
        data: mockRegionalTrainers,
        loading: false,
        error: null,
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useEventAndSessionStaff(event), { wrapper })

      expect(result.current.optionsForValue).toEqual(mockRegionalTrainers)
    })

    it('handles empty trainer arrays', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
      }

      useFetch.mockReturnValue({
        data: [],
        loading: false,
        error: null,
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useEventAndSessionStaff(event), { wrapper })

      expect(result.current.optionsForValue).toEqual([])
      expect(result.current.trainerOptions).toEqual([])
    })
  })

  describe('REGIONAL_TTA_NO_NATIONAL_CENTERS', () => {
    it('returns only regional trainers with flat array structure', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
      }

      useFetch.mockReturnValue({
        data: mockRegionalTrainers,
        loading: false,
        error: null,
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useEventAndSessionStaff(event), { wrapper })

      expect(result.current.optionsForValue).toEqual(mockRegionalTrainers)
      expect(result.current.trainerOptions).toEqual(mockRegionalTrainers)
    })

    it('returns empty arrays when regional trainers are empty', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
      }

      useFetch.mockReturnValue({
        data: [],
        loading: false,
        error: null,
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useEventAndSessionStaff(event), { wrapper })

      expect(result.current.optionsForValue).toEqual([])
      expect(result.current.trainerOptions).toEqual([])
    })

    it('ignores facilitation value and uses only regional trainers', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
      }

      useFetch.mockReturnValue({
        data: mockRegionalTrainers,
        loading: false,
        error: null,
      })

      const wrapper = createWrapper('national_center')
      const { result } = renderHook(() => useEventAndSessionStaff(event), { wrapper })

      expect(result.current.trainerOptions).toEqual(mockRegionalTrainers)
    })
  })

  describe('REGIONAL_PD_WITH_NATIONAL_CENTERS - isEvent=true or facilitation=national_center', () => {
    it('returns only national center trainers when isEvent=true and facilitation=national_center', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockNationalCenterTrainers, loading: false, error: null })

      const wrapper = createWrapper('national_center')
      const { result } = renderHook(() => useEventAndSessionStaff(event, true), { wrapper })

      expect(result.current.optionsForValue).toEqual(mockNationalCenterTrainers)
      expect(result.current.trainerOptions).toEqual(mockNationalCenterTrainers)
    })

    it('returns national center trainers when isEvent=true with facilitation=regional_tta_staff', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockNationalCenterTrainers, loading: false, error: null })

      const wrapper = createWrapper('regional_tta_staff')
      const { result } = renderHook(() => useEventAndSessionStaff(event, true), { wrapper })

      // facilitation=regional_tta_staff does not match the isEvent condition, so returns empty
      expect(result.current.optionsForValue).toEqual(mockNationalCenterTrainers)
      expect(result.current.trainerOptions).toEqual(mockNationalCenterTrainers)
    })

    it('returns both trainers when isEvent=true with facilitation=both', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockNationalCenterTrainers, loading: false, error: null })

      const wrapper = createWrapper('both')
      const { result } = renderHook(() => useEventAndSessionStaff(event, true), { wrapper })

      // facilitation=both overwrites the isEvent condition (second if block)
      expect(result.current.optionsForValue).toEqual([
        ...mockNationalCenterTrainers,
        ...mockRegionalTrainers,
      ])
      expect(result.current.trainerOptions).toEqual([
        {
          label: 'National Center trainers',
          options: mockNationalCenterTrainers,
        },
        {
          label: 'Regional trainers',
          options: mockRegionalTrainers,
        },
      ])
    })

    it('returns only national center trainers when isEvent=false and facilitation=national_center', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockNationalCenterTrainers, loading: false, error: null })

      const wrapper = createWrapper('national_center')
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      expect(result.current.optionsForValue).toEqual(mockNationalCenterTrainers)
      expect(result.current.trainerOptions).toEqual(mockNationalCenterTrainers)
    })

    it('returns national center trainers with flat array structure', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockNationalCenterTrainers, loading: false, error: null })

      const wrapper = createWrapper('national_center')
      const { result } = renderHook(() => useEventAndSessionStaff(event), { wrapper })

      expect(Array.isArray(result.current.trainerOptions)).toBe(true)
      expect(result.current.trainerOptions).not.toContainEqual(
        expect.objectContaining({ label: expect.any(String) })
      )
    })
  })

  describe('REGIONAL_PD_WITH_NATIONAL_CENTERS - facilitation=regional_tta_staff', () => {
    it('returns regional trainerswhen facilitation=regional_tta_staff', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockNationalCenterTrainers, loading: false, error: null })

      const wrapper = createWrapper('regional_tta_staff')
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      // regional_tta_staff no longer sets trainers - comment indicates "already set to correct values"
      expect(result.current.optionsForValue).toEqual(mockRegionalTrainers)
      expect(result.current.trainerOptions).toEqual(mockRegionalTrainers)
    })

    it('returns empty arrays in all scenarios for regional_tta_staff with empty trainer data', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: [], loading: false, error: null })
        .mockReturnValueOnce({ data: [], loading: false, error: null })

      const wrapper = createWrapper('regional_tta_staff')
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      expect(result.current.optionsForValue).toEqual([])
      expect(result.current.trainerOptions).toEqual([])
    })
  })

  describe('REGIONAL_PD_WITH_NATIONAL_CENTERS - facilitation=both', () => {
    it('returns both trainers in grouped structure when facilitation=both', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockNationalCenterTrainers, loading: false, error: null })

      const wrapper = createWrapper('both')
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      expect(result.current.optionsForValue).toEqual([
        ...mockNationalCenterTrainers,
        ...mockRegionalTrainers,
      ])

      expect(result.current.trainerOptions).toEqual([
        {
          label: 'National Center trainers',
          options: mockNationalCenterTrainers,
        },
        {
          label: 'Regional trainers',
          options: mockRegionalTrainers,
        },
      ])
    })

    it('handles empty arrays in grouped structure for both', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: [], loading: false, error: null })
        .mockReturnValueOnce({ data: [], loading: false, error: null })

      const wrapper = createWrapper('both')
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      expect(result.current.optionsForValue).toEqual([])
      expect(result.current.trainerOptions).toEqual([
        {
          label: 'National Center trainers',
          options: [],
        },
        {
          label: 'Regional trainers',
          options: [],
        },
      ])
    })
  })

  describe('REGIONAL_PD_WITH_NATIONAL_CENTERS - other facilitation values', () => {
    it('returns empty arrays when facilitation is empty string', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockNationalCenterTrainers, loading: false, error: null })

      const wrapper = createWrapper('')
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      expect(result.current.optionsForValue).toEqual([])
      expect(result.current.trainerOptions).toEqual([])
    })

    it('returns empty arrays when facilitation is null', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockNationalCenterTrainers, loading: false, error: null })

      const wrapper = createWrapper(null)
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      expect(result.current.optionsForValue).toEqual([])
      expect(result.current.trainerOptions).toEqual([])
    })

    it('returns empty arrays when facilitation is undefined', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockNationalCenterTrainers, loading: false, error: null })

      const wrapper = createWrapper(undefined)
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      expect(result.current.optionsForValue).toEqual([])
      expect(result.current.trainerOptions).toEqual([])
    })

    it('returns empty arrays when facilitation is unexpected value', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockNationalCenterTrainers, loading: false, error: null })

      const wrapper = createWrapper('unexpected_value')
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      expect(result.current.optionsForValue).toEqual([])
      expect(result.current.trainerOptions).toEqual([])
    })
  })

  describe('Edge Cases', () => {
    it('handles eventOrganizer as empty string', () => {
      const event = {
        regionId: 1,
        eventOrganizer: '',
      }

      const wrapper = createWrapper('national_center')
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      expect(result.current.optionsForValue).toEqual([])
      expect(result.current.trainerOptions).toEqual([])
    })

    it('handles eventOrganizer as null', () => {
      const event = {
        regionId: 1,
        eventOrganizer: null,
      }

      const wrapper = createWrapper('national_center')
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      expect(result.current.optionsForValue).toEqual([])
      expect(result.current.trainerOptions).toEqual([])
    })

    it('handles eventOrganizer as unexpected value', () => {
      const event = {
        regionId: 1,
        eventOrganizer: 'unexpected_organizer',
      }

      const wrapper = createWrapper('national_center')
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      expect(result.current.optionsForValue).toEqual([])
      expect(result.current.trainerOptions).toEqual([])
    })

    it('handles both trainer arrays empty with REGIONAL_PD_WITH_NATIONAL_CENTERS and regional_tta_staff', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: [], loading: false, error: null })
        .mockReturnValueOnce({ data: [], loading: false, error: null })

      const wrapper = createWrapper('regional_tta_staff')
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      expect(result.current.optionsForValue).toEqual([])
      expect(result.current.trainerOptions).toEqual([])
    })

    it('handles both trainer arrays populated with REGIONAL_PD_WITH_NATIONAL_CENTERS and both facilitation', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockNationalCenterTrainers, loading: false, error: null })

      const wrapper = createWrapper('both')
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      expect(result.current.optionsForValue).toEqual([
        ...mockNationalCenterTrainers,
        ...mockRegionalTrainers,
      ])
      expect(result.current.trainerOptions).toEqual([
        {
          label: 'National Center trainers',
          options: mockNationalCenterTrainers,
        },
        {
          label: 'Regional trainers',
          options: mockRegionalTrainers,
        },
      ])
    })

    it('handles national center trainers empty but regional trainers populated with both facilitation', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: [], loading: false, error: null })

      const wrapper = createWrapper('both')
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      expect(result.current.optionsForValue).toEqual(mockRegionalTrainers)
      expect(result.current.trainerOptions).toEqual([
        {
          label: 'National Center trainers',
          options: [],
        },
        {
          label: 'Regional trainers',
          options: mockRegionalTrainers,
        },
      ])
    })
  })

  describe('Return Value Structure Validation', () => {
    it('validates flat array structure for national_center facilitation', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockNationalCenterTrainers, loading: false, error: null })

      const wrapper = createWrapper('national_center')
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      // Flat array should not have label property
      expect(result.current.trainerOptions).toEqual(mockNationalCenterTrainers)
      expect(result.current.trainerOptions.every((t) => !('label' in t))).toBe(true)
    })

    it('validates empty array structure for regional_tta_staff', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockNationalCenterTrainers, loading: false, error: null })

      const wrapper = createWrapper('regional_tta_staff')
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      // regional_tta_staff returns empty arrays
      expect(result.current.trainerOptions).toEqual(mockRegionalTrainers)
      expect(result.current.optionsForValue).toEqual(mockRegionalTrainers)
    })

    it('validates optionsForValue is always flat array', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockNationalCenterTrainers, loading: false, error: null })

      const wrapper = createWrapper('regional_tta_staff')
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      // optionsForValue should always be flat, never grouped
      expect(Array.isArray(result.current.optionsForValue)).toBe(true)
      expect(result.current.optionsForValue.every((t) => !('label' in t))).toBe(true)
    })

    it('trainerOptions structure varies correctly by scenario', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      // Test flat structure (national_center)
      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockNationalCenterTrainers, loading: false, error: null })

      const wrapper1 = createWrapper('national_center')
      const { result: result1 } = renderHook(() => useEventAndSessionStaff(event, false), {
        wrapper: wrapper1,
      })

      const isFlatArray =
        Array.isArray(result1.current.trainerOptions) &&
        result1.current.trainerOptions.length > 0 &&
        !('label' in result1.current.trainerOptions[0])

      expect(isFlatArray).toBe(true)

      // Test grouped structure (both)
      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockNationalCenterTrainers, loading: false, error: null })

      const wrapper2 = createWrapper('both')
      const { result: result2 } = renderHook(() => useEventAndSessionStaff(event, false), {
        wrapper: wrapper2,
      })

      const isGroupedArray =
        Array.isArray(result2.current.trainerOptions) &&
        result2.current.trainerOptions.length > 0 &&
        'label' in result2.current.trainerOptions[0]

      expect(isGroupedArray).toBe(true)
    })
  })

  describe('Memoization and Re-renders', () => {
    it('returns new reference when eventOrganizer changes', () => {
      const event1 = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
      }

      const event2 = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockNationalCenterTrainers, loading: false, error: null })

      const wrapper = createWrapper('national_center')
      const { result, rerender } = renderHook(({ event }) => useEventAndSessionStaff(event), {
        wrapper,
        initialProps: { event: event1 },
      })

      const firstResult = result.current

      rerender({ event: event2 })

      expect(result.current).not.toBe(firstResult)
    })

    it('returns new reference when regionId changes', () => {
      const event1 = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
      }

      const event2 = {
        regionId: 2,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })

      const wrapper = createWrapper()
      const { result, rerender } = renderHook(({ event }) => useEventAndSessionStaff(event), {
        wrapper,
        initialProps: { event: event1 },
      })

      const firstResult = result.current

      rerender({ event: event2 })

      // regionId change triggers new fetches, so new result
      expect(result.current).not.toBe(firstResult)
    })

    it('returns new reference when trainer data changes', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainers, loading: false, error: null })
        .mockReturnValueOnce({ data: [...mockRegionalTrainers], loading: false, error: null })

      const wrapper = createWrapper()
      const { result, rerender } = renderHook(() => useEventAndSessionStaff(event), { wrapper })

      const firstResult = result.current

      rerender()

      expect(result.current).not.toBe(firstResult)
    })
  })

  describe('AA Role Filtering', () => {
    it('includes AA users when isEvent=true (Event Collaborators)', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
      }

      useFetch.mockReturnValue({
        data: mockRegionalTrainersWithRoles,
        loading: false,
        error: null,
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useEventAndSessionStaff(event, true), { wrapper })

      // AA user should be included for Event Collaborators
      expect(result.current.optionsForValue).toEqual(mockRegionalTrainersWithRoles)
      expect(result.current.trainerOptions).toEqual(mockRegionalTrainersWithRoles)
      expect(result.current.optionsForValue.find((u) => u.id === 5)).toBeDefined()
    })

    it('excludes AA users when isEvent=false (Session Trainers)', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
      }

      useFetch.mockReturnValue({
        data: mockRegionalTrainersWithRoles,
        loading: false,
        error: null,
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      // AA user should NOT be included for Session Trainers
      const expectedTrainers = mockRegionalTrainersWithRoles.filter((u) => u.id !== 5)
      expect(result.current.optionsForValue).toEqual(expectedTrainers)
      expect(result.current.trainerOptions).toEqual(expectedTrainers)
      expect(result.current.optionsForValue.find((u) => u.id === 5)).toBeUndefined()
    })

    it('excludes AA users in regional trainers for REGIONAL_PD_WITH_NATIONAL_CENTERS with facilitation=both', () => {
      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
      }

      useFetch
        .mockReturnValueOnce({ data: mockRegionalTrainersWithRoles, loading: false, error: null })
        .mockReturnValueOnce({ data: mockNationalCenterTrainers, loading: false, error: null })

      const wrapper = createWrapper('both')
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      // AA user should NOT be in the regional trainers group for Session Trainers
      const expectedRegionalTrainers = mockRegionalTrainersWithRoles.filter((u) => u.id !== 5)
      expect(result.current.trainerOptions[1].options).toEqual(expectedRegionalTrainers)
      expect(result.current.optionsForValue.find((u) => u.id === 5)).toBeUndefined()
    })

    it('handles users with no roles property gracefully', () => {
      const trainersWithMissingRoles = [
        { id: 1, fullName: 'Trainer 1' }, // No roles property
        { id: 2, fullName: 'Trainer 2', roles: null }, // Null roles
        { id: 3, fullName: 'Trainer 3', roles: [{ name: 'HS' }] }, // Valid roles
      ]

      const event = {
        regionId: 1,
        eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
      }

      useFetch.mockReturnValue({
        data: trainersWithMissingRoles,
        loading: false,
        error: null,
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useEventAndSessionStaff(event, false), { wrapper })

      // All trainers should be included since none have AA role
      expect(result.current.optionsForValue).toEqual(trainersWithMissingRoles)
    })
  })
})
