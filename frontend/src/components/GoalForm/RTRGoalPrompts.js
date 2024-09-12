import React, { useState, useEffect } from 'react';
import { uniq, uniqueId } from 'lodash';
import PropTypes from 'prop-types';
import usePerGrantMetadata from '../../hooks/usePerGrantMetadata';
import DivergenceRadio from './DivergenceRadio';
import ConditionalFields from '../ConditionalFields';
import { getGoalTemplatePrompts } from '../../fetchers/goalTemplates';
import { combinePrompts } from '../condtionalFieldConstants';
import FormFieldThatIsSometimesReadOnly from './FormFieldThatIsSometimesReadOnly';

const PromptProps = {
  value: PropTypes.shape({
    [PropTypes.string]: PropTypes.string,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  validate: PropTypes.func.isRequired,
  errors: PropTypes.shape({}).isRequired,
  userCanEdit: PropTypes.bool,
  selectedGrants: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    numberWithProgramTypes: PropTypes.string,
  })),
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
  goalTemplatePrompts,
}) => {
  if (!divergence) {
    return (
      <ConditionalFields
        prompts={combinePrompts(singleValue, goalTemplatePrompts)}
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
        prompts={combinePrompts(value[grantNumber], goalTemplatePrompts)}
        setPrompts={(newValue) => {
          updateSingle(grantNumber, newValue);
        }}
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
  singleValue: PropTypes.arrayOf(
    PropTypes.shape({}),
  ).isRequired,
  goalTemplatePrompts: PropTypes.arrayOf(
    PropTypes.shape({
      fieldType: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
    }),
  ).isRequired,
};

export default function RTRGoalPrompts({
  value,
  onChange,
  validate,
  errors,
  userCanEdit,
  selectedGrants,
  isCurated,
  goalTemplateId,
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

  const [goalTemplatePrompts, setGoalTemplatePrompts] = useState([]);

  useEffect(() => {
    async function fetchGoalTemplatePrompts() {
      try {
        const prompts = await getGoalTemplatePrompts(goalTemplateId);
        setGoalTemplatePrompts(prompts);
      } catch (error) {
        setGoalTemplatePrompts([]);
      }
    }
    if (goalTemplateId) {
      fetchGoalTemplatePrompts();
    }
  }, [goalTemplateId]);

  if (!selectedGrants.length || !isCurated || !goalTemplateId) {
    return null;
  }

  const singleValue = data[0];
  const fieldData = combinePrompts(singleValue, goalTemplatePrompts);

  if (!fieldData || !fieldData.length) {
    return null;
  }

  const allResponses = uniq(Object.values(data || {}).flat().map(({ response }) => response).flat()).join(', ');

  return (
    <FormFieldThatIsSometimesReadOnly
      permissions={[userCanEdit]}
      label={fieldData[0].title}
      value={allResponses}
    >
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
        singleValue={singleValue}
        goalTemplatePrompts={goalTemplatePrompts}
      />
    </FormFieldThatIsSometimesReadOnly>
  );
}

RTRGoalPrompts.propTypes = {
  ...PromptProps,
  isCurated: PropTypes.bool.isRequired,
  goalTemplateId: PropTypes.number,
  userCanEdit: PropTypes.bool,
  selectedGrants: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    numberWithProgramTypes: PropTypes.string,
  })),
};

RTRGoalPrompts.defaultProps = {
  userCanEdit: false,
  selectedGrants: [],
  goalTemplateId: null,
};
