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

const formData = () => ({
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
  participants: ['CEO / CFO / Executive'],
  programTypes: ['type 1'],
  requester: 'grantee',
  resourcesUsed: 'eclkcurl',
  startDate: moment().format('MM/DD/YYYY'),
  targetPopulations: ['target 1'],
  topics: 'first',
});
const history = createMemoryHistory();

const renderActivityReport = (id, location = 'activity-summary') => {
  render(
    <Router history={history}>
      <ActivityReport
        match={{ params: { currentPage: location, activityReportId: id }, path: '', url: '' }}
        location={{
          state: undefined, hash: '', pathname: '', search: '',
        }}
        user={{ id: 1 }}
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
    fetchMock.get('/api/activity-reports/activity-recipients', recipients);
    fetchMock.get('/api/users/collaborators?region=1', []);
    fetchMock.get('/api/activity-reports/approvers?region=1', []);
  });

  it('defaults to activity summary if no page is in the url', async () => {
    renderActivityReport('new', null);
    await waitFor(() => expect(history.location.pathname).toEqual('/activity-reports/new/activity-summary'));
  });

  describe('updatePage', () => {
    it('navigates to the correct page', async () => {
      renderActivityReport('new');
      const button = await screen.findByRole('button', { name: 'Topics and resources' });
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
      const granteeSelectbox = await screen.findByRole('textbox', { name: 'Grantee name(s)' });
      await reactSelectEvent.select(granteeSelectbox, ['grant']);

      const button = await screen.findByRole('button', { name: 'Topics and resources' });
      userEvent.click(button);

      await waitFor(() => expect(fetchMock.called('/api/activity-reports')).toBeTruthy());
    });

    it('calls "report update"', async () => {
      fetchMock.get('/api/activity-reports/1', formData());
      fetchMock.put('/api/activity-reports/1', {});
      renderActivityReport(1);
      const button = await screen.findByRole('button', { name: 'Topics and resources' });
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
        const granteeSelectbox = await screen.findByRole('textbox', { name: 'Grantee name(s)' });
        reactSelectEvent.openMenu(granteeSelectbox);
        expect(await screen.findByText(withText('grant'))).toBeVisible();
      });

      it('Non-grantee', async () => {
        renderActivityReport('new');
        const information = await screen.findByRole('group', { name: 'Who was the activity for?' });
        const nonGrantee = within(information).getByLabelText('Non-Grantee');
        fireEvent.click(nonGrantee);
        const granteeSelectbox = await screen.findByRole('textbox', { name: 'Grantee name(s)' });
        reactSelectEvent.openMenu(granteeSelectbox);
        expect(await screen.findByText(withText('nonGrantee'))).toBeVisible();
      });
    });

    it('clears selection when non-grantee is selected', async () => {
      renderActivityReport('new');
      const enabled = await screen.findByRole('textbox', { name: 'Grantee name(s)' });
      expect(enabled).toBeDisabled();
      const information = await screen.findByRole('group', { name: 'Who was the activity for?' });
      const grantee = within(information).getByLabelText('Grantee');
      fireEvent.click(grantee);
      const disabled = await screen.findByRole('textbox', { name: 'Grantee name(s)' });
      expect(disabled).not.toBeDisabled();
    });
  });

  describe('method checkboxes', () => {
    it('require a single selection for the form to be valid', async () => {
      const data = formData();
      delete data.deliveryMethod;
      fetchMock.get('/api/activity-reports/1', data);

      renderActivityReport(1);
      expect(await screen.findByText('Continue')).toBeDisabled();
      const box = await screen.findByLabelText('Virtual');
      fireEvent.click(box);
      await waitFor(() => expect(screen.getByText('Continue')).not.toBeDisabled());
    });
  });

  describe('tta checkboxes', () => {
    it('requires a single selection for the form to be valid', async () => {
      const data = formData();
      delete data.ttaType;
      fetchMock.get('/api/activity-reports/1', data);

      renderActivityReport(1);
      expect(await screen.findByText('Continue')).toBeDisabled();
      const box = await screen.findByLabelText('Training');
      fireEvent.click(box);
      await waitFor(() => expect(screen.getByText('Continue')).not.toBeDisabled());
    });
  });
});
