import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import GranteeSummary from '../GranteeSummary';

describe('GranteeSummary', () => {
  const renderGranteeSummary = (summary) => {
    render(<div data-testid="grantee-summary-container"><GranteeSummary summary={summary} regionId={12} /></div>);
  };

  it('renders the grantee summary appropriately', async () => {
    const summary = {
      granteeId: '44',
      granteeType: 'Frog Stuff',
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
    expect(screen.getByText(/frog stuff/i)).toBeInTheDocument();
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
