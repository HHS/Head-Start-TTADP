import React from 'react'
import { isArray } from 'lodash'
import PropTypes from 'prop-types'
import { Dropdown } from '@trussworks/react-uswds'

export function mapDisplayValue(value) {
  const valueToMape = isArray(value) ? value[0] : value
  if (valueToMape === 'single-recipient') {
    return 'Single recipient reports'
  }

  if (valueToMape === 'multi-recipients') {
    return 'Multiple recipient reports'
  }
  return ''
}

export default function FilterSingleOrMultiRecipientsSelect({ onApply, inputId, query }) {
  const onApplySingleOrMulti = (e) => {
    const {
      target: { value },
    } = e
    onApply(value)
  }

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label className="usa-sr-only" htmlFor={inputId}>
        Select single or multiple recipients to filter by
      </label>
      <Dropdown name={inputId} id={inputId} value={query} onChange={onApplySingleOrMulti}>
        <option value="single-recipient">Single recipient reports</option>
        <option value="multi-recipients">Multiple recipient reports</option>
      </Dropdown>
    </>
  )
}

FilterSingleOrMultiRecipientsSelect.propTypes = {
  onApply: PropTypes.func.isRequired,
  query: PropTypes.string.isRequired,
  inputId: PropTypes.string,
}

FilterSingleOrMultiRecipientsSelect.defaultProps = {
  inputId: 'singleOrMultiRecipientsFilter',
}
