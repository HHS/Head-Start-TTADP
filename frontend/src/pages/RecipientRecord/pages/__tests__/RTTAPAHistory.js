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
    );
    fetchMock.getOnce(url, [{
      id: 1,
      user: {
        name: 'Timmy the Tester',
      },
      goals: [
        {
          id: 1,
          name: 'Goal 1',
          status: 'In Progress',
        },
      ],
      notes: 'This is gooooood soup',
      createdAt: '2021-01-01',
    }]);

    act(() => {
      renderRTTAPAHistory(recipientId, regionId, 'Recipient 1 (Region 1)');
    });

    await waitFor(() => {
      expect(screen.getByText('Timmy the Tester reviewed 1 goals on January 1 2021')).toBeInTheDocument();
      expect(screen.getByText('This is gooooood soup')).toBeInTheDocument();
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
    );
    fetchMock.getOnce(url, []);

    act(() => {
      renderRTTAPAHistory(recipientId, regionId, 'Recipient 1 (Region 1)');
    });

    const sort = screen.getByLabelText('Sort by');

    expect(sort.value).toBe('reviewDate-desc');
    act(() => {
      userEvent.selectOptions(sort, 'reviewDate-asc');
    });

    expect(sort.value).toBe('reviewDate-asc');
  });
});
