import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent, act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DateRangeSelect, { formatDateRange } from '../DateRangeSelect';

describe('format date function', () => {
  it('returns a formatted date string', () => {
    const str = formatDateRange({
      lastThirtyDays: false,
      string: '2021/06/07-2021/06/08',
      withSpaces: true,
    });

    expect(str).toBe('06/07/2021 - 06/08/2021');
  });

  it('returns a formatted date string without spaces', () => {
    const str = formatDateRange({
      string: '2021/06/07-2021/06/08',
      withSpaces: false,
    });

    expect(str).toBe('06/07/2021-06/08/2021');
  });
});

describe('DateRangeSelect', () => {
  const renderDateRangeSelect = (onApplyDateRange = jest.fn(), disabled = false) => {
    render(
      <DateRangeSelect
        updateDateRange={onApplyDateRange}
        styleAsSelect
        disabled={disabled}
      />,
    );
  };

  it('renders correctly', () => {
    renderDateRangeSelect();
    const button = screen.getByRole('button', { name: /Toggle the date range select menu/i });
    expect(button).toHaveTextContent('Last 30 Days');
  });

  it('opens the list of options', () => {
    renderDateRangeSelect();

    const button = screen.getByRole('button', { name: /Toggle the date range select menu/i });
    fireEvent.click(button);

    const thirtyDays = screen.getByRole('button', { name: /select to view data from last 30 days\. select apply filters button to apply selection/i });
    expect(thirtyDays).toHaveTextContent('Last 30 Days');
  });

  it('opens the start date calendar', async () => {
    renderDateRangeSelect();
    const button = screen.getByRole('button', { name: /Toggle the date range select menu/i });

    fireEvent.click(button);

    const custom = screen.getByRole('button', { name: /select to view data from custom date range\. select apply filters button to apply selection/i });
    fireEvent.click(custom);

    const startDateCalendar = screen.getByRole('button', { name: /open start date picker calendar/i });

    act(() => {
      fireEvent.click(startDateCalendar);
    });

    expect(document.querySelector('#startDatePicker')).toHaveFocus();
  });

  it('allows the date range to be updated', () => {
    const onApplyDateRange = jest.fn();
    renderDateRangeSelect(onApplyDateRange);

    const button = screen.getByRole('button', { name: /Toggle the date range select menu/i });
    fireEvent.click(button);

    const thirtyDays = screen.getByRole('button', { name: /select to view data from last 30 days\. select apply filters button to apply selection/i });
    fireEvent.click(thirtyDays);

    const applyFilters = screen.getByRole('button', { name: 'Apply date range filters' });
    fireEvent.click(applyFilters);

    expect(onApplyDateRange).toHaveBeenCalled();
  });

  it('can be disabled', () => {
    const onApplyDateRange = jest.fn();
    renderDateRangeSelect(onApplyDateRange, true);
    const button = screen.getByRole('button', { name: /Toggle the date range select menu/i });
    expect(button).toBeDisabled();
  });

  it('allows flexible start dates and preserves the delta', async () => {
    renderDateRangeSelect();

    // open menu
    const button = screen.getByRole('button', { name: /Toggle the date range select menu/i });
    fireEvent.click(button);

    // select custom date range
    const custom = screen.getByRole('button', { name: /select to view data from custom date range\. select apply filters button to apply selection/i });
    fireEvent.click(custom);

    // get the two text boxes
    const startDate = screen.getByRole('textbox', { name: /start date/i });
    const endDate = screen.getByRole('textbox', { name: /end date/i });

    // do some typing
    userEvent.type(startDate, '10/05/2021');
    userEvent.type(endDate, '10/10/2021');

    // sure, I guess
    // https://testing-library.com/docs/example-input-event/
    fireEvent.change(startDate, { target: { value: '10/11/2021' } });

    expect(endDate.value).toBe('10/16/2021');
  });

  it('closes the menu with the escape key', () => {
    renderDateRangeSelect();

    // open menu
    const button = screen.getByRole('button', { name: /Toggle the date range select menu/i });
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
