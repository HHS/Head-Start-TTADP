/* eslint-disable max-len */
/* eslint-disable jest/no-commented-out-tests */
import '@testing-library/jest-dom';
import reactSelectEvent from 'react-select-event';
import {
  screen,
  waitFor,
  within,
  act,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';
import { REPORT_STATUSES } from '@ttahub/common';
import { mockRSSData, mockWindowProperty } from '../../../testHelpers';
import { unflattenResourcesUsed, findWhatsChanged } from '../formDataHelpers';
import {
  history,
  formData,
  renderActivityReport,
  recipients,
  mockGoalsAndObjectives,
} from '../testHelpers';
import { formatReportWithSaveBeforeConversion } from '..';
import { HTTPError } from '../../../fetchers';

describe('ActivityReport', () => {
  const setItem = jest.fn();
  const getItem = jest.fn();
  const removeItem = jest.fn();

  mockWindowProperty('localStorage', {
    setItem,
    getItem,
    removeItem,
  });

  afterEach(() => {
    fetchMock.restore();
    jest.clearAllMocks();
  });

  beforeEach(() => {
    fetchMock.get('/api/groups', []);
    fetchMock.get('/api/activity-reports/activity-recipients?region=1', recipients);
    fetchMock.get('/api/activity-reports/1/activity-recipients', recipients);
    fetchMock.get('/api/activity-reports/groups?region=1', [{
      id: 110,
      name: 'Group 1',
      grants: [
        { id: 1 },
        { id: 2 },
      ],
    },
    {
      id: 111,
      name: 'Group 2',
      grants: [
        { id: 3 },
        { id: 4 },
      ],
    },
    ]);
    fetchMock.get('/api/users/collaborators?region=1', []);
    fetchMock.get('/api/activity-reports/approvers?region=1', []);
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <title>Whats New</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
    <subtitle>Confluence Syndication Feed</subtitle>
    <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
    fetchMock.get('/api/feeds/item?tag=ttahub-tta-support-type', mockRSSData());
    fetchMock.get('/api/feeds/item?tag=ttahub-ohs-standard-goals', mockRSSData());
    fetchMock.get('/api/feeds/item?tag=ttahub-tta-request-option', mockRSSData());
    fetchMock.get('/api/feeds/item?tag=ttahub-tta-provided', mockRSSData());
    fetchMock.get('begin:/api/goal-templates', []);
    fetchMock.get('/api/citations/region/1?grantIds=1&reportStartDate=1970-01-01', []);
  });
  it('handles failures to download a report', async () => {
    const e = new HTTPError(500, 'unable to download report');
    fetchMock.get('/api/activity-reports/1', async () => { throw e; });
    renderActivityReport('1', 'activity-summary', true);
    const [alert] = await screen.findAllByTestId('alert');
    expect(alert).toHaveTextContent('There’s an issue with your connection. Some sections of this form may not load correctly.Your work is saved on this computer. If you continue to have problems, contact us.');
  });

  describe('allow approvers to edit', () => {
    it('does not allow approvers to navigate and change the report if the report is not submitted', async () => {
      const data = formData();
      fetchMock.get('/api/activity-reports/1', {
        ...data,
        approvers: [{ user: { id: 3 } }],
      });
      renderActivityReport(1, 'activity-summary', null, 3);
      await waitFor(() => expect(history.location.pathname).toEqual('/activity-reports/1/review'));
    });

    it('does not allow approvers to navigate and change the report if the report has been approvedby one approver', async () => {
      const data = formData();
      fetchMock.get('/api/activity-reports/1', {
        ...data,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        approvers: [
          {
            status: null,
            user: {
              id: 3,
            },
          },
          {
            status: REPORT_STATUSES.APPROVED,
            user: {
              id: 4,
            },
          },
        ],
      });
      renderActivityReport(1, 'activity-summary', null, 3);
      await waitFor(() => expect(history.location.pathname).toEqual('/activity-reports/1/review'));
    });

    it('allows approvers to navigate and change the report if the report is submitted', async () => {
      const data = formData();
      fetchMock.get('/api/activity-reports/1', {
        ...data,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        approvers: [{ user: { id: 3 } }],
      });
      renderActivityReport(1, 'activity-summary', null, 3);

      const startDate = await screen.findByRole('textbox', { name: /start date/i });
      expect(startDate).toBeVisible();
    });
  });

  describe('for read only users', () => {
    it('redirects the user to the review page', async () => {
      const data = formData();
      fetchMock.get('/api/activity-reports/1', data);
      renderActivityReport('1', null, null, 2);
      await waitFor(() => expect(history.location.pathname).toEqual('/activity-reports/1/review'));
    });
  });

  describe('something went wrong context', () => {
    it('ensure we call set the response code on error', async () => {
      const spy = jest.spyOn(history, 'push');
      fetchMock.get('/api/activity-reports/1', 500);
      renderActivityReport('1', 'activity-summary', null, 1);
      await waitFor(() => expect(spy).toHaveBeenCalledWith('/something-went-wrong/500'));
    });
  });

  describe('last saved time', () => {
    it('is shown if history.state.showLastUpdatedTime is true', async () => {
      const data = formData();

      fetchMock.get('/api/activity-reports/1', data);
      renderActivityReport('1', 'activity-summary', true);
      await screen.findByRole('group', { name: 'Who was the activity for?' }, { timeout: 4000 });
      const alert = await screen.findByTestId('alert');
      expect(alert).toBeVisible();
      expect(alert.textContent).toMatch(/our network at/i);
    });

    it('is not shown if history.state.showLastUpdatedTime is null', async () => {
      const data = formData();

      fetchMock.get('/api/activity-reports/1', data);
      renderActivityReport('1', 'activity-summary');
      await screen.findByRole('group', { name: 'Who was the activity for?' });

      // After refactoring to use react-hook-form, local storage backup messages are no longer shown
      // Only network save times are displayed when available
      const alerts = screen.queryAllByTestId('alert');
      expect(alerts.length).toBe(0);
    });
  });

  it('defaults to activity summary if no page is in the url', async () => {
    renderActivityReport('new', null);
    await waitFor(() => expect(history.location.pathname).toEqual('/activity-reports/new/activity-summary'));
  });

  describe('updatePage', () => {
    it("does not update the page if the form hasn't changed", async () => {
      const spy = jest.spyOn(history, 'push');
      renderActivityReport('new');

      // Navigate to the next page
      const button = await screen.findByRole('button', { name: /supporting attachments not started/i });
      userEvent.click(button);

      await waitFor(() => expect(spy).toHaveBeenCalledWith('/activity-reports/new/supporting-attachments', {}));
    });
  });

  describe('onSave', () => {
    it('calls "report create"', async () => {
      renderActivityReport('new');
      fetchMock.post('/api/activity-reports', { id: 1 });
      await screen.findByRole('group', { name: 'Who was the activity for?' });
      const recipientName = await screen.findByText('Recipient');
      const recipientSelectbox = await within(recipientName).findByText(/- select -/i);
      await reactSelectEvent.select(recipientSelectbox, ['Recipient Name']);

      const button = await screen.findByRole('button', { name: 'Save draft' });
      userEvent.click(button);

      await waitFor(() => expect(fetchMock.called('/api/activity-reports')).toBeTruthy());
    });

    it('assigns save alert fade animation', async () => {
      renderActivityReport('new');
      fetchMock.post('/api/activity-reports', {
        id: 1,
        activityRecipients: [{
          id: 1,
          recipientId: 1,
          activityRecipientId: 1,
          name: 'Recipient Name',
          recipientIdForLookUp: 1,
        }],
      });
      let alerts = screen.queryByTestId('alert');
      expect(alerts).toBeNull();
      await screen.findByRole('group', { name: 'Who was the activity for?' });
      const recipientName = await screen.findByText('Recipient');
      const recipientSelectbox = await within(recipientName).findByText(/- select -/i);
      await reactSelectEvent.select(recipientSelectbox, ['Recipient Name']);

      const button = await screen.findByRole('button', { name: 'Save draft' });
      act(() => userEvent.click(button));
      await waitFor(() => expect(fetchMock.called('/api/activity-reports')).toBeTruthy());
      alerts = await screen.findAllByTestId('alert');
      expect(alerts.length).toBe(2);
      expect(alerts[0]).toHaveClass('alert-fade');
      expect(alerts[0]).toHaveTextContent('Autosaved on');
    });

    it('displays review submit save alert', async () => {
      const data = formData();
      fetchMock.get('/api/activity-reports/1', {
        ...data,
        approvers: [],
      });

      renderActivityReport('1', 'review');
      fetchMock.put('/api/activity-reports/1', formData());
      const button = await screen.findByRole('button', { name: 'Save Draft' });
      userEvent.click(button);
      await waitFor(() => expect(fetchMock.called('/api/activity-reports/1', { method: 'put' })).toBeTruthy());
      expect(await screen.findByText(/draft saved on/i)).toBeVisible();
    });

    it('finds whats changed', () => {
      const old = {
        beans: 'kidney', dog: 'brown', beetle: ['what', 'yeah'], boat: { length: 1, color: 'green' },
      };
      const young = {
        beans: 'black', dog: 'brown', beetle: ['what'], time: 1, boat: { length: 1, color: 'red' },
      };

      const changed = findWhatsChanged(young, old);
      expect(changed).toEqual({
        beans: 'black', beetle: ['what'], time: 1, boat: { length: 1, color: 'red' },
      });
    });

    it('finds whats changed branch cases', () => {
      const orig = {
        startDate: 'blah', creatorRole: '',
      };
      const changed = {
        startDate: 'blah', creatorRole: '',
      };
      const result = findWhatsChanged(orig, changed);
      expect(result).toEqual({ creatorRole: null });

      // ensure NaN values are removed
      const out = findWhatsChanged({ duration: Number('a') }, { duration: 1 });
      expect(out).toEqual({});
    });

    it('access correct fields when diffing turns up activity recipients', () => {
      const old = {
        activityRecipients: [{
          activityRecipientId: 1,
        }],
        goalForEditing: {
          name: 'goal 3',
          activityReportGoals: [{ isActivelyEdited: true }],
          prompts: [],
        },
        goals: [
          {
            name: 'goal 1', activityReportGoals: [{ isActivelyEdited: true }], prompts: [],
          },
          {
            name: 'goal 2', activityReportGoals: [{ isActivelyEdited: false }], prompts: [],
          },
        ],
      };

      const young = {
        activityRecipients: [{
          activityRecipientId: 2,
        }, {
          activityRecipientId: 1,
        }],
      };

      const changed = findWhatsChanged(young, old);

      expect(Object.keys(changed).sort()).toEqual(['activityRecipients', 'goals', 'recipientsWhoHaveGoalsThatShouldBeRemoved']);

      expect(changed.recipientsWhoHaveGoalsThatShouldBeRemoved).toEqual([]);
      expect(changed.activityRecipients.map((ar) => ar.activityRecipientId)).toEqual([2, 1]);
      expect(changed.goals).toEqual([
        {
          activityReportGoals: [
            {
              isActivelyEdited: true,
            },
          ],
          grantIds: [
            2,
            1,
          ],
          isActivelyEdited: true,
          name: 'goal 3',
          prompts: [],
        },
        {
          activityReportGoals: [
            {
              isActivelyEdited: true,
            },
          ],
          grantIds: [
            2,
            1,
          ],
          isActivelyEdited: false,
          name: 'goal 1',
          prompts: [],
        },
        {
          activityReportGoals: [
            {
              isActivelyEdited: false,
            },
          ],
          grantIds: [
            2,
            1,
          ],
          isActivelyEdited: false,
          name: 'goal 2',
          prompts: [],
        },
      ]);
    });

    it('displays the creator name', async () => {
      fetchMock.get('/api/activity-reports/1', formData());
      renderActivityReport(1);
      expect(await screen.findByText(/creator:/i)).toBeVisible();
    });

    it('displays the context', async () => {
      fetchMock.get('/api/activity-reports/1', formData());
      renderActivityReport(1);
      const contextGroup = await screen.findByRole('group', { name: /context/i });
      expect(contextGroup).toBeVisible();
    });

    it('calls "report update"', async () => {
      fetchMock.get('/api/activity-reports/1', formData());
      fetchMock.put('/api/activity-reports/1', {});
      renderActivityReport(1);
      const button = await screen.findByRole('button', { name: /supporting attachments in progress/i });
      userEvent.click(button);
      await waitFor(() => expect(fetchMock.called('/api/activity-reports/1')).toBeTruthy());
    });
  });

  describe('recipient select', () => {
    describe('changes the recipient selection to', () => {
      it('unflattens resources properly', async () => {
        const empty = unflattenResourcesUsed(undefined);
        expect(empty).toEqual([]);

        const good = unflattenResourcesUsed(['resource']);
        expect(good).toEqual([{ value: 'resource' }]);
      });
    });

    describe('actively editable goals', () => {
      it('loads goals in read-only mode', async () => {
        const data = formData();
        fetchMock.get('/api/topic', []);
        fetchMock.get('/api/goal-templates?grantIds=12539', []);
        fetchMock.get('/api/activity-reports/goals?grantIds=12539', []);
        // fetchMock.get('/api/goals?reportId=1&goalIds=37499', mockGoalsAndObjectives(true));
        fetchMock.get('/api/activity-reports/1', {
          ...data,
          activityRecipientType: 'recipient',
          activityRecipients: [
            {
              id: 12539,
              activityRecipientId: 12539,
              name: 'Barton LLC - 04bear012539  - EHS, HS',
            },
          ],
          objectivesWithoutGoals: [],
          goalsAndObjectives: mockGoalsAndObjectives(false),
        });

        act(() => renderActivityReport(1, 'goals-objectives', false, 1));

        await screen.findByRole('heading', { name: 'Goals and objectives' });

        // expect 1 read-only goals
        const readOnlyGoals = document.querySelectorAll('.ttahub-goal-form-goal-summary');
        expect(readOnlyGoals.length).toBe(1);

        await screen.findByRole('heading', { name: 'Goal summary' });
        await screen.findByText('test', { selector: 'p.usa-prose' });

        // we don't expect form controls
        expect(document.querySelector('textarea[name="goalName"]')).toBeNull();
      });
    });
  });

  describe('formatReportWithSaveBeforeConversion', () => {
    it('properly formats dates', async () => {
      const reportData = await formatReportWithSaveBeforeConversion(
        {
          creatorRole: 'Tiny Lizard',
          startDate: '10/04/2020',
          endDate: '10/04/2020',
        },
        {
          creatorRole: 'Tiny Lizard',
          startDate: '10/04/2020',
          endDate: '10/04/2020',
        },
        {},
        false,
        1,
        [],
      );
      expect(reportData.startDate).toBe('10/04/2020');
      expect(reportData.endDate).toBe('10/04/2020');
    });
  });

  describe('collaborators', () => {
    it('does not add the report creator to the selectable collaborator options', async () => {
      const userId = 1;
      const collaborators = [
        { id: 1, name: 'Creator User', roles: [{ fullName: 'Creator' }] },
        { id: 2, name: 'Other User', roles: [{ fullName: 'Other User' }] },
      ];

      fetchMock.get('/api/users/collaborators?region=1', collaborators, { overwriteRoutes: true });

      const data = formData();
      fetchMock.get('/api/activity-reports/1', {
        ...data,
        userId,
        activityReportCollaborators: [],
      });

      renderActivityReport('1');

      // Click the multiselect and verify the options.
      await waitFor(() => {
        const select = screen.getByLabelText(/collaborating specialists/i);
        userEvent.click(select);
      });

      // Expect 'Other User' to be visible and 'Creator User' to be hidden.
      expect(screen.getByText('Other User')).toBeVisible();
      expect(screen.queryByText('Creator User')).not.toBeInTheDocument();
    });
  });

  describe('reason for activity', () => {
    it('shows the reason for activity', async () => {
      const data = formData();
      fetchMock.get('/api/activity-reports/1', {
        ...data,
        reasonForActivity: null,
      });
      renderActivityReport(1);

      // We can select an activity reason.
      // Find all form groups first
      const formGroups = await screen.findAllByTestId('formGroup');
      // Find the specific form group that contains both the text and a combobox
      const formGroup = formGroups.find((group) => group.textContent.includes('Why was this activity requested?')
               && within(group).queryByRole('combobox') !== null);
      // Get the combobox within the found form group
      const selectElement = within(formGroup).getByRole('combobox');

      act(() => userEvent.click(selectElement));
      const reasonOption = await screen.findByText('Recipient requested');
      act(() => userEvent.click(reasonOption));
      expect(screen.getByText('Recipient requested')).toBeVisible();
    });
  });

  describe('creator, collaborator', () => {
    it('report submitted', async () => {
      const d = {
        ...formData(), id: 1, calculatedStatus: REPORT_STATUSES.SUBMITTED,
      };

      fetchMock.get('/api/activity-reports/1', d);
      act(() => {
        renderActivityReport('1', 'review', true, 1);
      });

      await waitFor(() => expect(history.location.pathname).toEqual('/activity-reports/submitted/1'));
    });
  });

  describe('approved report', () => {
    it('auto redirects', async () => {
      const d = {
        ...formData(), id: 1, calculatedStatus: REPORT_STATUSES.APPROVED,
      };

      fetchMock.get('/api/activity-reports/1', d);
      act(() => {
        renderActivityReport('1', 'review', true, 1);
      });

      await waitFor(() => expect(history.location.pathname).toEqual('/activity-reports/view/1'));
    });
  });

  describe('localStorage data synchronization', () => {
    it('uses localStorage data when it is newer than server data', async () => {
      const newerTimestamp = new Date('2024-01-02T12:00:00Z').toISOString();
      const olderTimestamp = new Date('2024-01-01T12:00:00Z').toISOString();

      const data = formData();
      const localStorageData = {
        ...data,
        savedToStorageTime: newerTimestamp,
        context: 'Updated locally',
      };

      getItem.mockReturnValue(JSON.stringify(localStorageData));

      fetchMock.get('/api/activity-reports/1', {
        ...data,
        updatedAt: olderTimestamp,
        context: 'Original from server',
      });

      renderActivityReport('1', 'activity-summary');

      // Wait for the form to render
      await screen.findByRole('group', { name: 'Who was the activity for?' });

      // Verify that localStorage.getItem was called
      expect(getItem).toHaveBeenCalled();
    });

    it('uses server data when it is newer than localStorage data', async () => {
      const newerTimestamp = new Date('2024-01-02T12:00:00Z').toISOString();
      const olderTimestamp = new Date('2024-01-01T12:00:00Z').toISOString();

      const data = formData();
      const localStorageData = {
        ...data,
        savedToStorageTime: olderTimestamp,
        context: 'Updated locally',
      };

      getItem.mockReturnValue(JSON.stringify(localStorageData));

      fetchMock.get('/api/activity-reports/1', {
        ...data,
        updatedAt: newerTimestamp,
        context: 'Original from server',
      });

      renderActivityReport('1', 'activity-summary');

      // Wait for the form to render
      await screen.findByRole('group', { name: 'Who was the activity for?' });

      // Verify that localStorage.getItem was called
      expect(getItem).toHaveBeenCalled();
    });
  });

  describe('localStorage error handling', () => {
    it('handles localStorage errors gracefully when loading stored data', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      getItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      fetchMock.get('/api/activity-reports/1', formData());

      renderActivityReport('1', 'activity-summary');

      // Should continue to render normally with server data
      await screen.findByRole('group', { name: 'Who was the activity for?' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error loading from localStorage during fetch:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('loading states', () => {
    it('displays loading state when formData is not initialized', async () => {
      fetchMock.get('/api/activity-reports/1', formData());

      renderActivityReport('1', 'activity-summary');

      // Initial loading state
      expect(screen.getByText('loading...')).toBeVisible();

      // Should eventually show the form
      await screen.findByRole('group', { name: 'Who was the activity for?' });
    });
  });

  describe('error handling', () => {
    it('displays error alert when there is an error and form is not initialized', async () => {
      const e = new HTTPError(500, 'Server error');
      fetchMock.get('/api/activity-reports/1', async () => { throw e; });

      renderActivityReport('1', 'activity-summary', false);

      const alerts = await screen.findAllByTestId('alert');
      const errorAlert = alerts.find((alert) => alert.textContent.includes('issue with your connection'));
      expect(errorAlert).toBeVisible();
    });
  });
});
