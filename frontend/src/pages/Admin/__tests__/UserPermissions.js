import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { render, screen, within } from '@testing-library/react';

import UserPermissions from '../UserPermissions';
import { withText } from '../../../testHelpers';
import { SCOPE_IDS, DECIMAL_BASE } from '../../../Constants';

const {
  READ_ACTIVITY_REPORTS,
  ADMIN,
  UNLOCK_APPROVED_REPORTS,
} = SCOPE_IDS;

describe('UserPermissions', () => {
  describe('with no permissions', () => {
    beforeEach(() => {
      render(<UserPermissions
        regionalPermissions={{}}
        globalPermissions={{}}
        onRegionalPermissionChange={() => { }}
        onGlobalPermissionChange={() => { }}
      />);
    });

    it('has no checkboxes checked', () => {
      screen.getAllByRole('checkbox').forEach((cb) => {
        expect(cb).not.toBeChecked();
      });
    });
  });

  describe('with permissions', () => {
    beforeEach(() => {
      render(<UserPermissions
        regionalPermissions={{
          1: { [READ_ACTIVITY_REPORTS]: true },
        }}
        globalPermissions={{
          [ADMIN]: true,
          [UNLOCK_APPROVED_REPORTS]: true,
        }}
        onRegionalPermissionChange={() => { }}
        onGlobalPermissionChange={() => { }}
      />);
    });

    it('has correct global permissions checked', () => {
      const adminCheckbox = screen.getByRole('checkbox', {
        name: /admin : user can view the admin panel and change user permissions \(including their own\)/i, checked: true,
      });
      expect(adminCheckbox.name).toBe(ADMIN.toString(DECIMAL_BASE));

      const unlockCheckbox = screen.getByRole('checkbox', {
        name: /unlock_approved_reports : user can unlock approved reports\./i, checked: true,
      });
      expect(unlockCheckbox.name).toBe(UNLOCK_APPROVED_REPORTS.toString(DECIMAL_BASE));
    });

    it('displays the current regional permissions', () => {
      expect(screen.getByText(withText('READ_ACTIVITY_REPORTS: Region 1'))).toBeVisible();
    });

    describe('when a region is selected', () => {
      it('the correct regional scopes are shown as checked', () => {
        userEvent.selectOptions(screen.getByLabelText('Region'), '1');
        const fieldset = screen.getByRole('group', { name: 'Regional Permissions' });
        const checkbox = within(fieldset).getByRole('checkbox', { name: 'READ_ACTIVITY_REPORTS : Can view reports activity in the region' });
        expect(checkbox).toBeChecked();
      });
    });
  });
});
