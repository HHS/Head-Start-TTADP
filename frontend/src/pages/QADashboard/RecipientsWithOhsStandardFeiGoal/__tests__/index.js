import '@testing-library/jest-dom';
import React from 'react';
import moment from 'moment';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { SCOPE_IDS } from '@ttahub/common';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipientsWithOhsStandardFeiGoal from '../index';
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

const recipientsWithOhsStandardFeiGoalEmptyData = {
  headers: ['Recipient', 'Date of Last TTA', 'Days Since Last TTA'],
  RecipientsWithNoTta: [],
};

const recipientsWithOhsStandardFeiGoalData = {
  headers: ['Goal created on', 'Goal number', 'Goal status', 'Root cause'],
  RecipientsWithOhsStandardFeiGoal: [
    {
      id: 1,
      heading: 'Test Recipient 1',
      name: 'Test Recipient 1',
      recipient: 'Test Recipient 1',
      isUrl: true,
      hideLinkIcon: true,
      link: '/recipient-tta-records/376/region/1/profile',
      data: [{
        title: 'Goal_created_on',
        value: moment('2021-09-01').format('MM/DD/YYYY'),
      },
      {
        title: 'Goal_number',
        value: 'G-20628',
      },
      {
        title: 'Goal_status',
        value: 'In progress',
      },
      {
        title: 'Root_cause',
        value: 'Community Partnership, Workforce',
      },
      ],
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
        title: 'Goal_created_on',
        value: moment('2021-09-02').format('MM/DD/YYYY'),
      },
      {
        title: 'Goal_number',
        value: 'G-359813',
      },
      {
        title: 'Goal_status',
        value: 'Not started',
      },
      {
        title: 'Root_cause',
        value: 'Testing',
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
        title: 'Goal_created_on',
        value: moment('2021-09-03').format('MM/DD/YYYY'),
      },
      {
        title: 'Goal_number',
        value: 'G-457825',
      },
      {
        title: 'Goal_status',
        value: 'In progress',
      },
      {
        title: 'Root_cause',
        value: 'Facilities',
      }],
    }],
};

const renderRecipientsWithOhsStandardFeiGoal = (user = defaultUser) => {
  render(
    <Router history={history}>
      <UserContext.Provider value={{ user }}>
        <RecipientsWithOhsStandardFeiGoal />
      </UserContext.Provider>
    </Router>,
  );
};

describe('Recipients With Ohs Standard Fei Goal', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  it('renders correctly without data', async () => {
    fetchMock.get('/api/ssdi/recipients-with-ohs-standard-fei-goal?region.in[]=1&region.in[]=2', recipientsWithOhsStandardFeiGoalEmptyData);
    renderRecipientsWithOhsStandardFeiGoal();

    expect(screen.queryAllByRole('heading', { name: /recipients with ohs standard fei goal/i }).length).toBe(1);
    expect(screen.getByText(/root causes were identified through self-reported data\./i)).toBeInTheDocument();
  });

  it('renders correctly with data', async () => {
    fetchMock.get('/api/ssdi/recipients-with-ohs-standard-goal?region.in[]=1&region.in[]=2', recipientsWithOhsStandardFeiGoalData);
    renderRecipientsWithOhsStandardFeiGoal();

    expect(screen.queryAllByRole('heading', { name: /recipients with ohs standard fei goal/i }).length).toBe(1);
    expect(screen.getByText(/root causes were identified through self-reported data\./i)).toBeInTheDocument();
    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText(/Test Recipient 1/i)).toBeInTheDocument();
        expect(screen.getByText(/Test Recipient 2/i)).toBeInTheDocument();
        expect(screen.getByText(/Test Recipient 3/i)).toBeInTheDocument();

        expect(screen.getByText('09/01/2021')).toBeInTheDocument();
        expect(screen.getByText('09/02/2021')).toBeInTheDocument();
        expect(screen.getByText('09/03/2021')).toBeInTheDocument();

        expect(screen.getByText(/G-20628/i)).toBeInTheDocument();
        expect(screen.getByText(/G-359813/i)).toBeInTheDocument();
        expect(screen.getByText(/G-457825/i)).toBeInTheDocument();

        expect(screen.queryAllByText(/In progress/i).length).toBe(2);
        expect(screen.getByText(/Not started/i)).toBeInTheDocument();

        expect(screen.getByText(/Community Partnership, Workforce/i)).toBeInTheDocument();
        expect(screen.getByText(/Testing/i)).toBeInTheDocument();
        expect(screen.getByText(/Facilities/i)).toBeInTheDocument();
      });
    });
  });

  it('handles a user with only one region', async () => {
    const u = {
      homeRegionId: 14,
      permissions: [{
        regionId: 2,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };
    fetchMock.get('/api/ssdi/recipients-with-ohs-standard-fei-goal?region.in[]=1&region.in[]=2', recipientsWithOhsStandardFeiGoalData);
    renderRecipientsWithOhsStandardFeiGoal(u);

    expect(screen.queryAllByRole('heading', { name: /recipients with ohs standard fei goal/i }).length).toBe(1);
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
