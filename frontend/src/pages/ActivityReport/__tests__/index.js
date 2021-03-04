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

import { withText } from '../../../testHelpers';
import ActivityReport from '../index';
import { SCOPE_IDS, REPORT_STATUSES } from '../../../Constants';

const formData = () => ({
  regionId: 1,
  deliveryMethod: 'in-person',
  ttaType: ['training'],
  duration: '1',
  pageState: {
    1: 'in-progress',
    2: 'in-progress',
    3: 'in-progress',
    4: 'in-progress',
  },
  endDate: moment().format('MM/DD/YYYY'),
  activityRecipients: ['Grantee Name 1'],
  numberOfParticipants: '1',
  reason: ['reason 1'],
  activityRecipientType: 'grantee',
  collaborators: [],
  participants: ['CEO / CFO / Executive'],
  programTypes: ['type 1'],
  requester: 'grantee',
  status: REPORT_STATUSES.DRAFT,
  resourcesUsed: 'eclkcurl',
  startDate: moment().format('MM/DD/YYYY'),
  targetPopulations: ['target 1'],
  author: { name: 'test' },
  topics: 'first',
  userId: 1,
  updatedAt: new Date().toISOString(),
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
          id: userId, name: 'Walter Burns', role: 'Reporter', permissions: [{ regionId: 1, scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS }],
        }}
      />
    </Router>,
  );
};

const recipients = {
  grants: [{ name: 'grantee', grants: [{ activityRecipientId: 1, name: 'grant' }] }],
  nonGrantees: [{ activityRecipientId: 1, name: 'nonGrantee' }],
};

describe('ActivityReport', () => {
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
      expect(screen.queryByTestId('alert')).toBeNull();
    });
  });

  it('program type is hidden unless grantee is selected', async () => {
    renderActivityReport('new');
    const information = await screen.findByRole('group', { name: 'Who was the activity for?' });
    await waitFor(() => expect(screen.queryByLabelText('Program type(s)')).toBeNull());
    const nonGrantee = within(information).getByLabelText('Grantee');
    fireEvent.click(nonGrantee);
    await waitFor(() => expect(screen.queryByLabelText('Program type(s) (Required)')).toBeVisible());
  });

  it('defaults to activity summary if no page is in the url', async () => {
    renderActivityReport('new', null);
    await waitFor(() => expect(history.location.pathname).toEqual('/activity-reports/new/activity-summary'));
  });

  describe('updatePage', () => {
    it('navigates to the correct page', async () => {
      renderActivityReport('new');
      const button = await screen.findByRole('button', { name: 'Topics and resources Not Started' });
      userEvent.click(button);
      await waitFor(() => expect(history.location.pathname).toEqual('/activity-reports/new/topics-resources'));
    });
  });

  describe('onSave', () => {
    it('calls "report create"', async () => {
      renderActivityReport('new');
      fetchMock.post('/api/activity-reports', { id: 1 });
      const information = await screen.findByRole('group', { name: 'Who was the activity for?' });
      const grantee = within(information).getByLabelText('Grantee');
      fireEvent.click(grantee);
      const granteeSelectbox = await screen.findByRole('textbox', { name: 'Grantee name(s) (Required)' });
      await reactSelectEvent.select(granteeSelectbox, ['grant']);

      const button = await screen.findByRole('button', { name: 'Save draft' });
      userEvent.click(button);

      await waitFor(() => expect(fetchMock.called('/api/activity-reports')).toBeTruthy());
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

  describe('grantee select', () => {
    describe('changes the recipient selection to', () => {
      it('Grantee', async () => {
        renderActivityReport('new');
        const information = await screen.findByRole('group', { name: 'Who was the activity for?' });
        const grantee = within(information).getByLabelText('Grantee');
        fireEvent.click(grantee);
        const granteeSelectbox = await screen.findByRole('textbox', { name: 'Grantee name(s) (Required)' });
        reactSelectEvent.openMenu(granteeSelectbox);
        expect(await screen.findByText(withText('grant'))).toBeVisible();
      });

      it('Non-grantee', async () => {
        renderActivityReport('new');
        const information = await screen.findByRole('group', { name: 'Who was the activity for?' });
        const nonGrantee = within(information).getByLabelText('Non-Grantee');
        fireEvent.click(nonGrantee);
        const granteeSelectbox = await screen.findByRole('textbox', { name: 'Grantee name(s) (Required)' });
        reactSelectEvent.openMenu(granteeSelectbox);
        expect(await screen.findByText(withText('nonGrantee'))).toBeVisible();
      });
    });

    it('clears selection when non-grantee is selected', async () => {
      renderActivityReport('new');
      const enabled = await screen.findByRole('textbox', { name: 'Grantee name(s) (Required)' });
      expect(enabled).toBeDisabled();
      const information = await screen.findByRole('group', { name: 'Who was the activity for?' });
      const grantee = within(information).getByLabelText('Grantee');
      fireEvent.click(grantee);
      const disabled = await screen.findByRole('textbox', { name: 'Grantee name(s) (Required)' });
      expect(disabled).not.toBeDisabled();
    });
  });
});
