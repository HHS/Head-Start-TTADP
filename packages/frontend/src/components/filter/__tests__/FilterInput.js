import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterInput from '../FilterInput';

describe('FilterInput', () => {
  const renderFilterInput = (onApply) => (
    render(
      <FilterInput
        onApply={onApply}
        query=""
        inputId="screams"
        label="filter by bananas"
      />,
    ));

  it('calls the onapply handler', () => {
    const onApply = jest.fn();
    renderFilterInput(onApply);
    const textbox = screen.getByRole('textbox', { name: /filter by bananas/i });
    expect(textbox).toHaveAttribute('id', 'screams');
    userEvent.type(textbox, 'we have none');
    expect(onApply).toHaveBeenCalled();
  });
});
