import React from 'react'
import PropTypes from 'prop-types'
import Container from '../Container'

export default function GoalFormContainer({ children }) {
  return (
    <Container className="margin-y-3 margin-left-2 width-tablet" paddingX={4} paddingY={5}>
      {children}
    </Container>
  )
}

GoalFormContainer.propTypes = {
  children: PropTypes.node.isRequired,
}
