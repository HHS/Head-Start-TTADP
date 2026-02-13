import React from 'react'
import join from 'url-join'
import { render, screen, act, waitFor } from '@testing-library/react'
import fetchMock from 'fetch-mock'
import { Router } from 'react-router'
import { createMemoryHistory } from 'history'
import UserContext from '../../../../../UserContext'
import AppLoadingContext from '../../../../../AppLoadingContext'
import { NOT_STARTED, COMPLETE } from '../../../../../components/Navigator/constants'
import ViewCommunicationForm from '../index'

const RECIPIENT_ID = 1
const REGION_ID = 1
const RECIPIENT_NAME = 'Little Lord Wigglytoes'

const communicationLogUrl = join('/', 'api', 'communication-logs')

describe('ViewCommunicationForm', () => {
  const history = createMemoryHistory()

  const renderTest = (communicationLogId = '1') =>
    render(
      <Router history={history}>
        <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
          <UserContext.Provider value={{ user: { id: 1, permissions: [], name: 'Ted User' } }}>
            <ViewCommunicationForm
              recipientName={RECIPIENT_NAME}
              match={{
                params: {
                  communicationLogId,
                  recipientId: RECIPIENT_ID,
                  regionId: REGION_ID,
                },
                path: '',
                url: '',
              }}
            />
          </UserContext.Provider>
        </AppLoadingContext.Provider>
      </Router>
    )

  beforeEach(() => {
    jest.clearAllMocks()
    fetchMock.reset()
  })

  it('should render the view', async () => {
    const formData = {
      id: 1,
      recipients: [
        {
          id: 1,
          name: 'Little Lord Wigglytoes',
        },
      ],
      userId: '1',
      updatedAt: new Date(),
      author: {
        id: 1,
        name: 'Ted User',
      },
      data: {
        communicationDate: '11/01/2023',
        result: 'Next Steps identified',
        method: 'Phone',
        purpose: 'Monitoring',
        duration: '1',
        notes: '<p>This is a note</p>',
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
        otherStaff: [{ label: 'Me', value: 1 }],
        goals: [{ label: 'Goal', value: 1 }],
      },
      files: [
        {
          id: 1,
          originalFileName: 'cat.png',
          url: {
            url: 'https://wikipedia.com/cats',
            error: null,
          },
        },
      ],
    }

    const url = `${communicationLogUrl}/region/${REGION_ID}/log/1`
    fetchMock.get(url, formData)

    await act(() =>
      waitFor(() => {
        renderTest()
      })
    )

    expect(await screen.findByText('Little Lord Wigglytoes')).toBeInTheDocument()
    const edit = await screen.findByRole('link', { name: 'Edit' })
    expect(edit).toBeInTheDocument()
    expect(edit).toHaveAttribute('href', `/recipient-tta-records/${RECIPIENT_ID}/region/${REGION_ID}/communication/1/log`)
  })

  it('should render the view & edit button for regional logs', async () => {
    const formData = {
      id: 1,
      recipients: [
        {
          id: 1,
          name: 'Little Lord Wigglytoes',
        },
        {
          id: 2,
          name: 'Recipient Two',
        },
      ],
      userId: '1',
      updatedAt: new Date(),
      author: {
        id: 1,
        name: 'Ted User',
      },
      data: {
        communicationDate: '11/01/2023',
        result: 'Next Steps identified',
        method: 'Phone',
        purpose: 'Monitoring',
        duration: '1',
        notes: '<p>This is a note</p>',
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
        otherStaff: [{ label: 'Me', value: 1 }],
        goals: [{ label: 'Goal', value: 1 }],
      },
      files: [
        {
          id: 1,
          originalFileName: 'cat.png',
          url: {
            url: 'https://wikipedia.com/cats',
            error: null,
          },
        },
      ],
    }

    const url = `${communicationLogUrl}/region/${REGION_ID}/log/1`
    fetchMock.get(url, formData)

    await act(() =>
      waitFor(() => {
        renderTest()
      })
    )

    expect(await screen.findByText('Little Lord Wigglytoes')).toBeInTheDocument()
    const edit = await screen.findByRole('link', { name: 'Edit' })
    expect(edit).toBeInTheDocument()
    expect(edit).toHaveAttribute('href', '/communication-log/region/1/log/1/log')
  })

  it('hides notes section when empty', async () => {
    const formData = {
      id: 1,
      recipients: [
        {
          id: 1,
          name: 'Little Lord Wigglytoes',
        },
      ],
      userId: '1',
      updatedAt: new Date(),
      author: {
        id: 1,
        name: 'Ted User',
      },
      data: {
        communicationDate: '11/01/2023',
        result: 'Next Steps identified',
        method: 'Phone',
        purpose: 'Monitoring',
        duration: '1',
        notes: '',
        specialistNextSteps: [],
        recipientNextSteps: [],
        pageState: {
          1: COMPLETE,
          2: NOT_STARTED,
          3: NOT_STARTED,
        },
        otherStaff: [],
        goals: [],
      },
      files: [],
    }

    const url = `${communicationLogUrl}/region/${REGION_ID}/log/1`
    fetchMock.get(url, formData)

    await act(() =>
      waitFor(() => {
        renderTest()
      })
    )

    expect(await screen.findByText('Little Lord Wigglytoes')).toBeInTheDocument()
    expect(screen.queryByText('Notes')).toBeNull()
  })

  it('shows error message', async () => {
    const url = `${communicationLogUrl}/region/${REGION_ID}/log/1`
    const spy = jest.spyOn(history, 'push')
    fetchMock.get(url, 500)
    await act(async () => {
      renderTest('1')
    })

    expect(spy).toHaveBeenCalledWith('/something-went-wrong/500')
  })

  it('should render the view without edit button', async () => {
    const formData = {
      id: 1,
      recipients: [
        {
          id: 1,
          name: 'Little Lord Wigglytoes',
        },
      ],
      userId: '1',
      updatedAt: new Date(),
      files: [],
      author: {
        id: 2,
        name: 'Tedwina User',
      },
      data: {
        communicationDate: '11/01/2023',
        result: 'Next Steps identified',
        method: 'Phone',
        purpose: 'Monitoring',
        duration: '1',
        notes: '<p>This is a note</p>',
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
        otherStaff: [],
        goals: [],
      },
    }

    const url = `${communicationLogUrl}/region/${REGION_ID}/log/1`
    fetchMock.get(url, formData)

    await act(() =>
      waitFor(() => {
        renderTest()
      })
    )

    expect(await screen.findByText('Little Lord Wigglytoes')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
  })
})
