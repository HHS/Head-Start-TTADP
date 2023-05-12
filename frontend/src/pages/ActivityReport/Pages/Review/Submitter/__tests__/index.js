/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { REPORT_STATUSES, SCOPE_IDS } from '@ttahub/common';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import { useForm, FormProvider } from 'react-hook-form/dist/index.ie11';
import Submitter from '../index';
import NetworkContext from '../../../../../../NetworkContext';

import UserContext from '../../../../../../UserContext';

const defaultUser = {
  id: 1, name: 'Walter Burns', roles: [{ fullName: 'Reporter' }], permissions: [{ regionId: 1, scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS }],
};

const RenderSubmitter = ({
  // eslint-disable-next-line react/prop-types
  onFormSubmit, formData, pages, onResetToDraft, onSave,
}) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: formData,
  });

  return (
    <FormProvider {...hookForm}>
      <Submitter
        pages={pages}
        onFormSubmit={onFormSubmit}
        onResetToDraft={onResetToDraft}
        onSaveForm={onSave}
        formData={formData}
        availableApprovers={[{ name: 'test', id: 1 }]}
      >
        <div />
      </Submitter>
    </FormProvider>
  );
};

const completePages = [{
  label: 'label',
  state: 'Complete',
  review: false,
}];

const incompletePages = [{
  label: 'incomplete',
  state: 'In progress',
  review: false,
}];

const renderReview = (
  calculatedStatus,
  onFormSubmit,
  complete = true,
  onSave = () => { },
  resetToDraft = () => { },
  approvers = [{ status: calculatedStatus, note: '', user: { fullName: 'name' } }],
  user = defaultUser,
  creatorRole = null,
) => {
  const formData = {
    approvers,
    calculatedStatus,
    displayId: '1',
    id: 1,
    creatorRole,
  };

  const history = createMemoryHistory();
  const pages = complete ? completePages : incompletePages;
  render(
    <Router history={history}>
      <UserContext.Provider value={{ user }}>
        <NetworkContext.Provider value={{ connectionActive: true, localStorageAvailable: true }}>
          <RenderSubmitter
            onFormSubmit={onFormSubmit}
            formData={formData}
            onResetToDraft={resetToDraft}
            onSave={onSave}
            pages={pages}
          />
        </NetworkContext.Provider>
      </UserContext.Provider>
    </Router>,
  );

  return history;
};

