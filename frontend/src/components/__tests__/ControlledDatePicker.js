/* eslint-disable jsx-a11y/label-has-associated-control */
import '@testing-library/jest-dom';
import React from 'react';
import moment from 'moment';
import { render, screen, act } from '@testing-library/react';
import { useForm } from 'react-hook-form/dist/index.ie11';
import userEvent from '@testing-library/user-event';
import { Grid } from '@trussworks/react-uswds';
import { DATE_DISPLAY_FORMAT } from '../../Constants';

import ControlledDatePicker from '../ControlledDatePicker';

describe('Controlled Date Picker', () => {
  // eslint-disable-next-line react/prop-types
  const TestDatePicker = ({ setEndDate }) => {
    const {
      control, errors, handleSubmit, watch,
    } = useForm({
      defaultValues: { name: [] },
      mode: 'all',
    });

    const startDate = watch('startDate');
    const endDate = watch('endDate');

    const submit = jest.fn();

    return (
      <form onSubmit={handleSubmit(submit)}>
        <Grid row>
          <Grid col={8}>
            {errors.startDate ? errors.startDate.message : ''}
            <label htmlFor="startDate">
              Start date
            </label>
            <ControlledDatePicker
              control={control}
              name="startDate"
              value={startDate}
              setEndDate={setEndDate}
              maxDate={endDate}
              isStartDate
              inputId="startDate"
            />
          </Grid>
        </Grid>
        <Grid row>
          {errors.endDate ? errors.endDate.message : ''}
          <Grid col={8}>
            <label htmlFor="endDate">End date</label>
            <ControlledDatePicker
              control={control}
              name="endDate"
              value={endDate}
              minDate={startDate}
              key="endDateKey"
              inputId="endDate"
            />
          </Grid>
        </Grid>
      </form>
    );
  };

  it('validates correctly', async () => {
    const setEndDate = jest.fn();
    render(<TestDatePicker setEndDate={setEndDate} />);

    const sd = await screen.findByRole('textbox', { name: /start date/i });

    userEvent.type(sd, '01/01/1999');
    await screen.findByText('Please enter a date after 09/01/2020');

    act(() => userEvent.clear(sd));

    const ed = await screen.findByRole('textbox', { name: /end date/i });

    userEvent.type(sd, '01/01/2021');
    userEvent.type(ed, '12/31/2020');

    expect(await screen.findByText('Please enter a date after 01/01/2021')).toBeVisible();

    act(() => userEvent.clear(ed));
    userEvent.type(ed, '01/02/2021');

    act(() => userEvent.clear(sd));
    userEvent.type(sd, '01/03/2021');
    expect(setEndDate).toHaveBeenCalled();
  });

  it('can set future start date', async () => {
    const setEndDate = jest.fn();
    render(<TestDatePicker setEndDate={setEndDate} />);

    const sd = await screen.findByRole('textbox', { name: /start date/i });
    const futureDate = moment().add(5, 'days').format(DATE_DISPLAY_FORMAT);
    userEvent.type(sd, futureDate);

    const ed = await screen.findByRole('textbox', { name: /end date/i });
    const todaysDate = moment().format(DATE_DISPLAY_FORMAT);
    userEvent.type(ed, todaysDate);

    const validationMessage = await screen.findByText(`Please enter a date after ${futureDate}`);
    expect(validationMessage).toBeVisible();
  });
});
