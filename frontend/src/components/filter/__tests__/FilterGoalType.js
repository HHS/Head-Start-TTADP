import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterGoalType from '../FilterGoalType';

const { findByRole } = screen;

describe('FilterGoalType', () => {
  const renderFilterGoalType = (appliedType, onApply) => (
    render(
      <FilterGoalType
        onApply={onApply}
        goalType={appliedType}
      />,
    ));

  it('calls the onapply handler', async () => {
    const onApply = jest.fn();
    renderFilterGoalType('RTTAPA', onApply);
    const select = await findByRole('combobox', { name: /Select goal type to filter by/i });
    userEvent.selectOptions(select, 'Non-RTTAPA');
    expect(onApply).toHaveBeenCalled();
  });
});
