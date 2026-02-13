/* eslint-disable react/prop-types */
/* eslint-disable max-len */
import React from 'react'
import join from 'url-join'
import { render, screen, act, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fetchMock from 'fetch-mock'
import { Router } from 'react-router'
import { createMemoryHistory } from 'history'
import { COMMUNICATION_PURPOSES, COMMUNICATION_RESULTS } from '@ttahub/common'
import UserContext from '../../../../../UserContext'
import AppLoadingContext from '../../../../../AppLoadingContext'
import { NOT_STARTED, COMPLETE } from '../../../../../components/Navigator/constants'
import CommunicationLogForm from '../index'
import { LogProvider } from '../../../../../components/CommunicationLog/components/LogContext'

jest.mock(
  '../../../../../components/RichEditor',
  () =>
    function MockRichEditor({ ariaLabel, value, onChange }) {
      return <textarea aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)} />
    }
)

const RECIPIENT_ID = 1
const REGION_ID = 1
const RECIPIENT_NAME = 'Little Lord Wigglytoes'

const communicationLogUrl = join('/', 'api', 'communication-logs')

describe('CommunicationLogForm', () => {
  const history = createMemoryHistory()

  const renderTest = (communicationLogId = 'new', currentPage = 'log') => {
    render(
      <Router history={history}>
        <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
          <LogProvider regionId={REGION_ID}>
            <UserContext.Provider value={{ user: { id: 1, permissions: [], name: 'Ted User' } }}>
              <CommunicationLogForm
                recipientName={RECIPIENT_NAME}
                match={{
                  params: {
                    currentPage,
                    communicationLogId,
                    recipientId: RECIPIENT_ID,
                    regionId: REGION_ID,
                  },
                  path: currentPage,
                  url: currentPage,
                }}
              />
            </UserContext.Provider>
          </LogProvider>
        </AppLoadingContext.Provider>
      </Router>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    fetchMock.reset()
    const url = `${communicationLogUrl}/region/${REGION_ID}/additional-data`
    fetchMock.get(url, {
      regionalUsers: [{ value: 1, label: 'One' }],
      standardGoals: [{ value: 1, label: 'One' }],
      recipients: [],
      groups: [],
    })
  })

  it('renders training report form', async () => {
    await act(() =>
      waitFor(() => {
        renderTest()
      })
    )

    expect(screen.getByText(/Little Lord Wigglytoes/i)).toBeInTheDocument()
  })

  it('redirects to log', async () => {
    await act(() =>
      waitFor(() => {
        renderTest('new', '')
      })
    )

    expect(history.location.pathname).toEqual(`/recipient-tta-records/${RECIPIENT_ID}/region/${REGION_ID}/communication/new/log`)
  })

  it('fetches additional data', async () => {
    const url = `${communicationLogUrl}/region/${REGION_ID}/additional-data`

    await act(() =>
      waitFor(() => {
        renderTest('new', 'log')
      })
    )

    expect(fetchMock.called(url)).toBe(true)

    expect(screen.getByText(/Little Lord Wigglytoes/i)).toBeInTheDocument()
  })

  it('fetches log by id', async () => {
    const url = `${communicationLogUrl}/region/${REGION_ID}/log/1`
    fetchMock.get(url, {
      id: 0,
      recipientId: '',
      userId: '',
      data: {
        pageState: {
          1: NOT_STARTED,
          2: NOT_STARTED,
          3: NOT_STARTED,
          4: NOT_STARTED,
        },
      },
    })

    await act(() =>
      waitFor(() => {
        renderTest('1', 'log')
      })
    )

    expect(fetchMock.called(url)).toBe(true)

    expect(screen.getByText(/Little Lord Wigglytoes/i)).toBeInTheDocument()
  })

  it('prefills notes when editing an existing log', async () => {
    const url = `${communicationLogUrl}/region/${REGION_ID}/log/1`
    fetchMock.get(url, {
      id: 0,
      recipientId: '',
      userId: '',
      data: {
        notes: '<p>Existing note</p>',
        pageState: {
          1: NOT_STARTED,
          2: NOT_STARTED,
          3: NOT_STARTED,
          4: NOT_STARTED,
        },
      },
      recipients: [],
    })

    await act(() =>
      waitFor(() => {
        renderTest('1', 'log')
      })
    )

    const notesField = await screen.findByLabelText(/notes/i)
    expect(notesField.value).toBe('<p>Existing note</p>')
  })

  it('handlers error fetching log by id', async () => {
    const url = `${communicationLogUrl}/region/${REGION_ID}/log/1`
    fetchMock.get(url, 500)

    await act(() =>
      waitFor(() => {
        renderTest('1', 'log')
      })
    )

    expect(fetchMock.called(url)).toBe(true)

    expect(screen.getByText(/Little Lord Wigglytoes/i)).toBeInTheDocument()
    expect(screen.getByText(/Error fetching communication log/i)).toBeInTheDocument()
  })

  it('Validates required fields', async () => {
    fetchMock.reset()

    await act(() =>
      waitFor(() => {
        renderTest('new', 'log')
      })
    )

    const onSaveButton = screen.getByText(/save and continue/i)
    await act(() =>
      waitFor(() => {
        userEvent.click(onSaveButton)
      })
    )

    expect(fetchMock.called()).toBe(false)

    await Promise.all(
      [/Select a communication method/i, /enter duration/i, /enter valid date/i, /Select a purpose of communication/i].map(async (message) => {
        expect(await screen.findByText(message)).toBeInTheDocument()
      })
    )
  })

  it('allows a page to be completed', async () => {
    await act(() =>
      waitFor(() => {
        renderTest('new', 'log')
      })
    )

    const view = screen.getByTestId('otherStaff-click-container')
    const select = within(view).getByText(/- select -/i)
    userEvent.click(select)
    await act(async () => {
      userEvent.type(select, 'One')
      userEvent.type(select, '{enter}')
    })

    const communicationDate = document.querySelector('#communicationDate')
    userEvent.type(communicationDate, '11/01/2023')

    const duration = await screen.findByLabelText(/duration in hours/i)
    userEvent.type(duration, '1')

    const method = await screen.findByLabelText(/How was the communication conducted/i)
    userEvent.selectOptions(method, 'Phone')

    const purpose = screen.getByLabelText(/purpose of communication/i, { selector: 'select' })
    userEvent.selectOptions(purpose, COMMUNICATION_PURPOSES[0])

    const notes = await screen.findByLabelText(/notes/i)
    userEvent.type(notes, 'This is a note')

    const result = screen.getByLabelText(/result/i, { selector: 'select' })
    userEvent.selectOptions(result, COMMUNICATION_RESULTS[0])

    const url = `${communicationLogUrl}/region/${REGION_ID}/recipient/${RECIPIENT_ID}`
    fetchMock.post(url, {
      id: 0,
      recipientId: '',
      userId: '',
      data: {
        pageState: {
          1: COMPLETE,
          2: NOT_STARTED,
          3: NOT_STARTED,
        },
      },
      updatedAt: new Date(),
    })

    const onSaveButton = screen.getByText(/save and continue/i)
    await act(() =>
      waitFor(() => {
        userEvent.click(onSaveButton)
      })
    )

    await waitFor(() => expect(fetchMock.called(url, { method: 'post' })).toBe(true))
  })

  it('handles an error saving page', async () => {
    await act(() =>
      waitFor(() => {
        renderTest('new', 'log')
      })
    )

    const view = screen.getByTestId('otherStaff-click-container')
    const select = within(view).getByText(/- select -/i)
    userEvent.click(select)
    await act(async () => {
      userEvent.type(select, 'One')
      userEvent.type(select, '{enter}')
    })

    const communicationDate = document.querySelector('#communicationDate')
    userEvent.type(communicationDate, '11/01/2023')

    const duration = await screen.findByLabelText(/duration in hours/i)
    userEvent.type(duration, '1')

    const method = await screen.findByLabelText(/How was the communication conducted/i)
    userEvent.selectOptions(method, 'Phone')

    const purpose = screen.getByLabelText(/purpose of communication/i, { selector: 'select' })
    userEvent.selectOptions(purpose, COMMUNICATION_PURPOSES[0])

    const notes = await screen.findByLabelText(/notes/i)
    userEvent.type(notes, 'This is a note')

    const result = screen.getByLabelText(/result/i, { selector: 'select' })
    userEvent.selectOptions(result, COMMUNICATION_RESULTS[0])

    const url = `${communicationLogUrl}/region/${REGION_ID}/recipient/${RECIPIENT_ID}`
    fetchMock.post(url, 500)

    const onSaveButton = screen.getByText(/save and continue/i)
    await act(() =>
      waitFor(() => {
        userEvent.click(onSaveButton)
      })
    )

    await waitFor(() => expect(fetchMock.called(url, { method: 'post' })).toBe(true))
    await waitFor(() => expect(screen.getByText(/There was an error saving the communication log. Please try again later/i)).toBeInTheDocument())
  })

  it('you can complete support attachment', async () => {
    const formData = {
      id: 1,
      recipientId: RECIPIENT_ID,
      userId: '1',
      updatedAt: new Date(),
      files: [],
      data: {
        communicationDate: '11/01/2023',
        result: 'Next Steps identified',
        method: 'Phone',
        purpose: 'General Check-In',
        duration: '1',
        notes: '<p>This is a note</p>',
        goals: [{ label: 'CQI and Data', value: '1' }],
        otherStaff: [{ label: 'A', value: '1' }],
        specialistNextSteps: [
          {
            note: 'next step 1',
            completeDate: '11/23/2023',
          },
        ],
        recipientNextSteps: [
          {
            note: 'next step 2',
            completeDate: '11/16/2023',
          },
        ],
        pageState: {
          1: COMPLETE,
          2: NOT_STARTED,
          3: NOT_STARTED,
        },
      },
    }

    const url = `${communicationLogUrl}/region/${REGION_ID}/log/1`
    const putUrl = `${communicationLogUrl}/log/1`
    fetchMock.get(url, formData)
    fetchMock.put(putUrl, formData)

    await act(() =>
      waitFor(() => {
        renderTest('1', 'supporting-attachments')
      })
    )

    expect(fetchMock.called(url, { method: 'get' })).toBe(true)
    const onSaveButton = screen.getByText(/save and continue/i)
    await act(() =>
      waitFor(() => {
        userEvent.click(onSaveButton)
      })
    )
    await waitFor(() => expect(fetchMock.called(putUrl, { method: 'put' })).toBe(true))
    expect(history.location.pathname).toEqual(`/recipient-tta-records/${RECIPIENT_ID}/region/${REGION_ID}/communication/1/next-steps`)
  })

  it('can submit the form', async () => {
    const formData = {
      id: 1,
      recipients: [
        {
          id: RECIPIENT_ID,
        },
      ],
      userId: '1',
      updatedAt: new Date(),
      files: [],
      data: {
        communicationDate: '11/01/2023',
        notes: '<p>adsf</p>',
        method: 'Phone',
        result: 'New TTA accepted',
        purpose: "Program Specialist's site visit",
        duration: 1,
        regionId: '1',
        createdAt: '2023-11-15T16:15:55.134Z',
        goals: [{ label: 'CQI and Data', value: '1' }],
        otherStaff: [{ label: 'A', value: '1' }],
        pageState: {
          1: 'Complete',
          2: 'Complete',
          3: 'Complete',
        },
        pocComplete: false,
        recipientNextSteps: [
          {
            note: 'asdf',
            completeDate: '11/01/2023',
          },
        ],
        specialistNextSteps: [
          {
            note: 'asf',
            completeDate: '11/01/2023',
          },
        ],
        'pageVisited-supporting-attachments': 'true',
      },
    }

    const url = `${communicationLogUrl}/region/${REGION_ID}/log/1`
    const putUrl = `${communicationLogUrl}/log/1`
    fetchMock.get(url, formData)
    fetchMock.put(putUrl, formData)

    await act(() =>
      waitFor(() => {
        renderTest('1', 'next-steps')
      })
    )

    expect(fetchMock.called(url, { method: 'get' })).toBe(true)
    const submit = screen.getByText(/save log/i)
    await act(() =>
      waitFor(() => {
        userEvent.click(submit)
      })
    )
    expect(fetchMock.called(putUrl, { method: 'put' })).toBe(true)
    expect(history.location.pathname).toEqual(`/recipient-tta-records/${RECIPIENT_ID}/region/${REGION_ID}/communication`)
  })

  it('handles error submitting the form', async () => {
    const formData = {
      id: 1,
      recipients: [
        {
          id: RECIPIENT_ID,
        },
      ],
      userId: '1',
      updatedAt: new Date(),
      files: [],
      data: {
        communicationDate: '11/01/2023',
        notes: '<p>adsf</p>',
        method: 'Phone',
        result: 'New TTA accepted',
        purpose: "Program Specialist's site visit",
        duration: 1,
        regionId: '1',
        createdAt: '2023-11-15T16:15:55.134Z',
        goals: [{ label: 'CQI and Data', value: '1' }],
        otherStaff: [{ label: 'A', value: '1' }],
        pageState: {
          1: 'Complete',
          2: 'Complete',
          3: 'Complete',
        },
        pocComplete: false,
        recipientNextSteps: [
          {
            note: 'asdf',
            completeDate: '11/01/2023',
          },
        ],
        specialistNextSteps: [
          {
            note: 'asf',
            completeDate: '11/01/2023',
          },
        ],
        'pageVisited-supporting-attachments': 'true',
      },
    }

    const url = `${communicationLogUrl}/region/${REGION_ID}/log/1`
    const putUrl = `${communicationLogUrl}/log/1`
    fetchMock.get(url, formData)
    fetchMock.put(putUrl, 500)

    await act(() =>
      waitFor(() => {
        renderTest('1', 'next-steps')
      })
    )

    expect(fetchMock.called(url, { method: 'get' })).toBe(true)
    const submit = screen.getByText(/save log/i)
    await act(() =>
      waitFor(() => {
        userEvent.click(submit)
      })
    )
    expect(fetchMock.called(putUrl, { method: 'put' })).toBe(true)
    await waitFor(() => expect(screen.getByText(/There was an error saving the communication log. Please try again later/i)).toBeInTheDocument())
  })

  it('can go back', async () => {
    const formData = {
      id: 1,
      recipientId: RECIPIENT_ID,
      userId: '1',
      updatedAt: new Date(),
      files: [],
      data: {
        communicationDate: '11/01/2023',
        notes: '<p>adsf</p>',
        method: 'Phone',
        result: 'New TTA accepted',
        purpose: "Program Specialist's site visit",
        duration: 1,
        regionId: '1',
        createdAt: '2023-11-15T16:15:55.134Z',
        goals: [{ label: 'CQI and Data', value: '1' }],
        otherStaff: [{ label: 'A', value: '1' }],
        pageState: {
          1: 'Complete',
          2: 'Complete',
          3: 'Complete',
        },
        pocComplete: false,
        recipientNextSteps: [
          {
            note: 'asdf',
            completeDate: '11/01/2023',
          },
        ],
        specialistNextSteps: [
          {
            note: 'asf',
            completeDate: '11/01/2023',
          },
        ],
        'pageVisited-supporting-attachments': 'true',
      },
    }

    const url = `${communicationLogUrl}/region/${REGION_ID}/log/1`
    const putUrl = `${communicationLogUrl}/log/1`
    fetchMock.get(url, formData)
    fetchMock.put(putUrl, formData)

    await act(() =>
      waitFor(() => {
        renderTest('1', 'next-steps')
      })
    )

    expect(fetchMock.called(url, { method: 'get' })).toBe(true)
    const back = await screen.findByRole('button', { name: /back/i })
    await act(() =>
      waitFor(() => {
        userEvent.click(back)
      })
    )
    expect(fetchMock.called(putUrl, { method: 'put' })).toBe(true)
    expect(history.location.pathname).toEqual(`/recipient-tta-records/${RECIPIENT_ID}/region/${REGION_ID}/communication/1/supporting-attachments`)
  })
})
