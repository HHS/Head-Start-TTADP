/* eslint-disable jest/no-commented-out-tests */
/* eslint-disable jest/no-disabled-tests */
import '@testing-library/jest-dom';
import reactSelectEvent from 'react-select-event';
import {
  screen, fireEvent, waitFor, within,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';

import { mockWindowProperty, withText } from '../../../testHelpers';
import { unflattenResourcesUsed, findWhatsChanged, updateGoals } from '../index';
import {
  REPORT_STATUSES,
} from '../../../Constants';

import {
  history, formData, renderActivityReport, recipients,
} from '../testHelpers';
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

  afterEach(() => fetchMock.restore());

  beforeEach(() => {
    fetchMock.get('/api/activity-reports/activity-recipients?region=1', recipients);
    fetchMock.get('/api/users/collaborators?region=1', []);
    fetchMock.get('/api/activity-reports/approvers?region=1', []);
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
        approvers: [{ User: { id: 3 } }],
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
            User: {
              id: 3,
            },
          },
          {
            status: REPORT_STATUSES.APPROVED,
            User: {
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
        approvers: [{ User: { id: 3 } }],
      });
      renderActivityReport(1, 'activity-summary', null, 3);

      const startDate = await screen.findByRole('textbox', { name: /start date/i });
      expect(startDate).toBeVisible();
    });
  });

  describe('updateGoals', () => {
    it('sets new goals as such', () => {
      const report = {
        goals: [{
          id: 123,
          name: 'name',
        }],
      };
      const updateFn = updateGoals(report);
      const { goals } = updateFn({ goals: [{ id: 'id', name: 'name', new: true }] });

      expect(goals.length).toBe(1);
      expect(goals[0].id).toBe(123);
      expect(goals[0].new).toBeTruthy();
    });

    it('sets old goals as such', () => {
      const report = {
        goals: [{
          id: 123,
          name: 'name',
        }],
      };
      const updateFn = updateGoals(report);
      const { goals } = updateFn({ goals: [{ id: 'id', name: 'name' }] });
      expect(goals.length).toBe(1);
      expect(goals[0].id).toBe(123);
      expect(goals[0].new).toBeFalsy();
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
      const alert = screen.queryByTestId('alert');

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

  describe('resetToDraft', () => {
    it('navigates to the correct page', async () => {
      const data = formData();
      // load the report
      fetchMock.get('/api/activity-reports/3', {
        ...data,
        goals: [],
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      });
      // reset to draft
      fetchMock.put('/api/activity-reports/3/reset', { ...data, goals: [] });
      renderActivityReport(3, 'review');
      const button = await screen.findByRole('button', { name: /reset to draft/i });
      userEvent.click(button);
      const notes = await screen.findByRole('textbox', { name: /Additional notes/i });
      expect(notes).toBeVisible();
      expect(notes.getAttribute('contenteditable')).toBe('true');
    });
  });

  // describe('updatePage', () => {
  //   it('navigates to the correct page', async () => {
  //     fetchMock.post('/api/activity-reports', { id: 1 });
  //     renderActivityReport('new');
  //     const button = await screen.findByRole(
  //       'button', { name: 'Topics and resources Not Started' },
  //     );
  //     userEvent.click(button);
  //     await waitFor(() => expect(history.location.pathname).toEqual(
  //       '/activity-reports/1/topics-resources',
  //     ));
  //   });
  // });

  describe('onSave', () => {
    it('calls "report create"', async () => {
      renderActivityReport('new');
      fetchMock.post('/api/activity-reports', { id: 1 });
      const information = await screen.findByRole('group', { name: 'Who was the activity for?' });
      const recipient = within(information).getByLabelText('Recipient');
      fireEvent.click(recipient);
      const recipientSelectbox = await screen.findByRole('textbox', { name: 'Recipient name(s) (Required)' });
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
      const button = await screen.findByRole('button', { name: 'Save draft' });
      userEvent.click(button);
      await waitFor(() => expect(fetchMock.called('/api/activity-reports')).toBeTruthy());
      alerts = await screen.findAllByTestId('alert');
      expect(alerts.length).toBe(2);
      expect(alerts[0]).toHaveClass('alert-fade');
    });

    it('displays review submit save alert', async () => {
      renderActivityReport('new', 'review');
      fetchMock.post('/api/activity-reports', formData);
      const button = await screen.findByRole('button', { name: 'Save Draft' });
      userEvent.click(button);
      await waitFor(() => expect(fetchMock.called('/api/activity-reports')).toBeTruthy());
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
      expect(result).toEqual({ startDate: null, creatorRole: null });
    });

    it('displays the creator name', async () => {
      fetchMock.get('/api/activity-reports/1', formData());
      renderActivityReport(1);
      expect(await screen.findByText(/creator:/i)).toBeVisible();
    });

    // it('calls "report update"', async () => {
    //   fetchMock.get('/api/activity-reports/1', formData());
    //   fetchMock.put('/api/activity-reports/1', {});
    //   renderActivityReport(1);
    // const button = await screen.findByRole(
    //   'button', { name: 'Topics and resources In Progress' }
    // );
    //   userEvent.click(button);
    //   await waitFor(() => expect(fetchMock.called('/api/activity-reports/1')).toBeTruthy());
    // });

    it('automatically sets creator role on existing report', async () => {
      const data = formData();
      fetchMock.get('/api/activity-reports/1', { ...data, creatorRole: null });
      fetchMock.put('/api/activity-reports/1', {});
      renderActivityReport(1);

      const button = await screen.findByRole('button', { name: 'Save draft' });
      userEvent.click(button);

      const lastOptions = fetchMock.lastOptions();
      const bodyObj = JSON.parse(lastOptions.body);
      await waitFor(() => expect(fetchMock.called('/api/activity-reports/1')).toBeTruthy());
      expect(bodyObj.creatorRole).toEqual('Reporter');
    });
  });

  describe('recipient select', () => {
    describe('changes the recipient selection to', () => {
      it('Recipient', async () => {
        renderActivityReport('new');
        const information = await screen.findByRole('group', { name: 'Who was the activity for?' });
        const recipient = within(information).getByLabelText('Recipient');
        fireEvent.click(recipient);
        const recipientSelectbox = await screen.findByRole('textbox', { name: 'Recipient name(s) (Required)' });
        reactSelectEvent.openMenu(recipientSelectbox);

        const recipientNames = await screen.findByText(/recipient name\(s\)/i);
        expect(within(recipientNames).queryAllByText(/recipient name/i).length).toBe(2);
      });

      it('Other entity', async () => {
        renderActivityReport('new');
        const information = await screen.findByRole('group', { name: 'Who was the activity for?' });
        const otherEntity = within(information).getByLabelText('Other entity');
        fireEvent.click(otherEntity);
        const recipientSelectbox = await screen.findByRole('textbox', { name: 'Other entities (Required)' });
        reactSelectEvent.openMenu(recipientSelectbox);
        expect(await screen.findByText(withText('otherEntity'))).toBeVisible();
      });
    });

    it('clears selection when other entity is selected', async () => {
      renderActivityReport('new');
      let information = await screen.findByRole('group', { name: 'Who was the activity for?' });

      const recipient = within(information).getByLabelText('Recipient');
      fireEvent.click(recipient);

      let recipientSelectbox = await screen.findByRole('textbox', { name: 'Recipient name(s) (Required)' });
      reactSelectEvent.openMenu(recipientSelectbox);
      await reactSelectEvent.select(recipientSelectbox, ['Recipient Name']);

      const recipientNames = await screen.findByText(/recipient name\(s\)/i);
      expect(await within(recipientNames).queryAllByText(/recipient name/i).length).toBe(2);

      information = await screen.findByRole('group', { name: 'Who was the activity for?' });
      const otherEntity = within(information).getByLabelText('Other entity');
      fireEvent.click(otherEntity);
      fireEvent.click(recipient);

      recipientSelectbox = await screen.findByLabelText(/recipient name\(s\)/i);
      expect(within(recipientSelectbox).queryByText('Recipient Name')).toBeNull();
    });

    it('unflattens resources properly', async () => {
      const empty = unflattenResourcesUsed(undefined);
      expect(empty).toEqual([]);

      const good = unflattenResourcesUsed(['resource']);
      expect(good).toEqual([{ value: 'resource' }]);
    });
  });
});
