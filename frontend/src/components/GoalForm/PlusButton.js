import React from 'react'
import PropTypes from 'prop-types'
import { Button } from '@trussworks/react-uswds'
import './PlusButton.scss'

export default function PlusButton({ onClick, text, testId, className }) {
  return (
    <>
      <Button type="button" className={`ttahub-plus-button ${className}`} data-testid={testId} unstyled onClick={onClick}>
        <i className="fa-regular fa-circle-plus margin-right-1" />
        {text}
      </Button>
    </>
  )
}

PlusButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  text: PropTypes.string.isRequired,
  testId: PropTypes.string,
  className: PropTypes.string,
}

PlusButton.defaultProps = {
  testId: 'plusButton',
  className: '',
}
