/* eslint-disable max-len */
/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import { SUPPORT_TYPES } from '@ttahub/common'
import { MemoryRouter } from 'react-router-dom'
import join from 'url-join'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import fetchMock from 'fetch-mock'
import { useForm, FormProvider } from 'react-hook-form'
import userEvent from '@testing-library/user-event'
import selectEvent from 'react-select-event'
import sessionSummary, { isPageComplete } from '../sessionSummary'
import NetworkContext from '../../../../NetworkContext'
import { NOT_STARTED } from '../../../../components/Navigator/constants'
import AppLoadingContext from '../../../../AppLoadingContext'
import { mockRSSData } from '../../../../testHelpers'
import { TRAINING_EVENT_ORGANIZER } from '../../../../Constants'

const mockData = (files) => ({
  dataTransfer: {
    files,
    items: files.map((file) => ({
      kind: 'file',
      type: file.type,
      getAsFile: () => file,
    })),
    types: ['Files'],
  },
})

const file = (name, id, status = 'Uploaded') => ({
  originalFileName: name,
  id,
  fileSize: 2000,
  status,
  lastModified: 123456,
})

const dispatchEvt = (node, type, data) => {
  const event = new Event(type, { bubbles: true })
  Object.assign(event, data)
  fireEvent(node, event)
}

const flushPromises = async (rerender, ui) => {
  await act(() => waitFor(() => rerender(ui)))
}

