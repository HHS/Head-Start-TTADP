/* eslint-disable react/prop-types */
import '@testing-library/jest-dom'
import React from 'react'
import join from 'url-join'
import { render, screen, waitFor, act } from '@testing-library/react'
import { Router } from 'react-router-dom'
import { createMemoryHistory } from 'history'
import fetchMock from 'fetch-mock'
import userEvent from '@testing-library/user-event'
import UpdateStandardGoal from '../UpdateStandardGoal'
import AppLoadingContext from '../../../AppLoadingContext'

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: () => ({
    regionId: '1',
    goalTemplateId: '1',
    grantId: '1',
  }),
}))

const mockRecipient = {
  id: 1,
  name: 'Test Recipient',
  grants: [
    {
      id: 1,
      numberWithProgramTypes: 'Grant-123',
      status: 'Active',
    },
  ],
}

const mockGoal = {
  id: 1,
  name: 'Test Goal',
  objectives: [
    { id: 1, title: 'Objective 1', onAR: false },
    { id: 2, title: 'Objective 2', onAR: true },
  ],
  responses: [
    {
      response: ['Root Cause 1', 'Root Cause 2'],
    },
  ],
  grant: {
    numberWithProgramTypes: 'Grant-123',
  },
}

describe('UpdateStandardGoal', () => {
  const RenderTest = () => {
    const history = createMemoryHistory()
    const setIsAppLoading = jest.fn()

    return {
      history,
      setIsAppLoading,
      ...render(
        <Router history={history}>
          <AppLoadingContext.Provider value={{ setIsAppLoading }}>
            <UpdateStandardGoal recipient={mockRecipient} />
          </AppLoadingContext.Provider>
        </Router>
      ),
    }
  }
  const goalTemplatesUrl = join('/', 'api', 'goal-templates')
  beforeEach(() => {
    fetchMock.get(join(goalTemplatesUrl, '1', 'prompts'), [[], []])
    fetchMock.get('/api/goal-templates/standard/1/grant/1', mockGoal)
  })

  afterEach(() => {
    fetchMock.restore()
  })

  it('renders the goal form with existing goal data', async () => {
    RenderTest()

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1')).toBe(true)
    })

    expect(await screen.findByRole('button', { name: /Save/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Cancel/i })).toBeInTheDocument()
    expect(screen.getByText('Test Goal')).toBeInTheDocument()
    expect(screen.getByText('Grant-123')).toBeInTheDocument()
  })

  it('redirects to error page when goal is not found', async () => {
    fetchMock.reset()
    fetchMock.get(join(goalTemplatesUrl, '1', 'prompts'), [[], []])
    fetchMock.get('/api/goal-templates/standard/1/grant/1', 404)
    const { history } = RenderTest()

    await waitFor(() => {
      expect(history.location.pathname).toBe('/something-went-wrong/404')
    })
  })

  it('successfully updates an existing goal', async () => {
    fetchMock.put('/api/goal-templates/standard/1/grant/1', { everything: 'ok' })
    const { history } = RenderTest()

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1')).toBe(true)
    })

    const submitButton = await screen.findByRole('button', { name: /Save/i })
    await act(async () => {
      userEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1', { method: 'PUT' })).toBe(true)
      expect(history.location.pathname).toBe('/recipient-tta-records/1/region/1/rttapa')
    })
  })

  it('handles API error during goal update', async () => {
    fetchMock.put('/api/goal-templates/standard/1/grant/1', 500)
    const { setIsAppLoading } = RenderTest()

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1')).toBe(true)
    })

    const submitButton = await screen.findByRole('button', { name: /Save/i })
    await act(async () => {
      userEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1', { method: 'PUT' })).toBe(true)
      expect(setIsAppLoading).toHaveBeenCalledWith(false)
    })
  })

  it('navigates to recipient TTA page on cancel', async () => {
    const { history } = RenderTest()

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1')).toBe(true)
    })

    const cancelButton = await screen.findByRole('link', { name: /Cancel/i })
    userEvent.click(cancelButton)

    expect(history.location.pathname).toMatch(/\/recipient-tta-records\/1\/region\/1\/rttapa/)
  })
})
