import React, { useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import { Controller, useFormContext } from 'react-hook-form'
import Select from 'react-select'
import { Button, Label, Textarea } from '@trussworks/react-uswds'
import FormItem from '../FormItem'
import selectOptionsReset from '../selectOptionsReset'
import { CREATE_A_NEW_OBJECTIVE } from './constants'

const ObjectiveTextArea = ({ fieldName, index, defaultValue }) => {
  const { register } = useFormContext()
  return (
    <Textarea
      name={`${fieldName}[${index}].value`}
      id={`${fieldName}[${index}].value`}
      className="margin-bottom-1"
      inputRef={register()}
      defaultValue={defaultValue}
      required
    />
  )
}

ObjectiveTextArea.propTypes = {
  fieldName: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  defaultValue: PropTypes.string,
}

ObjectiveTextArea.defaultProps = {
  defaultValue: '',
}

export default function ObjectiveSelection({ field, index, remove, fieldName, objectiveOptions }) {
  const { setValue, register, watch } = useFormContext()

  const selectedObjectives = watch(fieldName)
  const selectedObjectiveTitles = useMemo(() => {
    const titles = []
    selectedObjectives.forEach((obj, idx) => {
      // Skip the current field to avoid self-filtering
      if (idx === index) return

      // Only consider preset objectives that are actually selected (not "Create a new objective")
      if (obj.label && obj.label !== CREATE_A_NEW_OBJECTIVE) {
        titles.push(obj.label)
      }
    })
    return titles
  }, [selectedObjectives, index])

  const fieldLabel = watch(`${fieldName}[${index}].label`)
  const fieldValue = watch(`${fieldName}[${index}].value`)

  const filteredOptions = useMemo(
    () =>
      objectiveOptions.filter((option) => {
        // Always show "Create a new objective"
        if (option.label === CREATE_A_NEW_OBJECTIVE) {
          return true
        }

        // Always show the currently selected option for this field
        if (option.label === fieldLabel) {
          return true
        }

        // Hide options that are selected in other fields
        return !selectedObjectiveTitles.includes(option.label)
      }),
    [fieldLabel, objectiveOptions, selectedObjectiveTitles]
  )

  const onlyCreateNew = useMemo(() => filteredOptions.length === 1 && filteredOptions[0].label === CREATE_A_NEW_OBJECTIVE, [filteredOptions])

  useEffect(() => {
    if (onlyCreateNew) {
      setValue(`${fieldName}[${index}].label`, CREATE_A_NEW_OBJECTIVE)
    }
  }, [fieldName, index, onlyCreateNew, setValue])

  return (
    <div key={field.id}>
      <input
        type="hidden"
        name={`${fieldName}[${index}].objectiveId`}
        id={`${fieldName}[${index}].objectiveId`}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...register(`${fieldName}[${index}].objectiveId`)}
        defaultValue={field.objectiveId}
      />
      <div>
        <FormItem label="Select TTA objective" name={`${fieldName}[${index}].label`} className={onlyCreateNew ? 'display-none' : ''}>
          <Controller
            name={`${fieldName}[${index}].label`}
            defaultValue={null}
            render={({ value, onChange }) => (
              <Select
                className="usa-select margin-bottom-1"
                placeholder="- Select -"
                options={filteredOptions}
                styles={selectOptionsReset}
                value={value ? { label: value, value } : null}
                onChange={(v) => {
                  setValue(`${fieldName}[${index}].objectiveId`, v.objectiveId)
                  onChange(v.label)
                }}
                required
              />
            )}
          />
        </FormItem>
        <Label className={onlyCreateNew ? '' : 'usa-sr-only'} htmlFor={`${fieldName}[${index}].value`}>
          TTA objective
        </Label>

        {(fieldLabel === CREATE_A_NEW_OBJECTIVE || onlyCreateNew) && (
          <ObjectiveTextArea index={index} fieldName={fieldName} defaultValue={fieldValue || field.value} />
        )}
        <Button
          type="button"
          unstyled
          onClick={() => {
            remove(index)
          }}
        >
          Remove this objective
        </Button>
      </div>
    </div>
  )
}

ObjectiveSelection.propTypes = {
  field: PropTypes.shape({
    id: PropTypes.string,
    objectiveId: PropTypes.number,
    label: PropTypes.string,
    onAR: PropTypes.bool,
    value: PropTypes.string,
  }).isRequired,
  fieldName: PropTypes.string.isRequired,
  remove: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
  objectiveOptions: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string,
      label: PropTypes.string,
    })
  ).isRequired,
}
