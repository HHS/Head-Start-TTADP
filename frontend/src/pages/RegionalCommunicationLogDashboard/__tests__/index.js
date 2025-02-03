import React from 'react';
import {
  render, screen, act,
} from '@testing-library/react';
import { SCOPE_IDS } from '@ttahub/common';
import UserContext from '../../../UserContext';
import RegionalCommunicationLog from '..';
import AppLoadingContext from '../../../AppLoadingContext';

describe('RegionalCommunicationLog', () => {
  const userCentralOffice = {
    homeRegionId: 14,
    permissions: [{
      regionId: 1,
      scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
    }],
  };

  const renderComm = (u) => {
    const user = u || userCentralOffice;
    render(
      <AppLoadingContext.Provider value={{
        setIsAppLoading: jest.fn(),
        setAppLoadingText: jest.fn(),
      }}
      >
        <UserContext.Provider value={{ user }}>
          <RegionalCommunicationLog />
        </UserContext.Provider>
      </AppLoadingContext.Provider>,
    );
  };

  it('renders the page', async () => {
    act(renderComm);
    expect(await screen.findByRole('heading', { name: /region 1 communication log/i })).toBeInTheDocument();
  });
});
