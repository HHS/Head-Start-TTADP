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
        ariaLabel="open menu"
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

    const calendar = screen.getByRole('button', {
      name: /open calendar/i,
    });

    fireEvent.click(calendar);

    const [day1, day2] = document.querySelectorAll('.DateRangePicker_picker .CalendarDay');

    fireEvent.click(day1);
    fireEvent.click(day2);

    const startDate = screen.getByRole('textbox', {
      name: /start date/i,
    });

    expect(startDate).toBeInTheDocument();

    const apply = screen.getByRole('button', {
      name: 'Apply filters',
    });

    fireEvent.click(apply);

    expect(onApply).toHaveBeenCalled();
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

    const blanko = screen.getByRole('button', { name: /blanko/i });
    expect(blanko).toHaveFocus();

    expect(startDate).not.toBeInTheDocument();
  });
});
