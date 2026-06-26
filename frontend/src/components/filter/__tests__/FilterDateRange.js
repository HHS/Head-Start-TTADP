import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { formatDateRange } from '../../../utils';
import FilterDateRange from '../FilterDateRange';
import FilterErrorContext from '../FilterErrorContext';

describe('FilterDateRange', () => {
  const renderFilterDateRange = (
    query,
    condition = 'is on or after',
    onApplyDateRange = jest.fn(),
    setError = jest.fn(),
    customDateOptions = null
  ) => {
    const updateSingleDate = jest.fn();

    render(
      <FilterErrorContext.Provider value={{ setError }}>
        <FilterDateRange
          condition={condition}
          query={query}
          updateSingleDate={updateSingleDate}
          onApplyDateRange={onApplyDateRange}
          customDateOptions={customDateOptions}
        />
      </FilterErrorContext.Provider>
    );
  };

  it('handles an empty query', async () => {
    const onApplyDateRange = jest.fn();
    renderFilterDateRange('', 'is on or after', onApplyDateRange);
    const date = screen.getByRole('textbox', { name: /date/i });
    userEvent.type(date, '10/31/2021');
    expect(onApplyDateRange).toHaveBeenCalled();
    const [hidden] = await screen.findAllByRole('textbox', { hidden: true });
    expect(hidden).toHaveValue('2021-10-31');
  });

  it('checks for valid dates', async () => {
    const onApplyDateRange = jest.fn();
    const setError = jest.fn();
    renderFilterDateRange('', 'is on or after', onApplyDateRange, setError);
    const date = screen.getByRole('textbox', { name: /date/i });
    userEvent.type(date, 'pppppp');

    const message = 'Please enter a valid date';
    expect(setError).toHaveBeenCalledWith(message);
  });

  it('renders the is dropdown', async () => {
    const onApplyDateRange = jest.fn();
    renderFilterDateRange('', 'is', onApplyDateRange);
    const date = screen.getByRole('combobox', { name: /date/i });
    userEvent.selectOptions(date, 'Last thirty days');
    expect(onApplyDateRange).toHaveBeenCalled();
  });

  it('shows the selected preset when the query is a string', () => {
    const yearToDate = formatDateRange({ yearToDate: true, forDateTime: true });

    renderFilterDateRange(yearToDate, 'is');

    const date = screen.getByRole('combobox', { name: /date/i });
    expect(date).toHaveDisplayValue('Year to date');
    expect(date).toHaveValue(yearToDate);
  });

  it('shows the selected preset when the query comes from the URL', () => {
    const yearToDate = formatDateRange({ yearToDate: true, forDateTime: true });

    renderFilterDateRange([yearToDate], 'is');

    const date = screen.getByRole('combobox', { name: /date/i });
    expect(date).toHaveDisplayValue('Year to date');
    expect(date).toHaveValue(yearToDate);
  });

  it('shows a restored date range when it is not in the current preset options', () => {
    const restoredRange = '2024/01/01-2024/03/15';

    renderFilterDateRange([restoredRange], 'is');

    const date = screen.getByRole('combobox', { name: /date/i });
    expect(date).toHaveDisplayValue('01/01/2024 - 03/15/2024');
    expect(date).toHaveValue(restoredRange);
  });

  it('renders custom date options', async () => {
    const customDateOptions = [
      {
        label: 'Last three months',
        value: 'last-three-months',
      },
      {
        label: 'Last six months',
        value: 'last-six-months',
      },
    ];
    const onApplyDateRange = jest.fn();
    renderFilterDateRange('', 'is', onApplyDateRange, jest.fn(), customDateOptions);
    const date = screen.getByRole('combobox', { name: /date/i });
    userEvent.selectOptions(date, 'Last three months');
    userEvent.selectOptions(date, 'Last six months');
    expect(onApplyDateRange).toHaveBeenCalled();
  });
});
