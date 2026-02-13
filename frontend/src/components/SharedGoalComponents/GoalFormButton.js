import React from 'react'
import PropTypes from 'prop-types'
import { Button, ModalToggleButton } from '@trussworks/react-uswds'
import { Link } from 'react-router-dom'
import { GOAL_FORM_BUTTON_TYPES, GOAL_FORM_BUTTON_VARIANTS } from './constants'

export default function GoalFormButton({ type, to, onClick, variant, label, modalRef }) {
  if (type === GOAL_FORM_BUTTON_TYPES.MODAL_OPENER) {
    return (
      <ModalToggleButton opener modalRef={modalRef}>
        {label}
      </ModalToggleButton>
    )
  }

  if (type === GOAL_FORM_BUTTON_TYPES.LINK) {
    if (!to) {
      // eslint-disable-next-line no-console
      console.error('GoalFormButton: to prop is required for link buttons')
      return null
    }

    return (
      <Link to={to} className={`usa-button usa-button--${variant}`}>
        {label}
      </Link>
    )
  }

  return (
    <Button type={type} className={`usa-button usa-button--${variant}`} onClick={onClick}>
      {label}
    </Button>
  )
}

GoalFormButton.propTypes = {
  type: PropTypes.string.isRequired,
  variant: PropTypes.string,
  label: PropTypes.string.isRequired,
  to: PropTypes.string,
  onClick: PropTypes.func,
  // eslint-disable-next-line react/forbid-prop-types -- modalRef is a ref object
  modalRef: PropTypes.shape({ current: PropTypes.object }),
}

GoalFormButton.defaultProps = {
  variant: GOAL_FORM_BUTTON_VARIANTS.PRIMARY,
  to: null,
  onClick: undefined,
  modalRef: undefined,
}
