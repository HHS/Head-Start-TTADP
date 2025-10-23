/* eslint-disable max-len */
/* eslint-disable jest/no-commented-out-tests */
import '@testing-library/jest-dom';
import React from 'react';
import moment from 'moment';
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
import { REPORT_STATUSES, SUPPORT_TYPES, GOAL_STATUS } from '@ttahub/common';
import { mockRSSData, mockWindowProperty } from '../../../testHelpers';
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
import { OBJECTIVE_STATUS } from '../../../Constants';

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
            status: GOAL_STATUS.IN_PROGRESS,
            grantIds: [10431],
            oldGrantIds: [7764],
            isCurated: false,
            isNew: false,
            goals: [
              {
                id: 37502,
                name: 'The Grant Recipient will develop a comprehensive plan for staff recruitment, retention and leadership development for all positions',
                source: null,
                status: GOAL_STATUS.IN_PROGRESS,
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
        status: GOAL_STATUS.NOT_STARTED,
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
            id: 104904, activityReportId: 23786, objectiveId: 95297, arOrder: 1, title: 'The Grantee Specialists will support the Grant Recipient in reviewing the Planning Alternative Tomorrows with Hope (PATH) 30-Day action items to identify recruitment and retention progress made and celebrate successes.', status: OBJECTIVE_STATUS.IN_PROGRESS, ttaProvided: '', createdAt: '2023-07-05T17:56:15.562Z', updatedAt: '2023-07-05T17:56:15.588Z',
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

    it('you can add a goal and objective and add a file after saving', async () => {
      const data = formData();
      fetchMock.get('/api/topic', [{ id: 64, name: 'Communication' }]);
      fetchMock.get('/api/courses', []);
      fetchMock.get('/api/activity-reports/goals?grantIds=12539', []);
      fetchMock.get('/api/goal-templates?grantIds=12539&reportStartDate=2012-05-20', []);
      fetchMock.put('/api/activity-reports/1/goals/edit?goalIds=37504', {});
      fetchMock.get('//api/feeds/item?tag=ttahub-tta-support-type', mockRSSData());
      fetchMock.get('/api/activity-reports/1', {
        ...data,
        startDate: moment().format('YYYY-MM-DD'),
        activityRecipientType: 'recipient',
        activityRecipients: [
          {
            id: 12539,
            activityRecipientId: 12539,
            name: 'Barton LLC - 04bear012539  - EHS, HS',
          },
        ],
        objectivesWithoutGoals: [],
        goalsAndObjectives: [{
          activityReportGoals: [
            {
              isActivelyEdited: true,
            },
          ],
          value: 'a5252c25-fbc6-41cc-a655-24fabac34873',
          number: false,
          label: 'Create new goal',
          objectives: [
            {
              title: 'sdfgsdfg',
              topics: [
                {
                  id: 64,
                  name: 'Communication',
                },
              ],
              resources: [],
              files: [],
              ttaProvided: '<p>sdgfsdfg</p>\n',
              status: OBJECTIVE_STATUS.NOT_STARTED,
              label: 'Create a new objective',
              supportType: SUPPORT_TYPES[1],
            },
          ],
          name: 'Create new goal',
          goalNumber: '',
          id: 'new',
          isNew: true,
          endDate: '',
          onApprovedAR: false,
          grantIds: [
            11606,
          ],
          goalIds: [],
          oldGrantIds: [],
          status: GOAL_STATUS.DRAFT,
          isRttapa: null,
          isCurated: false,
        }],
      });

      act(() => renderActivityReport(1, 'goals-objectives', false, 1));

      await screen.findByRole('heading', { name: 'Goals and objectives' });

      // assert that the file upload is visible
      let message = await screen.findByText('Add a TTA objective and save as draft to upload resources.');
      expect(message).toBeInTheDocument();

      const radios = document.querySelector('.ttahub-objective-files input[type="radio"]');
      expect(radios).toBeNull();

      fetchMock.put('/api/activity-reports/1', {
        id: 23786,
        userId: 355,
        startDate: moment().format('YYYY-MM-DD'),
        endDate: null,
        lastUpdatedById: 355,
        ECLKCResourcesUsed: [],
        nonECLKCResourcesUsed: [],
        additionalNotes: null,
        numberOfParticipants: null,
        deliveryMethod: null,
        version: 2,
        duration: null,
        activityRecipientType: 'recipient',
        activityRecipients: [
          {
            id: 12539,
            activityRecipientId: 12539,
            name: 'Barton LLC - 04bear012539  - EHS, HS',
          },
        ],
        requester: null,
        targetPopulations: [],
        virtualDeliveryType: null,
        participants: [],
        topics: [],
        programTypes: null,
        context: '',
        pageState: {
          1: 'In progress', 2: 'Complete', 3: 'Not started', 4: 'Not started',
        },
        regionId: 1,
        submissionStatus: 'draft',
        calculatedStatus: 'draft',
        ttaType: [],
        submittedDate: null,
        updatedAt: '2023-06-21T17:54:15.844Z',
        approvedAt: null,
        creatorRole: 'Central Office',
        createdAt: '2023-06-21T17:43:50.905Z',
        legacyId: null,
        objectivesWithGoals: [],
        author: {},
        files: [],
        activityReportCollaborators: [],
        specialistNextSteps: [{ completeDate: null, note: '', id: 130888 }],
        recipientNextSteps: [{ completeDate: null, note: '', id: 130887 }],
        approvers: [],
        displayId: 'R01-AR-23786',
        goalsAndObjectives: [{
          id: 37504,
          name: 'New goal',
          status: GOAL_STATUS.DRAFT,
          timeframe: null,
          isFromSmartsheetTtaPlan: null,
          endDate: '',
          closeSuspendReason: null,
          closeSuspendContext: null,
          grantId: 10431,
          goalTemplateId: null,
          previousStatus: null,
          onAR: true,
          onApprovedAR: false,
          isRttapa: null,
          firstNotStartedAt: null,
          lastNotStartedAt: null,
          firstInProgressAt: null,
          lastInProgressAt: null,
          firstCeasedSuspendedAt: null,
          lastCeasedSuspendedAt: null,
          firstClosedAt: null,
          lastClosedAt: null,
          firstCompletedAt: null,
          lastCompletedAt: null,
          createdVia: 'activityReport',
          rtrOrder: 1,
          createdAt: '2023-06-21T17:54:16.543Z',
          updatedAt: '2023-06-21T17:54:16.812Z',
          isCurated: null,
          prompts: [],
          activityReportGoals: [{
            endDate: null, id: 76212, activityReportId: 23786, goalId: 37504, isRttapa: null, name: 'New goal', status: GOAL_STATUS.DRAFT, timeframe: null, closeSuspendReason: null, closeSuspendContext: null, isActivelyEdited: false, createdAt: '2023-06-21T17:54:16.699Z', updatedAt: '2023-06-21T17:54:16.699Z',
          }],
          grant: {},
          objectives: [{
            id: 95299,
            otherEntityId: null,
            goalId: 37504,
            title: 'ASDF',
            status: OBJECTIVE_STATUS.NOT_STARTED,
            objectiveTemplateId: null,
            onAR: true,
            onApprovedAR: false,
            createdVia: 'activityReport',
            firstNotStartedAt: '2023-06-21T17:54:16.916Z',
            lastNotStartedAt: '2023-06-21T17:54:16.916Z',
            firstInProgressAt: null,
            lastInProgressAt: null,
            firstSuspendedAt: null,
            lastSuspendedAt: null,
            firstCompleteAt: null,
            lastCompleteAt: null,
            rtrOrder: 1,
            createdAt: '2023-06-21T17:54:16.916Z',
            updatedAt: '2023-06-21T17:54:17.269Z',
            activityReportObjectives: [{
              id: 104904,
              activityReportId: 23786,
              objectiveId: 95299,
              arOrder: 1,
              title: 'ASDF',
              status: OBJECTIVE_STATUS.NOT_STARTED,
              ttaProvided: '<p>ASDF</p>\n',
              createdAt: '2023-06-21T17:54:17.172Z',
              updatedAt: '2023-06-21T17:54:17.207Z',
              supportType: SUPPORT_TYPES[1],
              activityReportObjectiveTopics: [{
                id: 13747,
                activityReportObjectiveId: 104904,
                topicId: 64,
                createdAt: '2023-06-21T17:54:17.428Z',
                updatedAt: '2023-06-21T17:54:17.428Z',
                topic: {
                  id: 64, name: 'Communication', mapsTo: null, createdAt: '2022-03-18T21:27:37.915Z', updatedAt: '2022-03-18T21:27:37.915Z', deletedAt: null,
                },
              }],
              activityReportObjectiveFiles: [],
              activityReportObjectiveResources: [],
            }],
            topics: [{
              id: 64, name: 'Communication', mapsTo: null, createdAt: '2022-03-18T21:27:37.915Z', updatedAt: '2022-03-18T21:27:37.915Z', deletedAt: null,
            }],
            resources: [],
            files: [],
            value: 95299,
            ids: [95299],
            ttaProvided: '<p>ASDF</p>\n',
            isNew: false,
            arOrder: 1,
          }],
          goalNumbers: ['G-37504'],
          goalIds: [37504],
          grants: [{ }],
          grantIds: [10431],
          isNew: false,
        }],
        objectivesWithoutGoals: [],
      });

      expect(fetchMock.called('/api/activity-reports/1', { method: 'PUT' })).toBe(false);
      const saveGoal = await screen.findByRole('button', { name: /save goal/i });
      act(() => {
        userEvent.click(saveGoal);
      });

      const errors = document.querySelectorAll('.usa-error-message:not(:empty)');
      expect(errors.length).toBe(0);

      await waitFor(() => {
        expect(fetchMock.called('/api/activity-reports/1', { method: 'PUT' })).toBe(true);
      });

      const actions = await screen.findByRole('button', { name: /actions for goal/i });
      act(() => {
        userEvent.click(actions);
      });

      fetchMock.get('/api/goals?reportId=1&goalIds=37504', [{
        startDate: moment().format('YYYY-MM-DD'),
        status: GOAL_STATUS.DRAFT,
        value: 37504,
        label: 'dfghgh',
        id: 37504,
        name: 'dfghgh',
        grant: {
          programTypes: [],
          name: 'Dooley and Sons - 02bear011606 ',
          numberWithProgramTypes: '02bear011606 ',
          recipientInfo: 'Dooley and Sons - 02bear011606 - 757',
          id: 11606,
          number: '02bear011606',
          annualFundingMonth: 'January',
          cdi: false,
          status: 'Active',
          grantSpecialistName: 'Marian Daugherty',
          grantSpecialistEmail: 'Effie.McCullough@gmail.com',
          programSpecialistName: 'Eddie Denesik DDS',
          programSpecialistEmail: 'Darryl_Kunde7@yahoo.com',
          stateCode: 'RI',
          startDate: '2020-01-01T00:00:00.000Z',
          endDate: '2024-12-31T00:00:00.000Z',
          inactivationDate: null,
          inactivationReason: null,
          recipientId: 757,
          oldGrantId: 8609,
          deleted: false,
          createdAt: '2021-03-16T01:20:44.754Z',
          updatedAt: '2022-09-28T15:03:28.488Z',
          regionId: 1,
          recipient: {
            id: 757, uei: 'GAKEGQ34K338', name: 'Dooley and Sons', recipientType: 'Private/Public Non-Profit (Non-CAA) (e.g., church or non-profit hospital)', deleted: false, createdAt: '2021-03-16T01:20:43.530Z', updatedAt: '2022-09-28T15:03:26.279Z',
          },
        },
        objectives: [{
          id: 95300,
          label: 'dfghdfgh',
          title: 'dfghdfgh',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          goalId: 37505,
          resources: [],
          activityReportObjectives: [{ ttaProvided: '<p>dfgh</p>\n' }],
          files: [],
          topics: [{
            id: 62,
            name: 'CLASS: Instructional Support',
            mapsTo: null,
            createdAt: '2022-03-18T21:27:37.915Z',
            updatedAt: '2022-03-18T21:27:37.915Z',
            deletedAt: null,
            ObjectiveTopic: {
              id: 16251, objectiveId: 95300, topicId: 62, onAR: true, onApprovedAR: false, createdAt: '2023-06-21T18:13:19.936Z', updatedAt: '2023-06-21T18:13:20.312Z',
            },
          }],
          activityReports: [{
            displayId: 'R01-AR-23788',
            endDate: null,
            startDate: null,
            submittedDate: null,
            lastSaved: '06/21/2023',
            creatorNameWithRole: ', CO',
            sortedTopics: [],
            creatorName: ', CO',
            id: 23788,
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
              1: 'In progress', 2: 'In progress', 3: 'Not started', 4: 'Not started',
            },
            regionId: 1,
            submissionStatus: 'draft',
            calculatedStatus: 'draft',
            ttaType: [],
            updatedAt: '2023-06-21T18:14:42.989Z',
            approvedAt: null,
            imported: null,
            creatorRole: 'Central Office',
            createdAt: '2023-06-21T18:06:00.221Z',
            ActivityReportObjective: {
              id: 104905, activityReportId: 23788, objectiveId: 95300, arOrder: 1, title: 'dfghdfgh', status: OBJECTIVE_STATUS.NOT_STARTED, ttaProvided: '<p>dfgh</p>\n', createdAt: '2023-06-21T18:13:20.063Z', updatedAt: '2023-06-21T18:13:20.094Z',
            },
          }],
          value: 95300,
          ids: [95300],
          recipientIds: [],
          isNew: false,
        }],
        prompts: [],
        goalNumbers: ['G-37505'],
        goalIds: [37505],
        grants: [{
          id: 11606,
          number: '02bear011606',
          annualFundingMonth: 'January',
          cdi: false,
          status: 'Active',
          grantSpecialistName: 'Marian Daugherty',
          grantSpecialistEmail: 'Effie.McCullough@gmail.com',
          programSpecialistName: 'Eddie Denesik DDS',
          programSpecialistEmail: 'Darryl_Kunde7@yahoo.com',
          stateCode: 'RI',
          startDate: '2020-01-01T00:00:00.000Z',
          endDate: '2024-12-31T00:00:00.000Z',
          inactivationDate: null,
          inactivationReason: null,
          recipientId: 757,
          oldGrantId: 8609,
          deleted: false,
          createdAt: '2021-03-16T01:20:44.754Z',
          updatedAt: '2022-09-28T15:03:28.488Z',
          regionId: 1,
          recipient: {
            id: 757, uei: 'GAKEGQ34K338', name: 'Dooley and Sons', recipientType: 'Private/Public Non-Profit (Non-CAA) (e.g., church or non-profit hospital)', deleted: false, createdAt: '2021-03-16T01:20:43.530Z', updatedAt: '2022-09-28T15:03:26.279Z',
          },
          numberWithProgramTypes: '02bear011606 ',
          name: 'Dooley and Sons - 02bear011606 ',
          goalId: 37505,
        }],
        grantIds: [11606],
        isNew: false,
      }]);

      const edit = await screen.findByRole('button', { name: /edit/i });
      act(() => {
        userEvent.click(edit);
      });

      message = screen.queryByText('Add a TTA objective and save as draft to upload resources.');
      expect(message).toBeNull();

      const didYouUse = await screen.findAllByText(/Did you use any other TTA resources/i);
      expect(didYouUse).toHaveLength(2);

      didYouUse.forEach((el) => {
        expect(el).toBeVisible();
      });
      expect(screen.getByRole('group', { name: /did you use an ipd course as a resource\?/i })).toBeVisible();
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
