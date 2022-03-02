import '@testing-library/jest-dom';
import React from 'react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import reactSelectEvent from 'react-select-event';
import {
  render, screen, fireEvent, waitFor, within,
} from '@testing-library/react';
import moment from 'moment';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';

import { mockWindowProperty, withText } from '../../../testHelpers';
import ActivityReport, { unflattenResourcesUsed, findWhatsChanged } from '../index';
import { SCOPE_IDS, REPORT_STATUSES } from '../../../Constants';

const formData = (d) => ({
  regionId: 1,
  deliveryMethod: 'in-person',
  ttaType: ['training'],
  approvers: [],
  duration: '1',
  pageState: {
    1: 'in-progress',
    2: 'in-progress',
    3: 'in-progress',
    4: 'in-progress',
  },
  endDate: moment().format('MM/DD/YYYY'),
  activityRecipients: ['Recipient Name 1'],
  numberOfParticipants: '1',
  reason: ['reason 1'],
  activityRecipientType: 'recipient',
  collaborators: [],
  participants: ['CEO / CFO / Executive'],
  requester: 'recipient',
  calculatedStatus: REPORT_STATUSES.DRAFT,
  submissionStatus: REPORT_STATUSES.DRAFT,
  resourcesUsed: 'eclkcurl',
  startDate: moment().format('MM/DD/YYYY'),
  targetPopulations: ['target 1'],
  author: { name: 'test' },
  topics: 'first',
  userId: 1,
  updatedAt: new Date().toISOString(),
  ...d,
});
const history = createMemoryHistory();

const renderActivityReport = (id, location = 'activity-summary', showLastUpdatedTime = null, userId = 1) => {
  render(
    <Router history={history}>
      <ActivityReport
        match={{ params: { currentPage: location, activityReportId: id }, path: '', url: '' }}
        location={{
          state: { showLastUpdatedTime }, hash: '', pathname: '', search: '',
        }}
        user={{
          id: userId, name: 'Walter Burns', role: ['Reporter'], permissions: [{ regionId: 1, scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS }],
        }}
      />
    </Router>,
  );
};

const recipients = {
  grants: [{ name: 'recipient', grants: [{ activityRecipientId: 1, name: 'Recipient Name' }] }],
  otherEntities: [{ activityRecipientId: 1, name: 'otherEntity' }],
};

describe('ActivityReport', () => {
  const setItem = jest.fn();
  const getItem = jest.fn();

  mockWindowProperty('localStorage', {
    setItem,
    getItem,
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

  describe('local storage fallbacks', () => {
    const additionalData = {
      recipients: {
        grants: [],
        otherEntities: [],
      },
      collaborators: [],
      availableApprovers: [],
    };

    // beforeEach(async () => {
    //   fetchMock.reset();
    // });

    it('knows what to do when the local data is newer than the network data', async () => {
      getItem
        .mockReturnValueOnce(JSON.stringify(formData()))
        .mockReturnValueOnce(JSON.stringify(additionalData))
        .mockReturnValueOnce(JSON.stringify(true))
        .mockReturnValueOnce(JSON.stringify(formData()))
        .mockReturnValueOnce(JSON.stringify(additionalData))
        .mockReturnValueOnce(JSON.stringify(true));

      const updatedAt = moment().subtract(1, 'day').toISOString();
      const d = formData({ updatedAt });
      fetchMock.get('/api/activity-reports/1', d);

      renderActivityReport('1', 'activity-summary', true);
      await screen.findByRole('group', { name: 'Who was the activity for?' }, { timeout: 4000 });
      const [alert] = await screen.findAllByTestId('alert');
      expect(alert).toBeVisible();

      const today = moment().format('MM/DD/YYYY');
      const reggie = new RegExp(`this report was last saved on ${today}`, 'i');

      expect(alert.textContent.match(reggie).length).toBe(1);
    });

    it('handles failure to download a report from the network with local storage fallback', async () => {
      getItem
        .mockReturnValueOnce(JSON.stringify(formData()))
        .mockReturnValueOnce(JSON.stringify(additionalData))
        .mockReturnValueOnce(JSON.stringify(true))
        .mockReturnValueOnce(JSON.stringify(formData()))
        .mockReturnValueOnce(JSON.stringify(additionalData))
        .mockReturnValueOnce(JSON.stringify(true));

      fetchMock.get('/api/activity-reports/1', () => { throw new Error('unable to download report'); });
      renderActivityReport('1', 'activity-summary', true);
      await screen.findByRole('group', { name: 'Who was the activity for?' }, { timeout: 4000 });
      expect(getItem).toHaveBeenCalled();
      expect(setItem).toHaveBeenCalled();
      const alert = await screen.findByText(/ We found saved work on your computer, and we've loaded that instead/i);
      expect(alert).toBeVisible();
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
      expect(screen.queryByTestId('alert')).toBeNull();
    });
  });

  it('defaults to activity summary if no page is in the url', async () => {
    renderActivityReport('new', null);
    await waitFor(() => expect(history.location.pathname).toEqual('/activity-reports/new/activity-summary'));
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
      await userEvent.click(button);
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
        expect(await within(recipientNames).queryAllByText(/recipient name/i).length).toBe(2);
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
