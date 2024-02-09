import '@testing-library/jest-dom';
import React from 'react';
import { Router } from 'react-router-dom';
import { render } from '@testing-library/react';
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
});
