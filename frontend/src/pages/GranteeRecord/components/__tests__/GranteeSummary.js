import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import GranteeSummary from '../GranteeSummary';

describe('GranteeSummary', () => {
  const renderGranteeSummary = (summary) => {
    render(<div data-testid="grantee-summary-container"><GranteeSummary summary={summary} /></div>);
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
    renderGranteeSummary(summary);

    expect(screen.getByText('44')).toBeInTheDocument();
  });

  it('renders nothing when it receives nothing', async () => {
    const summary = '';
    renderGranteeSummary(summary);
    const container = screen.getByTestId('grantee-summary-container');
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when it receives no grants', async () => {
    const summary = {
      granteeId: '44',
    };
    renderGranteeSummary(summary);
    const container = screen.getByTestId('grantee-summary-container');
    expect(container.innerHTML).toBe('');
  });
});
