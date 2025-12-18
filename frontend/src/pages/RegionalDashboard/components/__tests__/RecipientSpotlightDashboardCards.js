import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RecipientSpotlightDashboardCards from '../RecipientSpotlightDashboardCards';

describe('RecipientSpotlightDashboardCards', () => {
  const renderComponent = (recipients = []) => render(
    <BrowserRouter>
      <RecipientSpotlightDashboardCards recipients={recipients} />
    </BrowserRouter>,
  );

  it('renders header with title and description', () => {
    renderComponent([]);

    expect(screen.getByText('Recipient spotlight')).toBeInTheDocument();
    expect(screen.getByText('These are the recipients that currently have at least one priority indicator.')).toBeInTheDocument();
  });

  it('shows NoResultsFound when recipients array is empty', () => {
    renderComponent([]);

    expect(screen.getByText('No results found.')).toBeInTheDocument();
    expect(screen.getByText('At this time, there are no recipients that have a priority indicator.')).toBeInTheDocument();
  });

  it('shows NoResultsFound when recipients is null', () => {
    render(
      <BrowserRouter>
        <RecipientSpotlightDashboardCards recipients={null} />
      </BrowserRouter>,
    );

    expect(screen.getByText('No results found.')).toBeInTheDocument();
    expect(screen.getByText('At this time, there are no recipients that have a priority indicator.')).toBeInTheDocument();
  });

  it('shows NoResultsFound when recipients is undefined', () => {
    render(
      <BrowserRouter>
        <RecipientSpotlightDashboardCards recipients={undefined} />
      </BrowserRouter>,
    );

    expect(screen.getByText('No results found.')).toBeInTheDocument();
    expect(screen.getByText('At this time, there are no recipients that have a priority indicator.')).toBeInTheDocument();
  });

  it('does not show NoResultsFound when recipients exist', () => {
    const recipients = [
      {
        recipientId: 1,
        regionId: 5,
        recipientName: 'Test Recipient',
        grantIds: ['12345'],
        lastTTA: '2024-03-15',
        childIncidents: true,
        deficiency: false,
        newRecipients: false,
        newStaff: false,
        noTTA: false,
        DRS: false,
        FEI: false,
      },
    ];

    renderComponent(recipients);

    expect(screen.queryByText('No results found.')).not.toBeInTheDocument();
    expect(screen.queryByText('At this time, there are no recipients that have a priority indicator.')).not.toBeInTheDocument();
  });

  it('renders RecipientSpotlightCard for each recipient', () => {
    const recipients = [
      {
        recipientId: 1,
        regionId: 5,
        recipientName: 'Recipient A',
        grantIds: ['12345'],
        lastTTA: '2024-03-15',
        childIncidents: true,
        deficiency: false,
        newRecipients: false,
        newStaff: false,
        noTTA: false,
        DRS: false,
        FEI: false,
      },
      {
        recipientId: 2,
        regionId: 5,
        recipientName: 'Recipient B',
        grantIds: ['12346'],
        lastTTA: '2024-02-10',
        childIncidents: false,
        deficiency: true,
        newRecipients: false,
        newStaff: false,
        noTTA: false,
        DRS: false,
        FEI: false,
      },
    ];

    renderComponent(recipients);

    expect(screen.getByText('Recipient A')).toBeInTheDocument();
    expect(screen.getByText('Recipient B')).toBeInTheDocument();
  });

  it('assigns unique keys to each card', () => {
    const recipients = [
      {
        recipientId: 1,
        regionId: 5,
        recipientName: 'Recipient A',
        grantIds: ['12345'],
        lastTTA: '2024-03-15',
        childIncidents: true,
        deficiency: false,
        newRecipients: false,
        newStaff: false,
        noTTA: false,
        DRS: false,
        FEI: false,
      },
      {
        recipientId: 2,
        regionId: 5,
        recipientName: 'Recipient B',
        grantIds: ['12346'],
        lastTTA: '2024-02-10',
        childIncidents: false,
        deficiency: true,
        newRecipients: false,
        newStaff: false,
        noTTA: false,
        DRS: false,
        FEI: false,
      },
    ];

    const { container } = renderComponent(recipients);

    const cards = container.querySelectorAll('[data-testid^="recipient-spotlight-card"]');
    expect(cards.length).toBe(2);
  });

  it('renders cards within scrollable container', () => {
    const recipients = [
      {
        recipientId: 1,
        regionId: 5,
        recipientName: 'Test Recipient',
        grantIds: ['12345'],
        lastTTA: '2024-03-15',
        childIncidents: true,
        deficiency: false,
        newRecipients: false,
        newStaff: false,
        noTTA: false,
        DRS: false,
        FEI: false,
      },
    ];

    const { container } = renderComponent(recipients);

    expect(container.querySelector('.usa-table-container--scrollable')).toBeInTheDocument();
  });

  it('does not show filter help button in NoResultsFound', () => {
    renderComponent([]);

    expect(screen.queryByText('Get help using filters')).not.toBeInTheDocument();
  });
});
