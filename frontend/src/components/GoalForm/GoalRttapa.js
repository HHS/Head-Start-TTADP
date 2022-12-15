import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Fieldset, Radio } from '@trussworks/react-uswds';
import Req from '../Req';

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

  if (readOnly) {
    return (
      <div className={className}>
        <p className="usa-prose margin-y-0 text-bold">
          Recipient TTA Plan Agreement (RTTAPA) goal
        </p>
        <p className="usa-prose margin-y-0">
          {isRttapa ? 'Yes' : 'No'}
        </p>
      </div>
    );
  }

  return (
    <FormGroup className={`ttahub-goal-is-rttapa ${className}`} error={error.props.children}>
      <Fieldset onBlur={() => onBlur()}>
        <legend>
          Is this a Recipient TTA Plan Agreement (RTTAPA) goal?
          <Req />
        </legend>
        {error}
        <Radio disabled={isLoading} name={inputName} id={`${inputName}-yes`} label="Yes" checked={isRttapa === 'Yes'} onChange={() => onChange('Yes')} />
        <Radio disabled={isLoading} name={inputName} id={`${inputName}-no`} label="No" checked={isRttapa === 'No'} onChange={() => onChange('No')} />
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
