import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { useForm } from 'react-hook-form/dist/index.ie11';
import DatePicker from '../DatePicker';

// react-dates when opening the calendar in these tests. For details see
// https://github.com/airbnb/react-dates/issues/1426#issuecomment-593420014
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderLeftWidth: 0,
  }),
});

describe('DatePicker', () => {
  const RenderDatePicker = ({
    // eslint-disable-next-line react/prop-types
    disabled = false, setEndDate = jest.fn(), isStartDate = false, maxDate = '07/04/2021',
  }) => {
    const { control } = useForm();
    return (
      <form>
        <DatePicker
          control={control}
          label="label"
          name="picker"
          disabled={disabled}
          ariaName="datepicker"
          setEndDate={setEndDate}
          isStartDate={isStartDate}
          maxDate={maxDate}
        />
      </form>
    );
  };

  it('disabled flag disables text input', async () => {
    render(<RenderDatePicker disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('accepts text input', async () => {
    render(<RenderDatePicker />);
    const textbox = screen.getByRole('textbox');
    fireEvent.change(textbox, { target: { value: '01/01/2000' } });
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('01/01/2000'));
  });

  it('clicking the open button will open the calendar', async () => {
    render(<RenderDatePicker />);
    const openCalendar = screen.getByRole('button');
    fireEvent.click(openCalendar);
    const button = await screen.findByLabelText('Move backward to switch to the previous month.');
    await waitFor(() => expect(button).toBeVisible());
  });

  it('changing the start date can move the end date', () => {
    const setEndDate = jest.fn();
    render(<RenderDatePicker isStartDate setEndDate={setEndDate} />);
    const textbox = screen.getByRole('textbox');
    // set initial date
    fireEvent.change(textbox, { target: { value: '07/03/2021' } });

    // set to a date past the max date
    fireEvent.change(textbox, { target: { value: '07/10/2021' } });

    // see that the delta is preserved
    expect(setEndDate).toHaveBeenCalledWith('07/11/2021');
  });
});
