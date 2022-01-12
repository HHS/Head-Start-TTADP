import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import FilterProgramType from '../FilterProgramType';

const { findByText } = screen;

describe('FilterProgramType', () => {
  const renderProgramTypeSelect = (onApply) => (
    render(
      <FilterProgramType
        onApply={onApply}
        inputId="curly"
        query={[]}
      />,
    ));

  it('calls the onapply handler', async () => {
    const onApply = jest.fn();
    renderProgramTypeSelect(onApply);

    const select = await findByText(/select program type to filter by/i);
    await selectEvent.select(select, ['EHS']);
    expect(onApply).toHaveBeenCalled();
  });
});