describe('Submitter review page', () => {
  describe('when the report is a draft', () => {
    it('displays the draft review component', async () => {
      renderReview(REPORT_STATUSES.DRAFT, () => { });
      expect(await screen.findByText('Submit Report')).toBeVisible();
    });

    it('allows the author to submit for review', async () => {
      const mockSubmit = jest.fn();
      renderReview(REPORT_STATUSES.DRAFT, mockSubmit);
      const button = await screen.findByRole('button', { name: 'Submit for approval' });
      userEvent.click(button);
      await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    });

    it('displays an error if the report is not complete', async () => {
      renderReview(REPORT_STATUSES.DRAFT, () => { }, false);
      const alert = await screen.findByTestId('alert');
      expect(alert.textContent).toContain('Incomplete report');
    });

    it('shows pages that are not completed', async () => {
      renderReview(REPORT_STATUSES.DRAFT, () => { }, false);
      const alert = await screen.findByText('Incomplete report');
      expect(alert).toBeVisible();
    });

    it('fails to submit if there are pages that have not been completed', async () => {
      const mockSubmit = jest.fn();
      renderReview(REPORT_STATUSES.DRAFT, mockSubmit, false);
      const button = await screen.findByRole('button', { name: 'Submit for approval' });
      userEvent.click(button);
      await waitFor(() => expect(mockSubmit).not.toHaveBeenCalled());
    });

    it('displays success if the report has been submitted', async () => {
      const mockSubmit = jest.fn();
      const history = renderReview(REPORT_STATUSES.DRAFT, mockSubmit, true);
      const button = await screen.findByRole('button', { name: 'Submit for approval' });

      userEvent.click(button);
      await waitFor(() => expect(history.location.pathname).toBe('/activity-reports'));
    });

    it('can be saved', async () => {
      const mockSave = jest.fn();
      renderReview(REPORT_STATUSES.DRAFT, () => { }, true, mockSave);
      const button = await screen.findByRole('button', { name: 'Save Draft' });
      userEvent.click(button);
      await waitFor(() => expect(mockSave).toHaveBeenCalled());
    });
  });

  describe('when the report is approved', () => {
    it('displays the approved component', async () => {
      renderReview(REPORT_STATUSES.APPROVED, () => { });
      expect(await screen.findByText('Report approved')).toBeVisible();
    });
  });

  describe('when the report has been submitted', () => {
    it('displays the submitted page', async () => {
      renderReview(REPORT_STATUSES.SUBMITTED, () => { }, true);
      const allAlerts = await screen.findAllByTestId('alert');
      const successAlert = allAlerts.find((alert) => alert.textContent.includes('Success'));
      expect(successAlert).toBeVisible();
    });

    it('the reset to draft button works', async () => {
      const onReset = jest.fn();
      renderReview(REPORT_STATUSES.SUBMITTED, () => { }, true, () => { }, onReset);
      const button = await screen.findByRole('button', { name: 'Reset to Draft' });
      userEvent.click(button);
      await waitFor(() => expect(onReset).toHaveBeenCalled());
    });

    it('shows manager notes', async () => {
      const approvers = [
        { status: REPORT_STATUSES.NEEDS_ACTION, note: 'Report needs action.', user: { fullName: 'Needs Action 1' } },
        { status: REPORT_STATUSES.APPROVED, note: 'Report is approved 1.', user: { fullName: 'Approved User 1' } },
        { status: REPORT_STATUSES.APPROVED, user: { fullName: 'Approved User 2' } },
      ];
      renderReview(REPORT_STATUSES.SUBMITTED, () => { }, true, () => { }, () => { }, approvers);
      expect(await screen.findByText(/report needs action\./i)).toBeVisible();
      expect(await screen.findByText(/report is approved 1\./i)).toBeVisible();
      expect(await screen.findByText(/no manager notes/i)).toBeVisible();
    });
  });

  describe('when the report needs action', () => {
    it('displays the needs action component', async () => {
      renderReview(REPORT_STATUSES.NEEDS_ACTION, () => { });
      expect(await screen.findByText('Review and re-submit report')).toBeVisible();
    });

    it('displays approvers requesting action', async () => {
      const approvers = [
        { status: REPORT_STATUSES.NEEDS_ACTION, note: 'Report needs action.', user: { fullName: 'Needs Action 1' } },
        { status: REPORT_STATUSES.APPROVED, note: 'Report is approved.', user: { fullName: 'Approved User' } },
        { status: REPORT_STATUSES.NEEDS_ACTION, note: 'Report needs action2.', user: { fullName: 'Needs Action 2' } },
      ];
      renderReview(REPORT_STATUSES.NEEDS_ACTION, () => { }, true, () => { }, () => { }, approvers);
      expect(await screen.findByText('Review and re-submit report')).toBeVisible();
      expect(screen.getByText(
        /the following approving manager\(s\) have requested changes to this activity report: needs action 1, needs action 2/i,
      )).toBeVisible();
    });

    it('displays correctly when no approver is requesting action', async () => {
      const approvers = [
        { status: null, note: 'Report is approved.', user: { fullName: 'Approved User 1' } },
        { status: null, note: 'Report is approved.', user: { fullName: 'Approved User 2' } },
      ];
      renderReview(REPORT_STATUSES.NEEDS_ACTION, () => { }, true, () => { }, () => { }, approvers);
      expect(await screen.findByText(/the following approving manager\(s\) have requested changes to this activity report:/i)).toBeVisible();
    });

    it('fails to re-submit if there are pages that have not been completed', async () => {
      const mockSubmit = jest.fn();
      renderReview(REPORT_STATUSES.NEEDS_ACTION, mockSubmit, false);
      const button = await screen.findByRole('button');
      userEvent.click(button);
      await waitFor(() => expect(mockSubmit).not.toHaveBeenCalled());
    });

    it('allows the user to resubmit the report', async () => {
      const mockSubmit = jest.fn();
      renderReview(REPORT_STATUSES.NEEDS_ACTION, mockSubmit);
      const button = await screen.findByRole('button');
      userEvent.click(button);
      await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    });

    it('creator role auto populates on needs_action', async () => {
      const mockSubmit = jest.fn();
      renderReview(REPORT_STATUSES.NEEDS_ACTION, mockSubmit, true, () => { }, () => { }, [], { ...defaultUser, roles: [{ fullName: 'COR' }] });

      // Resubmit.
      const reSubmit = await screen.findByRole('button', { name: /re-submit for approval/i });
      userEvent.click(reSubmit);
      await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    });

    it('requires creator role on needs_action multiple roles', async () => {
      const mockSubmit = jest.fn();
      renderReview(REPORT_STATUSES.NEEDS_ACTION, mockSubmit, true, () => { }, () => { }, [], { ...defaultUser, roles: [{ fullName: 'COR' }, { fullName: 'Health Specialist' }, { fullName: 'TTAC' }] });

      // Shows creator role.
      expect(await screen.findByText(/creator role/i)).toBeVisible();
      const roleSelector = await screen.findByRole('combobox');

      // Resubmit without selecting creator roles shows validation error.
      const reSubmit = await screen.findByRole('button', { name: /re-submit for approval/i });
      userEvent.click(reSubmit);

      // Verify validation message.
      const validationError = await screen.findByText('Please select a creator role.');
      expect(validationError).toBeVisible();

      // Select creator role.
      expect(roleSelector.length).toBe(4);
      userEvent.selectOptions(roleSelector, 'COR');
      userEvent.selectOptions(roleSelector, 'Health Specialist');
      userEvent.selectOptions(roleSelector, 'TTAC');

      // Resubmit after setting creator role.
      expect(validationError).not.toBeVisible();
      userEvent.click(reSubmit);
      await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    });

    it('hides creator role on needs_action single role', async () => {
      const mockSubmit = jest.fn();
      renderReview(
        REPORT_STATUSES.NEEDS_ACTION,
        mockSubmit,
        true,
        () => { },
        () => { },
        [],
        { ...defaultUser },
      );

      // Hides creator role.
      expect(screen.queryByRole('combobox')).toBeNull();

      // Resubmit without validation error.
      const reSubmit = await screen.findByRole('button', { name: /re-submit for approval/i });
      userEvent.click(reSubmit);
      await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    });
  });

  describe('creator role when report is draft', () => {
    it('hides with single role', async () => {
      renderReview(REPORT_STATUSES.DRAFT, () => { }, true, () => { }, () => { }, [], { ...defaultUser, roles: [{ fullName: 'Health Specialist' }] });
      expect(screen.queryByRole('combobox', { name: /creator role */i })).toBeNull();
    });

    it('displays with multiple roles', async () => {
      renderReview(REPORT_STATUSES.DRAFT, () => { }, true, () => { }, () => { }, [], { ...defaultUser, roles: [{ fullName: 'COR' }, { fullName: 'Health Specialist' }, { fullName: 'TTAC' }] });
      const roleSelector = await screen.findByRole('combobox', { name: /creator role */i });
      expect(roleSelector.length).toBe(4);
      userEvent.selectOptions(roleSelector, 'COR');
      userEvent.selectOptions(roleSelector, 'Health Specialist');
      userEvent.selectOptions(roleSelector, 'TTAC');
    });

    it('adds now missing role', async () => {
      renderReview(REPORT_STATUSES.DRAFT, () => { }, true, () => { }, () => { }, [], { ...defaultUser, roles: [{ fullName: 'Health Specialist' }, { fullName: 'TTAC' }] }, 'COR');
      const roleSelector = await screen.findByRole('combobox', { name: /creator role */i });
      expect(roleSelector.length).toBe(4);
      expect(await screen.findByText(/cor/i)).toBeVisible();
      userEvent.selectOptions(roleSelector, 'COR');
      userEvent.selectOptions(roleSelector, 'Health Specialist');
      userEvent.selectOptions(roleSelector, 'TTAC');
    });
  });
});
