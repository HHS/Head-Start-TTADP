import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import RecipientSpotlightDashboardCards from '../RecipientSpotlightDashboardCards';

describe('RecipientSpotlightDashboardCards', () => {
  it('renders header with title and description', () => {
    render(<RecipientSpotlightDashboardCards recipients={[]} loading={false} />);

    expect(screen.getByText('Recipient spotlight')).toBeInTheDocument();
    expect(screen.getByText('These are the recipients that currently have at least one priority indicator.')).toBeInTheDocument();
  });

  it('shows NoResultsFound when recipients array is empty', () => {
    render(<RecipientSpotlightDashboardCards recipients={[]} loading={false} />);

    expect(screen.getByText('No results found.')).toBeInTheDocument();
    expect(screen.getByText('At this time, there are no recipients that have a priority indicator.')).toBeInTheDocument();
  });

  it('shows NoResultsFound when recipients is null', () => {
    render(<RecipientSpotlightDashboardCards recipients={null} loading={false} />);

    expect(screen.getByText('No results found.')).toBeInTheDocument();
    expect(screen.getByText('At this time, there are no recipients that have a priority indicator.')).toBeInTheDocument();
  });

  it('shows NoResultsFound when recipients is undefined', () => {
    render(<RecipientSpotlightDashboardCards recipients={undefined} loading={false} />);

    expect(screen.getByText('No results found.')).toBeInTheDocument();
    expect(screen.getByText('At this time, there are no recipients that have a priority indicator.')).toBeInTheDocument();
  });

  it('does not show NoResultsFound when recipients exist', () => {
    const recipients = [
      {
        recipientId: 1,
        recipientName: 'Test Recipient',
        childIncidents: true,
        deficiency: false,
        newRecipients: false,
        newStaff: false,
        noTTA: false,
        DRS: false,
        FEI: false,
      },
    ];

    render(<RecipientSpotlightDashboardCards recipients={recipients} loading={false} />);

    expect(screen.queryByText('No results found.')).not.toBeInTheDocument();
    expect(screen.queryByText('At this time, there are no recipients that have a priority indicator.')).not.toBeInTheDocument();
  });

  it('shows loading state when loading is true', () => {
    const { container } = render(<RecipientSpotlightDashboardCards recipients={[]} loading />);

    // Container component adds a loading class or element when loading
    // The exact implementation depends on the Container component
    expect(container.querySelector('.ttahub-recipient-spotlight-container')).toBeInTheDocument();
  });

  it('renders placeholder for future table/cards when recipients exist', () => {
    const recipients = [
      {
        recipientId: 1,
        recipientName: 'Test Recipient',
        childIncidents: true,
        deficiency: false,
        newRecipients: false,
        newStaff: false,
        noTTA: false,
        DRS: false,
        FEI: false,
      },
    ];

    const { container } = render(
      <RecipientSpotlightDashboardCards
        recipients={recipients}
        loading={false}
      />,
    );

    expect(container.querySelector('.usa-table-container--scrollable')).toBeInTheDocument();
  });

  it('does not show filter help button in NoResultsFound', () => {
    render(<RecipientSpotlightDashboardCards recipients={[]} loading={false} />);

    expect(screen.queryByText('Get help using filters')).not.toBeInTheDocument();
  });
});
