import React from 'react';
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
}) {
  return (
    <FormGroup className={className} error={error.props.children}>
      <Fieldset onBlur={onBlur}>
        <legend>
          Is this a Recipient TTA Plan Agreement (RTTAPA) goal?
          <Req />
        </legend>
        {error}
        <Radio disabled={isLoading} name={inputName} id={`${inputName}-yes`} label="Yes" checked={isRttapa === 'yes'} onChange={() => onChange('yes')} />
        <Radio disabled={isLoading} name={inputName} id={`${inputName}-no`} label="No" checked={isRttapa === 'no'} onChange={() => onChange('no')} />
      </Fieldset>
    </FormGroup>
  );
}

GoalRttapa.propTypes = {
  inputName: PropTypes.string,
  isRttapa: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
  error: PropTypes.node.isRequired,
  className: PropTypes.string,
  isLoading: PropTypes.bool,
};

GoalRttapa.defaultProps = {
  className: 'margin-top-3',
  inputName: 'goal-is-rttapa',
  isLoading: false,
};
