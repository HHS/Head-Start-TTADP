import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RecipientSpotlightDashboardCards from '../RecipientSpotlightDashboardCards';

describe('RecipientSpotlightDashboardCards', () => {
  const defaultProps = {
    recipients: [],
    count: 0,
    sortConfig: {
      sortBy: 'recipientName',
      direction: 'asc',
      activePage: 1,
      offset: 0,
    },
    requestSort: jest.fn(),
    handlePageChange: jest.fn(),
    perPage: 10,
    perPageChange: jest.fn(),
    loading: false,
  };

  const renderComponent = (props = {}) => {
    const mergedProps = { ...defaultProps, ...props };
    return render(
      <BrowserRouter>
        <RecipientSpotlightDashboardCards
          recipients={mergedProps.recipients}
          count={mergedProps.count}
          sortConfig={mergedProps.sortConfig}
          requestSort={mergedProps.requestSort}
          handlePageChange={mergedProps.handlePageChange}
          perPage={mergedProps.perPage}
          perPageChange={mergedProps.perPageChange}
          loading={mergedProps.loading}
        />
      </BrowserRouter>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header with title and description', () => {
    renderComponent();

    expect(screen.getByText('Recipient spotlight')).toBeInTheDocument();
    expect(screen.getByText('These are the recipients that currently have at least one priority indicator.')).toBeInTheDocument();
  });

  it('shows NoResultsFound when recipients array is empty', () => {
    renderComponent();

    expect(screen.getByText('No results found.')).toBeInTheDocument();
    expect(screen.getByText('At this time, there are no recipients that have a priority indicator.')).toBeInTheDocument();
  });

  it('shows NoResultsFound when recipients is null', () => {
    renderComponent({ recipients: null });

    expect(screen.getByText('No results found.')).toBeInTheDocument();
    expect(screen.getByText('At this time, there are no recipients that have a priority indicator.')).toBeInTheDocument();
  });

  it('shows NoResultsFound when recipients is undefined', () => {
    renderComponent({ recipients: undefined });

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
        indicatorCount: 1,
      },
    ];

    renderComponent({ recipients, count: 1 });

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
        indicatorCount: 1,
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
        indicatorCount: 1,
      },
    ];

    renderComponent({ recipients, count: 2 });

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
        indicatorCount: 1,
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
        indicatorCount: 1,
      },
    ];

    const { container } = renderComponent({ recipients, count: 2 });

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
        indicatorCount: 1,
      },
    ];

    const { container } = renderComponent({ recipients, count: 1 });

    expect(container.querySelector('.usa-table-container--scrollable')).toBeInTheDocument();
  });

  it('does not show filter help button in NoResultsFound', () => {
    renderComponent();

    expect(screen.queryByText('Get help using filters')).not.toBeInTheDocument();
  });

  it('renders pagination when there are multiple pages', () => {
    const recipients = Array.from({ length: 10 }, (_, i) => ({
      recipientId: i + 1,
      regionId: 5,
      recipientName: `Test Recipient ${i + 1}`,
      grantIds: ['12345'],
      lastTTA: '2024-03-15',
      childIncidents: true,
      deficiency: false,
      newRecipients: false,
      newStaff: false,
      noTTA: false,
      DRS: false,
      FEI: false,
      indicatorCount: 1,
    }));

    renderComponent({ recipients, count: 25 });

    // Pagination controls exist (next button is always rendered)
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
  });

  it('calls handlePageChange when next button is clicked', () => {
    const recipients = Array.from({ length: 10 }, (_, i) => ({
      recipientId: i + 1,
      regionId: 5,
      recipientName: `Test Recipient ${i + 1}`,
      grantIds: ['12345'],
      lastTTA: '2024-03-15',
      childIncidents: true,
      deficiency: false,
      newRecipients: false,
      newStaff: false,
      noTTA: false,
      DRS: false,
      FEI: false,
      indicatorCount: 1,
    }));

    const handlePageChange = jest.fn();
    renderComponent({ recipients, count: 25, handlePageChange });

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('calls handlePageChange when previous button is clicked', () => {
    const recipients = Array.from({ length: 10 }, (_, i) => ({
      recipientId: i + 1,
      regionId: 5,
      recipientName: `Test Recipient ${i + 1}`,
      grantIds: ['12345'],
      lastTTA: '2024-03-15',
      childIncidents: true,
      deficiency: false,
      newRecipients: false,
      newStaff: false,
      noTTA: false,
      DRS: false,
      FEI: false,
      indicatorCount: 1,
    }));

    const handlePageChange = jest.fn();
    const sortConfig = {
      ...defaultProps.sortConfig,
      activePage: 2,
    };

    renderComponent({
      recipients, count: 25, handlePageChange, sortConfig,
    });

    const previousButton = screen.getByRole('button', { name: /previous/i });
    fireEvent.click(previousButton);

    expect(handlePageChange).toHaveBeenCalledWith(1);
  });

  it('renders page info correctly', () => {
    const recipients = Array.from({ length: 10 }, (_, i) => ({
      recipientId: i + 1,
      regionId: 5,
      recipientName: `Test Recipient ${i + 1}`,
      grantIds: ['12345'],
      lastTTA: '2024-03-15',
      childIncidents: true,
      deficiency: false,
      newRecipients: false,
      newStaff: false,
      noTTA: false,
      DRS: false,
      FEI: false,
      indicatorCount: 1,
    }));

    renderComponent({ recipients, count: 25, perPage: 10 });

    expect(screen.getByText(/1-10 of 25/)).toBeInTheDocument();
  });

  it('shows loading state when loading prop is true', () => {
    renderComponent({ loading: true });

    expect(screen.getByRole('status', { name: /Recipient spotlight loading/i })).toBeInTheDocument();
  });

  it('does not show loading state when loading prop is false', () => {
    renderComponent({ loading: false });

    expect(screen.queryByRole('status', { name: /Recipient spotlight loading/i })).not.toBeInTheDocument();
  });

  it('passes sortConfig to RecipientSpotlightCardsHeader', () => {
    renderComponent();

    const sortDropdown = screen.getByLabelText('Sort by');
    expect(sortDropdown).toHaveValue('recipientName-asc');
  });

  it('passes requestSort to RecipientSpotlightCardsHeader', () => {
    const requestSort = jest.fn();
    renderComponent({ requestSort });

    const sortDropdown = screen.getByLabelText('Sort by');
    fireEvent.change(sortDropdown, { target: { value: 'indicatorCount-desc' } });

    expect(requestSort).toHaveBeenCalledWith('indicatorCount', 'desc');
  });

  it('passes perPage and perPageChange to RecipientSpotlightCardsHeader', () => {
    const perPageChange = jest.fn();
    renderComponent({ perPage: 25, perPageChange });

    const perPageDropdown = screen.getByLabelText('Show');
    expect(perPageDropdown).toHaveValue('25');

    fireEvent.change(perPageDropdown, { target: { value: '50' } });
    expect(perPageChange).toHaveBeenCalled();
  });

  it('passes count to RecipientSpotlightCardsHeader for "All" option', () => {
    renderComponent({ count: 42 });

    const perPageDropdown = screen.getByLabelText('Show');
    const allOption = Array.from(perPageDropdown.querySelectorAll('option')).find(
      (option) => option.textContent === 'All',
    );

    expect(allOption).toHaveValue('42');
  });
});
