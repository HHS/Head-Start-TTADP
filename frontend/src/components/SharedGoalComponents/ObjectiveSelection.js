import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Controller, useFormContext } from 'react-hook-form';
import Select from 'react-select';
import { Button, Textarea } from '@trussworks/react-uswds';
import ReadOnlyField from '../ReadOnlyField';
import FormItem from '../FormItem';
import selectOptionsReset from '../selectOptionsReset';
import { CREATE_A_NEW_OBJECTIVE } from './constants';

export default function ObjectiveSelection({
  field,
  index,
  remove,
  fieldName,
  objectiveOptions,
}) {
  const { setValue, register, watch } = useFormContext();
  const isReadOnly = field.onAR === true;

  const selectedObjectives = watch(fieldName);
  const selectedObjectiveTitles = useMemo(() => (
    selectedObjectives.map((o) => o.label)
  ), [selectedObjectives]);
  const fieldLabel = watch(`${fieldName}[${index}].label`);

  const filteredOptions = objectiveOptions.filter((option) => {
    if (option.label === fieldLabel) {
      return true;
    }

    // console.log(selectedObjectiveTitles, fieldLabel, !selectedObjectiveTitles.includes(fieldLabel));

    return selectedObjectiveTitles.includes(fieldLabel);
  });

  return (
    <div key={field.id}>
      <div hidden={!isReadOnly}>
        <ReadOnlyField
          label="TTA objective"
        >
          {field.value}
        </ReadOnlyField>
        {
            (field.onAR === false) && (
            <Button
              type="button"
              className="margin-top-1"
              unstyled
              onClick={() => {
                remove(index);
              }}
            >
              Remove this objective
            </Button>
            )
        }
      </div>
      <input
        type="hidden"
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...register(`${fieldName}[${index}].objectiveId`)}
        defaultValue={field.objectiveId}
      />
      <input
        type="hidden"
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...register(`${fieldName}[${index}].value`)}
        defaultValue={field.objectiveId}
      />
      <div hidden={isReadOnly}>
        <FormItem
          label="Select TTA objective"
          name={`${fieldName}[${index}].label`}
        >
          <Controller
            name={`${fieldName}[${index}].label`}
            defaultValue={null}
            render={({ value, onChange }) => (
              <Select
                className="usa-select margin-bottom-1"
                options={filteredOptions}
                styles={selectOptionsReset}
                value={{ label: value, value }}
                onChange={(v) => {
                  setValue(`${fieldName}[${index}].value`, v.value);
                  setValue(`${fieldName}[${index}].objectiveId`, v.objectiveId);
                  onChange(v.label);
                }}
                required
              />
            )}
          />
          {fieldLabel === CREATE_A_NEW_OBJECTIVE && (
          <Textarea
            name={`${fieldName}[${index}].value`}
            id={`${fieldName}[${index}].value`}
            className="margin-bottom-1"
            inputRef={register()}
            defaultValue={field.value}
            required
          />
          )}
          <Button
            type="button"
            unstyled
            onClick={() => {
              remove(index);
            }}
          >
            Remove this objective
          </Button>
        </FormItem>
      </div>
    </div>

  );
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
  objectiveOptions: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string,
    label: PropTypes.string,
  })).isRequired,
};
