import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DateRangePicker from '../DateRangePicker';

describe('DateRangePicker', () => {
  const renderDateRangePicker = (query = '2021/11/03-2021/11/10', onApply = jest.fn()) => {
    render(
      <>
        <DateRangePicker
          onApply={onApply}
          query={query}
        />
        <button type="button">Dumb button</button>
      </>,
    );
  };

  it('adjusts the deltas', async () => {
    renderDateRangePicker();
    const toggle = await screen.findByRole('button', { name: /change custom date range/i });
    userEvent.click(toggle);
    const [sdCalendar] = await screen.findAllByRole('button', { name: /toggle calendar/i });
    userEvent.click(sdCalendar);

    const newStart = await screen.findByRole('button', { name: /11 november 2021 thursday/i });
    act(() => userEvent.click(newStart));

    userEvent.tab();

    const endDate = await screen.findByRole('textbox', { name: /end date/i });
    expect(endDate.value).toBe('11/18/2021');
  });
});
