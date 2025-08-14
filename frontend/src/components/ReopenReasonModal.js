/* eslint-disable react/jsx-props-no-spreading */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { REOPEN_REASONS, GOAL_STATUS } from '@ttahub/common';
import {
  Form, FormGroup, ErrorMessage, Label, Fieldset, Radio, Textarea,
} from '@trussworks/react-uswds';
import Modal from './Modal';

const ReopenReasonModal = ({
  modalRef,
  goalId,
  onSubmit,
  resetValues,
}) => {
  const [reopenReason, setReopenReason] = useState('');
  const [reopenContext, setReopenContext] = useState('');
  const [showValidationError, setShowValidationError] = useState(false);

  useEffect(() => {
    // Every time we show the modal reset the form.
    setReopenReason('');
    setReopenContext('');
    setShowValidationError(false);
  }, [resetValues]);

  const reasonChanged = (e) => {
    setReopenReason(e.target.value);
    setShowValidationError(false);
  };

  const reasonRadioOptions = Object.values(REOPEN_REASONS[GOAL_STATUS.CLOSED]);

  const generateReasonRadioButtons = () => reasonRadioOptions.map((r) => (
    <Radio
      id={r.trim().replace(' ', '-').toLowerCase()}
      key={r}
      onChange={reasonChanged}
      name="reopenReason"
      label={r}
      value={r}
      className="smart-hub--report-checkbox"
      checked={reopenReason === r}
    />
  ));
  const contextChanged = (e) => {
    setReopenContext(e.target.value);
  };

  const validateSubmit = () => {
    if (!reopenReason) {
      setShowValidationError(true);
    } else {
      onSubmit(goalId, reopenReason, reopenContext);
    }
  };

  return (
    <div className="smart-hub--goal-close-suspend-reason">
      <Modal
        modalRef={modalRef}
        onOk={validateSubmit}
        modalId="ReopenReasonModal"
        title="Why are you reopening this goal?"
        okButtonText="Submit"
        okButtonAriaLabel="Reopen goal"
        okButtonCss="usa-button--primary"
        cancelButtonCss="usa-button--unstyled"
        showTitleRequired
        forceAction
      >
        <Form
          key={`reopen-reason-form-goal-${goalId}`}
        >
          <FormGroup error={showValidationError} className="margin-top-0">
            <ErrorMessage>
              {showValidationError
                ? 'Please select a reason for reopening this goal.' : null}
            </ErrorMessage>
            <Fieldset>
              {
                generateReasonRadioButtons()
              }
            </Fieldset>
          </FormGroup>
          <FormGroup>
            <Fieldset>
              <Label htmlFor="reopen-reason-context">
                Additional context
              </Label>
              <Textarea
                id="reopen-reason-context"
                name="reopen-reason-context"
                type="text"
                value={reopenContext}
                onChange={contextChanged}
              />
            </Fieldset>
          </FormGroup>
        </Form>
      </Modal>
    </div>
  );
};

ReopenReasonModal.propTypes = {
  modalRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape(),
  ]).isRequired,
  goalId: PropTypes.number,
  onSubmit: PropTypes.func.isRequired,
  resetValues: PropTypes.bool.isRequired,
};
ReopenReasonModal.defaultProps = {
  goalId: null,
};

export default ReopenReasonModal;
