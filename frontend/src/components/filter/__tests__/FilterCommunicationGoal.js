import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import selectEvent from 'react-select-event';
import FilterCommunicationGoal from '../FilterCommunicationGoal';

const { findByText } = screen;

describe('FilterCommunicationGoal', () => {
  const renderFilterCommunicationGoal = (onApply) =>
    render(<FilterCommunicationGoal onApply={onApply} inputId="curly" query={[]} />);

  it('calls the onapply handler', async () => {
    const onApply = jest.fn();
    renderFilterCommunicationGoal(onApply);

    const select = await findByText(/Select goal type to filter by/i);
    await selectEvent.select(select, ['Workforce Development']);
    expect(onApply).toHaveBeenCalledWith(['Workforce Development']);
  });
});
