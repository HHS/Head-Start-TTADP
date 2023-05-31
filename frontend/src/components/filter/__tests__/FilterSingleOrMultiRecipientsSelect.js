import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterSingleOrMultiRecipientsSelect from '../FilterSingleOrMultiRecipientsSelect';

describe('FilterSingleOrMultiSelect', () => {
  const renderSingleOrMultiSelect = (onApply) => (
    render(
      <FilterSingleOrMultiRecipientsSelect
        onApply={onApply}
        inputId="single-or-multi"
        query={[]}
      />,
    ));

  it('calls the onapply handler', async () => {
    const onApply = jest.fn();
    renderSingleOrMultiSelect(onApply);
    const select = await screen.findByRole('combobox');
    userEvent.selectOptions(select, 'Multiple recipient reports');
    expect(onApply).toHaveBeenCalled();
  });
});
