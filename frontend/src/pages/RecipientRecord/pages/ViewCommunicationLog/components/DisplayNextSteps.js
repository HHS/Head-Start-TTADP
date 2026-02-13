import React from 'react'
import PropTypes from 'prop-types'
import ReadOnlyField from '../../../../../components/ReadOnlyField'

export const skipDisplaySteps = (steps) => {
  if (!steps || !steps.length) {
    return true
  }

  return steps.every((step) => !step.note && !step.completeDate)
}

export default function DisplayNextSteps({ title, steps }) {
  if (skipDisplaySteps(steps)) {
    return null
  }

  return (
    <>
      <h2>{title}</h2>
      {steps.map((step, index) => (
        <div key={`${title}${step.note}`}>
          <ReadOnlyField label={`Step ${index + 1}`}>{step.note}</ReadOnlyField>
          <ReadOnlyField label="Anticipated completion date">{step.completeDate}</ReadOnlyField>
        </div>
      ))}
    </>
  )
}

DisplayNextSteps.propTypes = {
  title: PropTypes.string.isRequired,
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      note: PropTypes.string,
      completeDate: PropTypes.string,
    })
  ),
}

DisplayNextSteps.defaultProps = {
  steps: [],
}
