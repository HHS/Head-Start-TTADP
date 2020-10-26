import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent, waitFor,
} from '@testing-library/react';

import { useForm } from 'react-hook-form';
import DatePicker from '../DatePicker';

describe('DatePicker', () => {
  // eslint-disable-next-line react/prop-types
  const RenderDatePicker = ({ minDate, maxDate, disabled }) => {
    const { control } = useForm();
    return (
      <form>
        <DatePicker
          control={control}
          label="label"
          name="picker"
          minDate={minDate}
          maxDate={maxDate}
          disabled={disabled}
        />
      </form>
    );
  };

  it('disabled flag works', () => {
    render(<RenderDatePicker disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('accepts text input', async () => {
    render(<RenderDatePicker />);
    const textbox = screen.getByRole('textbox');
    fireEvent.change(textbox, { target: { value: '01/01/2000' } });
    waitFor(() => expect(screen.getByRole('textbox')).toHaveTextContent('01/01/2000'));
  });

  describe('maxDate', () => {
    it('causes input after minDate to be discarded', async () => {
      const date = new Date(2000, 1, 2);
      render(<RenderDatePicker maxDate={date} />);
      const textbox = screen.getByRole('textbox');
      fireEvent.change(textbox, { target: { value: '01/03/1000' } });
      waitFor(() => expect(screen.getByRole('textbox')).toHaveTextContent(''));
    });
  });

  describe('minDate', () => {
    it('causes input before minDate to be discarded', async () => {
      const date = new Date(2000, 1, 2);
      render(<RenderDatePicker minDate={date} />);
      const textbox = screen.getByRole('textbox');
      fireEvent.change(textbox, { target: { value: '01/01/1000' } });
      waitFor(() => expect(screen.getByRole('textbox')).toHaveTextContent(''));
    });
  });
});
