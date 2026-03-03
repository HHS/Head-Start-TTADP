import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import FilterPriorityIndicator from '../FilterPriorityIndicator';

const { findByText } = screen;

describe('FilterPriorityIndicator', () => {
  const renderPriorityIndicatorSelect = (onApply, query = []) => (
    render(
      <FilterPriorityIndicator
        onApply={onApply}
        inputId="priority-indicator-test"
        query={query}
      />,
    ));

  it('calls the onApply handler when a priority indicator is selected', async () => {
    const onApply = jest.fn();
    renderPriorityIndicatorSelect(onApply);

    const select = await findByText(/select priority indicator to filter by/i);
    await selectEvent.select(select, ['New recipient']);
    expect(onApply).toHaveBeenCalled();
  });

  it('renders all priority indicator options', async () => {
    const onApply = jest.fn();
    renderPriorityIndicatorSelect(onApply);

    const select = await findByText(/select priority indicator to filter by/i);
    await selectEvent.openMenu(select);

    // Verify all 5 options are present (DRS and FEI are filtered out)
    expect(screen.getByText('Child incidents')).toBeInTheDocument();
    expect(screen.getByText('Deficiency')).toBeInTheDocument();
    expect(screen.getByText('New recipient')).toBeInTheDocument();
    expect(screen.getByText('New staff')).toBeInTheDocument();
    expect(screen.getByText('No TTA')).toBeInTheDocument();

    // Verify DRS and FEI are not present
    expect(screen.queryByText('DRS')).not.toBeInTheDocument();
    expect(screen.queryByText('FEI')).not.toBeInTheDocument();
  });

  it('renders with pre-selected values', async () => {
    const onApply = jest.fn();
    renderPriorityIndicatorSelect(onApply, ['New recipient', 'Deficiency']);

    // Verify the selected values are displayed
    expect(screen.getAllByText('New recipient').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Deficiency').length).toBeGreaterThan(0);
  });

  it('allows multiple selections', async () => {
    const onApply = jest.fn();
    renderPriorityIndicatorSelect(onApply);

    const select = await findByText(/select priority indicator to filter by/i);
    await selectEvent.select(select, ['New recipient', 'No TTA']);

    // selectEvent.select calls onApply once for each selection
    expect(onApply).toHaveBeenCalled();
    expect(onApply).toHaveBeenCalledTimes(2);
  });
});
