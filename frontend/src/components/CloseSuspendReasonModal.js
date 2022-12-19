/* eslint-disable react/jsx-props-no-spreading */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Form, FormGroup, ErrorMessage, Label, Fieldset, Radio, Textarea,
} from '@trussworks/react-uswds';
import { GOAL_CLOSE_REASONS, GOAL_SUSPEND_REASONS } from '@ttahub/common';
import Modal from './Modal';

const CloseSuspendReasonModal = ({
  modalRef, goalIds, newStatus, onSubmit, resetValues, oldGoalStatus,
}) => {
  const [closeSuspendReason, setCloseSuspendReason] = useState('');
  const [closeSuspendContext, setCloseSuspendContext] = useState('');
  const [showValidationError, setShowValidationError] = useState(false);

  const key = goalIds.join();

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

  const generateReasonRadioButtons = () => reasonRadioOptions.map((r) => (
    <Radio
      id={r.trim().replace(' ', '-').toLowerCase()}
      key={r}
      onChange={reasonChanged}
      name="closeSuspendReason"
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
        modalId="CloseSuspendReasonModal"
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
              {showValidationError ? <ErrorMessage>{`Please select a reason for ${reasonDisplayStatus} goal.`}</ErrorMessage> : null}
              {
                generateReasonRadioButtons()
              }
            </Fieldset>
          </FormGroup>
          <FormGroup>
            <Fieldset>
              <Label className="font-weight-normal" htmlFor="close-suspend-reason-context" error>
                Additional context
              </Label>
              <Textarea
                id="close-suspend-reason-context"
                name="close-suspend-reason-context"
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
