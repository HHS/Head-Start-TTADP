import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DatePicker from '../DatePicker';

describe('DatePicker', () => {
  const renderDatePicker = (value, onChange = jest.fn, maxDate = '12/31/2020') => {
    render(<DatePicker
      defaultValue={value}
      name="toby"
      id="toby"
      onChange={onChange}
      minDate="2020-09-01"
      maxDate={maxDate}
    />);
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
    expect(onChange).toHaveBeenCalled();
  });
});
