import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import selectEvent from 'react-select-event';
import FilterDeliveryMethod from '../FilterDeliveryMethod';

const { findByText } = screen;

describe('FilterDeliveryMethod', () => {
  const renderProgramTypeSelect = (onApply) =>
    render(<FilterDeliveryMethod onApply={onApply} inputId="curly" query={[]} />);

  it('calls the on apply handler', async () => {
    const onApply = jest.fn();
    renderProgramTypeSelect(onApply);

    const select = await findByText(/select delivery method to filter by/i);
    await selectEvent.select(select, ['Hybrid']);
    expect(onApply).toHaveBeenCalled();
  });
});
