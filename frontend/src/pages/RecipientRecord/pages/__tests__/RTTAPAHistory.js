import React from 'react';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fetchMock from 'fetch-mock';
import join from 'url-join';
import userEvent from '@testing-library/user-event';
import { SCOPE_IDS } from '@ttahub/common';
import RTTAPAHistory from '../RTTAPAHistory';
import UserContext from '../../../../UserContext';

const rttapaUrl = join('/', 'api', 'rttapa');

describe('RTTAPAHistory', () => {
  const user = {
    name: 'test@test.com',
    homeRegionId: 1,
    permissions: [
      {
        scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
        regionId: 1,
      },
    ],
  };

  const renderRTTAPAHistory = (recipientId, regionId, recipientNameWithRegion) => {
    render(
      <MemoryRouter>
        <UserContext.Provider value={{ user }}>
          <RTTAPAHistory
            recipientId={recipientId}
            regionId={regionId}
            recipientNameWithRegion={recipientNameWithRegion}
          />
        </UserContext.Provider>
      </MemoryRouter>,
    );
  };

  afterEach(() => {
    fetchMock.restore();
  });

  it('displays RTTAPA history', async () => {
    const recipientId = '1';
    const regionId = '1';

    const url = join(
      rttapaUrl,
      'region',
      String(regionId),
      'recipient',
      String(recipientId),
      '?sortBy=reviewDate&direction=desc',
    );
    fetchMock.getOnce(url, [{
      id: 1,
      user: {
        name: 'Timmy the Tester',
      },
      notes: 'This is gooooood soup',
      reviewDate: '2021-01-01',
      regionId,
      recipientId,
      goals: [
        {
          id: 1,
          goalText: 'Goal 1',
          goalStatus: 'In Progress',
          isRttapa: 'Yes',
          goalTopics: ['Topic 1', 'Topic 2'],
          objectives: [],
          goalNumbers: ['G-1'],
        },
        {
          id: 2,
          goalText: 'Goal 2',
          goalStatus: 'Not Started',
          isRttapa: 'Yes',
          goalTopics: ['Topic 1', 'Topic 2'],
          goalNumbers: ['G-2'],
          objectives: [
            {
              id: 1,
              title: 'Objective 1',
              endDate: '2021-02-01',
              reasons: [],
              topics: [],
              status: 'Not Started',
              grantNumbers: ['grant-1'],
              activityReports: [
                {
                  id: 1,
                  legacyId: 'AR-1',
                  number: 'AR-1',
                  endDate: '2021-01-01',
                },
              ],
            },
          ],
        },
      ],
    }]);

    act(() => {
      renderRTTAPAHistory(recipientId, regionId, 'Recipient 1 (Region 1)');
    });

    await waitFor(() => {
      expect(screen.getByText('Timmy the Tester reviewed 2 goals on January 1, 2021')).toBeInTheDocument();
      expect(screen.getByText('This is gooooood soup')).toBeInTheDocument();
    });

    const viewGoals = screen.getAllByText(/View Goals/i);
    expect(viewGoals.length).toBe(1);

    act(() => {
      userEvent.click(viewGoals[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Goal 1')).toBeInTheDocument();
      expect(screen.getByText(/in progress/i)).toBeInTheDocument();
    });
  });

  it('you can change the sort', async () => {
    const recipientId = '1';
    const regionId = '1';

    const url = join(
      rttapaUrl,
      'region',
      String(regionId),
      'recipient',
      String(recipientId),
      '?sortBy=reviewDate&direction=desc',
    );
    fetchMock.getOnce(url, []);

    act(() => {
      renderRTTAPAHistory(recipientId, regionId, 'Recipient 1 (Region 1)');
    });

    const sort = screen.getByLabelText('Sort by');

    expect(sort.value).toBe('reviewDate-desc');

    fetchMock.getOnce(join(
      rttapaUrl,
      'region',
      String(regionId),
      'recipient',
      String(recipientId),
      '?sortBy=reviewDate&direction=asc',
    ), []);

    act(() => {
      userEvent.selectOptions(sort, 'reviewDate-asc');
    });

    expect(sort.value).toBe('reviewDate-asc');
  });

  it('handles an error', async () => {
    const recipientId = '1';
    const regionId = '1';

    const url = join(
      rttapaUrl,
      'region',
      String(regionId),
      'recipient',
      String(recipientId),
      '?sortBy=reviewDate&direction=desc',
    );
    fetchMock.getOnce(url, 500);
    act(() => {
      renderRTTAPAHistory(recipientId, regionId, 'Recipient 1 (Region 1)');
    });

    await waitFor(() => expect(screen.getByText('There was an error fetching your reports')).toBeInTheDocument());
  });
});
