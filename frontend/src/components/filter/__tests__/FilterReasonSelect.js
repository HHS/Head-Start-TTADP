import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import selectEvent from 'react-select-event';
import FilterReasonSelect from '../FilterReasonSelect';

const { findByText } = screen;

describe('FilterReasonSelect', () => {
  const renderProgramTypeSelect = (onApply) =>
    render(<FilterReasonSelect onApply={onApply} inputId="curly" query={[]} />);

  it('calls the onapply handler', async () => {
    const onApply = jest.fn();
    renderProgramTypeSelect(onApply);

    const select = await findByText(/select reasons to filter by/i);
    await selectEvent.select(select, ['Child Incident']);
    expect(onApply).toHaveBeenCalled();
  });
});
