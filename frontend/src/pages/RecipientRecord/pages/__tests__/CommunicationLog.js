import '@testing-library/jest-dom';
import React from 'react';
// import fetchMock from 'fetch-mock'; commenting out, we will need it real soon
import { render, screen } from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import CommunicationLog from '../CommunicationLog';
import AppLoadingContext from '../../../../AppLoadingContext';

describe('CommunicationLog', () => {
  const history = createMemoryHistory();
  const renderTest = () => {
    render(
      <AppLoadingContext.Provider value={{ setIsAppLoading: () => {} }}>
        <Router history={history}>
          <CommunicationLog recipientName="Big recipient" recipientId={1} regionId={5} />
        </Router>
      </AppLoadingContext.Provider>,
    );
  };

  it('renders the communication log approriately', async () => {
    renderTest();

    expect(screen.getByText('Communication Log')).toBeInTheDocument();
  });
});
