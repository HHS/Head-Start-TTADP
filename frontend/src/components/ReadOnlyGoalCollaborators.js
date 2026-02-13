import React from 'react'
import PropTypes from 'prop-types'
import { FormGroup } from '@trussworks/react-uswds'
import ReadOnlyField from './ReadOnlyField'

export default function ReadOnlyGoalCollaborators({ collaborators }) {
  if (!collaborators.length) return null

  return collaborators.map((collaborator) => {
    const { goalCreatorName, goalCreatorRoles, goalNumber } = collaborator
    if (!goalCreatorName) return null
    return (
      <FormGroup key={goalNumber}>
        <ReadOnlyField label={`Entered by${collaborators.length > 1 ? ` (${goalNumber})` : ''}`}>
          {goalCreatorName}
          {goalCreatorRoles ? `, ${goalCreatorRoles}` : ''}
        </ReadOnlyField>
      </FormGroup>
    )
  })
}

ReadOnlyGoalCollaborators.propTypes = {
  collaborators: PropTypes.arrayOf(
    PropTypes.shape({
      goalCreatorName: PropTypes.string,
      goalCreatorRoles: PropTypes.string,
      goalNumber: PropTypes.string,
    })
  ),
}

ReadOnlyGoalCollaborators.defaultProps = {
  collaborators: [],
}
