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
      />,
    ));

  it('calls the on apply handler', async () => {
    fetchMock.get('/api/national-center', { centers: [{ id: 1, name: 'NC 1' }, { id: 2, name: 'NC 2' }], users: [] });
    const onApply = jest.fn();
    await renderFilterNationalCenterNameSelect(onApply);

    const select = await findByText(/Select national center to filter by/i);
    await selectEvent.select(select, ['NC 2']);
    expect(onApply).toHaveBeenCalledWith(['NC 2']);
  });
});
