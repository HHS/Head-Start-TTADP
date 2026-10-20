import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import selectEvent from 'react-select-event';
import FilterStatus from '../FilterStatus';

const { findByText } = screen;

describe('FilterStatus', () => {
  const renderStatusSelect = (onApply) =>
    render(<FilterStatus onApply={onApply} inputId="curly" query={[]} />);

  it('calls the onapply handler', async () => {
    const onApply = jest.fn();
    renderStatusSelect(onApply);

    const select = await findByText(/select status to filter by/i);
    await selectEvent.select(select, [/in progress/i]);
    expect(onApply).toHaveBeenCalled();
  });
});
