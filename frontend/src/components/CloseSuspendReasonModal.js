/* eslint-disable react/jsx-props-no-spreading */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { GOAL_CLOSE_REASONS, GOAL_SUSPEND_REASONS } from '@ttahub/common';
import {
  Form, FormGroup, ErrorMessage, Label, Fieldset, Radio, Textarea,
} from '@trussworks/react-uswds';
import Modal from './Modal';

const CloseSuspendReasonModal = ({
  modalRef, goalIds, newStatus, onSubmit, resetValues, oldGoalStatus,
}) => {
  const [closeSuspendReason, setCloseSuspendReason] = useState('');
  const [closeSuspendContext, setCloseSuspendContext] = useState('');
  const [showValidationError, setShowValidationError] = useState(false);

  const key = goalIds.join();
  // Create a unique ID for this instance of the modal
  const uniqueId = `modal_${key}`;

  useEffect(() => {
    // Every time we show the modal reset the form.
    setCloseSuspendReason('');
    setCloseSuspendContext('');
    setShowValidationError(false);
  }, [resetValues]);

  const reasonDisplayStatus = newStatus === 'Closed' ? 'closing' : 'suspending';
  const reasonRadioOptions = newStatus === 'Closed' ? GOAL_CLOSE_REASONS : GOAL_SUSPEND_REASONS;
  const reasonChanged = (e) => {
    setCloseSuspendReason(e.target.value);
    setShowValidationError(false);
  };
  const generateReasonRadioButtons = () => reasonRadioOptions.map((r, index) => (
    <Radio
      id={`${reasonDisplayStatus}-reason-${index}-${uniqueId}`}
      key={`${r}-${uniqueId}`}
      onChange={reasonChanged}
      name={`${reasonDisplayStatus}-reason-${index}-${uniqueId}`}
      label={r}
      value={r}
      className="smart-hub--report-checkbox"
      checked={closeSuspendReason === r}
    />
  ));
  const contextChanged = (e) => {
    setCloseSuspendContext(e.target.value);
  };

  const validateSubmit = () => {
    if (!closeSuspendReason) {
      setShowValidationError(true);
    } else {
      onSubmit(goalIds, newStatus, oldGoalStatus, closeSuspendReason, closeSuspendContext);
    }
  };
  return (
    <div className="smart-hub--goal-close-suspend-reason">
      <Modal
        modalRef={modalRef}
        onOk={validateSubmit}
        modalId={`CloseSuspendReasonModal-${uniqueId}`}
        title={`Why are you ${reasonDisplayStatus} this goal?`}
        okButtonText="Submit"
        okButtonAriaLabel="Change goal status"
        okButtonCss="usa-button--primary"
        cancelButtonCss="usa-button--unstyled"
        showTitleRequired
      >
        <Form
          key={`close-suspend-reason-form-goal-${key}`}
        >
          <FormGroup error={showValidationError} className="margin-top-0">
            <Fieldset>
              <ErrorMessage>
                { showValidationError ? `Please select a reason for ${reasonDisplayStatus} goal.` : ''}
              </ErrorMessage>
              {generateReasonRadioButtons()}
            </Fieldset>
          </FormGroup>
          <FormGroup>
            <Fieldset>
              <Label htmlFor={`close-suspend-reason-context-${uniqueId}`}>
                Additional context
              </Label>
              <Textarea
                id={`close-suspend-reason-context-${uniqueId}`}
                name={`close-suspend-reason-context-${uniqueId}`}
                type="text"
                value={closeSuspendContext}
                onChange={contextChanged}
              />
            </Fieldset>
          </FormGroup>
        </Form>
      </Modal>
    </div>
  );
};

CloseSuspendReasonModal.propTypes = {
  modalRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape(),
  ]).isRequired,
  goalIds: PropTypes.arrayOf(PropTypes.number).isRequired,
  newStatus: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
  resetValues: PropTypes.bool.isRequired,
  oldGoalStatus: PropTypes.string,
};

CloseSuspendReasonModal.defaultProps = {
  oldGoalStatus: '',
};

export default CloseSuspendReasonModal;
