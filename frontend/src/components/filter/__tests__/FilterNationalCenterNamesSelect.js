import '@testing-library/jest-dom';
import React from 'react';
import fetchMock from 'fetch-mock';
import {
  render,
  screen,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import FilterNationalCenterNameSelect from '../FilterNationalCenterNameSelect';

const { findByText } = screen;

describe('FilterNationalCenterNameSelect', () => {
  const renderFilterNationalCenterNameSelect = async (onApply) => (
    render(
      <FilterNationalCenterNameSelect
        onApply={onApply}
        inputId="curly"
        query={[]}
        title="Creator"
      />,
    ));

  it('calls the onapply handler', async () => {
    fetchMock.get('/api/national-center', { options: ['NC 1', 'NC 2'] });
    const onApply = jest.fn();
    await renderFilterNationalCenterNameSelect(onApply);

    const select = await findByText(/Select national center to filter by/i);
    await selectEvent.select(select, ['NC 2']);
    expect(onApply).toHaveBeenCalledWith(['NC 2']);
  });
});
