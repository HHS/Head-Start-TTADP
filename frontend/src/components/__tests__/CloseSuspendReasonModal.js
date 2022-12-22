/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React, { useRef } from 'react';
import {
  render, screen, fireEvent,
} from '@testing-library/react';
import { ModalToggleButton } from '@trussworks/react-uswds';
import userEvent from '@testing-library/user-event';
import CloseSuspendReasonModal from '../CloseSuspendReasonModal';
import { GOAL_CLOSE_REASONS, GOAL_SUSPEND_REASONS } from '../../Constants';

describe('Close Suspend Goal Reason', () => {
  const ModalComponent = (
    {
      goalIds = [1],
      newStatus = 'Closed',
      onSubmit = () => { },
      resetValues = false,
    },
  ) => {
    const modalRef = useRef();

    return (
      <div>
        <div>Test Close Suspend Modal</div>
        <ModalToggleButton modalRef={modalRef} opener>Open</ModalToggleButton>
        <ModalToggleButton modalRef={modalRef} closer>Close</ModalToggleButton>
        <CloseSuspendReasonModal
          goalIds={goalIds}
          newStatus={newStatus}
          modalRef={modalRef}
          onSubmit={onSubmit}
          resetValues={resetValues}
          error={false}
          oldGoalStatus=""
        />
      </div>
    );
  };

  it('correctly hides and shows', async () => {
    render(<ModalComponent />);

    // Defaults modal to hidden.
    let modalElement = document.querySelector('.usa-modal-wrapper');
    expect(modalElement).toHaveClass('is-hidden');

    // Open modal.
    const button = await screen.findByText('Open');
    userEvent.click(button);

    // Check modal is visible.
    modalElement = document.querySelector('.usa-modal-wrapper');
    expect(modalElement).toHaveClass('is-visible');
  });

  it('exits when escape key is pressed', async () => {
    render(<ModalComponent />);

    // Open modal.
    const button = await screen.findByText('Open');
    userEvent.click(button);

    // Modal is visible.
    let modalElement = document.querySelector('.usa-modal-wrapper');
    expect(modalElement).toHaveClass('is-visible');

    // Press ESC.
    userEvent.type(modalElement, '{esc}', { skipClick: true });

    // Check Modal is hidden.
    modalElement = document.querySelector('.usa-modal-wrapper');
    expect(modalElement).toHaveClass('is-hidden');
  });

  it('does not escape when any other key is pressed', async () => {
    render(<ModalComponent />);

    // Open modal.
    const button = await screen.findByText('Open');
    userEvent.click(button);

    // Modal is visible.
    let modalElement = document.querySelector('.usa-modal-wrapper');
    expect(modalElement).toHaveClass('is-visible');

    // Press ENTER.
    userEvent.type(modalElement, '{enter}', { skipClick: true });

    // Modal is still open.
    modalElement = document.querySelector('.usa-modal-wrapper');
    expect(modalElement).toHaveClass('is-visible');
  });

  it('correctly shows validation error', async () => {
    render(<ModalComponent />);

    // Open modal.
    const button = await screen.findByText('Open');
    userEvent.click(button);

    // Click submit.
    const submit = await screen.findByText('Submit');
    userEvent.click(submit);

    // Verify validation error.
    expect(await screen.findByText('Please select a reason for closing goal.')).toBeVisible();
  });

  it('correctly shows close radio options', async () => {
    render(<ModalComponent />);

    // Open modal.
    const button = await screen.findByText('Open');
    userEvent.click(button);

    // Verify title.
    expect(await screen.findByText('Why are you closing this goal?')).toBeVisible();

    // Verify correct close radio options.
    expect(await screen.findByText(GOAL_CLOSE_REASONS[0])).toBeVisible();
    expect(await screen.findByText(GOAL_CLOSE_REASONS[1])).toBeVisible();
    expect(await screen.findByText(GOAL_CLOSE_REASONS[2])).toBeVisible();

    // Verify Context.
    expect(await screen.findByText('Additional context')).toBeVisible();
    expect(await screen.findByRole('textbox', { hidden: true })).toBeVisible();
  });

  it('correctly shows suspend radio options', async () => {
    render(<ModalComponent newStatus="Ceased/Suspended" />);

    // Open modal.
    const button = await screen.findByText('Open');
    userEvent.click(button);

    // Verify title.
    expect(await screen.findByText('Why are you suspending this goal?')).toBeVisible();

    // Verify correct close radio options.
    expect(await screen.findByText(GOAL_SUSPEND_REASONS[0])).toBeVisible();
    expect(await screen.findByText(GOAL_SUSPEND_REASONS[1])).toBeVisible();
    expect(await screen.findByText(GOAL_SUSPEND_REASONS[2])).toBeVisible();
    expect(await screen.findByText(GOAL_SUSPEND_REASONS[3])).toBeVisible();

    // Verify Context.
    expect(await screen.findByText('Additional context')).toBeVisible();
    expect(await screen.findByRole('textbox', { hidden: true })).toBeVisible();
  });

  it('correctly updates context text', async () => {
    render(<ModalComponent newStatus="Ceased/Suspended" />);

    // Open modal.
    const button = await screen.findByText('Open');
    userEvent.click(button);

    // Set sample context.
    const context = await screen.findByRole('textbox', { hidden: true });
    fireEvent.change(context, { target: { value: 'This is my sample context.' } });

    // Verify context.
    expect(context.value).toBe('This is my sample context.');
  });

  it('correctly switches between reason radio buttons', async () => {
    render(<ModalComponent />);

    // Open modal.
    const button = await screen.findByText('Open');
    userEvent.click(button);

    const firstRadio = await screen.findByRole('radio', { name: /duplicate goal/i, hidden: true });
    const secondRadio = await screen.findByRole('radio', { name: /recipient request/i, hidden: true });
    const thirdRadio = await screen.findByRole('radio', { name: /tta complete/i, hidden: true });

    // No radio buttons selected by default.
    expect(firstRadio.checked).toBe(false);
    expect(secondRadio.checked).toBe(false);
    expect(thirdRadio.checked).toBe(false);

    // Select first radio button.
    userEvent.click(firstRadio);

    // Verify its selected.
    expect(firstRadio.checked).toBe(true);

    // Select third radio button.
    userEvent.click(thirdRadio);

    // Verify first radio is no longer checked and third radio is checked.
    expect(firstRadio.checked).toBe(false);
    expect(thirdRadio.checked).toBe(true);
  });
});
