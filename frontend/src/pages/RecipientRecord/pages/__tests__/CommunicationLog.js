import '@testing-library/jest-dom';
import React from 'react';
import fetchMock from 'fetch-mock';
import {
  render, screen, act, waitFor, cleanup,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import CommunicationLog from '../CommunicationLog';
import AppLoadingContext from '../../../../AppLoadingContext';
import UserContext from '../../../../UserContext';
import AriaLiveContext from '../../../../AriaLiveContext';

describe('CommunicationLog', () => {
  const history = createMemoryHistory();
  const renderTest = () => {
    render(
      <AriaLiveContext.Provider value={{ announce: () => {} }}>
        <AppLoadingContext.Provider value={{ setIsAppLoading: () => {} }}>
          <UserContext.Provider value={{ user: { homeRegionId: 5 } }}>
            <Router history={history}>
              <CommunicationLog recipientName="Big recipient" recipientId={1} regionId={5} />
            </Router>
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
      rows: [
        {
          data: {
            goals: [{ label: 'First goal', value: '16' }, { label: 'Second goal', value: '10' }],
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
    });
    await act(() => waitFor(() => renderTest()));
    const tableCells = screen.getAllByRole('cell');
    const tableCellContents = tableCells.map((cell) => cell.textContent).join('');
    expect(tableCellContents).toMatch(/My purpose/i);
  });

  it('formats the log correctly', async () => {
    fetchMock.get('/api/communication-logs/region/5/recipient/1?sortBy=communicationDate&direction=desc&offset=0&limit=10&format=json&', {
      rows: [],
      count: 0,
    });
    await act(() => waitFor(() => renderTest()));

    expect(screen.getByText('Communication log')).toBeInTheDocument();
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
