import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import UserSection from '../UserSection';

describe('UserSection', () => {
  beforeEach(() => {
    const user = {
      id: 1,
      email: 'email',
      fullName: 'first last',
      jobTitle: 'Grantee Specialist',
      region: '1',
      permissions: [
        {
          region: 0,
          scope: 'SITE_ACCESS',
        },
        {
          region: 1,
          scope: 'READ_REPORTS',
        },
      ],
    };

    render(<UserSection user={user} />);
  });

  it('properly controls user info', () => {
    const inputBox = screen.getByLabelText('Full Name');
    expect(inputBox).toHaveValue('first last');
    userEvent.type(inputBox, '{selectall}{backspace}new name');
    expect(screen.getByLabelText('Full Name')).toHaveValue('new name');
  });

  it('properly controls global permissions', () => {
    const checkbox = screen.getByRole('checkbox', { checked: true });
    expect(checkbox).toBeChecked();
    userEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('properly controls regional permissions', () => {
    const permissions = screen.getByRole('group', { name: 'Regional Permissions' });
    userEvent.selectOptions(within(permissions).getByLabelText('Region'), '1');
    const checkbox = within(permissions).getByRole('checkbox', { checked: true });
    expect(checkbox).toBeChecked();
    userEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });
});
