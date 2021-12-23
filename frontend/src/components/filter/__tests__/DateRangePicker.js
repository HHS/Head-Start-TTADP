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
  const renderDateRangePicker = (query, onApply = jest.fn()) => {
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

  it('throws errors', async () => {
    renderDateRangePicker('');
    const toggle = await screen.findByRole('button', { name: /change custom date range/i });
    userEvent.click(toggle);

    const dumb = await screen.findByRole('button', { name: /dumb button/i });
    userEvent.click(dumb);

    let error = await screen.findByText(/please enter a start date/i);
    expect(error).toBeVisible();

    const startDate = await screen.findByRole('textbox', { name: /start date/i });
    userEvent.type(startDate, '12/21/2021');
    userEvent.click(dumb);

    error = await screen.findByText(/please enter an end date/i);
    expect(error).toBeVisible();

    const endDate = await screen.findByRole('textbox', { name: /end date/i });
    userEvent.type(endDate, '12/22/2441');

    userEvent.click(dumb);

    error = await screen.findByText(/please enter a date range between 09\/01\/2020 and today, in the format mm\/dd\/yyyy/i);
    expect(error).toBeVisible();

    userEvent.clear(endDate);
    userEvent.type(endDate, '12/22/2021');

    act(() => userEvent.click(toggle));
    act(() => userEvent.click(toggle));

    expect(startDate).not.toBeVisible();
  });

  it('adjusts the deltas', async () => {
    renderDateRangePicker('2021/10/01-2021/10/02');
    const toggle = await screen.findByRole('button', { name: /change custom date range/i });
    userEvent.click(toggle);

    const startDate = await screen.findByRole('textbox', { name: /start date/i });
    userEvent.clear(startDate);
    userEvent.type(startDate, '11/03/2021');

    const endDate = await screen.findByRole('textbox', { name: /end date/i });
    userEvent.clear(endDate);
    userEvent.type(endDate, '11/10/2021');

    userEvent.clear(startDate);
    act(() => userEvent.type(startDate, '11/11/2021'));
    userEvent.tab();
    expect(endDate.value).toBe('11/18/2021');
  });
});
