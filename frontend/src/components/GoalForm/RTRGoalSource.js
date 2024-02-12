import React, { useState } from 'react';
import { uniq, uniqueId } from 'lodash';
import PropTypes from 'prop-types';
import { Label, Radio } from '@trussworks/react-uswds';
import GoalSource from './GoalSource';
import Req from '../Req';
import './RTRGoalSource.css';

const GoalSourceProps = {
  source: PropTypes.shape({
    [PropTypes.string]: PropTypes.string,
  }).isRequired,
  onChangeGoalSource: PropTypes.func.isRequired,
  error: PropTypes.node.isRequired,
  isOnApprovedReport: PropTypes.bool.isRequired,
  status: PropTypes.string.isRequired,
  userCanEdit: PropTypes.bool.isRequired,
  validateGoalSource: PropTypes.func.isRequired,
  isCurated: PropTypes.bool.isRequired,
  createdVia: PropTypes.string.isRequired,
  selectedGrants: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    numberWithProgramTypes: PropTypes.string,
  })).isRequired,
};

const DisplayGoalSource = ({
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
      <GoalSource
        source={singleSource}
        onChangeGoalSource={updateAllSources}
        error={error}
        isOnReport={isOnApprovedReport}
        goalStatus={status}
        userCanEdit={userCanEdit}
        validateGoalSource={validateGoalSource}
        isCurated={isCurated}
      />
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

DisplayGoalSource.propTypes = {
  ...GoalSourceProps,
  sourcesDiverge: PropTypes.bool.isRequired,
  updateSingleSource: PropTypes.func.isRequired,
  updateAllSources: PropTypes.func.isRequired,
  singleSource: PropTypes.string.isRequired,
};

export default function RTRGoalSource({
  source,
  onChangeGoalSource,
  error,
  isOnApprovedReport,
  status,
  userCanEdit,
  validateGoalSource,
  isCurated,
  createdVia,
  selectedGrants,
}) {
  const sources = uniq(Object.values(source || {}));
  const [sourcesDiverge, setSourcesDiverge] = useState(sources.length > 1);

  if (!selectedGrants.length) {
    return null;
  }

  const updateSingleSource = (grantNumber, newSource) => {
    onChangeGoalSource({
      ...source,
      [grantNumber]: newSource,
    });
  };

  const updateAllSources = (newSource) => {
    // set all keys to the newSource value
    const newSources = Object.keys(source).reduce((acc, key) => {
      acc[key] = newSource;
      return acc;
    }, {});

    onChangeGoalSource(newSources);
  };

  return (
    <>
      {selectedGrants.length > 1 && (
      <>
        <Label htmlFor="rtr-source-same">
          Do all recipient grants have the same source?
          {' '}
          <Req />
        </Label>
        <Radio
          id="rtr-source-same"
          name="rtr-source"
          value="same"
          checked={!sourcesDiverge}
          onChange={() => setSourcesDiverge(false)}
          label="Yes"
        />
        <Radio
          id="rtr-source-different"
          name="rtr-source"
          value="different"
          checked={sourcesDiverge}
          onChange={() => setSourcesDiverge(true)}
          label="No"
        />
      </>
      )}
      <DisplayGoalSource
        source={source}
        setSource={onChangeGoalSource}
        error={error}
        isOnApprovedReport={isOnApprovedReport}
        status={status}
        userCanEdit={userCanEdit}
        validateGoalSource={validateGoalSource}
        isCurated={isCurated}
        createdVia={createdVia}
        updateAllSources={updateAllSources}
        updateSingleSource={updateSingleSource}
        sourcesDiverge={sourcesDiverge}
        singleSource={sources[0]}
      />
    </>
  );
}

RTRGoalSource.propTypes = GoalSourceProps;
