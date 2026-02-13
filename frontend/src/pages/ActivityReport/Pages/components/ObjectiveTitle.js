import React from 'react'
import PropTypes from 'prop-types'
import { FormGroup, Label } from '@trussworks/react-uswds'
import AutomaticResizingTextarea from '../../../../components/AutomaticResizingTextarea'
import Req from '../../../../components/Req'

export default function ObjectiveTitle({ error, title, onChangeTitle, validateObjectiveTitle, inputName, isLoading }) {
  return (
    <FormGroup className="margin-top-1" error={error.props.children}>
      <Label htmlFor={inputName}>
        TTA objective <Req />
      </Label>
      {error}
      <AutomaticResizingTextarea
        key={inputName}
        onUpdateText={onChangeTitle}
        onBlur={validateObjectiveTitle}
        inputName={inputName}
        disabled={isLoading}
        value={title}
        className="ttahub--objective-title"
      />
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
