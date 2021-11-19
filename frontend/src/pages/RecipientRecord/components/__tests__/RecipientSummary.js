import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import RecipientSummary from '../RecipientSummary';

describe('RecipientSummary', () => {
  const renderRecipientSummary = (summary) => {
    render(<div data-testid="recipient-summary-container"><RecipientSummary summary={summary} regionId={12} /></div>);
  };

  it('renders the grantee summary appropriately', async () => {
    const summary = {
      recipientId: '44',
      recipientType: 'Frog Stuff',
      grants: [
        {
          number: 'asdfsjkfd',
          status: 'Froglike',
          endDate: '2021-09-28',
        },
      ],
    };
    renderRecipientSummary(summary);

    expect(screen.getByText('44')).toBeInTheDocument();
    expect(screen.getByText(/frog stuff/i)).toBeInTheDocument();
  });

  it('renders nothing when it receives nothing', async () => {
    const summary = '';
    renderRecipientSummary(summary);
    const container = screen.getByTestId('recipient-summary-container');
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when it receives no grants', async () => {
    const summary = {
      recipientId: '44',
    };
    renderRecipientSummary(summary);
    const container = screen.getByTestId('recipient-summary-container');
    expect(container.innerHTML).toBe('');
  });

  it('renders program and grant specialist lists', async () => {
    const summary = {
      granteeId: '44',
      grants: [
        {
          programSpecialistName: 'Program Specialist 3',
          grantSpecialistName: 'Grant Specialist 3',
        },
        {
          programSpecialistName: 'Program Specialist 1',
          grantSpecialistName: 'Grant Specialist 1',
        },
        {
          programSpecialistName: 'Program Specialist 2',
        },
        {
          programSpecialistName: 'Program Specialist 1',
          grantSpecialistName: 'Grant Specialist 1',
        },
      ],
    };
    renderGranteeSummary(summary);
    const programSpecialists = await screen.findAllByText(/program specialist /i);
    expect(programSpecialists.length).toBe(3);
    expect(programSpecialists[0].firstChild.textContent).toBe('Program Specialist 1');
    expect(programSpecialists[1].firstChild.textContent).toBe('Program Specialist 2');
    expect(programSpecialists[2].firstChild.textContent).toBe('Program Specialist 3');
    const grantSpecialists = await screen.findAllByText(/grant specialist /i);
    expect(grantSpecialists.length).toBe(2);
    expect(grantSpecialists[0].firstChild.textContent).toBe('Grant Specialist 1');
    expect(grantSpecialists[1].firstChild.textContent).toBe('Grant Specialist 3');
  });
});
