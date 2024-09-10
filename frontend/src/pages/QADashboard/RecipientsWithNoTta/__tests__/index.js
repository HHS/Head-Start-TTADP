import '@testing-library/jest-dom';
import React from 'react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { SCOPE_IDS } from '@ttahub/common';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const renderRecipientsWithNoTta = (data, user = defaultUser) => {
  render(
    <UserContext.Provider value={{ user }}>
      <Router history={history}>
        <RecipientsWithNoTta
          data={data}
          loading={false}
          resetPagination={false}
          setResetPagination={() => {}}
          perPageNumber={10}
        />
      </Router>
    </UserContext.Provider>,
  );
};

describe('Recipients With Ohs Standard Fei Goal', () => {
  it('renders correctly without data', async () => {
    const emptyData = {
      headers: ['Recipient', 'Date of Last TTA', 'Days Since Last TTA'],
      RecipientsWithNoTta: [],
    };
    renderRecipientsWithNoTta(emptyData);
    expect(screen.queryAllByText(/recipients with no tta/i).length).toBe(2);
    expect(screen.getByText(/Recipients without Activity Reports or Training Reports for more than 90 days./i)).toBeInTheDocument();
  });

  it('renders correctly with data', async () => {
    const data = {
      headers: ['Goal created on', 'Goal number', 'Goal status', 'Root cause'],
      RecipientsWithOhsStandardFeiGoal: [
        {
          heading: 'Test Recipient 1',
          name: 'Test Recipient 1',
          recipient: 'Test Recipient 1',
          isUrl: true,
          hideLinkIcon: true,
          link: '/recipient-tta-records/376/region/1/profile',
          data: [{
            title: 'Goal_created_on',
            value: '2021-09-01',
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
          heading: 'Test Recipient 2',
          name: 'Test Recipient 2',
          recipient: 'Test Recipient 2',
          isUrl: true,
          hideLinkIcon: true,
          link: '/recipient-tta-records/376/region/1/profile',
          data: [{
            title: 'Goal_created_on',
            value: '2021-09-02',
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
          heading: 'Test Recipient 3',
          name: 'Test Recipient 3',
          recipient: 'Test Recipient 3',
          isUrl: true,
          hideLinkIcon: true,
          link: '/recipient-tta-records/376/region/1/profile',
          data: [{
            title: 'Goal_created_on',
            value: '2021-09-03',
          },
          {
            title: 'Goal_number',
            value: 'G-457825',
          },
          {
            title: 'Goal_status',
            value: 'Unavailable',
          },
          {
            title: 'Root_cause',
            value: 'Facilities',
          }],
        }],
    };
    renderRecipientsWithNoTta(data);
    expect(screen.queryAllByText(/recipients with no tta/i).length).toBe(2);
    expect(screen.getByText(/Recipients without Activity Reports or Training Reports for more than 90 days./i)).toBeInTheDocument();

    expect(screen.getByText(/test recipient 1/i)).toBeInTheDocument();
    expect(screen.getByText(/test recipient 2/i)).toBeInTheDocument();

    expect(screen.getByText(/date of last tta/i)).toBeInTheDocument();
    expect(screen.getByText(/days since last tta/i)).toBeInTheDocument();

    expect(screen.getByText(/2021-09-01/i)).toBeInTheDocument();
    expect(screen.getByText(/2021-09-02/i)).toBeInTheDocument();

    expect(screen.getByRole('cell', { name: /90/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /91/i })).toBeInTheDocument();
  });
  it('handles a user with only one region', async () => {
    const data = {
      headers: ['Goal created on', 'Goal number', 'Goal status', 'Root cause'],
      RecipientsWithOhsStandardFeiGoal: [
        {
          heading: 'Test Recipient 1',
          name: 'Test Recipient 1',
          recipient: 'Test Recipient 1',
          isUrl: true,
          hideLinkIcon: true,
          link: '/recipient-tta-records/376/region/1/profile',
          data: [{
            title: 'Goal_created_on',
            value: '2021-09-01',
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
          heading: 'Test Recipient 2',
          name: 'Test Recipient 2',
          recipient: 'Test Recipient 2',
          isUrl: true,
          hideLinkIcon: true,
          link: '/recipient-tta-records/376/region/1/profile',
          data: [{
            title: 'Goal_created_on',
            value: '2021-09-02',
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
          heading: 'Test Recipient 3',
          name: 'Test Recipient 3',
          recipient: 'Test Recipient 3',
          isUrl: true,
          hideLinkIcon: true,
          link: '/recipient-tta-records/376/region/1/profile',
          data: [{
            title: 'Goal_created_on',
            value: '2021-09-03',
          },
          {
            title: 'Goal_number',
            value: 'G-457825',
          },
          {
            title: 'Goal_status',
            value: 'Unavailable',
          },
          {
            title: 'Root_cause',
            value: 'Facilities',
          }],
        }],
    };
    const u = {
      homeRegionId: 14,
      permissions: [{
        regionId: 2,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };
    renderRecipientsWithNoTta(data, u);
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
