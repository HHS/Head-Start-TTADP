import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DECIMAL_BASE, SCOPE_IDS } from '@ttahub/common';
import React from 'react';
import { withText } from '../../../testHelpers';
import UserPermissions from '../UserPermissions';

const { READ_ACTIVITY_REPORTS, ADMIN, UNLOCK_APPROVED_REPORTS } = SCOPE_IDS;

describe('UserPermissions', () => {
  describe('with no permissions', () => {
    beforeEach(() => {
      render(
        <UserPermissions
          regionalPermissions={{}}
          globalPermissions={{}}
          onRegionalPermissionChange={() => {}}
          onGlobalPermissionChange={() => {}}
        />
      );
    });

    it('has no checkboxes checked', () => {
      screen.getAllByRole('checkbox').forEach((cb) => {
        expect(cb).not.toBeChecked();
      });
    });
  });

  describe('with permissions', () => {
    beforeEach(() => {
      render(
        <UserPermissions
          regionalPermissions={{
            1: { [READ_ACTIVITY_REPORTS]: true },
          }}
          globalPermissions={{
            [ADMIN]: true,
            [UNLOCK_APPROVED_REPORTS]: true,
          }}
          onRegionalPermissionChange={() => {}}
          onGlobalPermissionChange={() => {}}
        />
      );
    });

    it('has correct global permissions checked', () => {
      const adminCheckbox = screen.getByRole('checkbox', {
        name: /admin : user can view the admin panel and change user permissions \(including their own\)/i,
        checked: true,
      });
      expect(adminCheckbox.name).toBe(ADMIN.toString(DECIMAL_BASE));

      const unlockCheckbox = screen.getByRole('checkbox', {
        name: /unlock_approved_reports : user can unlock approved reports\./i,
        checked: true,
      });
      expect(unlockCheckbox.name).toBe(UNLOCK_APPROVED_REPORTS.toString(DECIMAL_BASE));
    });

    it('displays the current regional permissions', () => {
      expect(screen.getByText(withText('READ_REPORTS: Region 1'))).toBeVisible();
    });

    describe('when a region is selected', () => {
      it('the correct regional scopes are shown as checked', () => {
        userEvent.selectOptions(screen.getByLabelText('Region'), '1');
        const fieldset = screen.getByRole('group', { name: 'Regional Permissions' });
        const checkbox = within(fieldset).getByRole('checkbox', {
          name: 'READ_REPORTS : Can view reports in the region',
        });
        expect(checkbox).toBeChecked();
      });
    });
  });

  describe('with a primary TTA request approver in a region', () => {
    const MESSAGE = 'Region 3 already has a primary COR approver: Monica Geller';
    let onRegionalPermissionChange;

    const regionalCheckbox = (name) =>
      within(screen.getByRole('group', { name: 'Regional Permissions' })).getByRole('checkbox', {
        name: new RegExp(`^${name}`),
      });

    beforeEach(() => {
      onRegionalPermissionChange = jest.fn();
      render(
        <UserPermissions
          userId={1}
          regionalPermissions={{}}
          globalPermissions={{}}
          onRegionalPermissionChange={onRegionalPermissionChange}
          onGlobalPermissionChange={() => {}}
          primaryApprovers={{ 3: 'Monica Geller', 5: 'Ross Geller' }}
        />
      );
    });

    it('refuses a second primary approver there, naming the first', () => {
      userEvent.selectOptions(screen.getByLabelText('Region'), '3');
      userEvent.click(regionalCheckbox('APPROVE_TTA_REQUESTS'));

      expect(screen.getByText(MESSAGE)).toBeVisible();
      expect(screen.getByText(MESSAGE)).toHaveClass('usa-error-message');
      expect(regionalCheckbox('APPROVE_TTA_REQUESTS')).not.toBeChecked();
      expect(onRegionalPermissionChange).not.toHaveBeenCalled();
    });

    it('shows the message just above the primary approver checkbox', () => {
      userEvent.selectOptions(screen.getByLabelText('Region'), '3');
      userEvent.click(regionalCheckbox('APPROVE_TTA_REQUESTS'));

      const message = screen.getByText(MESSAGE);
      expect(message.nextElementSibling).toContainElement(regionalCheckbox('APPROVE_TTA_REQUESTS'));
    });

    it('allows a backup approver there', () => {
      userEvent.selectOptions(screen.getByLabelText('Region'), '3');
      userEvent.click(regionalCheckbox('BACKUP_APPROVE_TTA_REQUESTS'));

      expect(onRegionalPermissionChange).toHaveBeenCalled();
      expect(screen.queryByText(MESSAGE)).toBeNull();
    });

    it('allows a primary approver in a region without one', () => {
      userEvent.selectOptions(screen.getByLabelText('Region'), '4');
      userEvent.click(regionalCheckbox('APPROVE_TTA_REQUESTS'));

      expect(onRegionalPermissionChange).toHaveBeenCalled();
      expect(screen.queryByText(/already has a primary COR approver/)).toBeNull();
    });

    it('names every region that has one when all regions are picked', () => {
      userEvent.selectOptions(screen.getByLabelText('Region'), 'All');
      userEvent.click(regionalCheckbox('APPROVE_TTA_REQUESTS'));

      expect(screen.getByText(MESSAGE)).toBeVisible();
      expect(
        screen.getByText('Region 5 already has a primary COR approver: Ross Geller')
      ).toBeVisible();
      expect(onRegionalPermissionChange).not.toHaveBeenCalled();
    });

    it('clears the message when another region is picked', () => {
      userEvent.selectOptions(screen.getByLabelText('Region'), '3');
      userEvent.click(regionalCheckbox('APPROVE_TTA_REQUESTS'));
      expect(screen.getByText(MESSAGE)).toBeVisible();

      userEvent.selectOptions(screen.getByLabelText('Region'), '4');
      expect(screen.queryByText(MESSAGE)).toBeNull();
    });

    it('clears the message once another permission is changed', () => {
      userEvent.selectOptions(screen.getByLabelText('Region'), '3');
      userEvent.click(regionalCheckbox('APPROVE_TTA_REQUESTS'));
      expect(screen.getByText(MESSAGE)).toBeVisible();

      userEvent.click(regionalCheckbox('REVIEW_TTA_REQUESTS'));
      expect(screen.queryByText(MESSAGE)).toBeNull();
    });
  });
});
