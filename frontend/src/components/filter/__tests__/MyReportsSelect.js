import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import MyReportsSelect from '../MyReportsSelect';

const { findByText } = screen;

describe('MyReportsSelect', () => {
  const renderPopulationSelect = (onApply) => (
    render(
      <MyReportsSelect
        onApply={onApply}
        inputId="curly"
        query={[]}
      />,
    ));

  it('calls the onapply handler', async () => {
    const onApply = jest.fn();
    renderPopulationSelect(onApply);

    const select = await findByText(/select report roles to filter by/i);
    await selectEvent.select(select, ['Creator']);
    expect(onApply).toHaveBeenCalled();
  });
});
