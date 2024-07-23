import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SCOPE_IDS } from '@ttahub/common/src/constants';
import fetchMock from 'fetch-mock';
import ViewGoals from '..';
import UserContext from '../../../../../UserContext';
import AppLoadingContext from '../../../../../AppLoadingContext';

const basicGoalResponse = [{
  name: 'A goal',
  endDate: '1/1/1915',
  status: 'Draft',
  grants: [{
    recipient: {
      name: 'Recipient 1',
    },
    numberWithProgramTypes: '012345 HS',
  }],
  objectives: [{
    courses: [{
      name: 'Example course',
    }],
    topics: [{
      name: 'Example topic',
    }],
    resources: [{
      title: 'Example resource',
      url: 'http://exampleresource.com',
    }, {
      title: '',
      url: 'http://exampleresouce2.com',
    }],
    id: 1,
    title: 'objective title',
    files: [
      {
        originalFileName: 'Example resource.txt',
        url: {
          url: 'http://examplefile1.com',
        },
      },
    ],
  }],
  id: 'new',
  onApprovedAR: false,
  onAR: false,
  prompts: {},
  isCurated: false,
  source: {
    grant1: ['special source'],
  },
  createdVia: 'rtr',
  goalTemplateId: null,
  isReopenedGoal: false,
}];

describe('ViewGoals', () => {
  const recipient = {
    id: 1,
    name: 'John Doe',
    grants: [
      {
        id: 1,
        numberWithProgramTypes: 'Grant 1',
      },
      {
        id: 2,
        numberWithProgramTypes: 'Grant 2',
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

  const renderViewGoals = (user = DEFAULT_USER) => render(
    <UserContext.Provider value={{ user }}>
      <AppLoadingContext.Provider value={{
        setIsAppLoading: jest.fn(),
        setAppLoadingText: jest.fn(),
      }}
      >
        <MemoryRouter>
          <ViewGoals recipient={recipient} regionId={regionId} />
        </MemoryRouter>
      </AppLoadingContext.Provider>
    </UserContext.Provider>,
  );

  afterEach(() => fetchMock.restore());

  test('renders the page heading with recipient name and region id', async () => {
    fetchMock.get('/api/recipient/1/goals?goalIds=', [{
      name: '',
      endDate: null,
      status: 'Draft',
      grants: [],
      objectives: [],
      id: 'new',
      onApprovedAR: false,
      onAR: false,
      prompts: {},
      isCurated: false,
      source: {},
      createdVia: '',
      goalTemplateId: null,
      isReopenedGoal: false,
    }]);
    act(() => {
      renderViewGoals();
    });

    expect(fetchMock.called()).toBe(true);
    const heading = document.querySelector('h1.page-heading');
    expect(heading.textContent).toBe('TTA Goals for John Doe - Region 1');
  });

  test('handles no goals returned', async () => {
    fetchMock.get('/api/recipient/1/goals?goalIds=', []);
    act(() => {
      renderViewGoals();
    });

    expect(fetchMock.called()).toBe(true);
    expect(await screen.findByText(/there was an error fetching your goal/i)).toBeInTheDocument();
  });

  test('handles server error', async () => {
    fetchMock.get('/api/recipient/1/goals?goalIds=', 500);
    act(() => {
      renderViewGoals();
    });

    expect(fetchMock.called()).toBe(true);
    expect(await screen.findByText(/there was an error fetching your goal/i)).toBeInTheDocument();
  });

  test('handles permissions mismatch', async () => {
    fetchMock.get('/api/recipient/1/goals?goalIds=', [{
      name: '',
      endDate: null,
      status: 'Draft',
      grants: [],
      objectives: [],
      id: 'new',
      onApprovedAR: false,
      onAR: false,
      prompts: {},
      isCurated: false,
      source: {},
      createdVia: '',
      goalTemplateId: null,
      isReopenedGoal: false,
    }]);
    act(() => {
      renderViewGoals({ id: 1, permissions: [] });
    });

    expect(fetchMock.called()).toBe(false);
    expect(await screen.findByText(/You don't have permission to view this page/i)).toBeInTheDocument();
  });

  test('renders the back to RTTAPA link', async () => {
    fetchMock.get('/api/recipient/1/goals?goalIds=', [{
      name: '',
      endDate: null,
      status: 'Draft',
      grants: [],
      objectives: [],
      id: 'new',
      onApprovedAR: false,
      onAR: false,
      prompts: {},
      isCurated: false,
      source: {},
      createdVia: '',
      goalTemplateId: null,
      isReopenedGoal: false,
    }]);
    act(() => {
      renderViewGoals();
    });

    const link = await screen.findByRole('link', { name: /Back to RTTAPA/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/recipient-tta-records/1/region/1/rttapa/');
  });

  it('renders the goal data', async () => {
    fetchMock.get('/api/recipient/1/goals?goalIds=', basicGoalResponse);

    act(() => {
      renderViewGoals();
    });

    expect(fetchMock.called()).toBe(true);

    // assert goal data
    expect(await screen.findByText('A goal')).toBeInTheDocument();
    expect(await screen.findByText('1/1/1915')).toBeInTheDocument();
    expect(await screen.findByText('Example course')).toBeInTheDocument();
    expect(await screen.findByText('Example topic')).toBeInTheDocument();
    expect(await screen.findByText('Example resource')).toBeInTheDocument();
    expect(await screen.findByText('Example resource.txt')).toBeInTheDocument();
    expect(await screen.findByText('special source')).toBeInTheDocument();
  });
});
