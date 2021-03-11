/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import Approver from '../index';
import { REPORT_STATUSES } from '../../../../../../Constants';

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
      />
    </FormProvider>
  );
};

const renderReview = (status, onFormReview, reviewed, notes = '') => {
  const formData = {
    approvingManager: { name: 'name' },
    author: { name: 'user' },
    managerNotes: notes,
    additionalNotes: notes,
    approvingManagerId: '1',
    status,
  };

  const history = createMemoryHistory();
  render(
    <Router history={history}>
      <RenderApprover
        status={status}
        onFormReview={onFormReview}
        reviewed={reviewed}
        formData={formData}
      />
    </Router>,
  );

  return history;
};

describe('Approver review page', () => {
  describe('when the report is submitted', () => {
    it('displays the submit review component', async () => {
      renderReview(REPORT_STATUSES.SUBMITTED, () => {}, false);
      expect(await screen.findByText('Review and approve report')).toBeVisible();
    });

    it('allows the approver to submit a review and redirects them after', async () => {
      const mockSubmit = jest.fn();
      const history = renderReview(REPORT_STATUSES.SUBMITTED, mockSubmit, true, true);
      const dropdown = await screen.findByTestId('dropdown');
      userEvent.selectOptions(dropdown, 'approved');
      const button = await screen.findByRole('button');
      userEvent.click(button);
      expect(history.location.pathname).toBe('/activity-reports');
    });

    it('handles empty notes', async () => {
      renderReview(REPORT_STATUSES.SUBMITTED, () => {}, true);
      const notes = await screen.findByLabelText('additionalNotes');
      expect(notes.textContent).toContain('No creator notes');
    });
  });

  describe('when the report is approved', () => {
    it('displays the approved component', async () => {
      renderReview(REPORT_STATUSES.APPROVED, () => {}, false);
      expect(await screen.findByText('Report approved')).toBeVisible();
    });
  });
});
