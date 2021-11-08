/* eslint-disable no-unused-vars */
/* eslint-disable jest/expect-expect */
import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent,
} from '@testing-library/react';
import ButtonSelect from '../ButtonSelect';

const renderButtonSelect = (onApply, applied = 1) => {
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
      name: /toggle menu/i,
    });

    fireEvent.click(openMenu);

    const apply = screen.getByRole('button', {
      name: 'Apply filters for the menu',
    });

    fireEvent.click(apply);

    expect(onApply).toHaveBeenCalled();
  });

  it('handles weird applied value', () => {
    const onApply = jest.fn();
    const applied = 3;
    renderButtonSelect(onApply, applied);

    const openMenu = screen.getByRole('button', {
      name: /toggle menu/i,
    });

    expect(openMenu.textContent).toBe('Test');
  });
});
