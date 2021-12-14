import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import FilterPopulationSelect from '../FilterPopulationSelect';

const { findByText } = screen;

describe('FilterPopulationSelect', () => {
  const renderPopulationSelect = (onApply) => (
    render(
      <FilterPopulationSelect
        onApply={onApply}
        inputId="curly"
      />,
    ));

  it('calls the onapply handler', async () => {
    const onApply = jest.fn();
    renderPopulationSelect(onApply);

    const select = await findByText(/select target populations to filter by/i);
    await selectEvent.select(select, ['Dual-Language Learners']);
    expect(onApply).toHaveBeenCalled();
  });
});
