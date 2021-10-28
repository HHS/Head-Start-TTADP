import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, within, fireEvent,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import UserSection from '../UserSection';
import { SCOPE_IDS } from '../../../Constants';

const {
  ADMIN,
  READ_ACTIVITY_REPORTS,
  UNLOCK_APPROVED_REPORTS,
} = SCOPE_IDS;

describe('UserSection', () => {
  const onSave = jest.fn();

  beforeEach(() => {
    const user = {
      id: 1,
      email: 'email',
      name: 'first last',
      role: ['Grantee Specialist'],
      homeRegionId: 1,
      permissions: [
        {
          regionId: 14,
          scopeId: ADMIN,
        },
        {
          regionId: 14,
          scopeId: UNLOCK_APPROVED_REPORTS,
        },
        {
          regionId: 1,
          scopeId: READ_ACTIVITY_REPORTS,
        },
      ],
      flags: ['moon_man'],
    };

    render(<UserSection user={user} onSave={onSave} features={[{ value: 'half_goat', label: 'Half goat' }]} />);
  });

  it('properly controls user info', () => {
    const inputBox = screen.getByLabelText('Full Name');
    expect(inputBox).toHaveValue('first last');
    userEvent.type(inputBox, '{selectall}{backspace}new name');
    expect(screen.getByLabelText('Full Name')).toHaveValue('new name');
  });

  it('properly controls global permissions', () => {
    const adminCheckbox = screen.getByRole('checkbox', { name: /admin : user can view the admin panel and change user permissions \(including their own\)/i });
    expect(adminCheckbox).toBeChecked();
    userEvent.click(adminCheckbox);
    expect(adminCheckbox).not.toBeChecked();

    const unlockCheckbox = screen.getByRole('checkbox', { name: /unlock_approved_reports : user can unlock approved reports\./i });
    expect(unlockCheckbox).toBeChecked();
    userEvent.click(unlockCheckbox);
    expect(unlockCheckbox).not.toBeChecked();
  });

  it('properly controls regional permissions', () => {
    const permissions = screen.getByRole('group', { name: 'Regional Permissions' });
    userEvent.selectOptions(within(permissions).getByLabelText('Region'), '1');
    const checkbox = within(permissions).getByRole('checkbox', { checked: true });
    expect(checkbox).toBeChecked();
    userEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('checking a scope selects that scope for the current region', () => {
    const fieldName = 'APPROVE_ACTIVITY_REPORTS : Can approve activity reports in the region';
    const permissions = screen.getByRole('group', { name: 'Regional Permissions' });
    userEvent.selectOptions(within(permissions).getByLabelText('Region'), '1');
    const checkbox = within(permissions).getByRole('checkbox', { name: fieldName });

    expect(checkbox).not.toBeChecked();
    userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('checking a feature selects that feature', () => {
    const checkbox = screen.getByRole('checkbox', { name: /half goat/i });
    expect(checkbox).not.toBeChecked();
    userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('the region field is cast to a number when changed', () => {
    const userInfo = screen.getByRole('group', { name: 'User Profile' });
    const region = within(userInfo).getByLabelText('Region');
    userEvent.selectOptions(region, '1');
    expect(within(userInfo).getByLabelText('Region')).toHaveValue('1');
  });

  it('the roles support multi selection', () => {
    const rolesInputGS = screen.getByText('Grantee Specialist');

    fireEvent.focus(rolesInputGS);
    fireEvent.keyDown(rolesInputGS, { key: 'ArrowDown', code: 40 });
    fireEvent.click(screen.getByText('COR'));
    // Find the next option selected in the multiselect input
    const rolesInputCOR = rolesInputGS.parentElement.nextElementSibling.firstChild;
    expect(within(rolesInputCOR).getByText('COR')).toBeDefined();
  });

  it('there is a placeholder in the roles input', () => {
    const rolesInputGS = screen.getByText('Grantee Specialist');
    const removeRoleButton = rolesInputGS.nextElementSibling;
    fireEvent.click(removeRoleButton);
    const placeholder = screen.getByText('Select roles...');
    expect(placeholder).toBeDefined();
  });

  it('submitting the form calls the onSave prop', () => {
    const save = screen.getByRole('button', { name: 'Save' });
    userEvent.click(save);
    expect(onSave).toHaveBeenCalled();
  });
});
