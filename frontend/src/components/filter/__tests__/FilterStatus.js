import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import FilterStatus from '../FilterStatus';

const { findByText } = screen;

describe('FilterStatus', () => {
  const renderStatusSelect = (onApply) => (
    render(
      <FilterStatus
        onApply={onApply}
        inputId="curly"
        query={[]}
      />,
    ));

  it('calls the onapply handler', async () => {
    const onApply = jest.fn();
    renderStatusSelect(onApply);

    const select = await findByText(/select status to filter by/i);
    await selectEvent.select(select, ['Needs Status']);
    expect(onApply).toHaveBeenCalled();
  });
});
