import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DatePicker from '../DatePicker';

describe('DatePicker', () => {
  const renderDatePicker = (value, onChange = jest.fn(), setError = jest.fn()) => {
    render(
      <div>
        <DatePicker
          defaultValue={value}
          name="toby"
          id="toby"
          onChange={onChange}
          minDate="09/01/2020"
          maxDate="12/31/2020"
          error=""
          setError={setError}
        />
        <button type="button">Dumb button</button>
      </div>,
    );
  };

  it('knows what to do with a max date', async () => {
    const onChange = jest.fn();

    renderDatePicker('01/01/2021', onChange);

    const date = await screen.findByRole('textbox');
    act(() => userEvent.clear(date));
    userEvent.type(date, '01/01/2021');

    const invalid = document.querySelector(':invalid');
    expect(invalid).toBeTruthy();
    act(() => userEvent.clear(date));
    userEvent.type(date, '12/30/2020');

    userEvent.tab();
    userEvent.tab();
    userEvent.tab();

    expect(onChange).toHaveBeenCalled();
  });

  it('handles validation', async () => {
    const onChange = jest.fn();
    const setError = jest.fn();

    renderDatePicker('01/01/2021', onChange, setError);

    const dumbButton = await screen.findByRole('button', { name: /dumb button/i });

    const date = await screen.findByRole('textbox');
    act(() => userEvent.clear(date));
    userEvent.type(date, '08/31/2020');

    userEvent.click(dumbButton);

    expect(setError).toHaveBeenCalledWith('Please enter a date after 09/01/2020');

    act(() => userEvent.clear(date));
    userEvent.type(date, '01/01/2021');

    userEvent.click(dumbButton);
    expect(setError).toHaveBeenCalledWith('Please enter a date before 12/31/2020');
  });
});
