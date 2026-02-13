import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { Link } from 'react-router-dom'
import { useFormContext } from 'react-hook-form'
import { Editor } from 'react-draft-wysiwyg'
import ExternalLink from '../../../../components/ExternalResourceModal'
import { isValidURL, isExternalURL, isInternalGovernmentLink, getEditorState } from '../../../../utils'

const noneProvided = 'None provided'

export const mapUrlValue = (v) => {
  const labelMap = {
    recipient: 'Recipient',
    regionalOffice: 'Regional Office',
    'other-entity': 'Other entity',
    'technical-assistance': 'Technical assistance',
    training: 'Training',
    'in-person': 'In Person',
    virtual: 'Virtual',
    hybrid: 'Hybrid',
  }
  const result = labelMap[v] || v
  return result
}

const ReviewItem = ({ label, name, path, sortValues, customValue, linkNamePath, isFile, isRichText, commaSeparateArray }) => {
  const { watch } = useFormContext()
  let value = null
  let values = []
  let linkNameValues = []
  // Typically we pull values from the form context.
  // However, in some cases we may want to pass in a custom ordering of values
  // to display like goals or objectives.
  if (!customValue) {
    // Takes from form context.
    value = watch(name)
    values = value
  } else {
    // Use the custom value passed in.
    value = customValue[name]
    values = value
  }

  // If we don't have a value set none provided.
  if ((!value && !values) || (Array.isArray(values) && !values.length) || (value && typeof value === 'string' && value.trim() === '<p></p>')) {
    values = [noneProvided]
    value = noneProvided
  }

  if (!Array.isArray(value)) {
    values = [value]
  }

  if (linkNamePath) {
    linkNameValues = values.map((v) => _.get(v, linkNamePath))
    if (!Array.isArray(linkNameValues)) {
      linkNameValues = [linkNameValues]
    }
  }
  if (path) {
    values = values.map((v) => _.get(v, path))
    // If values has no length or only contains undefined values set to none provided..
    if (!values.length || values.every((v) => v === undefined)) {
      values = [noneProvided]
    }
  }

  if (sortValues) {
    values.sort()
  }

  if (values.length === 0 || values[0] === undefined) {
    values[0] = 'None provided'
  }

  values = values.map((v, index) => {
    // If not a valid url, then its most likely just text, so leave it as is
    // except for several values
    if (!isValidURL(v)) {
      if (isRichText) {
        return <Editor readOnly toolbarHidden defaultEditorState={getEditorState(v)} ariaLabel={label} />
      }
      return mapUrlValue(v)
    }

    const linkNameToUse = linkNamePath ? linkNameValues[index] : v
    if (isFile) {
      return (
        <a href={v} target="_blank" rel="noreferrer">
          {linkNameToUse}
        </a>
      )
    }
    if (isExternalURL(v) || isInternalGovernmentLink(v)) {
      return <ExternalLink to={v}>{linkNameToUse}</ExternalLink>
    }

    const localLink = new URL(v)
    return <Link to={localLink.pathname}>{linkNameToUse}</Link>
  })

  const emptySelector = value && value !== noneProvided ? '' : 'smart-hub-review-item--empty'
  const classes = ['margin-top-1', emptySelector].filter((x) => x !== '').join(' ')

  return (
    <div className={`grid-row grid-gap ${classes} margin-bottom-3 desktop:margin-bottom-0`}>
      <div className="grid-col-12 desktop:grid-col-6 print:grid-col-6  font-sans-2xs desktop:font-sans-sm text-bold">{label}</div>
      <div className="grid-col-12 desktop:grid-col-6 print:grid-col-6">
        {commaSeparateArray ? (
          <div aria-label={label} className="desktop:flex-align-end display-flex flex-column flex-justify-center">
            {values.map((v) => (Number.isNaN(v) ? '' : v)).join(', ')}
          </div>
        ) : (
          values.map((v, index) => (
            <div
              aria-label={`${label} ${index + 1}`}
              key={`${label}${v}`}
              className="desktop:flex-align-end display-flex flex-column flex-justify-center resource-link-wrapper"
            >
              {Number.isNaN(v) ? '' : v}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

ReviewItem.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  path: PropTypes.string,
  sortValues: PropTypes.bool,
  // This will be object like { [fieldName]: value }, so
  // we don't know the keys and types in advance
  // eslint-disable-next-line react/forbid-prop-types
  customValue: PropTypes.object,
  linkNamePath: PropTypes.string,
  isFile: PropTypes.bool,
  isRichText: PropTypes.bool,
  commaSeparateArray: PropTypes.bool,
}

ReviewItem.defaultProps = {
  path: '',
  sortValues: false,
  customValue: null,
  linkNamePath: null,
  isFile: false,
  isRichText: false,
  commaSeparateArray: false,
}

export default ReviewItem