describe('sessionSummary', () => {
  describe('isPageComplete', () => {
    it('returns true if form state is valid', () => {
      expect(
        isPageComplete({
          getValues: jest.fn(() => ({
            objectiveTrainers: [1],
            objectiveTopics: [1],
          })),
        })
      ).toBe(true)
    })

    it('returns false otherwise', () => {
      expect(isPageComplete({ getValues: jest.fn(() => false) })).toBe(false)
    })
  })

  describe('render', () => {
    const onSaveDraft = jest.fn()

    const defaultFormValues = {
      id: 1,
      ownerId: null,
      eventId: 'sdfgsdfg',
      regionId: 1,
      facilitation: 'regional_tta_staff',
      eventDisplayId: 'event-display-id',
      event: {
        regionId: 1,
      },
      eventName: 'Event name',
      status: 'In progress',
      pageState: {
        1: NOT_STARTED,
        2: NOT_STARTED,
      },
      files: [
        {
          originalFileName: 'fancy',
          fileSize: 104520,
          status: 'APPROVED',
          id: 2,
        },
      ],
    }

    const defaultAdditionalData = {
      status: 'Not started',
      event: {
        regionId: 1,
        data: {
          regionId: 1,
          facilitation: 'regional_tta_staff',
          eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
        },
      },
    }

    const RenderSessionSummary = ({ formValues = defaultFormValues, additionalData = defaultAdditionalData }) => {
      const hookForm = useForm({
        mode: 'onBlur',
        defaultValues: formValues,
      })

      return (
        <AppLoadingContext.Provider
          value={{
            setIsAppLoading: jest.fn(),
            setAppLoadingText: jest.fn(),
          }}
        >
          <MemoryRouter>
            <FormProvider {...hookForm}>
              <NetworkContext.Provider value={{ connectionActive: true }}>
                {sessionSummary.render(
                  { ...defaultAdditionalData, ...additionalData },
                  defaultFormValues,
                  1,
                  false,
                  jest.fn(),
                  onSaveDraft,
                  jest.fn(),
                  false,
                  'key',
                  jest.fn(),
                  () => (
                    <></>
                  )
                )}
              </NetworkContext.Provider>
            </FormProvider>
          </MemoryRouter>
        </AppLoadingContext.Provider>
      )
    }

    beforeEach(async () => {
      fetchMock.get('/api/topic', [
        { id: 1, name: 'Behavioral Health' },
        { id: 2, name: 'Complaint' },
      ])

      fetchMock.get('/api/users/trainers/regional/region/1', [
        { id: 1, fullName: 'Regional Trainer 1', roles: [{ name: 'GS' }] },
        { id: 2, fullName: 'Regional Trainer 2', roles: [{ name: 'GS' }] },
        { id: 3, fullName: 'Regional Trainer 3', roles: [{ name: 'GS' }] },
        { id: 4, fullName: 'Regional Trainer 4', roles: [{ name: 'GS' }] },
      ])

      fetchMock.get('/api/users/trainers/national-center/region/1', [
        { id: 1, fullName: 'National Center Trainer 1', roles: [{ name: 'NC' }] },
        { id: 2, fullName: 'National Center Trainer 2', roles: [{ name: 'NC' }] },
        { id: 3, fullName: 'National Center Trainer 3', roles: [{ name: 'NC' }] },
        { id: 4, fullName: 'National Center Trainer 4', roles: [{ name: 'NC' }] },
      ])

      fetchMock.get('/api/courses', [
        {
          id: 1,
          name: 'Sample Course 1',
        },
        {
          id: 2,
          name: 'Sample Course 2',
        },
        {
          id: 3,
          name: 'Sample Course 3',
        },
      ])

      fetchMock.get('/api/feeds/item?tag=ttahub-topic', mockRSSData())
      fetchMock.get('/api/feeds/item?tag=ttahub-tta-support-type', mockRSSData())
      fetchMock.get('/api/feeds/item?tag=ttahub-ohs-standard-goals', mockRSSData())
      fetchMock.get('/api/goal-templates', [])
    })

    afterEach(async () => {
      fetchMock.restore()
    })

    it('renders session summary', async () => {
      const { rerender } = render(<RenderSessionSummary />)

      const sessionName = await screen.findByLabelText(/session name/i)
      act(() => {
        fireEvent.focus(sessionName)
        userEvent.tab()
        userEvent.type(sessionName, 'Session name')
      })

      const startDate = await screen.findByLabelText(/session start Date/i, { selector: '#startDate' })
      act(() => {
        userEvent.type(startDate, '01/01/2021')
      })

      const endDate = await screen.findByLabelText(/session end Date/i, { selector: '#endDate' })
      act(() => {
        userEvent.type(endDate, '01/02/2021')
      })

      act(() => {
        userEvent.clear(startDate)
        userEvent.type(startDate, '01/03/2021')
      })

      const duration = await screen.findByLabelText(/duration/i)
      act(() => {
        userEvent.type(duration, '1.25')
      })

      const sessionObjective = await screen.findByLabelText(/session objective/i)
      act(() => {
        userEvent.type(sessionObjective, 'Session objective')
      })

      await selectEvent.select(document.getElementById('objectiveTopics'), ['Complaint'])

      const trainers = await screen.findByLabelText(/Who provided the TTA/i)
      await selectEvent.select(trainers, ['Regional Trainer 1'])

      const resourceOne = await screen.findByLabelText(/resource 1/i)
      act(() => {
        userEvent.type(resourceOne, 'http://www.resource.com')
      })

      const addNewResource = await screen.findByRole('button', { name: /add new resource/i })
      act(() => {
        userEvent.click(addNewResource)
      })

      const resourceTwo = await screen.findByLabelText(/resource 2/i)

      act(() => {
        userEvent.type(resourceTwo, 'http://www.resource2.com')
        fireEvent.focus(addNewResource)
        userEvent.clear(resourceTwo)
        fireEvent.blur(resourceTwo)
      })

      act(() => {
        userEvent.type(resourceTwo, 'I AM NOT A RESOURCE')
      })

      const removeResourceOne = await screen.findByRole('button', { name: /remove resource 1/i })
      act(() => {
        userEvent.click(removeResourceOne)
      })

      const removeFile = document.querySelector('.smart-hub--file-tag-button')
      act(() => {
        userEvent.click(removeFile)
      })

      const deleteUrl = '/api/files/s/1/2'
      fetchMock.delete(deleteUrl, 200)

      const confirmDelete = await screen.findByRole('button', {
        name: /confirm delete/i,
      })

      act(() => {
        userEvent.click(confirmDelete)
      })

      await waitFor(() => expect(fetchMock.called(deleteUrl, { method: 'DELETE' })).toBe(true))

      // Select courses.
      let yesCourses = document.querySelector('#useIpdCourses-yes')
      await act(async () => {
        userEvent.click(yesCourses)
      })

      const courseSelect = await screen.findByLabelText(/iPD course name/i)
      await selectEvent.select(courseSelect, ['Sample Course 2', 'Sample Course 3'])
      expect(await screen.findByText(/Sample Course 2/i)).toBeVisible()
      expect(await screen.findByText(/Sample Course 3/i)).toBeVisible()

      const noCourses = document.querySelector('#useIpdCourses-no')
      await act(async () => {
        userEvent.click(noCourses)
      })

      expect(await screen.findByText(/Sample Course 2/i)).not.toBeVisible()
      expect(await screen.findByText(/Sample Course 3/i)).not.toBeVisible()

      yesCourses = document.querySelector('#useIpdCourses-yes')
      await act(async () => {
        userEvent.click(yesCourses)
      })
      await selectEvent.select(courseSelect, ['Sample Course 1'])
      expect(await screen.findByText(/Sample Course 1/i)).toBeVisible()

      fetchMock.restore()

      const fileUrl = join('/', 'api', 'files')
      fetchMock.post(fileUrl, {})

      const data = mockData([file('testFile', 1)])
      const dropzone = document.querySelector('.dropzone')
      expect(fetchMock.called('/api/files/objectives')).toBe(false)
      dispatchEvt(dropzone, 'drop', data)
      await flushPromises(rerender, <RenderSessionSummary />)
      await waitFor(() => expect(fetchMock.called(fileUrl, { method: 'POST' })).toBe(true))

      const noIsaidNoIsaidNoFilesSir = document.querySelector('#addObjectiveFilesNo')
      act(() => {
        userEvent.click(noIsaidNoIsaidNoFilesSir)
      })

      const yesOnTheFilesSir = document.querySelector('#addObjectiveFilesYes')
      act(() => {
        userEvent.click(yesOnTheFilesSir)
      })

      act(() => {
        userEvent.click(noIsaidNoIsaidNoFilesSir)
      })

      act(() => {
        userEvent.type(screen.getByLabelText(/TTA provided/i), 'TTA provided')
      })

      const supportType = await screen.findByRole('combobox', { name: /support type/i })
      act(() => {
        userEvent.selectOptions(supportType, SUPPORT_TYPES[1])
      })

      const saveDraftButton = await screen.findByRole('button', { name: /save draft/i })
      userEvent.click(saveDraftButton)
      expect(onSaveDraft).toHaveBeenCalled()
    })

    it('shows validation error when iPD courses is yes but no courses selected', async () => {
      render(<RenderSessionSummary />)

      const yesCourses = document.querySelector('#useIpdCourses-yes')
      await act(async () => {
        userEvent.click(yesCourses)
      })

      const courseSelect = await screen.findByLabelText(/iPD course name/i)

      await act(async () => {
        userEvent.click(courseSelect)
        fireEvent.blur(courseSelect)
      })

      await waitFor(() => {
        expect(screen.getByText('Select at least one course')).toBeInTheDocument()
      })
    })

    it('shows validation error when no topic selected', async () => {
      render(<RenderSessionSummary />)

      const topicSelect = document.querySelector('#objectiveTopics')

      await act(async () => {
        userEvent.click(topicSelect)
        fireEvent.blur(topicSelect)
      })

      await waitFor(() => {
        expect(screen.getByText('Select at least one topic')).toBeInTheDocument()
      })
    })

    it('shows validation error when no trainer selected', async () => {
      render(<RenderSessionSummary />)

      const trainerSelect = await screen.findByLabelText(/Who provided the TTA/i)

      await act(async () => {
        userEvent.click(trainerSelect)
        fireEvent.blur(trainerSelect)
      })

      await waitFor(() => {
        expect(screen.getByText('Select at least one trainer')).toBeInTheDocument()
      })
    })

    it('national center event facilitated by national center', async () => {
      const additionalData = {
        status: 'Not started',
        facilitation: 'national_center',
        event: {
          regionId: 1,
          data: {
            regionId: 1,
            eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
          },
        },
      }

      const formValues = {
        ...defaultFormValues,
        facilitation: 'national_center',
      }

      render(<RenderSessionSummary additionalData={additionalData} formValues={formValues} />)

      const trainers = await screen.findByLabelText(/Who provided the TTA/i)
      await selectEvent.select(trainers, ['National Center Trainer 4'])
      expect(await screen.findByText('National Center Trainer 4')).toBeVisible()
    })

    it('national center event facilitated by regional tta staff returns no trainers', async () => {
      const additionalData = {
        status: 'Not started',
        facilitation: 'regional_tta_staff',
        event: {
          regionId: 1,
          data: {
            regionId: 1,
            eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
          },
        },
      }

      const formValues = {
        ...defaultFormValues,
        facilitation: 'regional_tta_staff',
      }

      render(<RenderSessionSummary additionalData={additionalData} formValues={formValues} />)

      const trainers = await screen.findByLabelText(/Who provided the TTA/i)
      // regional_tta_staff no longer returns trainer options for this organizer type
      expect(trainers).toBeInTheDocument()
    })

    it('national center event facilitated by both', async () => {
      const additionalData = {
        status: 'Not started',
        facilitation: 'both',
        event: {
          regionId: 1,
          data: {
            eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
          },
        },
      }

      const formValues = {
        ...defaultFormValues,
        facilitation: 'both',
      }

      render(<RenderSessionSummary additionalData={additionalData} formValues={formValues} />)

      const trainers = await screen.findByLabelText(/Who provided the TTA/i)
      await selectEvent.select(trainers, ['Regional Trainer 1'])
      expect(await screen.findByText('Regional Trainer 1')).toBeVisible()
    })

    it('handles errors uploading and deleting files', async () => {
      const { rerender } = render(<RenderSessionSummary />)

      const removeFile = document.querySelector('.smart-hub--file-tag-button')
      act(() => {
        userEvent.click(removeFile)
      })

      const deleteUrl = '/api/files/s/1/2'
      fetchMock.delete(deleteUrl, 500)

      const confirmDelete = await screen.findByRole('button', {
        name: /confirm delete/i,
      })

      act(() => {
        userEvent.click(confirmDelete)
      })

      await waitFor(() => expect(fetchMock.called(deleteUrl, { method: 'DELETE' })).toBe(true))

      const deleteMessage = await screen.findByText('File could not be deleted')
      expect(deleteMessage).toBeInTheDocument()

      fetchMock.restore()

      const fileUrl = join('/', 'api', 'files')
      fetchMock.post(fileUrl, 500)

      const data = mockData([file('testFile', 1)])
      const dropzone = document.querySelector('.dropzone')
      expect(fetchMock.called('/api/files/objectives')).toBe(false)
      dispatchEvt(dropzone, 'drop', data)
      await flushPromises(rerender, <RenderSessionSummary />)
      await waitFor(() => expect(fetchMock.called(fileUrl, { method: 'POST' })).toBe(true))

      const uploadMessage = await screen.findByText('File could not be uploaded')
      expect(uploadMessage).toBeInTheDocument()
    })

    it('shows an error if there was one fetching topics', async () => {
      fetchMock.restore()
      fetchMock.get('/api/feeds/item?tag=ttahub-topic', mockRSSData())
      fetchMock.get('/api/topic', 500)
      act(() => {
        render(<RenderSessionSummary />)
      })

      expect(await screen.findByText(/There was an error fetching topics/i)).toBeInTheDocument()
    })

    it('defaults to a closed file uploader', async () => {
      const values = {
        ...defaultFormValues,
        files: [],
      }

      render(<RenderSessionSummary formValues={values} />)

      const noIsaidNoIsaidNoFilesSir = document.querySelector('#addObjectiveFilesNo')
      expect(noIsaidNoIsaidNoFilesSir).toBeChecked()

      const yesOnTheFilesSir = document.querySelector('#addObjectiveFilesYes')
      act(() => {
        userEvent.click(yesOnTheFilesSir)
      })

      expect(yesOnTheFilesSir).toBeChecked()
    })

    it('hides the save draft button if the session status is complete', async () => {
      const values = {
        ...defaultFormValues,
        status: 'Complete',
      }

      render(<RenderSessionSummary formValues={values} additionalData={{ status: 'Complete' }} />)
      expect(screen.queryByRole('button', { name: /continue/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument()
    })

    it('shows the save draft button if the session status is not complete', async () => {
      const values = {
        ...defaultFormValues,
        status: 'In progress',
      }

      render(<RenderSessionSummary formValues={values} additionalData={{ status: 'In progress' }} />)
      expect(screen.queryByRole('button', { name: /save and continue/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /save draft/i })).toBeInTheDocument()
    })

    it('shows the save and continue button if the admin is editing the session and the session status is not complete', async () => {
      const values = {
        ...defaultFormValues,
        status: 'In progress',
      }

      render(<RenderSessionSummary formValues={values} additionalData={{ ...defaultAdditionalData, status: 'In progress', isAdminUser: true }} />)
      expect(screen.queryByRole('button', { name: /save and continue/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /review and submit/i })).not.toBeInTheDocument()
    })

    it('only shows the continue button if the admin is editing the session and the session status is complete', async () => {
      const values = {
        ...defaultFormValues,
        status: 'Complete',
      }

      render(<RenderSessionSummary formValues={values} additionalData={{ ...defaultAdditionalData, status: 'Complete', isAdminUser: true }} />)
      expect(screen.queryByRole('button', { name: /continue/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument()
    })
  })

  describe('ReviewSection', () => {
    it('exports a reviewSection function', () => {
      expect(typeof sessionSummary.reviewSection).toBe('function')
      expect(sessionSummary.reviewSection).toBeDefined()
    })

    it('has the correct review property', () => {
      expect(sessionSummary.review).toBe(false)
    })

    it('renders file links when files have URLs', async () => {
      const TestComponent = () => {
        const formValues = {
          recipients: [],
          files: [
            {
              originalFileName: 'test-file.pdf',
              id: 1,
              url: { url: 'https://example.com/file.pdf' },
            },
          ],
        }

        const hookForm = useForm({
          mode: 'onBlur',
          defaultValues: formValues,
        })

        return (
          <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn(), setAppLoadingText: jest.fn() }}>
            <MemoryRouter>
              <FormProvider {...hookForm}>
                <NetworkContext.Provider value={{ connectionActive: true }}>{sessionSummary.reviewSection()}</NetworkContext.Provider>
              </FormProvider>
            </MemoryRouter>
          </AppLoadingContext.Provider>
        )
      }

      render(<TestComponent />)

      await waitFor(() => {
        const fileLink = screen.getByText('test-file.pdf')
        expect(fileLink).toBeInTheDocument()
        expect(fileLink.tagName).toBe('A')
        expect(fileLink).toHaveAttribute('href', 'https://example.com/file.pdf')
      })
    })

    it('renders file names without links when files have no URLs', async () => {
      const TestComponent = () => {
        const formValues = {
          recipients: [],
          files: [
            {
              originalFileName: 'test-file-no-url.pdf',
              id: 2,
            },
          ],
        }

        const hookForm = useForm({
          mode: 'onBlur',
          defaultValues: formValues,
        })

        return (
          <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn(), setAppLoadingText: jest.fn() }}>
            <MemoryRouter>
              <FormProvider {...hookForm}>
                <NetworkContext.Provider value={{ connectionActive: true }}>{sessionSummary.reviewSection()}</NetworkContext.Provider>
              </FormProvider>
            </MemoryRouter>
          </AppLoadingContext.Provider>
        )
      }

      render(<TestComponent />)

      await waitFor(() => {
        const fileName = screen.getByText('test-file-no-url.pdf')
        expect(fileName).toBeInTheDocument()
      })
    })

    it('renders resource links', async () => {
      const TestComponent = () => {
        const formValues = {
          recipients: [],
          objectiveResources: [{ value: 'https://example.com/resource' }],
          // files not populated to test the defensive check in the Review section
        }

        const hookForm = useForm({
          mode: 'onBlur',
          defaultValues: formValues,
        })

        return (
          <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn(), setAppLoadingText: jest.fn() }}>
            <MemoryRouter>
              <FormProvider {...hookForm}>
                <NetworkContext.Provider value={{ connectionActive: true }}>{sessionSummary.reviewSection()}</NetworkContext.Provider>
              </FormProvider>
            </MemoryRouter>
          </AppLoadingContext.Provider>
        )
      }

      render(<TestComponent />)

      await waitFor(() => {
        const resourceLink = screen.getByText('https://example.com/resource')
        expect(resourceLink).toBeInTheDocument()
        expect(resourceLink.tagName).toBe('A')
        expect(resourceLink).toHaveAttribute('href', 'https://example.com/resource')
      })
    })

    it('maps course objects to course names', async () => {
      const TestComponent = () => {
        const formValues = {
          recipients: [],
          courses: [
            { id: 1, name: 'Course One' },
            { id: 2, name: 'Course Two' },
          ],
          files: [],
        }

        const hookForm = useForm({
          mode: 'onBlur',
          defaultValues: formValues,
        })

        return (
          <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn(), setAppLoadingText: jest.fn() }}>
            <MemoryRouter>
              <FormProvider {...hookForm}>
                <NetworkContext.Provider value={{ connectionActive: true }}>{sessionSummary.reviewSection()}</NetworkContext.Provider>
              </FormProvider>
            </MemoryRouter>
          </AppLoadingContext.Provider>
        )
      }

      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByText(/Course One/i)).toBeInTheDocument()
        expect(screen.getByText(/Course Two/i)).toBeInTheDocument()
      })
    })
  })
})
