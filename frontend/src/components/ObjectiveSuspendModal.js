import React from 'react';
import PropTypes from 'prop-types';
import { GOAL_SUSPEND_REASONS } from '@ttahub/common';
import {
  Textarea, Fieldset, Label, FormGroup, Button, Radio, ModalToggleButton,
} from '@trussworks/react-uswds';
import VanillaModal from './VanillaModal';

const SUSPEND_REASONS = GOAL_SUSPEND_REASONS;

export default function ObjectiveSuspendModal({
  objectiveId,
  modalRef,
  objectiveSuspendReason,
  onChangeSuspendReason,
  objectiveSuspendInputName,
  objectiveSuspendContextInputName,
  objectiveSuspendContext,
  onChangeSuspendContext,
}) {
  return (
    <VanillaModal
      forceAction
      id={`suspend-objective-${objectiveId}`}
      heading={(
        <>
          Why are you suspending this objective?
          {' '}
          <span>(required)</span>
        </>
      )}
      modalRef={modalRef}
    >
      <Fieldset>
        <FormGroup>
          <Label className="usa-sr-only" htmlFor={`suspend-objective-${objectiveId}-reason`}>
            Reason for suspension
          </Label>
          { SUSPEND_REASONS.map((r) => (
            <Radio
              id={`suspend-objective-${objectiveId}-reason-${r.trim().replace(' ', '-').toLowerCase()}`}
              key={r}
              onChange={onChangeSuspendReason}
              name={objectiveSuspendInputName}
              label={r}
              value={r}
              className="smart-hub--report-checkbox"
              checked={objectiveSuspendReason === r}
            />
          ))}
        </FormGroup>
      </Fieldset>
      <FormGroup className="margin-bottom-4">
        <Label htmlFor={`suspend-objective-${objectiveId}-context`}>
          Additional context
        </Label>
        <Textarea
          id={`suspend-objective-${objectiveId}-context`}
          name={objectiveSuspendContextInputName}
          type="text"
          value={objectiveSuspendContext}
          onChange={onChangeSuspendContext}
        />
      </FormGroup>
      <Button type="button">Submit</Button>
      <ModalToggleButton modalRef={modalRef} className="usa-button--subtle">Cancel</ModalToggleButton>
    </VanillaModal>
  );
}

ObjectiveSuspendModal.propTypes = {
  objectiveId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  modalRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape(),
  ]).isRequired,
  objectiveSuspendReason: PropTypes.string.isRequired,
  onChangeSuspendReason: PropTypes.func.isRequired,
  objectiveSuspendInputName: PropTypes.string.isRequired,
  objectiveSuspendContextInputName: PropTypes.string.isRequired,
  objectiveSuspendContext: PropTypes.string.isRequired,
  onChangeSuspendContext: PropTypes.func.isRequired,
};
