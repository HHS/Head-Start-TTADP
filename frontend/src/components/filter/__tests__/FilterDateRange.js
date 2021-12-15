import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterDateRange from '../FilterDateRange';

describe('FilterDateRange', () => {
  const renderFilterDateRange = (query, onApplyDateRange = jest.fn()) => {
    const condition = 'Is after';

    const updateSingleDate = jest.fn();

    render(
      <FilterDateRange
        condition={condition}
        query={query}
        updateSingleDate={updateSingleDate}
        onApplyDateRange={onApplyDateRange}
      />,
    );
  };

  it('handles an empty query', () => {
    const onApplyDateRange = jest.fn();
    renderFilterDateRange('', onApplyDateRange);
    const date = screen.getByRole('textbox', { name: /date/i });
    userEvent.type(date, '10/31');

    expect(onApplyDateRange).toHaveBeenCalledWith('');
    expect(onApplyDateRange).not.toHaveBeenCalledWith('2021/10/31');

    userEvent.type(date, '/2021');

    expect(onApplyDateRange).toHaveBeenCalledWith('2021/10/31');
    expect(date.value).toBe('10/31/2021');
  });

  it('handles an string query', () => {
    renderFilterDateRange('2021/10/31');
    expect(screen.getByRole('textbox', { name: /date/i }).value).toBe('10/31/2021');
  });

  it('handles an array query', () => {
    renderFilterDateRange(['Early childhood specialist']);
    expect(screen.getByRole('textbox', { name: /date/i }).value).toBe('');
  });
});
