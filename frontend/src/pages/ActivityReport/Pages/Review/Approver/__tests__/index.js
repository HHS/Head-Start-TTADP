/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import {
  render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import UserContext from '../../../../../../UserContext';
import Approver from '../index';
import { REPORT_STATUSES } from '../../../../../../Constants';

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
  id: 1, status: null, note: '', User: { id: 1, fullName: 'name' },
}];

const RenderApprover = ({
  // eslint-disable-next-line react/prop-types
  onFormReview, reviewed, formData,
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
      >
        <div>
          test
        </div>
      </Approver>
    </FormProvider>
  );
};

const renderReview = (calculatedStatus, onFormReview, reviewed, approvers = defaultApprover) => {
  const formData = {

    author: { name: 'user' },
    additionalNotes: '',
    calculatedStatus,
    approvers,
  };

  const history = createMemoryHistory();
  render(
    <Router history={history}>
      <UserContext.Provider value={{ user }}>
        <RenderApprover
          onFormReview={onFormReview}
          reviewed={reviewed}
          formData={formData}
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
      const dropdown = await screen.findByTestId('dropdown');
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

    it('handles approver reviewing needs action', async () => {
      const approverWithNotes = [
        {
          id: 1, status: REPORT_STATUSES.APPROVED, note: '<p>These are my approved notes 1.</p>\n', User: { id: 1, fullName: 'approver 1' },
        },
        {
          id: 2, status: REPORT_STATUSES.NEEDS_ACTION, note: '<p>These are my needs action notes 2.</p>\n', User: { id: 2, fullName: 'approver 2' },
        },
        {
          id: 3, status: null, note: null, User: { id: 1, fullName: 'approver 3' },
        },
        {
          id: 4, status: REPORT_STATUSES.APPROVED, note: null, User: { id: 4, fullName: 'approver 4' },
        },
      ];
      renderReview(REPORT_STATUSES.NEEDS_ACTION, () => { }, true, approverWithNotes);
      expect(await screen.findByText(/these are my needs action notes 2\./i)).toBeVisible();
      expect(await screen.findByText(/no creator notes/i)).toBeVisible();
      expect(await screen.findByText(/these are my approved notes 1\./i)).toBeVisible();
      expect(await screen.findByText(/choose report status/i)).toBeVisible();
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
          id: 1, status: null, note: '<p></p>\n', User: { id: 1, fullName: 'approver 1' },
        },
        {
          id: 2, status: null, note: '<p>These are my sample notes 2.</p>\n', User: { id: 2, fullName: 'approver 2' },
        },
        {
          id: 3, status: null, note: null, User: { id: 1, fullName: 'approver 3' },
        },
      ];
      renderReview(REPORT_STATUSES.APPROVED, () => { }, false, approverWithNotes);
      expect(await screen.findByText(/these are my sample notes 2\./i)).toBeVisible();
      expect(await screen.findByText(/no creator notes/i)).toBeVisible();
    });
  });
});
