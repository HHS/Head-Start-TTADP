import '@testing-library/jest-dom';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import selectEvent from 'react-select-event';
import AppLoadingContext from '../../../AppLoadingContext';
import UserContext from '../../../UserContext';
import { GOAL_FORM_FIELDS, mapObjectivesAndRootCauses } from '../constants';
import StandardGoalForm from '../index';

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

const inaccessibleReport = {
  displayId: 'R14-AR-67898',
  creatorName: 'Hanna Fisher, GS',
  href: null,
};

const accessibleReport = {
  displayId: 'R14-AR-67433',
  creatorName: 'Annika Lewis, GS',
  href: '/activity-reports/123',
};

const blockedGoalTemplate = {
  id: 2,
  name: 'Blocked Goal Template',
  goals: [{ id: 22, prestandard: false }],
  blockingActivityReports: [inaccessibleReport],
};

const mockGoalTemplatePrompt = {
  hint: 'Choose the root causes that apply',
  id: 1,
  options: ['Facilities', 'Family Circumstances'],
  prompt: 'Root cause',
};

const goalTemplatesUrl =
  '/api/goal-templates?grantIds=1&includeClosedSuspendedGoals=true&includeBlockingActivityReports=true';
const currentGoalTemplatesUrl = '/api/goal-templates?grantIds=1&includeClosedSuspendedGoals=true';

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

const renderStandardGoalForm = (user = mockUser, recipient = mockRecipient) => {
  const history = createMemoryHistory();

  const setIsAppLoading = jest.fn();

  return {
    history,
    setIsAppLoading,
    ...render(
      <Router history={history}>
        <UserContext.Provider value={{ user }}>
          <AppLoadingContext.Provider value={{ setIsAppLoading }}>
            <StandardGoalForm recipient={recipient} />
          </AppLoadingContext.Provider>
        </UserContext.Provider>
      </Router>
    ),
  };
};

