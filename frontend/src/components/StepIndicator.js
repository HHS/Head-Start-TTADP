import React from 'react'
import PropTypes from 'prop-types'
import { DECIMAL_BASE } from '@ttahub/common'

const StepIndicator = ({ children, helpLink }) => {
  const findCurrentStepIndex = () => {
    const i = children.findIndex((step) => step.props.status === 'current')
    return i === -1 ? 0 : i
  }
  const currentStepIndex = findCurrentStepIndex()
  const currentStepNumber = currentStepIndex + 1
  const currentStepLabel = children[parseInt(`${currentStepIndex}`, DECIMAL_BASE)].props.label
  const totalNumberOfSteps = children.length

  return (
    <div className="usa-step-indicator" data-testid="step-indicator" aria-label="progress">
      <ol className="usa-step-indicator__segments">{children}</ol>
      <div className="usa-step-indicator__header">
        <h2 className="usa-step-indicator__heading margin-right-1">
          <span className="usa-step-indicator__heading-counter">
            <span className="usa-sr-only">Step</span>
            <span className="usa-step-indicator__current-step">{currentStepNumber}</span>
            &nbsp;
            <span className="usa-step-indicator__total-steps">{`of ${totalNumberOfSteps}`}</span>
            &nbsp;
          </span>
          <span className="usa-step-indicator__heading-text">{currentStepLabel}</span>
        </h2>
        {helpLink}
      </div>
    </div>
  )
}

StepIndicator.propTypes = {
  children: PropTypes.node.isRequired,
  helpLink: PropTypes.node.isRequired,
}

export default StepIndicator
