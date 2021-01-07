import '@testing-library/jest-dom';
import moment from 'moment';
import React from 'react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import reactSelectEvent from 'react-select-event';
import {
  render, screen, fireEvent, waitFor, within,
} from '@testing-library/react';

import { withText } from '../../../testHelpers';
import ActivityReport from '../index';

const formData = () => ({
  activityMethod: 'in-person',
  activityType: ['training'],
  duration: '1',
  endDate: moment().format('MM/DD/YYYY'),
  grantees: ['Grantee Name 1'],
  numberOfParticipants: '1',
  participantCategory: 'grantee',
  participants: ['CEO / CFO / Executive'],
  programTypes: ['type 1'],
  requester: 'grantee',
  resourcesUsed: 'eclkcurl',
  startDate: moment().format('MM/DD/YYYY'),
  targetPopulations: ['target 1'],
  topics: 'first',
});
const history = createMemoryHistory();

const renderActivityReport = (data = {}, location = 'activity-summary', reportId = 'test') => {
  fetch.mockResponse(JSON.stringify({
    report: data,
    additionalData: {},
    pageState: {},
  }));

  render(
    <Router history={history}>
      <ActivityReport
        match={{ params: { currentPage: location, activityReportId: reportId }, path: '', url: '' }}
      />
    </Router>,
  );
};

describe('ActivityReport', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  it('defaults to activity summary if no page is in the url', async () => {
    renderActivityReport({}, null);
    await waitFor(() => expect(history.location.pathname).toEqual('/activity-reports/test/activity-summary'));
  });

  describe('grantee select', () => {
    describe('changes the participant selection to', () => {
      it('Grantee', async () => {
        renderActivityReport();
        await screen.findByText('New activity report for Region 14');
        const information = await screen.findByRole('group', { name: 'Who was the activity for?' });
        const grantee = await within(information).findByLabelText('Grantee');
        fireEvent.click(grantee);
        const granteeSelectbox = await screen.findByLabelText('Grantee name(s)');
        reactSelectEvent.openMenu(granteeSelectbox);
        expect(await screen.findByText(withText('Grantee Name 1'))).toBeVisible();
      });

      it('Non-grantee', async () => {
        renderActivityReport();
        await screen.findByText('New activity report for Region 14');
        const information = await screen.findByRole('group', { name: 'Who was the activity for?' });
        const nonGrantee = await within(information).findByLabelText('Non-Grantee');
        fireEvent.click(nonGrantee);
        const granteeSelectbox = await screen.findByLabelText('Non-grantee name(s)');
        reactSelectEvent.openMenu(granteeSelectbox);
        expect(await screen.findByText(withText('QRIS System'))).toBeVisible();
      });
    });

    it('clears selection when non-grantee is selected', async () => {
      const data = formData();
      renderActivityReport(data);
      await screen.findByText('New activity report for Region 14');
      const information = await screen.findByRole('group', { name: 'Who was the activity for?' });
      const enabled = await within(information).findByText('Grantee Name 1');
      expect(enabled).not.toBeDisabled();
      const nonGrantee = await within(information).findByLabelText('Non-Grantee');

      fireEvent.click(nonGrantee);
      expect(await within(information).findByLabelText('Non-grantee name(s)')).toHaveValue('');
    });
  });

  describe('method checkboxes', () => {
    it('require a single selection for the form to be valid', async () => {
      const data = formData();
      delete data.activityMethod;

      renderActivityReport(data);
      expect(await screen.findByText('Continue')).toBeDisabled();
      const box = await screen.findByLabelText('Virtual');
      fireEvent.click(box);
      expect(await screen.findByText('Continue')).not.toBeDisabled();
    });
  });

  describe('tta checkboxes', () => {
    it('requires a single selection for the form to be valid', async () => {
      const data = formData();
      delete data.activityType;

      renderActivityReport(data);
      expect(await screen.findByText('Continue')).toBeDisabled();
      const box = await screen.findByLabelText('Training');
      fireEvent.click(box);
      expect(await screen.findByText('Continue')).not.toBeDisabled();
    });
  });
});
