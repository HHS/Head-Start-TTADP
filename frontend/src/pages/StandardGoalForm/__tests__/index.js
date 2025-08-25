import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  waitFor,
  act,
} from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import StandardGoalForm from '../index';
import UserContext from '../../../UserContext';
import AppLoadingContext from '../../../AppLoadingContext';
import { GOAL_FORM_FIELDS, mapObjectivesAndRootCauses } from '../constants';

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: () => ({
    regionId: '1',
  }),
}));

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
};

const mockUser = {
  id: 1,
  name: 'test@test.com',
  permissions: [{ regionId: 1, scopeId: 3 }],
};

const mockGoalTemplates = [
  {
    id: 1,
    name: 'Test Goal Template',
    goals: [],
  },
];

// Make sure this path matches the exact import path in the StandardGoalForm component
jest.mock('../../../hooks/useGoalTemplatePrompts', () => ({
  __esModule: true,
  default: jest.fn(() => [[], []]),
}));

// Add this to verify the mock is being used
beforeEach(() => {
  jest.clearAllMocks();
  const useGoalTemplatePrompts = jest.requireMock('../../../hooks/useGoalTemplatePrompts').default;
  useGoalTemplatePrompts.mockReturnValue([[], []]);
});

const renderStandardGoalForm = (user = mockUser) => {
  const history = createMemoryHistory();

  const setIsAppLoading = jest.fn();

  return {
    history,
    setIsAppLoading,
    ...render(
      <Router history={history}>
        <UserContext.Provider value={{ user }}>
          <AppLoadingContext.Provider value={{ setIsAppLoading }}>
            <StandardGoalForm recipient={mockRecipient} />
          </AppLoadingContext.Provider>
        </UserContext.Provider>
      </Router>,
    ),
  };
};

describe('StandardGoalForm', () => {
  beforeEach(() => {
    fetchMock.get('/api/goal-templates?grantIds=1&includeClosedSuspendedGoals=true', mockGoalTemplates);
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('renders the form with initial elements', async () => {
    act(() => {
      renderStandardGoalForm();
    });

    expect(await screen.findByText('Recipient\'s goal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add goal/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('automatically selects grant when only one is available', async () => {
    renderStandardGoalForm();

    await waitFor(() => {
      const grantSelect = screen.getByText(mockRecipient.grants[0].numberWithProgramTypes);
      expect(grantSelect).toBeInTheDocument();
    });
  });

  it('redirects unauthorized users', () => {
    const unauthorizedUser = {
      ...mockUser,
      permissions: [{ regionId: 2, scopeId: 1 }],
    };

    const { history } = renderStandardGoalForm(unauthorizedUser);
    expect(history.location.pathname).toBe('/something-went-wrong/401');
  });

  it('submits the form with valid data', async () => {
    fetchMock.post('/api/goal-templates/standard/1/grant/1', { everything: 'ok' });
    const { setIsAppLoading } = renderStandardGoalForm();

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates?grantIds=1&includeClosedSuspendedGoals=true')).toBe(true);
    });

    // Select a goal template
    const goalSelect = screen.getByLabelText('Select recipient\'s goal');
    await selectEvent.select(goalSelect, 'Test Goal Template');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Add goal/i });
    await act(async () => {
      userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(setIsAppLoading).toHaveBeenCalledWith(true);
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1')).toBe(true);
    });
  });

  it('handles an error submitting the form', async () => {
    fetchMock.post('/api/goal-templates/standard/1/grant/1', 500);
    const { setIsAppLoading, history } = renderStandardGoalForm();

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates?grantIds=1&includeClosedSuspendedGoals=true')).toBe(true);
    });

    // Select a goal template
    const goalSelect = screen.getByLabelText('Select recipient\'s goal');
    await selectEvent.select(goalSelect, 'Test Goal Template');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Add goal/i });
    await act(async () => {
      userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(setIsAppLoading).toHaveBeenCalledWith(true);
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1')).toBe(true);
    });

    expect(history.location.pathname).toContain('/something-went-wrong');
  });

  it('displays validation error when submitting without selecting a goal', async () => {
    renderStandardGoalForm();

    const submitButton = screen.getByRole('button', { name: /Add goal/i });
    await act(async () => {
      userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Select a goal')).toBeInTheDocument();
    });
  });

  it('navigates to the correct page on cancel', () => {
    const { history } = renderStandardGoalForm();

    const cancelButton = screen.getByRole('link', { name: /Cancel/i });
    userEvent.click(cancelButton);

    expect(history.location.pathname).toMatch(/\/recipient-tta-records\/1\/region\/1\/rttapa/);
  });

  describe('mapObjectivesAndRootCauses', () => {
    it('maps objectives and root causes correctly', () => {
      const data = {
        [GOAL_FORM_FIELDS.OBJECTIVES]: [{ value: 'Objective 1' }, { value: 'Objective 2' }],
        [GOAL_FORM_FIELDS.ROOT_CAUSES]: [{ id: 1 }, { id: 2 }],
      };

      const result = mapObjectivesAndRootCauses(data);

      expect(result).toEqual({
        objectives: [{ title: 'Objective 1' }, { title: 'Objective 2' }],
        rootCauses: [1, 2],
      });
    });
    it('handles null root causes', () => {
      const data = {
        [GOAL_FORM_FIELDS.OBJECTIVES]: [{ value: 'Objective 1' }, { value: 'Objective 2' }],
      };

      const result = mapObjectivesAndRootCauses(data);

      expect(result).toEqual({
        objectives: [{ title: 'Objective 1' }, { title: 'Objective 2' }],
        rootCauses: null,
      });
    });
    it('handles null objectives', () => {
      const data = {
        [GOAL_FORM_FIELDS.ROOT_CAUSES]: [{ id: 1 }, { id: 2 }],
      };
      const result = mapObjectivesAndRootCauses(data);
      expect(result).toEqual({
        objectives: [],
        rootCauses: [1, 2],
      });
    });
  });
});
