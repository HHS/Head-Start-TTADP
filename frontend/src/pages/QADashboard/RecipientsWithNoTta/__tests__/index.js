import '@testing-library/jest-dom';
import React from 'react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { SCOPE_IDS } from '@ttahub/common';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import RecipientsWithNoTta from '../index';
import UserContext from '../../../../UserContext';

const history = createMemoryHistory();

const defaultUser = {
  homeRegionId: 14,
  permissions: [{
    regionId: 1,
    scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
  }, {
    regionId: 2,
    scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
  }],
};

const RecipientsWithNoTtaDataEmpty = {
  headers: ['Date of Last TTA', 'Days Since Last TTA'],
  RecipientsWithNoTta: [],
};

const RecipientsWithNoTtaData = {
  headers: ['Date of Last TTA', 'Days Since Last TTA'],
  RecipientsWithNoTta: [
    {
      id: 1,
      heading: 'Test Recipient 1',
      name: 'Test Recipient 1',
      recipient: 'Test Recipient 1',
      isUrl: true,
      hideLinkIcon: true,
      link: '/recipient-tta-records/376/region/1/profile',
      data: [{
        title: 'Date_of_Last_TTA',
        value: '2021-09-01',
      },
      {
        title: 'Days_Since_Last_TTA',
        value: '90',
      }],
    },
    {
      id: 2,
      heading: 'Test Recipient 2',
      name: 'Test Recipient 2',
      recipient: 'Test Recipient 2',
      isUrl: true,
      hideLinkIcon: true,
      link: '/recipient-tta-records/376/region/1/profile',
      data: [{
        title: 'Date_of_Last_TTA',
        value: '2021-09-02',
      },
      {
        title: 'Days_Since_Last_TTA',
        value: '91',
      }],
    },
    {
      id: 3,
      heading: 'Test Recipient 3',
      name: 'Test Recipient 3',
      recipient: 'Test Recipient 3',
      isUrl: true,
      hideLinkIcon: true,
      link: '/recipient-tta-records/376/region/1/profile',
      data: [{
        title: 'Date_of_Last_TTA',
        value: '2021-09-03',
      },
      {
        title: 'Days_Since_Last_TTA',
        value: '92',
      }],
    }],
};

const renderRecipientsWithNoTta = (user = defaultUser) => {
  render(
    <UserContext.Provider value={{ user }}>
      <Router history={history}>
        <RecipientsWithNoTta />
      </Router>
    </UserContext.Provider>,
  );
};

describe('Recipients With Ohs Standard Fei Goal', () => {
  afterEach(() => fetchMock.restore());

  it('renders correctly without data', async () => {
    fetchMock.get('/api/ssdi/api/dashboards/qa/no-tta.sql?region.in[]=1&region.in[]=2&dataSetSelection[]=no_tta_widget', RecipientsWithNoTtaDataEmpty);
    renderRecipientsWithNoTta();
    expect(screen.queryAllByText(/recipients with no tta/i).length).toBe(2);
    expect(screen.getByText(/Recipients without Activity Reports or Training Reports for more than 90 days./i)).toBeInTheDocument();
  });

  it('renders correctly with data', async () => {
    fetchMock.get('/api/ssdi/api/dashboards/qa/no-tta.sql?region.in[]=1&region.in[]=2&dataSetSelection[]=no_tta_widget', RecipientsWithNoTtaData);
    renderRecipientsWithNoTta();
    expect(screen.queryAllByText(/recipients with no tta/i).length).toBe(2);
    expect(screen.getByText(/Recipients without Activity Reports or Training Reports for more than 90 days./i)).toBeInTheDocument();

    await act(async () => {
      await waitFor(async () => {
        expect(screen.getByText(/test recipient 1/i)).toBeInTheDocument();
        expect(screen.getByText(/test recipient 2/i)).toBeInTheDocument();

        expect(screen.getByText(/date of last tta/i)).toBeInTheDocument();
        expect(screen.getByText(/days since last tta/i)).toBeInTheDocument();

        expect(screen.getByText(/2021-09-01/i)).toBeInTheDocument();
        expect(screen.getByText(/2021-09-02/i)).toBeInTheDocument();

        expect(screen.getByRole('cell', { name: /90/i })).toBeInTheDocument();
        expect(screen.getByRole('cell', { name: /91/i })).toBeInTheDocument();
      });
    });
  });

  it('handles a user with only one region', async () => {
    fetchMock.get('/api/ssdi/api/dashboards/qa/no-tta.sql?&dataSetSelection[]=no_tta_widget', RecipientsWithNoTtaData);
    const u = {
      homeRegionId: 14,
      permissions: [{
        regionId: 2,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };
    renderRecipientsWithNoTta(u);
    expect(screen.queryAllByText(/recipients with no tta/i).length).toBe(2);
    expect(screen.getByText(/Recipients without Activity Reports or Training Reports for more than 90 days./i)).toBeInTheDocument();
    const filters = await screen.findByRole('button', { name: /open filters for this page/i });

    act(() => {
      userEvent.click(filters);
    });

    const select = await screen.findByLabelText(/select a filter/i);

    // expect select not to have "region" as an option
    const option = select.querySelector('option[value="region"]');
    expect(option).toBeNull();
  });
});
