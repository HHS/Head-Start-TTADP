/* eslint-disable no-unused-vars */
/* eslint-disable jest/expect-expect */
import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ButtonSelect from '../ButtonSelect';

const renderButtonSelect = (onApply) => {
  const options = [
    {
      label: 'Test',
      value: 1,
    },
    {
      label: 'Custom',
      value: 2,
    },
  ];

  const labelId = 'Test-Button-Select';
  const labelText = 'Give me a test, guv';
  const initialValue = options[0];
  const applied = options[0].value;

  render(
    <div>
      <ButtonSelect
        options={options}
        labelId={labelId}
        labelText={labelText}
        onApply={onApply}
        initialValue={initialValue}
        applied={applied}
        ariaName="menu"
        hasDateRange
      />

      <button type="button" data-testid="blanko">Blanko</button>
    </div>,
  );
};

describe('The Button Select component', () => {
  it('calls update date range', () => {
    const onApply = jest.fn();
    renderButtonSelect(onApply);

    const openMenu = screen.getByRole('button', {
      name: /open menu/i,
    });

    fireEvent.click(openMenu);

    const custom = screen.getByRole('button', {
      name: /select to view data from custom\. select apply filters button to apply selection/i,
    });

    fireEvent.click(custom);

    const sdcalendar = screen.getByRole('button', {
      name: /open start date picker calendar/i,
    });

    fireEvent.click(sdcalendar);

    const [day1] = document.querySelectorAll('.SingleDatePicker_picker .CalendarDay');

    fireEvent.click(day1);

    const edcalendar = screen.getByRole('button', {
      name: /open end date picker calendar/i,
    });

    fireEvent.click(edcalendar);
    const [, day2] = document.querySelectorAll('.SingleDatePicker_picker .CalendarDay');

    fireEvent.click(day2);

    const startDate = screen.getByRole('textbox', {
      name: /start date/i,
    });

    expect(startDate).toBeInTheDocument();

    const apply = screen.getByRole('button', {
      name: 'Apply filters for the menu',
    });

    fireEvent.click(apply);

    expect(onApply).toHaveBeenCalled();
  });

  it('shows an error message', async () => {
    const onApply = jest.fn();
    renderButtonSelect(onApply);

    const openMenu = screen.getByRole('button', {
      name: /open menu/i,
    });

    fireEvent.click(openMenu);

    const custom = screen.getByRole('button', {
      name: /select to view data from custom\. select apply filters button to apply selection/i,
    });

    fireEvent.click(custom);

    const sdcalendar = screen.getByRole('button', {
      name: /open start date picker calendar/i,
    });

    fireEvent.click(sdcalendar);

    const [day1] = document.querySelectorAll('.SingleDatePicker_picker .CalendarDay');

    fireEvent.click(day1);

    const startDate = screen.getByRole('textbox', {
      name: /start date/i,
    });

    expect(startDate).toBeInTheDocument();

    const apply = screen.getByRole('button', {
      name: 'Apply filters for the menu',
    });

    fireEvent.click(apply);

    const error = screen.getByText(/reports are available from 09\/01\/2020\.use the format mm\/dd\/yyyy\./i);
    expect(error).toBeInTheDocument();
  });

  it('handles blur', () => {
    const onApply = jest.fn();
    renderButtonSelect(onApply);

    const openMenu = screen.getByRole('button', {
      name: /open menu/i,
    });

    fireEvent.click(openMenu);

    const custom = screen.getByRole('button', {
      name: /select to view data from custom\. select apply filters button to apply selection/i,
    });

    fireEvent.click(custom);

    const startDate = screen.getByRole('textbox', {
      name: /start date/i,
    });

    // is this the best way to fire on blur? yikes
    userEvent.tab();
    userEvent.tab();
    userEvent.tab();
    userEvent.tab();
    userEvent.tab();
    userEvent.tab();
    userEvent.tab();
    userEvent.tab();
    userEvent.tab();
    userEvent.tab();
    userEvent.tab();
    userEvent.tab();

    const blanko = screen.getByRole('button', { name: /blanko/i });
    expect(blanko).toHaveFocus();

    expect(startDate).not.toBeInTheDocument();
  });
});
