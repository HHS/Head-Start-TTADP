import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// import fetchMock from 'fetch-mock';
import Llama from '../Llama';

// const mockResponse = {
//     userId,
//     daysSinceJoined: '123 days',
//     arsCreated: 3,
//     arsCollaboratedOn: 4,
//     ttaProvided: '10 days 5 hours',
//     recipientsReached: 1000,
//     grantsServed: 34,
//     participantsReached: 2344,
//     goalsApproved: 234,
//     objectivesApproved: 23,
//   }

describe('Llama', () => {
  it('renders the llama', () => {
    // const url = '/api/users/1/statistics';
    // fetchMock.get(url, mockResponse);

    render(<Llama user={{ id: 1 }} />);
    const img = screen.getByAltText('hey folks, it\'s me, llawrence the llama, and I\'m just here to tell you that you\'ve done a great job here on the ttahub');
    expect(img).toBeInTheDocument();
    userEvent.click(img.parentElement);
    expect(img).toHaveClass('the-wiggler');
  });
});
