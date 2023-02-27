import React from 'react';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import Llama from '../Llama';
import { SCOPE_IDS } from '../../../Constants';

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
    const img = screen.getByAltText('hey folks, it\'s me, llawrence the llama, and I\'m just here to tell you that you\'ve done a great job here on the ttahub');
    expect(img).toBeInTheDocument();
    userEvent.click(img.parentElement);
    expect(img).toHaveClass('the-wiggler');
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
