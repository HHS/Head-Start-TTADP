import '@testing-library/jest-dom';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router';
import selectEvent from 'react-select-event';
import AppLoadingContext from '../../../../AppLoadingContext';
import AriaLiveContext from '../../../../AriaLiveContext';
import UserContext from '../../../../UserContext';
import CommunicationLog from '../CommunicationLog';

const fakeResponse = {
  rows: [
    {
      id: 1,
      displayId: 'R01-CL-00001',
      userId: 1,
      data: {
        goals: [
          { label: 'First goal', value: '16' },
          { label: 'Second goal', value: '10' },
        ],
        notes: '',
        method: 'Phone',
        result: '',
        purpose: 'My purpose',
        duration: 0.25,
        regionId: '1',
        createdAt: '2025-01-22T00:28:35.416Z',
        displayId: 'R01-CL-00001',
        pageState: { 1: 'Complete', 2: 'Complete', 3: 'Complete' },
        otherStaff: [{ label: 'Harry', value: '10' }],
        pocComplete: false,
        communicationDate: '01/01/2025',
        recipientNextSteps: [{ note: 'recip step 1', completeDate: '02/02/2025' }],
        specialistNextSteps: [{ note: 'spec step 1', completeDate: '02/01/2025' }],
        'pageVisited-next-steps': 'true',
        'pageVisited-supporting-attachments': 'true',
      },
      files: [
        {
          id: 1,
          originalFileName: 'cat.png',
        },
      ],
      author: {
        name: 'Harry Potter',
        id: 1,
      },
    },
  ],
  count: 1,
};

describe('CommunicationLog', () => {
  const history = createMemoryHistory();
  const renderTest = () => {
    render(
      <AriaLiveContext.Provider value={{ announce: () => {} }}>
        <AppLoadingContext.Provider value={{ setIsAppLoading: () => {} }}>
          <UserContext.Provider value={{ user: { id: 1, homeRegionId: 5 } }}>
            <Router history={history}>
              <CommunicationLog recipientName="Big recipient" recipientId={1} regionId={5} />
            </Router>
          </UserContext.Provider>
        </AppLoadingContext.Provider>
      </AriaLiveContext.Provider>
    );
  };

  afterEach(async () => {
    cleanup();
    fetchMock.restore();
  });

  it('restores the saved page for this recipient without using another recipient page', async () => {
    const filterKey = 'communication-log-filters';
    const sortingKey = `${filterKey}-communication-log-table-5-1-sorting`;
    const otherSortingKey = `${filterKey}-communication-log-table-5-2-sorting`;
    sessionStorage.setItem(filterKey, '[]');
    sessionStorage.setItem(
      sortingKey,
      JSON.stringify({ sortBy: 'communicationDate', direction: 'desc', activePage: 3, offset: 20 })
    );
    sessionStorage.setItem(
      otherSortingKey,
      JSON.stringify({ sortBy: 'communicationDate', direction: 'desc', activePage: 2, offset: 10 })
    );
    const restoredUrl =
      '/api/communication-logs/region/5/recipient/1?sortBy=communicationDate&direction=desc&offset=20&limit=10&format=json&';
    fetchMock.get(restoredUrl, { count: 0, rows: [] });

    renderTest();

    await waitFor(() => expect(fetchMock.called(restoredUrl)).toBe(true));
    sessionStorage.removeItem(sortingKey);
    sessionStorage.removeItem(otherSortingKey);
  });

  it('renders the communication log appropriately', async () => {
    fetchMock.get(
      '/api/communication-logs/region/5/recipient/1?sortBy=communicationDate&direction=desc&offset=0&limit=10&format=json&',
      fakeResponse
    );
    await act(() => waitFor(() => renderTest()));
    const tableCells = screen.getAllByRole('cell');
    const tableCellContents = tableCells.map((cell) => cell.textContent).join('');
    expect(tableCellContents).toMatch(/My purpose/i);
  });

  it('formats the log correctly', async () => {
    fetchMock.get(
      '/api/communication-logs/region/5/recipient/1?sortBy=communicationDate&direction=desc&offset=0&limit=10&format=json&',
      {
        rows: [],
        count: 0,
      }
    );
    await act(() => waitFor(() => renderTest()));

    expect(screen.getByText('Communication log')).toBeInTheDocument();
  });

  it('resets the saved page before reloading after deleting a log', async () => {
    const filterKey = 'communication-log-filters';
    const sortingKey = `${filterKey}-communication-log-table-5-1-sorting`;
    const pageTwoUrl =
      '/api/communication-logs/region/5/recipient/1?sortBy=communicationDate&direction=desc&offset=10&limit=10&format=json&';
    sessionStorage.setItem(filterKey, '[]');
    sessionStorage.setItem(
      sortingKey,
      JSON.stringify({ sortBy: 'communicationDate', direction: 'desc', activePage: 2, offset: 10 })
    );
    fetchMock.get(pageTwoUrl, { ...fakeResponse, count: 11 });

    renderTest();

    const actions = await screen.findByRole('button', { name: 'Actions for R01-CL-00001' });
    act(() => userEvent.click(actions));
    await screen.findByRole('menu');
    const deleteButton = await screen.findByRole('button', { name: /delete/i });
    act(() => userEvent.click(deleteButton));

    const confirmDeleteButton = await screen.findByRole('button', {
      name: /confirm delete and reload page/i,
    });
    fetchMock.delete('/api/communication-logs/log/1', 204);
    act(() => userEvent.click(confirmDeleteButton));

    await waitFor(() => {
      expect(JSON.parse(sessionStorage.getItem(sortingKey))).toMatchObject({
        activePage: 1,
        offset: 0,
      });
    });
    sessionStorage.removeItem(filterKey);
    sessionStorage.removeItem(sortingKey);
  });

  it('you can apply a filter', async () => {
    const response = {
      rows: [],
      count: 0,
    };
    fetchMock.get(
      '/api/communication-logs/region/5/recipient/1?sortBy=communicationDate&direction=desc&offset=0&limit=10&format=json&',
      response
    );
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

    const filteredUrl =
      '/api/communication-logs/region/5/recipient/1?sortBy=communicationDate&direction=desc&offset=0&limit=10&format=json&result.in[]=RTTAPA%20declined';
    fetchMock.get(filteredUrl, response);
    const apply = await screen.findByRole('button', {
      name: /apply filters on communication logs/i,
    });
    act(() => userEvent.click(apply));

    await waitFor(() => expect(fetchMock.called(filteredUrl)).toBe(true));
  });
});
