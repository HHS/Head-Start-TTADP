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
} = SCOPE_IDS;

describe('UserPermissions', () => {
  describe('with no permissions', () => {
    beforeEach(() => {
      render(<UserPermissions
        regionalPermissions={{}}
        globalPermissions={{}}
        onRegionalPermissionChange={() => {}}
        onGlobalPermissionChange={() => {}}
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
        }}
        onRegionalPermissionChange={() => {}}
        onGlobalPermissionChange={() => {}}
      />);
    });

    it('has correct global permissions checked', () => {
      const checkbox = screen.getByRole('checkbox', { checked: true });
      expect(checkbox.name).toBe(ADMIN.toString(DECIMAL_BASE));
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
