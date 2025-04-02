import React from 'react';
import {
  render,
  screen,
  act,
} from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';
import { SCOPE_IDS } from '@ttahub/common/src/constants';
import fetchMock from 'fetch-mock';
import ViewGoalDetails from '..';
import UserContext from '../../../../../UserContext';
import AppLoadingContext from '../../../../../AppLoadingContext';

const mockGoalHistory = [
  {
    id: 1,
    name: 'Standard Goal Example',
    status: 'In Progress',
    createdAt: '2025-01-01T00:00:00.000Z',
    goalTemplateId: 1,
    grantId: 1,
    goalTemplate: {
      id: 1,
      templateName: 'Improve Child Development',
    },
    grant: {
      id: 1,
      number: '012345 HS',
    },
    objectives: [
      {
        id: 1,
        title: 'Implement new curriculum',
        status: 'In Progress',
      },
    ],
    statusChanges: [
      {
        id: 1,
        goalId: 1,
        userId: 1,
        oldStatus: 'Not Started',
        newStatus: 'In Progress',
        createdAt: '2025-01-02T00:00:00.000Z',
        user: {
          name: 'Test User',
        },
      },
    ],
    responses: [
      {
        id: 1,
        goalId: 1,
        response: ['Root cause 1', 'Root cause 2'],
      },
    ],
  },
  {
    id: 2,
    name: 'Standard Goal Example',
    status: 'Closed',
    createdAt: '2024-12-01T00:00:00.000Z',
    goalTemplateId: 1,
    grantId: 1,
    goalTemplate: {
      id: 1,
      templateName: 'Improve Child Development',
    },
    grant: {
      id: 1,
      number: '012345 HS',
    },
    objectives: [
      {
        id: 2,
        title: 'Implement new curriculum',
        status: 'Completed',
      },
    ],
    statusChanges: [
      {
        id: 2,
        goalId: 2,
        userId: 1,
        oldStatus: 'In Progress',
        newStatus: 'Closed',
        reason: 'Goal completed successfully',
        createdAt: '2024-12-15T00:00:00.000Z',
        user: {
          name: 'Test User',
        },
      },
    ],
    responses: [
      {
        id: 2,
        goalId: 2,
        response: ['Root cause 1', 'Root cause 2'],
      },
    ],
  },
];

describe('ViewGoalDetails', () => {
  const recipient = {
    id: 1,
    name: 'John Doe',
    grants: [
      {
        id: 1,
        numberWithProgramTypes: 'Grant 1',
      },
    ],
  };
  const regionId = '1';

  const DEFAULT_USER = {
    id: 1,
    permissions: [{
      regionId: 1,
      scopeId: SCOPE_IDS.READ_REPORTS,
    }],
  };

  const renderViewGoalDetails = (user = DEFAULT_USER, search = '?goalId=1') => render(
    <UserContext.Provider value={{ user }}>
      <AppLoadingContext.Provider value={{
        setIsAppLoading: jest.fn(),
        setAppLoadingText: jest.fn(),
      }}
      >
        <MemoryRouter initialEntries={[`/recipient-tta-records/1/region/1/goals/standard${search}`]}>
          <Route path="/recipient-tta-records/:recipientId/region/:regionId/goals/standard">
            <ViewGoalDetails recipient={recipient} regionId={regionId} />
          </Route>
        </MemoryRouter>
      </AppLoadingContext.Provider>
    </UserContext.Provider>,
  );

  afterEach(() => fetchMock.restore());

  test('renders the page heading with recipient name and region id', async () => {
    fetchMock.get('/api/goals/1/history', mockGoalHistory);

    await act(async () => {
      renderViewGoalDetails();
    });

    expect(fetchMock.called()).toBe(true);
    const heading = document.querySelector('h1.page-heading');
    expect(heading.textContent).toBe('TTA Goals for John Doe - Region 1');
  });

  test('renders the goal template name', async () => {
    fetchMock.get('/api/goals/1/history', mockGoalHistory);

    await act(async () => {
      renderViewGoalDetails();
    });

    expect(screen.getAllByText(/Standard Goal Example|Improve Child Development/i).length).toBeGreaterThan(0);
  });

  test('renders the accordion with goal history', async () => {
    fetchMock.get('/api/goals/1/history', mockGoalHistory);

    await act(async () => {
      renderViewGoalDetails();
    });

    expect(screen.getAllByText(/In Progress/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Closed/i).length).toBeGreaterThan(0);
  });

  test('handles missing query parameters', async () => {
    await act(async () => {
      renderViewGoalDetails(DEFAULT_USER, '');
    });

    expect(await screen.findByText('Missing required parameters')).toBeInTheDocument();
  });

  test('handles server error', async () => {
    fetchMock.get('/api/goals/1/history', 500);

    await act(async () => {
      renderViewGoalDetails();
    });

    expect(fetchMock.called()).toBe(true);
    expect(await screen.findByText('There was an error fetching goal history')).toBeInTheDocument();
  });

  test('handles no goals found', async () => {
    fetchMock.get('/api/goals/1/history', []);

    await act(async () => {
      renderViewGoalDetails();
    });

    expect(fetchMock.called()).toBe(true);
    expect(await screen.findByText('No goal history found')).toBeInTheDocument();
  });

  test('handles permissions mismatch', async () => {
    await act(async () => {
      renderViewGoalDetails({ id: 1, permissions: [] });
    });

    expect(await screen.findByText(/You don't have permission to view this page/i)).toBeInTheDocument();
  });

  test('renders the back to RTTAPA link', async () => {
    fetchMock.get('/api/goals/1/history', mockGoalHistory);

    await act(async () => {
      renderViewGoalDetails();
    });

    const link = await screen.findByRole('link', { name: /Back to RTTAPA/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/recipient-tta-records/1/region/1/rttapa/');
  });

  test('renders goal status updates', async () => {
    fetchMock.get('/api/goals/1/history', mockGoalHistory);

    await act(async () => {
      renderViewGoalDetails();
    });

    expect(screen.getAllByText(/Not Started.*In Progress/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Goal updates').length).toBeGreaterThan(0);
  });

  test('renders objective information', async () => {
    fetchMock.get('/api/goals/1/history', mockGoalHistory);

    await act(async () => {
      renderViewGoalDetails();
    });

    expect(screen.getAllByText('Implement new curriculum').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Objective summary').length).toBeGreaterThan(0);
  });

  test('renders root causes', async () => {
    fetchMock.get('/api/goals/1/history', mockGoalHistory);

    await act(async () => {
      renderViewGoalDetails();
    });

    expect(screen.getAllByText('Root causes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Root cause 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Root cause 2').length).toBeGreaterThan(0);
  });
});
