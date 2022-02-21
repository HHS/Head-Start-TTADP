import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import FilterOtherEntitiesSelect from '../FilterOtherEntitiesSelect';

const { findByText } = screen;

describe('FilterOtherEntitiesSelect', () => {
  const renderOtherEntitiesSelect = (onApply) => (
    render(
      <FilterOtherEntitiesSelect
        onApply={onApply}
        inputId="curly"
        query={[]}
      />,
    ));

  it('calls the onapply handler', async () => {
    const onApply = jest.fn();
    renderOtherEntitiesSelect(onApply);

    const select = await findByText(/Select other entities to filter by/i);
    await selectEvent.select(select, ['QRIS System']);
    expect(onApply).toHaveBeenCalledWith(['QRIS System']);
  });
});
