import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import FilterReasonSelect from '../FilterReasonSelect';

const { findByText } = screen;

describe('FilterReasonSelect', () => {
  const renderProgramTypeSelect = (onApply) => (
    render(
      <FilterReasonSelect
        onApply={onApply}
        inputId="curly"
        query={[]}
      />,
    ));

  it('calls the onapply handler', async () => {
    const onApply = jest.fn();
    renderProgramTypeSelect(onApply);

    const select = await findByText(/select reasons to filter by/i);
    await selectEvent.select(select, ['Child Incidents']);
    expect(onApply).toHaveBeenCalled();
  });
});
