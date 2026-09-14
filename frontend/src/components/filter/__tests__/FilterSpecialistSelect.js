import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import selectEvent from 'react-select-event';
import FilterSpecialistSelect from '../FilterSpecialistSelect';

const { findByText } = screen;

describe('FilterSpecialistSelect', () => {
  const renderSpecialistSelect = (onApply) =>
    render(<FilterSpecialistSelect onApply={onApply} inputId="curly" query={[]} />);

  it('calls the onapply handler', async () => {
    const onApply = jest.fn();
    renderSpecialistSelect(onApply);

    const select = await findByText(/Select specialist role to filter by/i);
    await selectEvent.select(select, ['Health Specialist (HS)']);
    expect(onApply).toHaveBeenCalledWith(['Health Specialist']);
  });

  it('maps a newly added role to its backend value', async () => {
    const onApply = jest.fn();
    renderSpecialistSelect(onApply);

    const select = await findByText(/Select specialist role to filter by/i);
    await selectEvent.select(select, ['Early Childhood Manager (ECM)']);
    expect(onApply).toHaveBeenCalledWith(['Early Childhood Manager']);
  });

  it('maps the TTAC role to its backend value', async () => {
    const onApply = jest.fn();
    renderSpecialistSelect(onApply);

    const select = await findByText(/Select specialist role to filter by/i);
    await selectEvent.select(select, ['TTAC']);
    expect(onApply).toHaveBeenCalledWith(['TTAC']);
  });
});
