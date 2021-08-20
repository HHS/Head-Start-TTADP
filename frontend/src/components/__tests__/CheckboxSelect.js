import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CheckboxSelect from '../CheckboxSelect';

describe('Checkbox select', () => {
  const renderCheckboxSelect = (onApply) => {
    const dogs = [
      {
        value: 1,
        label: 'Pomeranian',
      },
      {
        value: 2,
        label: 'Labrador',
      },
      {
        value: 3,
        label: 'Macademia nuts',
      },
    ];
    render(
      <CheckboxSelect
        toggleAllText="All Dogs"
        toggleAllInitial
        labelId="dogs"
        labelText="Filter by dogs"
        ariaLabel="Change filter by dogs"
        onApply={onApply}
        options={dogs}
      />,
    );
  };

  it('renders properly and calls the on apply function', async () => {
    const onApply = jest.fn();
    renderCheckboxSelect(onApply);
    const button = screen.getByRole('button', { name: /change filter by dogs/i });
    userEvent.click(button);
    const pom = screen.getByRole('checkbox', { name: /select pomeranian/i });
    userEvent.click(pom);
    const apply = screen.getByRole('button', { name: /apply filters/i });
    userEvent.click(apply);
    expect(onApply).toHaveBeenCalled();
  });

  it('toggles all off', async () => {
    const onApply = jest.fn();
    renderCheckboxSelect(onApply);
    const button = screen.getByRole('button', { name: /change filter by dogs/i });
    userEvent.click(button);
    const pom = screen.getByRole('checkbox', { name: /select pomeranian/i });
    expect(pom).toBeChecked();
    const allDogs = screen.getByRole('checkbox', { name: /all dogs/i });
    userEvent.click(allDogs);
    expect(pom).not.toBeChecked();
  });

  it('closes on escape button', () => {
    const onApply = jest.fn();
    renderCheckboxSelect(onApply);
    const button = screen.getByRole('button', { name: /change filter by dogs/i });
    userEvent.click(button);
    const pom = screen.getByRole('checkbox', { name: /select pomeranian/i });
    expect(pom).toBeInTheDocument();
    fireEvent.keyDown(button, {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      charCode: 27,
    });
    expect(pom).not.toBeInTheDocument();
  });

  it('handles blur', () => {
    const onApply = jest.fn();
    renderCheckboxSelect(onApply);
    const button = screen.getByRole('button', { name: /change filter by dogs/i });
    userEvent.click(button);
    const allDogs = screen.getByRole('checkbox', { name: /all dogs/i });
    expect(allDogs).toBeInTheDocument();
    userEvent.click(button);
    expect(allDogs).toBeInTheDocument();
  });

  it('toggles all on', async () => {
    const onApply = jest.fn();
    renderCheckboxSelect(onApply);
    const button = screen.getByRole('button', { name: /change filter by dogs/i });
    userEvent.click(button);
    const allDogs = screen.getByRole('checkbox', { name: /all dogs/i });
    userEvent.click(allDogs);
    expect(document.querySelectorAll(':checked').length).toBe(0);
    userEvent.click(allDogs);
    const pom = screen.getByRole('checkbox', { name: /select pomeranian/i });
    expect(pom).toBeChecked();
    const lab = screen.getByRole('checkbox', { name: /select labrador/i });
    expect(lab).toBeChecked();
  });

  it('checks and unchecks and passes the right parameters to onApply', async () => {
    const onApply = jest.fn();
    renderCheckboxSelect(onApply);
    const button = screen.getByRole('button', { name: /change filter by dogs/i });
    userEvent.click(button);
    const allDogs = screen.getByRole('checkbox', { name: /all dogs/i });
    userEvent.click(allDogs);
    const pom = screen.getByRole('checkbox', { name: /select pomeranian/i });
    userEvent.click(pom);
    expect(pom).toBeChecked();
    userEvent.click(pom);
    expect(pom).not.toBeChecked();
    userEvent.click(pom);
    expect(pom).toBeChecked();
    const apply = screen.getByRole('button', { name: /apply filters/i });
    userEvent.click(apply);
    expect(onApply).toHaveBeenCalledWith(['1']);
    userEvent.click(button);
    expect(document.querySelectorAll(':checked').length).toBe(1);
  });
});
