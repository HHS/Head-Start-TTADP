import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { useForm } from 'react-hook-form';

import Submitter from '../index';
import { REPORT_STATUSES } from '../../../../../../Constants';

const RenderSubmitter = ({
  // eslint-disable-next-line react/prop-types
  submitted, allComplete, onFormSubmit, formData, valid, onResetToDraft,
}) => {
  const { register, handleSubmit } = useForm({
    mode: 'onChange',
    defaultValues: formData,
  });

  return (
    <Submitter
      submitted={submitted}
      allComplete={allComplete}
      onFormSubmit={onFormSubmit}
      onResetToDraft={onResetToDraft}
      register={register}
      handleSubmit={handleSubmit}
      valid={valid}
      approvers={[{ name: 'test', id: 1 }]}
      formData={formData}
    />
  );
};

const renderReview = (status, submitted, allComplete, onFormSubmit, resetToDraft = () => {}) => {
  const formData = {
    approvingManager: { name: 'name' },
    approvingManagerId: 1,
    status,
  };

  render(
    <RenderSubmitter
      status={status}
      submitted={submitted}
      allComplete={allComplete}
      onFormSubmit={onFormSubmit}
      formData={formData}
      onResetToDraft={resetToDraft}
      valid
    />,
  );
};

describe('Submitter review page', () => {
  describe('when the report is a draft', () => {
    it('displays the draft review component', async () => {
      renderReview(REPORT_STATUSES.DRAFT, false, true, () => {});
      expect(await screen.findByText('Submit Report')).toBeVisible();
    });

    it('allows the author to submit for review', async () => {
      const mockSubmit = jest.fn();
      renderReview(REPORT_STATUSES.DRAFT, false, true, mockSubmit);
      const button = await screen.findByRole('button');
      userEvent.click(button);
      await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    });

    it('displays an error if the report is not complete', async () => {
      renderReview(REPORT_STATUSES.DRAFT, false, false, () => {});
      const alert = await screen.findByTestId('alert');
      expect(alert.textContent).toContain('Incomplete report');
    });
  });

  describe('when the report is approved', () => {
    it('displays the approved component', async () => {
      renderReview(REPORT_STATUSES.APPROVED, false, true, () => {});
      expect(await screen.findByText('Report approved')).toBeVisible();
    });
  });

  describe('when the report has been submitted', () => {
    it('displays the submitted page', async () => {
      renderReview(REPORT_STATUSES.SUBMITTED, false, true, () => {});
      const allAlerts = await screen.findAllByTestId('alert');
      const successAlert = allAlerts.find((alert) => alert.textContent.includes('Success'));
      expect(successAlert).toBeVisible();
    });

    it('the reset to draft button works', async () => {
      const onReset = jest.fn();
      renderReview(REPORT_STATUSES.SUBMITTED, false, true, () => {}, onReset);
      const button = await screen.findByRole('button', { name: 'Reset to Draft' });
      userEvent.click(button);
      await waitFor(() => expect(onReset).toHaveBeenCalled());
    });
  });

  describe('when the report needs action', () => {
    it('displays the needs action component', async () => {
      renderReview(REPORT_STATUSES.NEEDS_ACTION, false, true, () => {});
      expect(await screen.findByText('Review and re-submit report')).toBeVisible();
    });

    it('allows the user to resubmit the report', async () => {
      const mockSubmit = jest.fn();
      renderReview(REPORT_STATUSES.NEEDS_ACTION, false, true, mockSubmit);
      const button = await screen.findByRole('button');
      userEvent.click(button);
      await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    });
  });
});
