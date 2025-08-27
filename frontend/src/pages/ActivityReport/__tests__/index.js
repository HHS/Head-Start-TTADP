/* eslint-disable max-len */
/* eslint-disable jest/no-commented-out-tests */
import '@testing-library/jest-dom';
import React from 'react';
import reactSelectEvent from 'react-select-event';
import {
  screen,
  fireEvent,
  waitFor,
  within,
  act,
  render,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';
import { REPORT_STATUSES } from '@ttahub/common';
import { mockWindowProperty } from '../../../testHelpers';
import { unflattenResourcesUsed, findWhatsChanged } from '../formDataHelpers';
import {
  history,
  formData,
  renderActivityReport,
  ReportComponent,
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
      expect(await screen.findByTestId('alert')).toBeVisible();
    });

    it('is not shown if history.state.showLastUpdatedTime is null', async () => {
      const data = formData();

      fetchMock.get('/api/activity-reports/1', data);
      renderActivityReport('1', 'activity-summary');
      await screen.findByRole('group', { name: 'Who was the activity for?' });

      // we're just checking to see if the "local backup" message is shown, the
      // updatedAt from network won't be shown
      const alert = await screen.findByTestId('alert');

      const reggies = [
        new RegExp('your computer at', 'i'),
        new RegExp('our network at', 'i'),
      ];

      const reggiesMeasured = reggies.map((r) => alert.textContent.match(r));
      expect(reggiesMeasured.length).toBe(2);
      expect(reggiesMeasured[0].length).toBe(1);
      expect(reggiesMeasured[1]).toBe(null);
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
      fetchMock.post('/api/activity-reports', { id: 1 });
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
      it('loads goals in edit mode', async () => {
        const data = formData();
        fetchMock.get('/api/topic', []);
        fetchMock.get('/api/goal-templates?grantIds=12539', []);
        fetchMock.get('/api/activity-reports/goals?grantIds=12539', []);
        fetchMock.get('/api/goals?reportId=1&goalTemplateId=24727', []);
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
          goalsAndObjectives: mockGoalsAndObjectives(true),
        });

        act(() => renderActivityReport(1, 'goals-objectives', false, 1));

        // expect no read-only goals
        expect(document.querySelector('.ttahub-goal-form-goal-summary')).toBeNull();

        // expect the form to be open
        const goalName = await screen.findByLabelText(/Recipient's goal/i, { selector: 'textarea' });
        expect(goalName.value).toBe('test');

        // we don't need this but its for the symmetry with the below test
        expect(document.querySelector('textarea[name="goalName"]')).not.toBeNull();
      });

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

    it('you can select an existing goal and objective and add a file after saving', async () => {
      const dispatchEvt = (node, type, data) => {
        const event = new Event(type, { bubbles: true });
        Object.assign(event, data);
        fireEvent(node, event);
      };

      const mockData = (files) => ({
        dataTransfer: {
          files,
          items: files.map((file) => ({
            kind: 'file',
            type: file.type,
            getAsFile: () => file,
          })),
          types: ['Files'],
        },
      });

      const file = (name, id) => ({
        originalFileName: name, id, fileSize: 2000, status: 'Uploaded',
      });

      fetchMock.get('/api/goal-templates/24727/prompts?goalIds=92852', []);

      fetchMock.get('/api/topic', [{ id: 64, name: 'Communication' }]);
      fetchMock.get('/api/goal-templates?grantIds=10431',
        [
          {
            isSourceEditable: true,
            id: 24727,
            source: null,
            standard: 'Child Safety',
            label: 'The Grant Recipient will develop a comprehensive plan for staff recruitment, retention and leadership development for all positions',
            value: 24727,
            name: 'The Grant Recipient will develop a comprehensive plan for staff recruitment, retention and leadership development for all positions',
            goalTemplateId: 13500,
            goalIds: [37502],
            isRttapa: null,
            status: 'In Progress',
            grantIds: [10431],
            oldGrantIds: [7764],
            isCurated: false,
            isNew: false,
            goals: [
              {
                id: 37502,
                name: 'The Grant Recipient will develop a comprehensive plan for staff recruitment, retention and leadership development for all positions',
                source: null,
                status: 'In Progress',
                grantId: 10431,
                goalTemplateId: 13500,
              },
            ],
          },
        ]);

      fetchMock.get('/api/activity-reports/1', {
        ...formData(),
        activityRecipientType: 'recipient',
        activityRecipients: [
          {
            id: 10431,
            activityRecipientId: 10431,
            name: 'Barton LLC - 04bear012539  - EHS, HS',
          },
        ],
        objectivesWithoutGoals: [],
        goalsAndObjectives: [],
      });

      fetchMock.get('/api/goals?reportId=1&goalTemplateId=24727', [{
        id: 95297,
        label: 'The Grantee Specialists will support the Grant Recipient in reviewing the Planning Alternative Tomorrows with Hope (PATH) 30-Day action items to identify recruitment and retention progress made and celebrate successes.',
        title: 'The Grantee Specialists will support the Grant Recipient in reviewing the Planning Alternative Tomorrows with Hope (PATH) 30-Day action items to identify recruitment and retention progress made and celebrate successes.',
        status: 'Not Started',
        goalId: 37502,
        resources: [],
        activityReportObjectives: [],
        files: [],
        topics: [],
        activityReports: [{
          displayId: 'R01-AR-23786',
          endDate: null,
          startDate: null,
          submittedDate: null,
          lastSaved: '07/05/2023',
          creatorNameWithRole: ', CO',
          sortedTopics: [],
          creatorName: ', CO',
          id: 23786,
          legacyId: null,
          userId: 355,
          lastUpdatedById: 355,
          ECLKCResourcesUsed: [],
          nonECLKCResourcesUsed: [],
          additionalNotes: null,
          numberOfParticipants: null,
          deliveryMethod: null,
          version: 2,
          duration: null,
          activityRecipientType: 'recipient',
          requester: null,
          targetPopulations: [],
          virtualDeliveryType: null,
          participants: [],
          topics: [],
          programTypes: null,
          context: '',
          pageState: {
            1: 'In progress', 2: 'Not started', 3: 'Not started', 4: 'Not started',
          },
          regionId: 1,
          submissionStatus: 'draft',
          calculatedStatus: 'draft',
          ttaType: [],
          updatedAt: '2023-07-05T17:54:13.082Z',
          approvedAt: null,
          imported: null,
          creatorRole: 'Central Office',
          createdAt: '2023-07-05T17:54:13.082Z',
          ActivityReportObjective: {
            id: 104904, activityReportId: 23786, objectiveId: 95297, arOrder: 1, title: 'The Grantee Specialists will support the Grant Recipient in reviewing the Planning Alternative Tomorrows with Hope (PATH) 30-Day action items to identify recruitment and retention progress made and celebrate successes.', status: 'In Progress', ttaProvided: '', createdAt: '2023-07-05T17:56:15.562Z', updatedAt: '2023-07-05T17:56:15.588Z',
          },
        }],
      }]);

      const { container } = render(
        <ReportComponent
          id={1}
          currentPage="goals-objectives"
          showLastUpdatedTime={false}
          userId={1}
        />,

      );

      await screen.findByRole('heading', { name: 'Goals and objectives' });
      await act(() => reactSelectEvent.select(
        screen.getByText(/- select -/i),
        'The Grant Recipient will develop a comprehensive plan for staff recruitment, retention and leadership development for all positions',
      ));

      await act(() => reactSelectEvent.select(
        screen.getByLabelText(/Select TTA objective/i),
        'The Grantee Specialists will support the Grant Recipient in reviewing the Planning Alternative Tomorrows with Hope (PATH) 30-Day action items to identify recruitment and retention progress made and celebrate successes.',
      ));

      const radio = document.querySelector('#add-objective-files-yes-95297-0'); // yes radio button
      act(() => {
        userEvent.click(radio);
      });

      const dropzone = container.querySelector('.dropzone');

      fetchMock.post('/api/files', [{
        id: 25649, originalFileName: 'BSH_UE_SRD_1.0.2.docx', key: 'dc4b723f-f151-4934-a2b3-5f513c8254a2docx', status: 'UPLOADING', fileSize: 240736, updatedAt: '2023-07-05T18:40:06.130Z', createdAt: '2023-07-05T18:40:06.130Z', url: { url: 'http://minio:9000/ttadp-test/dc4b723f-f151-4934-a2b3-5f513c8254a2docx?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=EXAMPLEID%2F20230705%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20230705T184006Z&X-Amz-Expires=360&X-Amz-Signature=595be3d29630f8275d206300c7dfce6f5e3d7b16d506b7f47d64db04418cf982&X-Amz-SignedHeaders=host', error: null },
      }]);

      const e = mockData([file('file', 1)]);

      dispatchEvt(dropzone, 'drop', e);

      await waitFor(() => expect(fetchMock.called('/api/files', { method: 'POST' })).toBeTruthy());

      expect(await screen.findByText('BSH_UE_SRD_1.0.2.docx')).toBeInTheDocument();
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
});
