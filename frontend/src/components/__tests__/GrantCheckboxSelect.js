import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import GrantCheckboxSelect from '../GrantCheckboxSelect';

const GRANTS = [
  { value: 1, label: '14HP1234 - EHS' },
  { value: 2, label: '14CH5678 - HS' },
];

describe('GrantCheckboxSelect', () => {
  it('shows a single grant as read only text', () => {
    render(
      <GrantCheckboxSelect
        grants={[GRANTS[0]]}
        checkedValues={[1]}
        onToggle={jest.fn()}
        readOnlyLabel="Recipient grant"
        readOnlyValue="Children and Families First - 14HP1234 - EHS"
      />
    );

    expect(screen.getByText('Recipient grant')).toBeVisible();
    expect(screen.getByText('Children and Families First - 14HP1234 - EHS')).toBeVisible();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('falls back to the grant number when given no read only value', () => {
    render(<GrantCheckboxSelect grants={[GRANTS[0]]} checkedValues={[]} onToggle={jest.fn()} />);

    expect(screen.getByText('14HP1234 - EHS')).toBeVisible();
  });

  it('renders nothing when there are no grants at all', () => {
    render(<GrantCheckboxSelect grants={[]} checkedValues={[]} onToggle={jest.fn()} />);

    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByTestId('read-only-value')).toBeNull();
  });

  it('offers a checkbox per grant once there is a choice to make', () => {
    const onToggle = jest.fn();
    const onBlur = jest.fn();

    render(
      <GrantCheckboxSelect
        grants={GRANTS}
        checkedValues={[2]}
        onToggle={onToggle}
        onBlur={onBlur}
        label="Recipient grants"
      />
    );

    expect(screen.getByText('Recipient grants')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: 'Select grant 14HP1234 - EHS' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select grant 14CH5678 - HS' })).toBeChecked();

    userEvent.click(screen.getByRole('checkbox', { name: 'Select grant 14HP1234 - EHS' }));
    expect(onToggle).toHaveBeenCalledWith(GRANTS[0]);

    userEvent.tab();
    expect(onBlur).toHaveBeenCalled();
  });
});
