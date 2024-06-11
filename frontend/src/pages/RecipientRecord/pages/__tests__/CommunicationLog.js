import '@testing-library/jest-dom';
import React from 'react';
import fetchMock from 'fetch-mock';
import {
  render, screen, act, waitFor, cleanup,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import { MemoryRouter } from 'react-router';
import CommunicationLog from '../CommunicationLog';
import AppLoadingContext from '../../../../AppLoadingContext';
import UserContext from '../../../../UserContext';
import AriaLiveContext from '../../../../AriaLiveContext';

describe('CommunicationLog', () => {
  const renderTest = () => {
    render(
      <AriaLiveContext.Provider value={{ announce: () => {} }}>
        <AppLoadingContext.Provider value={{ setIsAppLoading: () => {} }}>
          <UserContext.Provider value={{ user: { homeRegionId: 5 } }}>
            <MemoryRouter>
              <CommunicationLog recipientName="Big recipient" recipientId={1} regionId={5} />
            </MemoryRouter>
          </UserContext.Provider>
        </AppLoadingContext.Provider>
      </AriaLiveContext.Provider>,
    );
  };

  afterEach(async () => {
    cleanup();
    fetchMock.restore();
  });

  it('renders the communication log approriately', async () => {
    fetchMock.get('/api/communication-logs/region/5/recipient/1?sortBy=communicationDate&direction=desc&offset=0&limit=10&format=json&', {
      rows: [],
      count: 0,
    });
    await act(() => waitFor(() => renderTest()));

    expect(screen.getByText('Communication log')).toBeInTheDocument();
  });

  it('you can export logs', async () => {
    const response = {
      rows: [],
      count: 0,
    };
    fetchMock.get('/api/communication-logs/region/5/recipient/1?sortBy=communicationDate&direction=desc&offset=0&limit=10&format=json&', response);
    await act(() => waitFor(() => renderTest()));

    expect(screen.getByText('Communication log')).toBeInTheDocument();

    const exportLog = await screen.findByRole('button', { name: /export log/i });
    fetchMock.get('/api/communication-logs/region/5/recipient/1?sortBy=communicationDate&direction=desc&offset=0&format=csv&', 'test\nnew');
    await act(() => waitFor(() => userEvent.click(exportLog)));
    expect(fetchMock.called('/api/communication-logs/region/5/recipient/1?sortBy=communicationDate&direction=desc&offset=0&format=csv&')).toBe(true);
  });

  it('you can apply a filter', async () => {
    const response = {
      rows: [],
      count: 0,
    };
    fetchMock.get('/api/communication-logs/region/5/recipient/1?sortBy=communicationDate&direction=desc&offset=0&limit=10&format=json&', response);
    renderTest();

    expect(screen.getByText('Communication log')).toBeInTheDocument();

    // Open filters menu.
    const open = await screen.findByRole('button', { name: /open filters for this page/i });
    act(() => userEvent.click(open));

    const [lastTopic] = Array.from(document.querySelectorAll('[name="topic"]')).slice(-1);
    act(() => userEvent.selectOptions(lastTopic, 'result'));

    const [lastCondition] = Array.from(document.querySelectorAll('[name="condition"]')).slice(-1);
    act(() => userEvent.selectOptions(lastCondition, 'is'));

    const select = await screen.findByText(/Select result to filter by/i);
    await selectEvent.select(select, ['RTTAPA declined']);

    const filteredUrl = '/api/communication-logs/region/5/recipient/1?sortBy=communicationDate&direction=desc&offset=0&limit=10&format=json&result.in[]=RTTAPA%20declined';
    fetchMock.get(filteredUrl, response);
    const apply = await screen.findByRole('button', { name: /apply filters on communication logs/i });
    act(() => userEvent.click(apply));

    await waitFor(() => expect(fetchMock.called(filteredUrl)).toBe(true));
  });
});
