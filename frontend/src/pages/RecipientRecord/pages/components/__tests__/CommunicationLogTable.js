import '@testing-library/jest-dom';
import React from 'react';
import { Router } from 'react-router-dom';
import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import CommunicationLogTable from '../CommunicationLogTable';
import UserContext from '../../../../../UserContext';

describe('CommunicationLogTable', () => {
  it('renders', () => {
    const mockLogs = [{
      id: 1,
      data: {
        communicationDate: '2021-06-15',
        purpose: 'Initial Contact',
        result: 'Successful',
      },
      authorName: 'John Doe',
      userId: 3,
    }];

    const mockRequestSort = jest.fn();
    const mockSortConfig = { sortBy: 'communicationDate', direction: 'asc' };
    const mockRecipientId = 1;
    const mockRegionId = '1';
    const history = createMemoryHistory();

    render(
      <Router history={history}>
        <UserContext.Provider value={{ user: { id: 1, permissions: [], name: 'Ted User' } }}>
          <CommunicationLogTable
            logs={mockLogs}
            requestSort={mockRequestSort}
            sortConfig={mockSortConfig}
            recipientId={mockRecipientId}
            regionId={mockRegionId}
          />
        </UserContext.Provider>
      </Router>,
    );

    expect(mockRequestSort).not.toHaveBeenCalled();
  });

  it('does not apply sorting class names when sortConfig does not match', () => {
    const mockLogs = [{
      id: 1,
      data: {
        communicationDate: '2021-06-15',
        purpose: 'Initial Contact',
        result: 'Successful',
      },
      authorName: 'John Doe',
      userId: 3,
    }];

    const mockRequestSort = jest.fn();
    const mockSortConfig = { sortBy: 'purpose', direction: 'desc' };
    const mockRecipientId = 1;
    const mockRegionId = '1';
    const history = createMemoryHistory();

    const { getByText } = render(
      <Router history={history}>
        <UserContext.Provider value={{ user: { id: 1, permissions: [], name: 'Ted User' } }}>
          <CommunicationLogTable
            logs={mockLogs}
            requestSort={mockRequestSort}
            sortConfig={mockSortConfig}
            recipientId={mockRecipientId}
            regionId={mockRegionId}
          />
        </UserContext.Provider>
      </Router>,
    );

    const dateHeaderButton = getByText('Date');
    expect(dateHeaderButton).not.toHaveClass('asc');
    expect(dateHeaderButton).not.toHaveClass('desc');
  });
});
