import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import selectEvent from 'react-select-event';
import MyReportsSelect from '../MyReportsSelect';

const { findByText } = screen;

describe('MyReportsSelect', () => {
  const renderPopulationSelect = (onApply) =>
    render(<MyReportsSelect onApply={onApply} inputId="curly" query={[]} />);

  it('calls the onapply handler', async () => {
    const onApply = jest.fn();
    renderPopulationSelect(onApply);

    const select = await findByText(/select report roles to filter by/i);
    await selectEvent.select(select, ['Creator']);
    expect(onApply).toHaveBeenCalled();
  });

  it('renders communication log report role options when isCommLog is true', async () => {
    const onApply = jest.fn();
    render(<MyReportsSelect onApply={onApply} inputId="cl-curly" query={[]} isCommLog />);
    const select = await findByText(/select report roles to filter by/i);
    expect(select).toBeInTheDocument();
  });
});
