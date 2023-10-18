/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import {
  render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import { FormProvider, useForm } from 'react-hook-form';
import { REPORT_STATUSES } from '@ttahub/common';
import UserContext from '../../../../../../UserContext';
import Approver from '../index';

const user = {
  id: 1,
  name: 'test@test.com',
  permissions: [
    {
      scopeId: 3,
      regionId: 1,
    },
  ],
};

const defaultApprover = [{
  id: 1, status: null, note: '', user: { id: 1, fullName: 'name' },
}];

const defaultPages = [{
  label: 'label',
  state: 'Complete',
  review: false,
}];

const incompletePages = [{
  label: 'incomplete',
  state: 'In progress',
  review: false,
}];

const RenderApprover = ({
  // eslint-disable-next-line react/prop-types
  onFormReview, reviewed, formData, pages,
}) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: formData,
  });

  return (
    <FormProvider {...hookForm}>
      <Approver
        onFormReview={onFormReview}
        reviewed={reviewed}
        formData={formData}
        isPendingApprover
        pages={pages}
      >
        <div>
          test
        </div>
      </Approver>
    </FormProvider>
  );
};

const renderReview = (
  calculatedStatus,
  onFormReview,
  reviewed,
  approvers = defaultApprover,
  pages = defaultPages,
  extraFormData = {},
) => {
  const formData = {
    author: { name: 'user', id: 4 },
    additionalNotes: '',
    calculatedStatus,
    approvers,
    ...extraFormData,
  };

  const history = createMemoryHistory();
  render(
    <Router history={history}>
      <UserContext.Provider value={{ user }}>
        <RenderApprover
          onFormReview={onFormReview}
          reviewed={reviewed}
          formData={formData}
          pages={pages}
        />
      </UserContext.Provider>
    </Router>,
  );

  return history;
};

describe('Approver review page', () => {
  describe('when the report is submitted', () => {
    it('displays the submit review component', async () => {
      renderReview(REPORT_STATUSES.SUBMITTED, () => { }, false);
      expect(await screen.findByText('Review and approve report')).toBeVisible();
    });

    it('allows the approver to submit a review and redirects them after', async () => {
      const mockSubmit = jest.fn();
      const history = renderReview(REPORT_STATUSES.SUBMITTED, mockSubmit, true);
      const dropdown = await screen.findByTestId('Select');
      userEvent.selectOptions(dropdown, 'approved');
      const button = await screen.findByRole('button');
      userEvent.click(button);
      await waitFor(() => expect(history.location.pathname).toBe('/activity-reports'));
    });

    it('approver viewing approved report, user is redirected', async () => {
      const history = renderReview(REPORT_STATUSES.APPROVED, () => { }, true);
      await waitFor(() => expect(history.location.pathname).toBe('/activity-reports'));
    });

    it('handles empty notes', async () => {
      renderReview(REPORT_STATUSES.SUBMITTED, () => { }, true);
      const notes = await screen.findByLabelText('additionalNotes');
      expect(notes.textContent).toContain('No creator notes');
    });

    it('shows date submitted', async () => {
      renderReview(REPORT_STATUSES.SUBMITTED, () => { }, true, defaultApprover, defaultPages, { submittedDate: '2023-03-03' });
      expect(await screen.findByText(/date submitted/i)).toBeVisible();
      expect(await screen.findByText('03/03/2023')).toBeVisible();
    });

    it('hides date submitted if missing', async () => {
      renderReview(REPORT_STATUSES.SUBMITTED,
        () => { },
        true,
        defaultApprover,
        defaultPages,
        { submittedDate: null });
      expect(screen.queryAllByText(/date submitted/i).length).toBe(0);
    });

    it('handles approver reviewing needs action', async () => {
      const approverWithNotes = [
        {
          id: 1, status: REPORT_STATUSES.APPROVED, note: '<p>These are my approved notes 1.</p>\n', user: { id: 1, fullName: 'approver 1' },
        },
        {
          id: 2, status: REPORT_STATUSES.NEEDS_ACTION, note: '<p>These are my needs action notes 2.</p>\n', user: { id: 2, fullName: 'approver 2' },
        },
        {
          id: 3, status: null, note: null, user: { id: 1, fullName: 'approver 3' },
        },
        {
          id: 4, status: REPORT_STATUSES.APPROVED, note: null, user: { id: 4, fullName: 'approver 4' },
        },
      ];

      const onFormReview = jest.fn();
      const reviewed = true;
      const calculatedStatus = REPORT_STATUSES.NEEDS_ACTION;
      renderReview(calculatedStatus, onFormReview, reviewed, approverWithNotes);

      expect(await screen.findByText(/these are my needs action notes 2\./i)).toBeVisible();
      expect(await screen.findByText(/no creator notes/i)).toBeVisible();
      expect(await screen.findByText(/these are my approved notes 1\./i)).toBeVisible();

      const statuses = screen.queryAllByLabelText('Choose report status *');
      expect(statuses.length).toBe(1);
    });

    it('a report can\'t be submitted with incomplete pages', async () => {
      const mockSubmit = jest.fn();
      renderReview(
        REPORT_STATUSES.SUBMITTED, mockSubmit, true, defaultApprover, incompletePages,
      );
      const button = await screen.findByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('when the report is approved', () => {
    it('displays the approved component', async () => {
      renderReview(REPORT_STATUSES.APPROVED, () => { }, false);
      expect(await screen.findByText('Report approved')).toBeVisible();
    });

    it('shows approver notes', async () => {
      const approverWithNotes = [
        {
          id: 1, status: null, note: '<p></p>\n', user: { id: 1, fullName: 'approver 1' },
        },
        {
          id: 2, status: null, note: '<p>These are my sample notes 2.</p>\n', user: { id: 2, fullName: 'approver 2' },
        },
        {
          id: 3, status: null, note: null, user: { id: 1, fullName: 'approver 3' },
        },
      ];
      renderReview(REPORT_STATUSES.APPROVED, () => { }, false, approverWithNotes);
      const alert = document.querySelector('.usa-alert');
      expect(alert).not.toBe(null);
    });
  });

  describe('when approver is creator', () => {
    it('does not show an alert', async () => {
      const calculatedStatus = REPORT_STATUSES.DRAFT;
      const onFormReview = jest.fn();
      const reviewed = false;
      const approvers = [
        {
          id: 1, status: null, note: '', user: { id: 4, fullName: 'name' },
        },
      ];
      const pages = defaultPages;
      renderReview(
        calculatedStatus, onFormReview, reviewed, approvers, pages,
      );

      const alert = document.querySelector('.usa-alert');
      expect(alert).toBe(null);
    });

    it('does not show a status dropdown', async () => {
      const calculatedStatus = REPORT_STATUSES.DRAFT;
      const onFormReview = jest.fn();
      const reviewed = false;
      const approvers = [
        {
          id: 1, status: null, note: '', user: { id: 4, fullName: 'name' },
        },
      ];
      const pages = defaultPages;
      renderReview(
        calculatedStatus, onFormReview, reviewed, approvers, pages,
      );

      const statuses = screen.queryAllByLabelText('Choose report status (Required)');
      expect(statuses.length).toBe(0);
    });
  });
});
