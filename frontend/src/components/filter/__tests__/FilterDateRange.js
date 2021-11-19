import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import FilterDateRange from '../FilterDateRange';

describe('FilterDateRange', () => {
  const renderFilterDateRange = (query) => {
    const condition = 'Is after';

    const updateSingleDate = jest.fn();
    const onApplyDateRange = jest.fn();

    render(
      <FilterDateRange
        condition={condition}
        query={query}
        updateSingleDate={updateSingleDate}
        onApplyDateRange={onApplyDateRange}
      />,
    );
  };

  it('handles an string query', () => {
    renderFilterDateRange('2021/10/31');
    expect(screen.getByRole('textbox', { name: /date/i }).value).toBe('10/31/2021');
  });

  it('handles an array query', () => {
    renderFilterDateRange(['Early childhood specialist']);
    expect(screen.getByRole('textbox', { name: /date/i }).value).toBe('');
  });
});
