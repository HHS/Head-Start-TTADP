import React from 'react'
import PropTypes from 'prop-types'
import GoalFormButton from './GoalFormButton'

export default function GoalFormButtonIterator({ buttons, modalRef }) {
  return buttons.map((button) => (
    <GoalFormButton
      key={button.id}
      onClick={button.onClick}
      label={button.label}
      variant={button.variant}
      type={button.type}
      to={button.to}
      modalRef={modalRef}
    />
  ))
}

GoalFormButtonIterator.propTypes = {
  buttons: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      type: PropTypes.string,
      variant: PropTypes.string,
      label: PropTypes.string,
      onClick: PropTypes.func,
      to: PropTypes.string,
    })
  ).isRequired,
  // eslint-disable-next-line react/forbid-prop-types -- modalRef is a ref object
  modalRef: PropTypes.shape({ current: PropTypes.object }),
}

GoalFormButtonIterator.defaultProps = {
  modalRef: undefined,
}
