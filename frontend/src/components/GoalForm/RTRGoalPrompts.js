import React from 'react';
import { uniqueId } from 'lodash';
import PropTypes from 'prop-types';
import usePerGrantMetadata from '../../hooks/usePerGrantMetadata';
import DivergenceRadio from './DivergenceRadio';
import ConditionalFields from '../ConditionalFields';
// import { combinePrompts } from '../condtionalFieldConstants';

const PromptProps = {
  value: PropTypes.shape({
    [PropTypes.string]: PropTypes.string,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  validate: PropTypes.func.isRequired,
  errors: PropTypes.arrayOf(PropTypes.node).isRequired,
  userCanEdit: PropTypes.bool,
  selectedGrants: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    numberWithProgramTypes: PropTypes.string,
  })).isRequired,
};

const DisplayFields = ({
  value,
  errors,
  userCanEdit,
  validate,
  updateAll,
  updateSingle,
  divergence,
  singleValue,
}) => {
  if (!divergence) {
    return (
      <ConditionalFields
        prompts={singleValue}
        setPrompts={updateAll}
        validatePrompts={validate}
        errors={errors}
        userCanEdit={userCanEdit}
      />
    );
  }

  const grantNumbers = Object.keys(value);

  return grantNumbers.map((grantNumber) => (
    <div key={uniqueId('root-cause-by-grant-')} className="margin-top-1">
      <h3 className="ttahub-rtr-grant-number">
        Grant
        {' '}
        {grantNumber}
      </h3>
      <ConditionalFields
        prompts={value[grantNumber]}
        setPrompts={() => updateSingle()}
        validatePrompts={validate}
        errors={errors}
        userCanEdit={userCanEdit}
      />
    </div>
  ));
};

DisplayFields.propTypes = {
  ...PromptProps,
  divergence: PropTypes.bool.isRequired,
  updateAll: PropTypes.func.isRequired,
  singleVale: PropTypes.shape({}).isRequired,
};

export default function RTRGoalPrompts({
  value,
  onChange,
  validate,
  errors,
  userCanEdit,
  selectedGrants,
}) {
  const {
    data,
    divergence,
    setDivergence,
    updateSingle,
    updateAll,
  } = usePerGrantMetadata(
    value,
    onChange,
  );

  if (!selectedGrants.length) {
    return null;
  }

  return (
    <>
      {JSON.stringify(data, null, 2)}
      {selectedGrants.length > 1 && (
      <DivergenceRadio
        divergenceLabel="Do all recipient grants have the same FEI root cause?"
        divergence={divergence}
        setDivergence={setDivergence}
      />
      )}
      <DisplayFields
        value={value}
        onChange={onChange}
        errors={errors}
        userCanEdit={userCanEdit}
        validate={validate}
        updateAll={updateAll}
        updateSingle={updateSingle}
        divergence={divergence}
        singleValue={data[0]}
      />
    </>
  );
}

RTRGoalPrompts.propTypes = PromptProps;

RTRGoalPrompts.defaultProps = {
  userCanEdit: false,
};
