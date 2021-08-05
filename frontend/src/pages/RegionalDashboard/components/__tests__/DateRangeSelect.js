import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent,
} from '@testing-library/react';
import DateRangeSelect from '../DateRangeSelect';

describe('DateRangeSelect', () => {
  const renderDateRangeSelect = (onApplyDateRange) => {
    render(<DateRangeSelect onApply={onApplyDateRange} />);
  };

  it('renders correctly', () => {
    const onApplyDateRange = jest.fn();
    renderDateRangeSelect(onApplyDateRange);
    const button = screen.getByRole('button', { name: /open date range options menu/i });
    expect(button).toHaveTextContent('Last 30 Days');
  });

  it('opens the list of options', () => {
    const onApplyDateRange = jest.fn();
    renderDateRangeSelect(onApplyDateRange);

    const button = screen.getByRole('button', { name: /open date range options menu/i });
    fireEvent.click(button);

    const thirtyDays = screen.getByRole('button', { name: /select to view data from last 30 days\. select apply filters button to apply selection/i });
    expect(thirtyDays).toHaveTextContent('Last 30 Days');
  });

  it('allows the date range to be updated', () => {
    const onApplyDateRange = jest.fn();
    renderDateRangeSelect(onApplyDateRange);

    const button = screen.getByRole('button', { name: /open date range options menu/i });
    fireEvent.click(button);

    const thirtyDays = screen.getByRole('button', { name: /select to view data from last 30 days\. select apply filters button to apply selection/i });
    fireEvent.click(thirtyDays);

    const applyFilters = screen.getByRole('button', { name: 'Apply filters' });
    fireEvent.click(applyFilters);

    expect(onApplyDateRange).toHaveBeenCalledWith({ label: 'Last 30 Days', value: 1 });
  });

  it('closes the menu with the escape key', () => {
    const onApplyDateRange = jest.fn();
    renderDateRangeSelect(onApplyDateRange);

    // open menu
    const button = screen.getByRole('button', { name: /open date range options menu/i });
    fireEvent.click(button);

    // expect text
    const option = screen.getByRole('button', { name: /select to view data from last 30 days\. select apply filters button to apply selection/i });

    button.focus();

    expect(option).toBeVisible();

    // close menu
    fireEvent.keyDown(button, { key: 'Escape', code: 'Escape', keyCode: 27 });

    // confirm menu is closed
    expect(option).not.toBeVisible();
  });
});
