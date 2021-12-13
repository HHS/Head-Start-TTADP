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
        id="screams"
        condition="within"
        label="filter by bananas"
        type="bananas"
      />,
    ));

  it('calls the onapply handler', () => {
    const onApply = jest.fn();
    renderFilterInput(onApply);
    const textbox = screen.getByRole('textbox', { name: /filter by bananas/i });
    expect(textbox).toHaveAttribute('id', 'bananas-within-screams');
    userEvent.type(textbox, 'we have none');
    expect(onApply).toHaveBeenCalled();
  });
});
