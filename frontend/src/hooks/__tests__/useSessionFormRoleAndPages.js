/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import { renderHook } from '@testing-library/react-hooks'
import React from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { SCOPE_IDS } from '@ttahub/common'
import UserContext from '../../UserContext'
import useSessionFormRoleAndPages from '../useSessionFormRoleAndPages'
import { TRAINING_EVENT_ORGANIZER } from '../../Constants'

// Wrapper to provide both UserContext and FormProvider
const createWrapper =
  (user, defaultValues) =>
  ({ children }) => {
    const hookForm = useForm({
      mode: 'onChange',
      defaultValues,
    })

    return (
      <UserContext.Provider value={{ user }}>
        <FormProvider {...hookForm}>{children}</FormProvider>
      </UserContext.Provider>
    )
  }
describe('useSessionFormRoleAndPages', () => {
  const mockUser = {
    id: 1,
    permissions: [],
  }

  describe('isSubmitted tracking', () => {
    it('should track submitted status from formData', () => {
      const defaultValues = {
        submitted: true,
        event: {
          ownerId: 2,
          pocIds: [],
          collaboratorIds: [1],
          data: {
            eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
          },
        },
        facilitation: 'national_center',
      }

      const wrapper = createWrapper(mockUser, defaultValues)

      const { result } = renderHook(
        () => {
          const { watch } = React.useContext(FormProvider) || {}
          const hookForm = { watch: watch || (() => defaultValues) }
          return useSessionFormRoleAndPages(hookForm)
        },
        { wrapper }
      )

      // Hook internally tracks submitted status
      expect(result.current.applicationPages.length).toBeGreaterThan(0)
    })
  })

  describe('applicationPages for collaborators', () => {
    it('shows all pages when collaborator, regional with national centers, no regional facilitation, and submitted', () => {
      const defaultValues = {
        submitted: true,
        event: {
          ownerId: 2,
          pocIds: [],
          collaboratorIds: [1],
          data: {
            eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
          },
        },
        facilitation: 'national_center',
      }

      const wrapper = createWrapper(mockUser, defaultValues)

      const { result } = renderHook(
        () => {
          const hookForm = useForm({ defaultValues })
          hookForm.watch = () => defaultValues
          return useSessionFormRoleAndPages(hookForm)
        },
        { wrapper }
      )

      // Should have all 4 pages + review page = 5 pages
      expect(result.current.applicationPages.length).toBe(5)
      const paths = result.current.applicationPages.map((p) => p.path)
      expect(paths).toEqual(expect.arrayContaining(['session-summary', 'participants', 'supporting-attachments', 'next-steps', 'review']))
    })

    it('shows only sessionSummary when collaborator, regional with national centers, no regional facilitation, and NOT submitted', () => {
      const defaultValues = {
        submitted: false,
        event: {
          ownerId: 2,
          pocIds: [],
          collaboratorIds: [1],
          data: {
            eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
          },
        },
        facilitation: 'national_center',
      }

      const wrapper = createWrapper(mockUser, defaultValues)

      const { result } = renderHook(
        () => {
          const hookForm = useForm({ defaultValues })
          hookForm.watch = () => defaultValues
          return useSessionFormRoleAndPages(hookForm)
        },
        { wrapper }
      )

      // Should have only sessionSummary + review = 2 pages
      expect(result.current.applicationPages.length).toBe(2)
      expect(result.current.applicationPages[0].path).toBe('session-summary')
      expect(result.current.applicationPages[1].path).toBe('review')
    })

    it('shows all pages for admin regardless of submission status', () => {
      const adminUser = {
        id: 1,
        permissions: [{ scopeId: SCOPE_IDS.ADMIN }],
      }

      const defaultValues = {
        submitted: false,
        event: {
          ownerId: 2,
          pocIds: [],
          collaboratorIds: [1],
          data: {
            eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
          },
        },
        facilitation: 'national_center',
      }

      const wrapper = createWrapper(adminUser, defaultValues)

      const { result } = renderHook(
        () => {
          const hookForm = useForm({ defaultValues })
          hookForm.watch = () => defaultValues
          return useSessionFormRoleAndPages(hookForm)
        },
        { wrapper }
      )

      // Admin should see all pages regardless of submitted status
      expect(result.current.applicationPages.length).toBe(5)
    })

    it('shows all pages for POC when facilitation includes region', () => {
      const defaultValues = {
        submitted: false,
        event: {
          ownerId: 2,
          pocIds: [1],
          collaboratorIds: [],
          data: {
            eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
          },
        },
        facilitation: 'regional_tta_staff',
      }

      const wrapper = createWrapper(mockUser, defaultValues)

      const { result } = renderHook(
        () => {
          const hookForm = useForm({ defaultValues })
          hookForm.watch = () => defaultValues
          return useSessionFormRoleAndPages(hookForm)
        },
        { wrapper }
      )

      // POC with regional facilitation should see all pages
      expect(result.current.applicationPages.length).toBe(5)
    })

    it('shows limited pages for POC when facilitation does not include region', () => {
      const defaultValues = {
        submitted: false,
        event: {
          ownerId: 2,
          pocIds: [1],
          collaboratorIds: [],
          data: {
            eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
          },
        },
        facilitation: 'national_center',
      }

      const wrapper = createWrapper(mockUser, defaultValues)

      const { result } = renderHook(
        () => {
          const hookForm = useForm({ defaultValues })
          hookForm.watch = () => defaultValues
          return useSessionFormRoleAndPages(hookForm)
        },
        { wrapper }
      )

      // POC without regional facilitation should see limited pages
      // (participants, attachments, next steps, review)
      expect(result.current.applicationPages.length).toBe(4)
      const paths = result.current.applicationPages.map((p) => p.path)
      expect(paths).toEqual(expect.arrayContaining(['participants', 'supporting-attachments', 'next-steps', 'review']))
    })

    it('returns correct role indicators for collaborator', () => {
      const defaultValues = {
        submitted: false,
        event: {
          ownerId: 2,
          pocIds: [],
          collaboratorIds: [1],
          data: {
            eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
          },
        },
        facilitation: 'both',
      }

      const wrapper = createWrapper(mockUser, defaultValues)

      const { result } = renderHook(
        () => {
          const hookForm = useForm({ defaultValues })
          hookForm.watch = () => defaultValues
          return useSessionFormRoleAndPages(hookForm)
        },
        { wrapper }
      )

      expect(result.current.isCollaborator).toBe(true)
      expect(result.current.isPoc).toBe(false)
      expect(result.current.isOwner).toBe(false)
      expect(result.current.isAdminUser).toBe(false)
    })

    it('returns correct role indicators for POC', () => {
      const defaultValues = {
        submitted: false,
        event: {
          ownerId: 2,
          pocIds: [1],
          collaboratorIds: [],
          data: {
            eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
          },
        },
        facilitation: 'national_center',
      }

      const wrapper = createWrapper(mockUser, defaultValues)

      const { result } = renderHook(
        () => {
          const hookForm = useForm({ defaultValues })
          hookForm.watch = () => defaultValues
          return useSessionFormRoleAndPages(hookForm)
        },
        { wrapper }
      )

      expect(result.current.isPoc).toBe(true)
      expect(result.current.isCollaborator).toBe(false)
      expect(result.current.isOwner).toBe(false)
      expect(result.current.isAdminUser).toBe(false)
    })

    it('returns correct role indicators for owner', () => {
      const defaultValues = {
        submitted: false,
        event: {
          ownerId: 1,
          pocIds: [],
          collaboratorIds: [],
          data: {
            eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
          },
        },
        facilitation: 'both',
      }

      const wrapper = createWrapper(mockUser, defaultValues)

      const { result } = renderHook(
        () => {
          const hookForm = useForm({ defaultValues })
          hookForm.watch = () => defaultValues
          return useSessionFormRoleAndPages(hookForm)
        },
        { wrapper }
      )

      expect(result.current.isOwner).toBe(true)
      expect(result.current.isPoc).toBe(false)
      expect(result.current.isCollaborator).toBe(false)
      expect(result.current.isAdminUser).toBe(false)
    })

    it('shows all pages when owner in Regional TTA No National Centers event', () => {
      const defaultValues = {
        submitted: false,
        event: {
          ownerId: 1,
          pocIds: [],
          collaboratorIds: [],
          data: {
            eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
          },
        },
        facilitation: 'both',
      }

      const wrapper = createWrapper(mockUser, defaultValues)

      const { result } = renderHook(
        () => {
          const hookForm = useForm({ defaultValues })
          hookForm.watch = () => defaultValues
          return useSessionFormRoleAndPages(hookForm)
        },
        { wrapper }
      )

      // Owner should get all 5 pages like collaborator
      expect(result.current.applicationPages.length).toBe(5)
      const paths = result.current.applicationPages.map((p) => p.path)
      expect(paths).toEqual(expect.arrayContaining(['session-summary', 'participants', 'supporting-attachments', 'next-steps', 'review']))
    })

    it('shows only sessionSummary when owner, regional with national centers, no regional facilitation, and NOT submitted', () => {
      const defaultValues = {
        submitted: false,
        event: {
          ownerId: 1,
          pocIds: [],
          collaboratorIds: [],
          data: {
            eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
          },
        },
        facilitation: 'national_center',
      }

      const wrapper = createWrapper(mockUser, defaultValues)

      const { result } = renderHook(
        () => {
          const hookForm = useForm({ defaultValues })
          hookForm.watch = () => defaultValues
          return useSessionFormRoleAndPages(hookForm)
        },
        { wrapper }
      )

      // Owner should have only sessionSummary + review = 2 pages
      expect(result.current.applicationPages.length).toBe(2)
      expect(result.current.applicationPages[0].path).toBe('session-summary')
      expect(result.current.applicationPages[1].path).toBe('review')
    })

    it('shows all pages when owner, regional with national centers, no regional facilitation, and submitted', () => {
      const defaultValues = {
        submitted: true,
        event: {
          ownerId: 1,
          pocIds: [],
          collaboratorIds: [],
          data: {
            eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
          },
        },
        facilitation: 'national_center',
      }

      const wrapper = createWrapper(mockUser, defaultValues)

      const { result } = renderHook(
        () => {
          const hookForm = useForm({ defaultValues })
          hookForm.watch = () => defaultValues
          return useSessionFormRoleAndPages(hookForm)
        },
        { wrapper }
      )

      // Owner should get all 5 pages when submitted
      expect(result.current.applicationPages.length).toBe(5)
      const paths = result.current.applicationPages.map((p) => p.path)
      expect(paths).toEqual(expect.arrayContaining(['session-summary', 'participants', 'supporting-attachments', 'next-steps', 'review']))
    })

    it('returns correct role indicators for approver', () => {
      const defaultValues = {
        submitted: false,
        approverId: 1,
        event: {
          ownerId: 2,
          pocIds: [],
          collaboratorIds: [],
          data: {
            eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
          },
        },
        facilitation: 'both',
      }

      const wrapper = createWrapper(mockUser, defaultValues)

      const { result } = renderHook(
        () => {
          const hookForm = useForm({ defaultValues })
          hookForm.watch = () => defaultValues
          return useSessionFormRoleAndPages(hookForm)
        },
        { wrapper }
      )

      expect(result.current.isApprover).toBe(true)
    })
  })
})
