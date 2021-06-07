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
  // eslint-disable-next-line react/prop-types
  const RenderDatePicker = ({ disabled }) => {
    const { control } = useForm();
    return (
      <form>
        <DatePicker
          control={control}
          label="label"
          name="picker"
          disabled={disabled}
          ariaName="datepicker"
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
});
