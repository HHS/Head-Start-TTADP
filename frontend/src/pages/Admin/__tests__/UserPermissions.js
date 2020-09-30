import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { render, screen, within } from '@testing-library/react';

import UserPermissions from '../UserPermissions';
import { withText } from '../../../testHelpers';

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
          1: { READ_REPORTS: true },
        }}
        globalPermissions={{
          SITE_ACCESS: true,
        }}
        onRegionalPermissionChange={() => {}}
        onGlobalPermissionChange={() => {}}
      />);
    });

    it('has correct global permissions checked', () => {
      const checkbox = screen.getByRole('checkbox', { checked: true });
      expect(checkbox.name).toBe('SITE_ACCESS');
    });

    it('displays the current regional permissions', () => {
      expect(screen.getByText(withText('READ_REPORTS: Region 1'))).toBeVisible();
    });

    describe('when a region is selected', () => {
      it('the correct regional scopes are shown as checked', () => {
        userEvent.selectOptions(screen.getByLabelText('Region'), '1');
        const fieldset = screen.getByRole('group', { name: 'Regional Permissions' });
        const checkbox = within(fieldset).getByRole('checkbox', { checked: true });
        expect(checkbox).toBeChecked();
      });
    });
  });
});
