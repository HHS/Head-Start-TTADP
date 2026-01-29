import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecipientSpotlightCardsHeader from '../RecipientSpotlightCardsHeader';

describe('RecipientSpotlightCardsHeader', () => {
  const defaultProps = {
    sortConfig: {
      sortBy: 'indicatorCount',
      direction: 'desc',
    },
    requestSort: jest.fn(),
    perPage: 10,
    perPageChange: jest.fn(),
    count: 50,
  };

  const renderHeader = (props = {}) => {
    const mergedProps = { ...defaultProps, ...props };
    return render(
      <RecipientSpotlightCardsHeader
        sortConfig={mergedProps.sortConfig}
        requestSort={mergedProps.requestSort}
        perPage={mergedProps.perPage}
        perPageChange={mergedProps.perPageChange}
        count={mergedProps.count}
      />,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and description', () => {
    renderHeader();

    expect(screen.getByText('Recipient spotlight')).toBeInTheDocument();
    expect(screen.getByText('These are the recipients that currently have at least one priority indicator.')).toBeInTheDocument();
  });

  it('renders the sort dropdown with correct label', () => {
    renderHeader();

    expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
  });

  it('renders all sort options', () => {
    renderHeader();

    const sortDropdown = screen.getByLabelText('Sort by');
    expect(sortDropdown).toBeInTheDocument();

    // Check that the dropdown has the expected options
    const options = sortDropdown.querySelectorAll('option');
    expect(options).toHaveLength(8);

    expect(screen.getByText('priority indicators (high to low)')).toBeInTheDocument();
    expect(screen.getByText('priority indicators (low to high)')).toBeInTheDocument();
    expect(screen.getByText('recipient name (A-Z)')).toBeInTheDocument();
    expect(screen.getByText('recipient name (Z-A)')).toBeInTheDocument();
    expect(screen.getByText('last TTA (oldest to newest)')).toBeInTheDocument();
    expect(screen.getByText('last TTA (newest to oldest)')).toBeInTheDocument();
    expect(screen.getByText('region ID (ascending)')).toBeInTheDocument();
    expect(screen.getByText('region ID (descending)')).toBeInTheDocument();
  });

  it('sets the correct selected value in sort dropdown', () => {
    renderHeader();

    const sortDropdown = screen.getByLabelText('Sort by');
    expect(sortDropdown).toHaveValue('indicatorCount-desc');
  });

  it('calls requestSort with correct parameters when sort option changes', () => {
    renderHeader();

    const sortDropdown = screen.getByLabelText('Sort by');
    fireEvent.change(sortDropdown, { target: { value: 'recipientName-asc' } });

    expect(defaultProps.requestSort).toHaveBeenCalledWith('recipientName', 'asc');
  });

  it('renders the per-page dropdown with correct label', () => {
    renderHeader();

    expect(screen.getByLabelText('Show')).toBeInTheDocument();
  });

  it('renders per-page options including "All"', () => {
    renderHeader();

    const perPageDropdown = screen.getByLabelText('Show');
    const options = perPageDropdown.querySelectorAll('option');

    expect(options).toHaveLength(4);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('sets the correct selected value in per-page dropdown', () => {
    renderHeader({ perPage: 25 });

    const perPageDropdown = screen.getByLabelText('Show');
    expect(perPageDropdown).toHaveValue('25');
  });

  it('sets "All" option value to total count', () => {
    renderHeader({ count: 75 });

    const perPageDropdown = screen.getByLabelText('Show');
    const allOption = Array.from(perPageDropdown.querySelectorAll('option')).find(
      (option) => option.textContent === 'All',
    );

    expect(allOption).toHaveValue('75');
  });

  it('calls perPageChange when per-page option changes', () => {
    renderHeader();

    const perPageDropdown = screen.getByLabelText('Show');
    fireEvent.change(perPageDropdown, { target: { value: '25' } });

    expect(defaultProps.perPageChange).toHaveBeenCalled();
  });

  it('renders divider at the bottom of header', () => {
    const { container } = renderHeader();

    const divider = container.querySelector('.ttahub-recipient-spotlight-header-divider');
    expect(divider).toBeInTheDocument();
  });

  it('updates sort dropdown when sortConfig changes', () => {
    const { rerender } = renderHeader();

    const newProps = {
      ...defaultProps,
      sortConfig: {
        sortBy: 'lastTTA',
        direction: 'asc',
      },
    };

    rerender(
      <RecipientSpotlightCardsHeader
        sortConfig={newProps.sortConfig}
        requestSort={newProps.requestSort}
        perPage={newProps.perPage}
        perPageChange={newProps.perPageChange}
        count={newProps.count}
      />,
    );

    const sortDropdown = screen.getByLabelText('Sort by');
    expect(sortDropdown).toHaveValue('lastTTA-asc');
  });

  it('handles multiple sort option changes', () => {
    renderHeader();

    const sortDropdown = screen.getByLabelText('Sort by');

    fireEvent.change(sortDropdown, { target: { value: 'recipientName-desc' } });
    expect(defaultProps.requestSort).toHaveBeenCalledWith('recipientName', 'desc');

    fireEvent.change(sortDropdown, { target: { value: 'regionId-asc' } });
    expect(defaultProps.requestSort).toHaveBeenCalledWith('regionId', 'asc');

    fireEvent.change(sortDropdown, { target: { value: 'indicatorCount-asc' } });
    expect(defaultProps.requestSort).toHaveBeenCalledWith('indicatorCount', 'asc');

    expect(defaultProps.requestSort).toHaveBeenCalledTimes(3);
  });

  it('handles different count values for "All" option', () => {
    const { rerender } = renderHeader({ count: 100 });

    let perPageDropdown = screen.getByLabelText('Show');
    let allOption = Array.from(perPageDropdown.querySelectorAll('option')).find(
      (option) => option.textContent === 'All',
    );
    expect(allOption).toHaveValue('100');

    rerender(
      <RecipientSpotlightCardsHeader
        sortConfig={defaultProps.sortConfig}
        requestSort={defaultProps.requestSort}
        perPage={defaultProps.perPage}
        perPageChange={defaultProps.perPageChange}
        count={250}
      />,
    );

    perPageDropdown = screen.getByLabelText('Show');
    allOption = Array.from(perPageDropdown.querySelectorAll('option')).find(
      (option) => option.textContent === 'All',
    );
    expect(allOption).toHaveValue('250');
  });
});
