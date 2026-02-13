import React from 'react'
import PropTypes from 'prop-types'
import { FormGroup, Label } from '@trussworks/react-uswds'
import AutomaticResizingTextarea from '../AutomaticResizingTextarea'

export default function ObjectiveTitle({ error, title, onChangeTitle, validateObjectiveTitle, inputName, isLoading }) {
  return (
    <FormGroup error={error.props.children}>
      <Label htmlFor={inputName}>
        TTA objective <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>
      </Label>
      <>
        {error}
        <AutomaticResizingTextarea
          onUpdateText={onChangeTitle}
          onBlur={validateObjectiveTitle}
          inputName={inputName}
          disabled={isLoading}
          value={title}
        />
      </>
    </FormGroup>
  )
}

ObjectiveTitle.propTypes = {
  error: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  validateObjectiveTitle: PropTypes.func.isRequired,
  onChangeTitle: PropTypes.func.isRequired,
  inputName: PropTypes.string,
  isLoading: PropTypes.bool,
}

ObjectiveTitle.defaultProps = {
  inputName: 'objectiveTitle',
  isLoading: false,
}
