import '@testing-library/jest-dom';
import React from 'react';
import fetchMock from 'fetch-mock';
import { render, screen } from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import CommunicationLog from '../CommunicationLog';
import AppLoadingContext from '../../../../AppLoadingContext';
import UserContext from '../../../../UserContext';

describe('CommunicationLog', () => {
  const history = createMemoryHistory();
  const renderTest = () => {
    render(
      <AppLoadingContext.Provider value={{ setIsAppLoading: () => {} }}>
        <UserContext.Provider value={{ user: { homeRegionId: 5 } }}>
          <Router history={history}>
            <CommunicationLog recipientName="Big recipient" recipientId={1} regionId={5} />
          </Router>
        </UserContext.Provider>
      </AppLoadingContext.Provider>,
    );
  };

  it('renders the communication log approriately', async () => {
    fetchMock.get('/api/communication-logs/region/5/recipient/1?sortBy=communicationDate&direction=desc&offset=0', {
      rows: [],
      count: 0,
    });
    renderTest();

    expect(screen.getByText('Communication log')).toBeInTheDocument();
  });
});
