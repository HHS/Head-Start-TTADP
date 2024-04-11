import '@testing-library/jest-dom';
import React from 'react';
import { Router } from 'react-router-dom';
import { render, fireEvent } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import CommunicationLogTable from '../CommunicationLogTable';

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
        <CommunicationLogTable
          logs={mockLogs}
          requestSort={mockRequestSort}
          sortConfig={mockSortConfig}
          recipientId={mockRecipientId}
          regionId={mockRegionId}
        />
      </Router>,
    );

    expect(mockRequestSort).not.toHaveBeenCalled();
  });

  it('applies the correct class names for sorting', () => {
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

    const { getByText } = render(
      <Router history={history}>
        <CommunicationLogTable
          logs={mockLogs}
          requestSort={mockRequestSort}
          sortConfig={mockSortConfig}
          recipientId={mockRecipientId}
          regionId={mockRegionId}
        />
      </Router>,
    );

    const dateHeaderButton = getByText('Date');
    expect(dateHeaderButton).toHaveClass('asc');
    fireEvent.click(dateHeaderButton);
    expect(mockRequestSort).toHaveBeenCalledWith('communicationDate');
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
        <CommunicationLogTable
          logs={mockLogs}
          requestSort={mockRequestSort}
          sortConfig={mockSortConfig}
          recipientId={mockRecipientId}
          regionId={mockRegionId}
        />
      </Router>,
    );

    const dateHeaderButton = getByText('Date');
    expect(dateHeaderButton).not.toHaveClass('asc');
    expect(dateHeaderButton).not.toHaveClass('desc');
  });
});
