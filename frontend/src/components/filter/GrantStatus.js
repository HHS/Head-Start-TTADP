import React from 'react'
import PropTypes from 'prop-types'
import { Dropdown } from '@trussworks/react-uswds'

export function displayGrantsStatus(q) {
  if (q === 'active') {
    return 'Active'
  }

  if (q === 'inactive') {
    return 'Inactive'
  }

  if (q === 'interim-management-cdi') {
    return 'Interim management (CDI)'
  }

  return ''
}

export default function GrantStatus({ onApply, query, inputId }) {
  const onApplyTTAType = (e) => {
    const {
      target: { value },
    } = e
    onApply(value)
  }

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label className="usa-sr-only" htmlFor={inputId}>
        Select grant status to filter by
      </label>
      <Dropdown name={inputId} id={inputId} value={query} onChange={onApplyTTAType}>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="interim-management-cdi">Interim management (CDI)</option>
      </Dropdown>
    </>
  )
}

GrantStatus.propTypes = {
  onApply: PropTypes.func.isRequired,
  query: PropTypes.string.isRequired,
  inputId: PropTypes.string,
}

GrantStatus.defaultProps = {
  inputId: 'grantStatus',
}
