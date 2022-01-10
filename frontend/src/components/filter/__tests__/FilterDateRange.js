import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterDateRange from '../FilterDateRange';
import FilterErrorContext from '../FilterErrorContext';

describe('FilterDateRange', () => {
  const renderFilterDateRange = (query, onApplyDateRange = jest.fn()) => {
    const condition = 'Is after';
    const updateSingleDate = jest.fn();
    const setError = jest.fn();

    render(
      <FilterErrorContext.Provider value={{ setError }}>
        <FilterDateRange
          condition={condition}
          query={query}
          updateSingleDate={updateSingleDate}
          onApplyDateRange={onApplyDateRange}
        />
      </FilterErrorContext.Provider>,
    );
  };

  it('handles an empty query', async () => {
    const onApplyDateRange = jest.fn();
    renderFilterDateRange('', onApplyDateRange);
    const date = screen.getByRole('textbox', { name: /date/i });
    userEvent.type(date, '10/31/2021');
    expect(onApplyDateRange).toHaveBeenCalled();
    const [hidden] = await screen.findAllByRole('textbox', { hidden: true });
    expect(hidden).toHaveValue('2021-10-31');
  });
});
