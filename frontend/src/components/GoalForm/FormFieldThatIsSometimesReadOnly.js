import React from 'react'
import PropTypes from 'prop-types'
import ReadOnlyField from '../ReadOnlyField'
import FormFieldThatIsSometimesReadOnlyContext from '../../FormFieldThatIsSometimesReadOnlyContext'

/**
 *
  @param {Array} permissions - An array of booleans that determine if the field should be read only
  Conditionally displays a form field as read only based on the
  permissions prop that's passed in (any boolean, does not refer
  to a user's permissions, but the permission to display a form field)

  @param {String} label - The label for the read-only form field
  @param {String} value - The value to display if the field is read only

  @param {Node} children - The form field to display if the field is not read only

  @returns {Node} - The form field to display
 */

const FormFieldThatIsSometimesReadOnlyProvider = ({ readOnly, children }) => (
  <FormFieldThatIsSometimesReadOnlyContext.Provider value={{ readOnly }}>{children}</FormFieldThatIsSometimesReadOnlyContext.Provider>
)

FormFieldThatIsSometimesReadOnlyProvider.propTypes = {
  readOnly: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
}

export default function FormFieldThatIsSometimesReadOnly({ permissions, label, value, children }) {
  const readOnly = !permissions.every((p) => Boolean(p))

  if (readOnly) {
    return (
      <FormFieldThatIsSometimesReadOnlyProvider readOnly={readOnly}>
        <ReadOnlyField label={label}>{value}</ReadOnlyField>
      </FormFieldThatIsSometimesReadOnlyProvider>
    )
  }

  return <FormFieldThatIsSometimesReadOnlyProvider readOnly={readOnly}>{children}</FormFieldThatIsSometimesReadOnlyProvider>
}

FormFieldThatIsSometimesReadOnly.propTypes = {
  permissions: PropTypes.arrayOf(PropTypes.bool).isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  children: PropTypes.node.isRequired,
}
