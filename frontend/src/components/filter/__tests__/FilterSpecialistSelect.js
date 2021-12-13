import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import FilterSpecialistSelect from '../FilterSpecialistSelect';

const { findByText } = screen;

describe('FilterSpecialistSelect', () => {
  const renderSpecialistSelect = (onApply) => (
    render(
      <FilterSpecialistSelect
        onApply={onApply}
        inputId="curly"
      />,
    ));

  it('calls the onapply handler', async () => {
    const onApply = jest.fn();
    renderSpecialistSelect(onApply);

    const select = await findByText(/Select specialist role to filter by/i);
    await selectEvent.select(select, ['Health Specialist (HS)']);
    expect(onApply).toHaveBeenCalledWith(['Health Specialist']);
  });
});
