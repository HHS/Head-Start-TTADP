/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { uniq, uniqueId } from 'lodash';
import PropTypes from 'prop-types';
// import { Label, Radio } from '@trussworks/react-uswds';
import GoalSource from './GoalSource';
import usePerGrantMetadata from '../../hooks/usePerGrantMetadata';
// import Req from '../Req';
import './RTRGoalSource.css';
import DivergenceRadio from './DivergenceRadio';

const DisplayFields = ({
  source,
  error,
  isOnApprovedReport,
  status,
  userCanEdit,
  validateGoalSource,
  isCurated,
  sourcesDiverge,
  updateSingleSource,
  updateAllSources,
  singleSource,
}) => {
  if (!sourcesDiverge) {
    return (
      null
    //   <GoalSource
    //     source={singleSource}
    //     onChangeGoalSource={updateAllSources}
    //     error={error}
    //     isOnReport={isOnApprovedReport}
    //     goalStatus={status}
    //     userCanEdit={userCanEdit}
    //     validateGoalSource={validateGoalSource}
    //     isCurated={isCurated}
    //   />
    //   <ConditionalFields
    //     prompts={prompts}
    //     setPrompts={setPrompts}
    //     validatePrompts={validatePrompts}
    //     errors={errors[FORM_FIELD_INDEXES.GOAL_PROMPTS]}
    //     userCanEdit={notClosedWithEditPermission}
    //   />

    );
  }

  const grantNumbers = Object.keys(source);

  return grantNumbers.map((grantNumber) => (
    <div key={uniqueId('source-by-grant-')} className="margin-top-1">
      <h3 className="ttahub-rtr-grant-number">
        Grant
        {' '}
        {grantNumber}
      </h3>
      <GoalSource
        source={source[grantNumber]}
        onChangeGoalSource={(newSource) => updateSingleSource(grantNumber, newSource)}
        error={error}
        isOnReport={isOnApprovedReport}
        goalStatus={status}
        userCanEdit={userCanEdit}
        validateGoalSource={validateGoalSource}
        isCurated={isCurated}
        inputName={uniqueId('source-')}
      />
    </div>
  ));
};

// DisplayGoalSource.propTypes = {
//   ...PromptProps,
//   sourcesDiverge: PropTypes.bool.isRequired,
//   updateSingleSource: PropTypes.func.isRequired,
//   updateAllSources: PropTypes.func.isRequired,
//   singleSource: PropTypes.string.isRequired,
// };

export default function RTRGoalPrompts({
  value,
  onChange,
  setPrompts,
  validatePrompts,
  errors,
  userCanEdit,
  selectedGrants,
  divergenceLabel,
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
      {selectedGrants.length > 1 && (
      <DivergenceRadio
        divergenceLabel="Do all recipient grants have the same FEI root cause?"
        divergence={divergence}
        setDivergence={setDivergence}
      />
      )}
      {/* <DisplayFields
        source={source}
        setSource={onChangeGoalSource}
        error={error}
        isOnApprovedReport={isOnApprovedReport}
        status={status}
        userCanEdit={userCanEdit}
        validate={validate}
        updateAll={updateAll}
        updateSingle={updateSingle}
        divergence={divergence}
        singleValue={data[0]}
      /> */}
    </>
  );
}

// RTRGoalPrompts.propTypes = PromptProps;

RTRGoalPrompts.defaultProps = {
  userCanEdit: false,
};
