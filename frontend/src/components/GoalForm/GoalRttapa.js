import React, { useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Fieldset, Radio } from '@trussworks/react-uswds';
import Req from '../Req';
import Drawer from '../Drawer';

export default function GoalRttapa({
  className,
  inputName,
  isRttapa,
  onChange,
  onBlur,
  error,
  isLoading,
  goalStatus,
  initial,
}) {
  const readOnly = useMemo(() => goalStatus === 'Closed' || (goalStatus !== 'Draft' && initial === 'Yes'), [goalStatus, initial]);
  const drawerTriggerRef = useRef(null);

  if (readOnly) {
    return (
      <div className={className}>
        <p className="usa-prose margin-y-0 text-bold">
          Goal type
        </p>
        <p className="usa-prose margin-y-0">
          {isRttapa === 'Yes' ? 'RTTAPA' : 'Non-RTTAPA'}
        </p>
      </div>
    );
  }

  return (
    <FormGroup className={`ttahub-goal-is-rttapa ${className}`} error={error.props.children}>
      <Fieldset onBlur={() => onBlur()}>
        <legend>
          Goal type
          <Req />
          <button
            type="button"
            className="usa-button usa-button--unstyled margin-left-1"
            ref={drawerTriggerRef}
          >
            View goal type guidance
          </button>
        </legend>
        {error}
        <Radio disabled={isLoading} name={inputName} id={`${inputName}-yes`} label="RTTAPA" checked={isRttapa === 'Yes'} onChange={() => onChange('Yes')} />
        <Radio disabled={isLoading} name={inputName} id={`${inputName}-no`} label="Non-RTTAPA" checked={isRttapa === 'No'} onChange={() => onChange('No')} />
        <Drawer
          triggerRef={drawerTriggerRef}
          stickyHeader
          stickyFooter
          title="Goal type guidance"
        >
          <h3 className="margin-bottom-0">RTTAPA goal</h3>
          <p className="margin-top-0">
            A goal established with the recipient during the annual planning process.
          </p>

          <h3 className="margin-bottom-0">Non-RTTAPA goal</h3>
          <p className="margin-top-0">
            A goal that emerged outside of the annual planning process with the recipient.
            Not included in the RTTAPA.
          </p>
        </Drawer>
      </Fieldset>
    </FormGroup>
  );
}

GoalRttapa.propTypes = {
  inputName: PropTypes.string,
  isRttapa: PropTypes.string,
  initial: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
  error: PropTypes.node.isRequired,
  className: PropTypes.string,
  isLoading: PropTypes.bool,
  goalStatus: PropTypes.string.isRequired,
};

GoalRttapa.defaultProps = {
  isRttapa: null,
  initial: null,
  className: 'margin-top-3',
  inputName: 'goal-is-rttapa',
  isLoading: false,
};
