import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import moment from 'moment';
import DateRangePicker from '../DateRangePicker';
import { DATE_DISPLAY_FORMAT } from '../../../Constants';

const today = moment().format(DATE_DISPLAY_FORMAT);

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

  it('handles no query applied', async () => {
    renderDateRangePicker('');
    const toggle = await screen.findByRole('button', { name: /change custom date range/i });
    userEvent.click(toggle);
    const apply = await screen.findByRole('button', { name: /apply date range changes/i });
    userEvent.click(apply);

    expect(await screen.findByText('Please enter a valid start date')).toBeVisible();
    expect(await screen.findByText('Please enter a valid end date')).toBeVisible();
  });

  it('validates the date range', async () => {
    renderDateRangePicker();
    const toggle = await screen.findByRole('button', { name: /change custom date range/i });
    userEvent.click(toggle);
    const endDate = await screen.findByRole('textbox', { name: /end date/i });

    userEvent.clear(endDate);
    userEvent.type(endDate, 'gargle-fargle');
    userEvent.tab();

    expect(await screen.findByText('Please enter a valid date before today and after 11/03/2021')).toBeVisible();
  });

  it('adjusts the deltas', async () => {
    renderDateRangePicker();
    const toggle = await screen.findByRole('button', { name: /change custom date range/i });
    userEvent.click(toggle);
    const [sdCalendar] = await screen.findAllByRole('button', { name: /toggle calendar/i });
    userEvent.click(sdCalendar);

    const newStart = await screen.findByRole('button', { name: /11 november 2021 thursday/i });
    act(() => userEvent.click(newStart));

    userEvent.tab();

    let endDate = await screen.findByRole('textbox', { name: /end date/i });
    expect(endDate.value).toBe('11/18/2021');

    const startDate = await screen.findByRole('textbox', { name: /start date/i });
    userEvent.clear(startDate);
    userEvent.type(startDate, today);
    userEvent.tab();
    userEvent.tab();
    userEvent.tab();

    endDate = await screen.findByRole('textbox', { name: /end date/i });
    expect(endDate.value).toBe(today);
  });
});
