import React, { useState } from 'react'
import useDeepCompareEffect from 'use-deep-compare-effect'
import PropTypes from 'prop-types'
import ConditionalMultiselect from './ConditionalMultiselect'
import CONDITIONAL_FIELD_CONSTANTS from './condtionalFieldConstants'

const { updateRefToInitialValues } = CONDITIONAL_FIELD_CONSTANTS

export const FIELD_DICTIONARY = {
  multiselect: {
    render: ({ error, field, validations, value, onChange, onBlur, userCanEdit }) => (
      <ConditionalMultiselect
        fieldData={field}
        validations={validations}
        fieldName={field.title.replace(/\s/g, '-').toLowerCase()}
        fieldValue={value}
        userCanEdit={userCanEdit}
        onBlur={onBlur}
        onChange={onChange}
        error={error}
        key={`conditional-multiselect-${field.title.replace(/\s/g, '-').toLowerCase()}`}
      />
    ),
  },
}

export default function ConditionalFields({ prompts, setPrompts, validatePrompts, errors, userCanEdit }) {
  const [initialValues, setInitialValues] = useState([])

  useDeepCompareEffect(() => {
    const newPromptValues = updateRefToInitialValues(initialValues, prompts)

    // save the new prompts to initialValues
    setInitialValues(newPromptValues)
  }, [prompts, initialValues])

  if (!prompts) {
    return null
  }

  return (
    <div>
      {prompts.map((prompt) => {
        const field = FIELD_DICTIONARY[prompt.fieldType]
        if (!field) {
          return null
        }

        const validationsAndCompletions = CONDITIONAL_FIELD_CONSTANTS[prompt.fieldType]
        const rules = validationsAndCompletions.transformValidationsIntoRules(prompt.validations)

        const onChange = (updatedValue) => {
          const newPrompts = [...prompts.map((p) => ({ ...p }))]
          const promptToUpdate = newPrompts.find((p) => p.title === prompt.title)
          promptToUpdate.response = updatedValue
          setPrompts(newPrompts)
        }

        // on blur should be returning the current value so that we can validate it
        const onBlur = (newSelections) => {
          Object.keys(rules.validate).every((rule) => {
            const validation = rules.validate[rule](newSelections)
            if (validation !== true) {
              validatePrompts(prompt.title, true, validation)
              return false
            }
            validatePrompts(prompt.title, false, '')
            return validation
          })
        }

        const fieldData = {
          error: errors[prompt.title] || <></>,
          field: prompt,
          validations: {},
          value: prompt.response,
          onChange,
          onBlur,
          userCanEdit,
        }

        return field.render(fieldData)
      })}
    </div>
  )
}

ConditionalFields.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  errors: PropTypes.object.isRequired, // we don't know the keys or values of this object
  prompts: PropTypes.arrayOf(
    PropTypes.shape({
      fieldType: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
    })
  ).isRequired,
  setPrompts: PropTypes.func.isRequired,
  validatePrompts: PropTypes.func.isRequired,
  userCanEdit: PropTypes.bool,
}

ConditionalFields.defaultProps = {
  userCanEdit: false,
}
