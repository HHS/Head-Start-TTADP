import '@testing-library/jest-dom';
import reactSelectEvent from 'react-select-event';
import {
  screen, fireEvent, waitFor, within,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';

import { mockWindowProperty, withText } from '../../../testHelpers';
import { unflattenResourcesUsed, findWhatsChanged } from '../index';
import { REPORT_STATUSES } from '../../../Constants';

import {
  history, formData, renderActivityReport, recipients,
} from '../testHelpers';

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
    fetchMock.get('/api/activity-reports/1', () => { throw new Error('unable to download report'); });
    renderActivityReport('1', 'activity-summary', true);
    const alert = await screen.findByTestId('alert');
    expect(alert).toHaveTextContent('Unable to load activity report');
  });

  describe('for read only users', () => {
    it('redirects the user to the review page', async () => {
      const data = formData();
      fetchMock.get('/api/activity-reports/1', data);
      renderActivityReport('1', null, null, 2);
      await waitFor(() => expect(history.location.pathname).toEqual('/activity-reports/1/review'));
    });
  });

  it('handles when region is invalid', async () => {
    fetchMock.get('/api/activity-reports/-1', () => { throw new Error('unable to download report'); });

    renderActivityReport('-1');
    const alert = await screen.findByTestId('alert');
    expect(alert).toHaveTextContent('Unable to load activity report');
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

      const reggie = new RegExp('this report was last saved to your local backup', 'i');
      expect(alert.textContent.match(reggie).length).toBe(1);
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

  describe('updatePage', () => {
    it('navigates to the correct page', async () => {
      fetchMock.post('/api/activity-reports', { id: 1 });
      renderActivityReport('new');
      const button = await screen.findByRole('button', { name: 'Topics and resources Not Started' });
      userEvent.click(button);
      await waitFor(() => expect(history.location.pathname).toEqual('/activity-reports/1/topics-resources'));
    });
  });

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
      fetchMock.post('/api/activity-reports', { id: 1 });
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

    it('calls "report update"', async () => {
      fetchMock.get('/api/activity-reports/1', formData());
      fetchMock.put('/api/activity-reports/1', {});
      renderActivityReport(1);
      const button = await screen.findByRole('button', { name: 'Topics and resources In Progress' });
      userEvent.click(button);
      await waitFor(() => expect(fetchMock.called('/api/activity-reports/1')).toBeTruthy());
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
