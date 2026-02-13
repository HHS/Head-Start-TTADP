import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { SCOPE_IDS } from '@ttahub/common'
import { MemoryRouter } from 'react-router'
import fetchMock from 'fetch-mock'
import join from 'url-join'
import TrainingReportAlerts from '../TrainingReportAlerts'
import UserContext from '../../UserContext'

describe('TrainingReportAlerts', () => {
  const eventsUrl = join('/', 'api', 'events', 'alerts')
  const DEFAULT_USER = {
    id: 1,
    permissions: [
      {
        regionId: 1,
        userId: 1,
        scopeId: SCOPE_IDS.READ_WRITE_TRAINING_REPORTS,
      },
    ],
  }

  const renderComponent = (alerts = [], customUser = DEFAULT_USER) => {
    fetchMock.get(eventsUrl, alerts)

    act(() => {
      render(
        <MemoryRouter>
          <UserContext.Provider value={{ user: customUser }}>
            <TrainingReportAlerts />
          </UserContext.Provider>
        </MemoryRouter>
      )
    })
  }

  afterEach(() => {
    fetchMock.restore()
  })

  it('does not fetch if the user lacks permissions', async () => {
    const user = {
      id: 1,
      permissions: [
        {
          regionId: 1,
          userId: 1,
          scopeId: SCOPE_IDS.READ_REPORTS,
        },
      ],
    }

    act(() => {
      renderComponent([], user)
    })

    expect(fetchMock.called(eventsUrl)).toBe(false)
  })

  it('shows null when user has no alerts state', () => {
    const { container } = render(
      <MemoryRouter>
        <UserContext.Provider value={{ user: null }}>
          <TrainingReportAlerts />
        </UserContext.Provider>
      </MemoryRouter>
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows empty state when no alerts', async () => {
    renderComponent([])

    await waitFor(() => {
      expect(screen.getByText('You have no events or sessions that require action')).toBeInTheDocument()
    })
  })

  it('renders table headers correctly with basic alerts', async () => {
    const alerts = [
      {
        id: 1,
        eventId: 'R01-PD-12345',
        eventName: 'Test Event',
        sessionName: '--',
        alertType: 'missingEventInfo',
        collaboratorNames: [],
        submitterId: 1,
      },
    ]

    renderComponent(alerts)

    await waitFor(() => {
      expect(screen.getByText('Event ID')).toBeInTheDocument()
      expect(screen.getByText('Event Name')).toBeInTheDocument()
      expect(screen.getByText('Session Name')).toBeInTheDocument()
      expect(screen.getByText('Action needed')).toBeInTheDocument()
    })
  })

  it('shows Collaborators column only when alerts have collaborators', async () => {
    const alerts = [
      {
        id: 1,
        eventId: 'R01-PD-12345',
        eventName: 'Test Event',
        sessionName: '--',
        alertType: 'missingEventInfo',
        collaboratorNames: ['John Doe', 'Jane Smith'],
        submitterId: 1,
      },
    ]

    renderComponent(alerts)

    await waitFor(() => {
      expect(screen.getByText('Collaborators')).toBeInTheDocument()
      expect(screen.getByText('John Doe, Jane Smith')).toBeInTheDocument()
    })
  })

  it('hides Collaborators column when no alerts have collaborators', async () => {
    const alerts = [
      {
        id: 1,
        eventId: 'R01-PD-12345',
        eventName: 'Test Event',
        sessionName: '--',
        alertType: 'noSessionsCreated',
        collaboratorNames: [],
        submitterId: 1,
      },
    ]

    renderComponent(alerts)

    await waitFor(() => {
      expect(screen.queryByText('Collaborators')).not.toBeInTheDocument()
    })
  })

  it('shows Approver column only when alerts have approvers', async () => {
    const alerts = [
      {
        id: 1,
        eventId: 'R01-PD-12345',
        eventName: 'Test Event',
        sessionName: 'Session 1',
        alertType: 'waitingForApproval',
        approverName: 'Approver User',
        collaboratorNames: [],
        submitterId: 1,
        approverId: 2,
      },
    ]

    renderComponent(alerts)

    await waitFor(() => {
      expect(screen.getByText('Approver')).toBeInTheDocument()
      expect(screen.getByText('Approver User')).toBeInTheDocument()
    })
  })

  it('hides Approver column when no alerts have approvers', async () => {
    const alerts = [
      {
        id: 1,
        eventId: 'R01-PD-12345',
        eventName: 'Test Event',
        sessionName: '--',
        alertType: 'noSessionsCreated',
        collaboratorNames: [],
        submitterId: 1,
      },
    ]

    renderComponent(alerts)

    await waitFor(() => {
      expect(screen.queryByText('Approver')).not.toBeInTheDocument()
    })
  })

  it('renders Create a session action link', async () => {
    const alerts = [
      {
        id: 1,
        eventId: 'R01-PD-12345',
        eventName: 'Test Event',
        sessionName: '--',
        alertType: 'noSessionsCreated',
        collaboratorNames: [],
        submitterId: 1,
      },
    ]

    renderComponent(alerts)

    await waitFor(() => {
      const link = screen.getByText('Create a session')
      expect(link).toHaveAttribute('href', '/training-report/12345/session/new/')
    })
  })

  it('renders Missing event info action link', async () => {
    const alerts = [
      {
        id: 1,
        eventId: 'R01-PD-67890',
        eventName: 'Test Event',
        sessionName: '--',
        alertType: 'missingEventInfo',
        collaboratorNames: [],
        submitterId: 1,
      },
    ]

    renderComponent(alerts)

    await waitFor(() => {
      const link = screen.getByText('Missing event info')
      expect(link).toHaveAttribute('href', '/training-report/67890/event-summary')
    })
  })

  it('renders Missing session info action link', async () => {
    const alerts = [
      {
        id: 123,
        eventId: 'R01-PD-11111',
        eventName: 'Test Event',
        sessionName: 'Session 1',
        alertType: 'missingSessionInfo',
        collaboratorNames: [],
        submitterId: 1,
      },
    ]

    renderComponent(alerts)

    await waitFor(() => {
      const link = screen.getByText('Missing session info')
      expect(link).toHaveAttribute('href', '/training-report/11111/session/123/session-summary')
    })
  })

  it('renders Event not completed action link', async () => {
    const alerts = [
      {
        id: 1,
        eventId: 'R01-PD-22222',
        eventName: 'Test Event',
        sessionName: '--',
        alertType: 'eventNotCompleted',
        collaboratorNames: [],
        submitterId: 1,
      },
    ]

    renderComponent(alerts)

    await waitFor(() => {
      const link = screen.getByText('Event not completed')
      expect(link).toHaveAttribute('href', '/training-report/view/22222')
    })
  })

  it('renders Waiting for approval action link', async () => {
    const alerts = [
      {
        id: 456,
        eventId: 'R01-PD-33333',
        eventName: 'Test Event',
        sessionName: 'Session 1',
        alertType: 'waitingForApproval',
        approverName: 'Approver User',
        collaboratorNames: [],
        submitterId: 1,
        approverId: 2,
      },
    ]

    renderComponent(alerts)

    await waitFor(() => {
      const link = screen.getByText('Waiting for approval')
      expect(link).toHaveAttribute('href', '/training-report/33333/session/456/review')
    })
  })

  it('renders Changes needed action link', async () => {
    const alerts = [
      {
        id: 789,
        eventId: 'R01-PD-44444',
        eventName: 'Test Event',
        sessionName: 'Session 1',
        alertType: 'changesNeeded',
        collaboratorNames: [],
        submitterId: 1,
        approverId: 2,
      },
    ]

    renderComponent(alerts)

    await waitFor(() => {
      const link = screen.getByText('Changes needed')
      expect(link).toHaveAttribute('href', '/training-report/44444/session/789/review')
    })
  })

  it('handles a weird "alertType" key', async () => {
    const alerts = [
      {
        id: 1,
        eventId: 'R01-PD-12345',
        eventName: 'Test Event',
        sessionName: '--',
        alertType: 'weird',
        collaboratorNames: [],
        submitterId: 1,
      },
    ]

    renderComponent(alerts)

    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument()
      expect(document.querySelector('[data-label="Action needed"]')).toHaveTextContent('')
    })
  })

  it('handles an error fetching alerts', async () => {
    fetchMock.get(eventsUrl, {
      status: 500,
      body: 'Internal server error',
    })

    act(() => {
      render(
        <MemoryRouter>
          <UserContext.Provider value={{ user: DEFAULT_USER }}>
            <TrainingReportAlerts />
          </UserContext.Provider>
        </MemoryRouter>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('You have no events or sessions that require action')).toBeInTheDocument()
    })
  })

  it('displays alert data correctly in table rows', async () => {
    const alerts = [
      {
        id: 1,
        eventId: 'R01-PD-12345',
        eventName: 'Test Event Name',
        sessionName: 'Test Session Name',
        alertType: 'missingEventInfo',
        collaboratorNames: [],
        submitterId: 1,
      },
    ]

    renderComponent(alerts)

    await waitFor(() => {
      expect(screen.getByText('R01-PD-12345')).toBeInTheDocument()
      expect(screen.getByText('Test Event Name')).toBeInTheDocument()
      expect(screen.getByText('Test Session Name')).toBeInTheDocument()
    })
  })

  it('renders multiple alerts correctly', async () => {
    const alerts = [
      {
        id: 1,
        eventId: 'R01-PD-11111',
        eventName: 'Event 1',
        sessionName: '--',
        alertType: 'missingEventInfo',
        collaboratorNames: [],
        submitterId: 1,
      },
      {
        id: 2,
        eventId: 'R01-PD-22222',
        eventName: 'Event 2',
        sessionName: 'Session 2',
        alertType: 'waitingForApproval',
        approverName: 'Approver',
        collaboratorNames: [],
        submitterId: 1,
        approverId: 2,
      },
    ]

    renderComponent(alerts)

    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument()
      expect(screen.getByText('Event 2')).toBeInTheDocument()
      expect(screen.getByText('R01-PD-11111')).toBeInTheDocument()
      expect(screen.getByText('R01-PD-22222')).toBeInTheDocument()
    })
  })

  it('displays multiple collaborators correctly', async () => {
    const alerts = [
      {
        id: 1,
        eventId: 'R01-PD-12345',
        eventName: 'Test Event',
        sessionName: 'Session 1',
        alertType: 'waitingForApproval',
        collaboratorNames: ['Alice', 'Bob', 'Charlie'],
        submitterId: 1,
        approverId: 2,
      },
    ]

    renderComponent(alerts)

    await waitFor(() => {
      expect(screen.getByText('Collaborators')).toBeInTheDocument()
      expect(screen.getByText('Alice, Bob, Charlie')).toBeInTheDocument()
    })
  })

  it('handles empty collaborator names array', async () => {
    const alerts = [
      {
        id: 1,
        eventId: 'R01-PD-12345',
        eventName: 'Test Event',
        sessionName: 'Session 1',
        alertType: 'waitingForApproval',
        collaboratorNames: [],
        submitterId: 1,
        approverId: 2,
      },
    ]

    renderComponent(alerts)

    await waitFor(() => {
      expect(screen.queryByText('Collaborators')).not.toBeInTheDocument()
    })
  })

  it('handles missing approverName gracefully', async () => {
    const alerts = [
      {
        id: 1,
        eventId: 'R01-PD-12345',
        eventName: 'Test Event',
        sessionName: 'Session 1',
        alertType: 'waitingForApproval',
        collaboratorNames: ['Alice'],
        submitterId: 1,
        approverId: 2,
      },
    ]

    renderComponent(alerts)

    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument()
      expect(screen.getByText('--')).toBeInTheDocument()
    })
  })

  it('displays approver name with icon for waitingForApproval', async () => {
    const alerts = [
      {
        id: 1,
        eventId: 'R01-PD-12345',
        eventName: 'Test Event',
        sessionName: 'Session 1',
        alertType: 'waitingForApproval',
        approverName: 'Approver User',
        collaboratorNames: [],
        submitterId: 1,
        approverId: 2,
      },
    ]

    renderComponent(alerts)

    await waitFor(() => {
      expect(screen.getByText('Approver User')).toBeInTheDocument()
      expect(document.querySelector('.fa-clock')).toBeTruthy()
    })
  })

  it('displays approver name with icon for changesNeeded', async () => {
    const alerts = [
      {
        id: 1,
        eventId: 'R01-PD-12345',
        eventName: 'Test Event',
        sessionName: 'Session 1',
        alertType: 'changesNeeded',
        approverName: 'Approver User',
        collaboratorNames: [],
        submitterId: 1,
        approverId: 2,
      },
    ]

    renderComponent(alerts)

    await waitFor(() => {
      expect(screen.getByText('Approver User')).toBeInTheDocument()
      expect(document.querySelector('.fa-circle-exclamation')).toBeTruthy()
    })
  })
})
