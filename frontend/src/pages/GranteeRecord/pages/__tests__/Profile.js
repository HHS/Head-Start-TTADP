import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import Profile from '../Profile';

describe('Grantee Record - Profile', () => {
  const renderGranteeProfile = (summary) => {
    render(<Profile granteeSummary={summary} />);
  };

  it('renders the grantee summary approriately', async () => {
    const summary = {
      granteeId: '44',
      grants: [
        {
          number: 'asdfsjkfd',
          status: 'Froglike',
          endDate: '2021-09-28',
        },
      ],
    };
    renderGranteeProfile(summary);

    expect(screen.getByText(summary.grants[0].status)).toBeInTheDocument();
    expect(screen.getByText('09/28/2021')).toBeInTheDocument();
    expect(screen.getByText(summary.grants[0].number)).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: /grantee summary/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /grants/i })).toBeInTheDocument();
  });
});
