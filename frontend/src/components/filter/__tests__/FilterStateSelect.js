import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import FilterStateSelect from '../FilterStateSelect';

const { findByText } = screen;

describe('FilterStateSelect', () => {
  const renderStateSelect = (onApply) => (
    render(
      <FilterStateSelect
        onApply={onApply}
        inputId="curly"
        stateCodes={['MA', 'RI']}
      />,
    ));

  it('calls the onapply handler', async () => {
    const onApply = jest.fn();
    renderStateSelect(onApply);

    const select = await findByText(/Select state to filter by/i);
    await selectEvent.select(select, ['MA']);
    expect(onApply).toHaveBeenCalledWith(['MA']);
  });
});
