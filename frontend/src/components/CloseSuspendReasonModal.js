/* eslint-disable react/jsx-props-no-spreading */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, ErrorMessage, Label, Fieldset, Radio, Textarea,
} from '@trussworks/react-uswds';
import Modal from './Modal';
import { GOAL_CLOSE_REASONS, GOAL_SUSPEND_REASONS } from '../Constants';
import './CloseSuspendReasonModal.css';

const CloseSuspendReasonModal = ({
  modalRef, goalId, newStatus, onSubmit, resetValues,
}) => {
  const [closeSuspendReason, setCloseSuspendReason] = useState(null);
  const [closeSuspendContext, setCloseSuspendContext] = useState(null);

  useEffect(() => {
    // Every time we show the modal reset the form.
    setCloseSuspendReason(null);
    setCloseSuspendContext('');
  }, [resetValues]);

  const reasonDisplayStatus = newStatus === 'Completed' ? 'closing' : 'suspending';
  const reasonRadioOptions = newStatus === 'Completed' ? GOAL_CLOSE_REASONS : GOAL_SUSPEND_REASONS;

  const generateReasonRadioButtons = () => reasonRadioOptions.map((r) => (
    <Radio
      id={`${goalId}-${r}-radio-reason`}
      key={`${goalId}-${r}-radio-reason`}
      name="closeSuspendReason"
      label={r}
      value={r}
      className="smart-hub--report-checkbox"
      checked={closeSuspendReason === r}
    />
  ));

  const ReasonChanged = (e) => {
    if (e.target && e.target.value) {
      setCloseSuspendReason(e.target.value);
    }
  };

  const contextChanged = (e) => {
    if (e.target && e.target.value) {
      setCloseSuspendContext(e.target.value);
    }
  };

  return (
    <>
      <Modal
        modalRef={modalRef}
        onOk={() => onSubmit(goalId, newStatus, closeSuspendReason, closeSuspendContext)}
        modalId="CloseSuspendReasonModal"
        title={`Select a reason for ${reasonDisplayStatus} the goal.`}
        okButtonText="Submit"
        okButtonAriaLabel={`This button will submit your reason for ${reasonDisplayStatus} the goal.`}
        okEnabled={!!closeSuspendReason}
        okButtonCss="usa-button--primary"
        cancelButtonCss="usa-button--unstyled"
      >
        <div className="smart-hub--goal-close-suspend-reason">
          <FormGroup error={!closeSuspendReason}>
            <Fieldset onChange={ReasonChanged}>
              <Label error>
                Reason
              </Label>
              {!closeSuspendReason ? <ErrorMessage>{`Please select a reason for ${reasonDisplayStatus} goal.`}</ErrorMessage> : null}
              {
                generateReasonRadioButtons()
              }
            </Fieldset>
          </FormGroup>
          <FormGroup>
            <Fieldset onChange={contextChanged}>
              <Label htmlFor="input-type-text" error>
                Additional context
              </Label>
              <Textarea
                id="close-suspend-reason-context"
                name="close-suspend-reason-context"
                type="text"
                value={closeSuspendContext}
              />
            </Fieldset>
          </FormGroup>
        </div>
      </Modal>
    </>
  );
};

CloseSuspendReasonModal.propTypes = {
  modalRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape(),
  ]).isRequired,
  goalId: PropTypes.number.isRequired,
  newStatus: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
  resetValues: PropTypes.bool.isRequired,
};

export default CloseSuspendReasonModal;
