import '@testing-library/jest-dom'
import React from 'react'
import join from 'url-join'
import { render, screen, waitFor, act } from '@testing-library/react'
import { Router } from 'react-router-dom'
import { createMemoryHistory } from 'history'
import fetchMock from 'fetch-mock'
import userEvent from '@testing-library/user-event'
import { GOAL_STATUS } from '@ttahub/common'
import RestartStandardGoal from '../RestartStandardGoal'
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
    { id: 1, title: 'Objective 1' },
    { id: 2, title: 'Objective 2' },
  ],
  status: GOAL_STATUS.CLOSED,
  grant: {
    numberWithProgramTypes: 'Grant-123',
  },
}

const renderRestartStandardGoal = () => {
  const history = createMemoryHistory()
  const setIsAppLoading = jest.fn()

  return {
    history,
    setIsAppLoading,
    ...render(
      <Router history={history}>
        <AppLoadingContext.Provider value={{ setIsAppLoading }}>
          <RestartStandardGoal recipient={mockRecipient} />
        </AppLoadingContext.Provider>
      </Router>
    ),
  }
}

describe('RestartStandardGoal', () => {
  const goalTemplatesUrl = join('/', 'api', 'goal-templates')
  beforeEach(() => {
    fetchMock.get(join(goalTemplatesUrl, '1', 'prompts'), [[], []])
    fetchMock.get('/api/goal-templates/standard/1/grant/1?status=Closed', mockGoal)
  })

  afterEach(() => {
    fetchMock.restore()
  })

  it('fetches and displays the goal data', async () => {
    renderRestartStandardGoal()

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1?status=Closed')).toBe(true)
    })

    expect(await screen.findByRole('button', { name: /Reopen/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Cancel/i })).toBeInTheDocument()
  })

  it('handles goal not found error', async () => {
    fetchMock.reset()
    fetchMock.get(join(goalTemplatesUrl, '1', 'prompts'), [[], []])
    fetchMock.get('/api/goal-templates/standard/1/grant/1?status=Closed', 404)

    const { history } = renderRestartStandardGoal()

    await waitFor(() => {
      expect(history.location.pathname).toBe('/something-went-wrong/404')
    })
  })

  it('submits the restarted goal successfully', async () => {
    fetchMock.post('/api/goal-templates/standard/1/grant/1', { everything: 'ok' })
    const { history } = renderRestartStandardGoal()

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1?status=Closed')).toBe(true)
    })

    const submitButton = await screen.findByRole('button', { name: /Reopen/i })
    await act(async () => {
      userEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1')).toBe(true)
      expect(history.location.pathname).toBe('/recipient-tta-records/1/region/1/rttapa')
    })
  })

  it('handles submission error', async () => {
    fetchMock.post('/api/goal-templates/standard/1/grant/1', 500)
    renderRestartStandardGoal()

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1?status=Closed')).toBe(true)
    })

    const submitButton = await screen.findByRole('button', { name: /Reopen/i })
    await act(async () => {
      userEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1')).toBe(true)
    })
  })

  it('navigates to the correct page on cancel', async () => {
    const { history } = renderRestartStandardGoal()

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1?status=Closed')).toBe(true)
    })

    const cancelButton = await screen.findByRole('link', { name: /Cancel/i })
    userEvent.click(cancelButton)

    expect(history.location.pathname).toMatch(/\/recipient-tta-records\/1\/region\/1\/rttapa/)
  })
})