describe('StandardGoalForm', () => {
  const mockGoalTemplateResponses = (templates) => {
    fetchMock.get(goalTemplatesUrl, templates, { overwriteRoutes: true });
  };

  beforeEach(() => {
    fetchMock.get(currentGoalTemplatesUrl, mockGoalTemplates);
    fetchMock.get(goalTemplatesUrl, mockGoalTemplates);
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('renders the form with initial elements', async () => {
    act(() => {
      renderStandardGoalForm();
    });

    expect(await screen.findByText("Recipient's goal")).toBeInTheDocument();
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
    const { setIsAppLoading, history } = renderStandardGoalForm();

    // Select a goal template
    const goalSelect = await screen.findByLabelText("Select recipient's goal");
    await selectEvent.select(goalSelect, 'Test Goal Template');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Add goal/i });
    await act(async () => {
      userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(setIsAppLoading).toHaveBeenCalledWith(true);
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1')).toBe(true);
      expect(history.location.pathname).toMatch(/\/recipient-tta-records\/1\/region\/1\/rttapa/);
      expect(history.location.state.refreshRecipient).toBe(true);
    });
  });

  it('handles an error submitting the form', async () => {
    fetchMock.post('/api/goal-templates/standard/1/grant/1', 500);
    const { setIsAppLoading, history } = renderStandardGoalForm();

    // Select a goal template
    const goalSelect = await screen.findByLabelText("Select recipient's goal");
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

  it('requests activity report blocker enrichment', async () => {
    fetchMock.reset();
    fetchMock.get(goalTemplatesUrl, mockGoalTemplates);

    renderStandardGoalForm();

    await waitFor(() => {
      expect(fetchMock.called(goalTemplatesUrl)).toBe(true);
    });
    expect(fetchMock.called(currentGoalTemplatesUrl)).toBe(false);
  });

  describe('goals already used on activity reports', () => {
    it('shows an inaccessible report as plain text and suppresses the full form', async () => {
      mockGoalTemplateResponses([blockedGoalTemplate]);
      renderStandardGoalForm();

      const goalSelect = await screen.findByLabelText("Select recipient's goal");
      await selectEvent.select(goalSelect, blockedGoalTemplate.name);

      expect(
        await screen.findByText(/This goal already exists on a draft or submitted activity report/i)
      ).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass(
        'maxw-mobile-lg',
        'margin-top-2',
        'margin-bottom-0'
      );
      const reportId = screen.getByText(inaccessibleReport.displayId);
      expect(reportId.closest('a')).toBeNull();
      expect(screen.getByText(/created by Hanna Fisher, GS/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Add goal/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Add new objective/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: /Root causes/i })).not.toBeInTheDocument();
      expect(goalSelect.closest('.usa-form-group')).toHaveClass('margin-top-2');
      expect(screen.getByRole('link', { name: /Cancel/i }).parentElement).toHaveClass(
        'margin-top-4'
      );
    });

    it('links a report when the current user can access it', async () => {
      const linkedTemplate = {
        ...blockedGoalTemplate,
        blockingActivityReports: [accessibleReport],
      };
      mockGoalTemplateResponses([linkedTemplate]);
      renderStandardGoalForm();

      const goalSelect = await screen.findByLabelText("Select recipient's goal");
      await selectEvent.select(goalSelect, linkedTemplate.name);

      expect(await screen.findByRole('link', { name: accessibleReport.displayId })).toHaveAttribute(
        'href',
        accessibleReport.href
      );
    });

    it('lists multiple reports and applies access to each report independently', async () => {
      const multipleReportsTemplate = {
        ...blockedGoalTemplate,
        blockingActivityReports: [inaccessibleReport, accessibleReport],
      };
      mockGoalTemplateResponses([multipleReportsTemplate]);
      renderStandardGoalForm();

      const goalSelect = await screen.findByLabelText("Select recipient's goal");
      await selectEvent.select(goalSelect, multipleReportsTemplate.name);

      expect(
        await screen.findByText(
          /This goal already exists on multiple draft or submitted activity reports:/i
        )
      ).toBeInTheDocument();
      const alert = screen.getByRole('alert');
      expect(alert.querySelector('.usa-alert__text')?.tagName).toBe('DIV');
      expect(within(alert).getAllByRole('listitem')).toHaveLength(2);
      expect(screen.getByText(inaccessibleReport.displayId).closest('a')).toBeNull();
      expect(screen.getByRole('link', { name: accessibleReport.displayId })).toHaveAttribute(
        'href',
        accessibleReport.href
      );
      expect(screen.getByText(/created by Hanna Fisher, GS/i)).toBeInTheDocument();
      expect(screen.getByText(/created by Annika Lewis, GS/i)).toBeInTheDocument();
    });

    it('clears the selected goal and blocker state when the grant changes', async () => {
      const recipientWithTwoGrants = {
        ...mockRecipient,
        grants: [
          {
            id: 1,
            numberWithProgramTypes: 'Grant-123',
            status: 'Active',
          },
          {
            id: 2,
            numberWithProgramTypes: 'Grant-456',
            status: 'Active',
          },
        ],
      };
      fetchMock.get('/api/goal-templates?grantIds=', []);
      mockGoalTemplateResponses([blockedGoalTemplate]);
      fetchMock.get(
        '/api/goal-templates?grantIds=2&includeClosedSuspendedGoals=true',
        mockGoalTemplates
      );
      fetchMock.get(
        '/api/goal-templates?grantIds=2&includeClosedSuspendedGoals=true&includeBlockingActivityReports=true',
        mockGoalTemplates
      );
      renderStandardGoalForm(mockUser, recipientWithTwoGrants);

      await selectEvent.select(screen.getByLabelText(/Recipient grant numbers/i), 'Grant-123');
      const goalSelect = await screen.findByLabelText("Select recipient's goal");
      await selectEvent.select(goalSelect, blockedGoalTemplate.name);
      expect(await screen.findByText(inaccessibleReport.displayId)).toBeInTheDocument();

      await selectEvent.select(screen.getByLabelText(/Recipient grant numbers/i), 'Grant-456');

      await waitFor(() => {
        expect(screen.getByLabelText("Select recipient's goal")).toHaveValue('');
      });
      expect(screen.queryByText(inaccessibleReport.displayId)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add goal/i })).toBeInTheDocument();
    });

    it('restores prompts, objectives, and submission when an available goal is selected', async () => {
      const useGoalTemplatePrompts = jest.requireMock(
        '../../../hooks/useGoalTemplatePrompts'
      ).default;
      useGoalTemplatePrompts.mockImplementation((goalTemplateId) =>
        goalTemplateId ? [[mockGoalTemplatePrompt], []] : [[], []]
      );
      mockGoalTemplateResponses([blockedGoalTemplate, mockGoalTemplates[0]]);
      renderStandardGoalForm();

      const goalSelect = await screen.findByLabelText("Select recipient's goal");
      await selectEvent.select(goalSelect, blockedGoalTemplate.name);

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: /Root causes/i })).not.toBeInTheDocument();
      expect(screen.queryByTestId('objectives-section')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Add goal/i })).not.toBeInTheDocument();

      await selectEvent.select(goalSelect, mockGoalTemplates[0].name);

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
      expect(screen.getByRole('combobox', { name: /Root causes/i })).toBeInTheDocument();
      expect(screen.getByTestId('objectives-section')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add goal/i })).toBeInTheDocument();
    });

    it('replaces stale availability with blocker details returned by a late conflict', async () => {
      mockGoalTemplateResponses(mockGoalTemplates);
      fetchMock.post('/api/goal-templates/standard/1/grant/1', {
        body: {
          code: 'STANDARD_GOAL_ON_ACTIVITY_REPORT',
          blockingActivityReports: [accessibleReport],
        },
        status: 409,
      });
      const { history } = renderStandardGoalForm();

      const goalSelect = await screen.findByLabelText("Select recipient's goal");
      await selectEvent.select(goalSelect, mockGoalTemplates[0].name);
      userEvent.click(screen.getByRole('button', { name: /Add goal/i }));

      expect(await screen.findByText(accessibleReport.displayId)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: accessibleReport.displayId })).toHaveAttribute(
        'href',
        accessibleReport.href
      );
      expect(history.location.pathname).not.toContain('something-went-wrong');
      expect(screen.queryByRole('button', { name: /Add goal/i })).not.toBeInTheDocument();
    });

    it('refreshes blocker details when an activity report wins the uniqueness race', async () => {
      const alternateGoalTemplate = {
        id: 3,
        name: 'Alternate Goal Template',
        goals: [],
      };
      let requestCount = 0;
      fetchMock.get(
        goalTemplatesUrl,
        () => {
          requestCount += 1;
          return requestCount === 1
            ? [...mockGoalTemplates, alternateGoalTemplate]
            : [
                {
                  ...mockGoalTemplates[0],
                  blockingActivityReports: [accessibleReport],
                },
                alternateGoalTemplate,
              ];
        },
        { overwriteRoutes: true }
      );
      fetchMock.post('/api/goal-templates/standard/1/grant/1', {
        body: { code: 'STANDARD_GOAL_ALREADY_USED' },
        status: 409,
      });
      const { history } = renderStandardGoalForm();

      const goalSelect = await screen.findByLabelText("Select recipient's goal");
      await selectEvent.select(goalSelect, mockGoalTemplates[0].name);
      userEvent.click(screen.getByRole('button', { name: /Add goal/i }));

      expect(await screen.findByText(accessibleReport.displayId)).toBeInTheDocument();
      expect(requestCount).toBe(2);
      expect(history.location.pathname).not.toContain('something-went-wrong');
      expect(screen.queryByRole('button', { name: /Add goal/i })).not.toBeInTheDocument();

      await selectEvent.select(goalSelect, alternateGoalTemplate.name);
      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
      expect(screen.getByRole('button', { name: /Add goal/i })).toBeInTheDocument();

      await selectEvent.select(goalSelect, mockGoalTemplates[0].name);
      expect(await screen.findByText(accessibleReport.displayId)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Add goal/i })).not.toBeInTheDocument();
    });
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
