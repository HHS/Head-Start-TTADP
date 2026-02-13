import React from 'react'
import { uniqueId } from 'lodash'
import PropTypes from 'prop-types'
import GoalSource from './GoalSource'
import usePerGrantMetadata from '../../hooks/usePerGrantMetadata'
import DivergenceRadio from './DivergenceRadio'
import './RTRGoalSource.css'

const GoalSourceProps = {
  source: PropTypes.shape({
    [PropTypes.string]: PropTypes.string,
  }).isRequired,
  onChangeGoalSource: PropTypes.func.isRequired,
  error: PropTypes.node.isRequired,
  userCanEdit: PropTypes.bool.isRequired,
  validateGoalSource: PropTypes.func.isRequired,
  isCurated: PropTypes.bool.isRequired,
  selectedGrants: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      numberWithProgramTypes: PropTypes.string,
    })
  ).isRequired,
}

const DisplayGoalSource = ({
  source,
  error,
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
        userCanEdit={userCanEdit}
        validateGoalSource={validateGoalSource}
        isCurated={isCurated}
      />
    )
  }

  const grantNumbers = Object.keys(source)

  return grantNumbers.map((grantNumber) => (
    <div key={uniqueId('source-by-grant-')} className="margin-top-1">
      <h3 className="ttahub-rtr-grant-number">Grant {grantNumber}</h3>
      <GoalSource
        source={source[grantNumber] || ''}
        onChangeGoalSource={(newSource) => updateSingleSource(grantNumber, newSource)}
        error={error}
        userCanEdit={userCanEdit}
        validateGoalSource={validateGoalSource}
        isCurated={isCurated}
        inputName={uniqueId('source-')}
      />
    </div>
  ))
}

DisplayGoalSource.propTypes = {
  ...GoalSourceProps,
  sourcesDiverge: PropTypes.bool.isRequired,
  updateSingleSource: PropTypes.func.isRequired,
  updateAllSources: PropTypes.func.isRequired,
  singleSource: PropTypes.string,
}

DisplayGoalSource.defaultProps = {
  singleSource: '',
}

export default function RTRGoalSource({ source, onChangeGoalSource, error, userCanEdit, validateGoalSource, isCurated, selectedGrants }) {
  const {
    data: sources,
    divergence: sourcesDiverge,
    setDivergence: setSourcesDiverge,
    updateSingle: updateSingleSource,
    updateAll: updateAllSources,
  } = usePerGrantMetadata(source, onChangeGoalSource)

  if (!selectedGrants.length) {
    return null
  }

  return (
    <>
      {selectedGrants.length > 1 && (
        <DivergenceRadio
          divergenceLabel="Do all recipient grants have the same source?"
          divergence={sourcesDiverge}
          setDivergence={setSourcesDiverge}
        />
      )}
      <DisplayGoalSource
        source={source}
        onChangeGoalSource={onChangeGoalSource}
        error={error}
        userCanEdit={userCanEdit}
        validateGoalSource={validateGoalSource}
        isCurated={isCurated}
        updateAllSources={updateAllSources}
        updateSingleSource={updateSingleSource}
        sourcesDiverge={sourcesDiverge}
        singleSource={sources[0]}
        selectedGrants={selectedGrants}
      />
    </>
  )
}

RTRGoalSource.propTypes = GoalSourceProps
