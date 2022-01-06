import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import Profile from '../Profile';

describe('Recipient Record - Profile', () => {
  const renderRecipientProfile = (summary) => {
    render(<Profile recipientSummary={summary} />);
  };

  it('renders the recipient summary approriately', async () => {
    const summary = {
      recipientId: '44',
      grants: [
        {
          number: 'asdfsjkfd',
          status: 'Froglike',
          endDate: '2021-09-28',
        },
      ],
    };
    renderRecipientProfile(summary);

    expect(screen.getByText(summary.grants[0].status)).toBeInTheDocument();
    expect(screen.getByText('09/28/2021')).toBeInTheDocument();
    expect(screen.getByText(summary.grants[0].number)).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: /recipient summary/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /grants/i })).toBeInTheDocument();
  });
});
