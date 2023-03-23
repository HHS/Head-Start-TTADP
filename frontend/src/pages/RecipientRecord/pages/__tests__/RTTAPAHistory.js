import React from 'react';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fetchMock from 'fetch-mock';
import join from 'url-join';
import userEvent from '@testing-library/user-event';
import RTTAPAHistory from '../RTTAPAHistory';
import UserContext from '../../../../UserContext';
import { SCOPE_IDS } from '../../../../Constants';

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
      ],
      notes: 'This is gooooood soup',
      reviewDate: '2021-01-01',
      regionId,
      recipientId,
    }]);

    act(() => {
      renderRTTAPAHistory(recipientId, regionId, 'Recipient 1 (Region 1)');
    });

    await waitFor(() => {
      expect(screen.getByText('Timmy the Tester reviewed 1 goals on January 1, 2021')).toBeInTheDocument();
      expect(screen.getByText('This is gooooood soup')).toBeInTheDocument();
    });

    act(() => {
      userEvent.click(screen.getByText(/View Goal/i));
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
});
