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

  it('renders communication log report role options when isFor is commLog', async () => {
    const onApply = jest.fn();
    render(<MyReportsSelect onApply={onApply} inputId="cl-curly" query={[]} isFor="commLog" />);
    const select = await findByText(/select report roles to filter by/i);
    expect(select).toBeInTheDocument();
  });

  it('renders AR and TR report role options when isFor is ttaHistory', async () => {
    const onApply = jest.fn();
    render(<MyReportsSelect onApply={onApply} inputId="tta-curly" query={[]} isFor="ttaHistory" />);
    const select = await findByText(/select report roles to filter by/i);

    // Verify a TR role is present and selectable.
    await selectEvent.select(select, ['TR POC']);
    expect(onApply).toHaveBeenCalledWith(['TR POC']);

    // Also verify that the AR-prefixed label is present (not the legacy 'Creator').
    const arOption = await screen.findByText('AR creator');
    expect(arOption).toBeInTheDocument();
  });
});
