import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DropdownMenu from '../DropdownMenu';

describe('DropdownMenu', () => {
  it('blur behavior is correct', async () => {
    const onApply = jest.fn();
    render(
      <div>
        <DropdownMenu onApply={onApply} menuName="Dropdown menu" buttonText="Dropdown Menu">
          <p>This is the interior of a luxurious menu</p>
        </DropdownMenu>
        <button type="button">Big dumb button</button>
      </div>,
    );

    userEvent.click(screen.getByRole('button', { name: /dropdown menu/i }));
    expect(screen.getByText(/this is the interior of a luxurious menu/i)).toBeVisible();

    userEvent.click(screen.getByRole('button', { name: /big dumb button/i }));
    expect(screen.getByText(/this is the interior of a luxurious menu/i)).not.toBeVisible();
  });

  it('renders correct filter count', async () => {
    const onApply = jest.fn();
    render(
      <div>
        <DropdownMenu onApply={onApply} menuName="Dropdown menu" buttonText="Filter Menu" filterCount={4}>
          <p>This is the interior of a luxurious menu</p>
        </DropdownMenu>
        <button type="button">Big dumb button</button>
      </div>,
    );
    expect(screen.getByText(/filter menu \(4\)/i)).toBeVisible();
  });
});
