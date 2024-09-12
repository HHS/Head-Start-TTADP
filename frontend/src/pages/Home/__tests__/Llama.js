import React from 'react';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import { SCOPE_IDS } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import Llama from '../Llama';

const mockResponse = {
  daysSinceJoined: '123 days',
  arsCreated: 3,
  arsCollaboratedOn: 4,
  ttaProvided: '10 days 5 hours',
  recipientsReached: 1000,
  grantsServed: 34,
  participantsReached: 2344,
  goalsApproved: 234,
  objectivesApproved: 23,
};

describe('Llama', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  it('renders the llama', async () => {
    const url = '/api/users/statistics';
    fetchMock.get(url, mockResponse);

    act(() => {
      render(<Llama user={{ id: 1, permissions: [] }} />);
    });
    await waitFor(() => expect(fetchMock.called(url)).toBe(true));
    const img = screen.getByAltText('You\'ve done a great job on the ttahub!');
    expect(img).toBeInTheDocument();
  });

  it('handles an error the llama', async () => {
    const url = '/api/users/statistics';
    fetchMock.get(url, 500);

    act(() => {
      render(<Llama user={{ id: 1, permissions: [] }} />);
    });
    await waitFor(() => expect(fetchMock.called(url)).toBe(true));
    const img = screen.getByAltText('You\'ve done a great job on the ttahub!');
    expect(img).toBeInTheDocument();
  });

  it('shows the extra fields when the user can write', async () => {
    const url = '/api/users/statistics';
    fetchMock.get(url, mockResponse);

    act(() => {
      render(<Llama user={{
        id: 1,
        permissions: [
          {
            scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
          },
        ],
      }}
      />);
    });
    await waitFor(() => expect(fetchMock.called(url)).toBe(true));
    expect(screen.getByText('since you joined')).toBeInTheDocument();
  });
});
