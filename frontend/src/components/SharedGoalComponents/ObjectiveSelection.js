import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Controller, useFormContext } from 'react-hook-form';
import Select from 'react-select';
import { Button, Textarea } from '@trussworks/react-uswds';
import FormItem from '../FormItem';
import selectOptionsReset from '../selectOptionsReset';
import { CREATE_A_NEW_OBJECTIVE } from './constants';

const ObjectiveTextArea = ({ fieldName, index, fieldValue }) => {
  const { register } = useFormContext();
  return (
    <Textarea
      name={`${fieldName}[${index}].value`}
      id={`${fieldName}[${index}].value`}
      className="margin-bottom-1"
      inputRef={register()}
      defaultValue={fieldValue}
      required
    />
  );
};

ObjectiveTextArea.propTypes = {
  fieldName: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  fieldValue: PropTypes.string,
};

ObjectiveTextArea.defaultProps = {
  fieldValue: '',
};

export default function ObjectiveSelection({
  field,
  index,
  remove,
  fieldName,
  objectiveOptions,
}) {
  const { setValue, register, watch } = useFormContext();

  const selectedObjectives = watch(fieldName);
  const selectedObjectiveTitles = useMemo(() => (
    selectedObjectives
      .map((o) => o.label)
      .filter((label) => label && label !== CREATE_A_NEW_OBJECTIVE)
  ), [selectedObjectives]);
  const fieldLabel = watch(`${fieldName}[${index}].label`);
  const fieldValue = watch(`${fieldName}[${index}].value`);

  const filteredOptions = objectiveOptions.filter((option) => {
    // Always show "Create a new objective"
    if (option.label === CREATE_A_NEW_OBJECTIVE) {
      return true;
    }

    // Always show the currently selected option for this field
    if (option.label === fieldLabel) {
      return true;
    }

    // Hide options that are selected in other fields
    return !selectedObjectiveTitles.includes(option.label);
  });

  useEffect(() => {
    if (fieldLabel) {
      if (fieldLabel === CREATE_A_NEW_OBJECTIVE) {
        // eslint-disable-next-line max-len
        const isExistingObjective = objectiveOptions.some((option) => option.label !== CREATE_A_NEW_OBJECTIVE && option.label === fieldValue);
        if (isExistingObjective) {
          setValue(`${fieldName}[${index}].value`, '');
        }
      } else {
        setValue(`${fieldName}[${index}].value`, fieldLabel);
      }
    }
  }, [fieldLabel, fieldName, index, setValue, objectiveOptions, fieldValue]);

  const onlyCreateNew = (
    filteredOptions.length === 1
    && filteredOptions[0].label === CREATE_A_NEW_OBJECTIVE
  );

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
      <input
        type="hidden"
        name={`${fieldName}[${index}].value`}
        id={`${fieldName}[${index}].value`}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...register(`${fieldName}[${index}].value`)}
        defaultValue={field.value}
      />
      <div>
        {(!onlyCreateNew) && (
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
                placeholder="- Select -"
                options={filteredOptions}
                styles={selectOptionsReset}
                value={value ? { label: value, value } : null}
                onChange={(v) => {
                  setValue(`${fieldName}[${index}].objectiveId`, v.objectiveId);
                  onChange(v.label);
                }}
                required
              />
            )}
          />
        </FormItem>
        )}
        {(fieldLabel === CREATE_A_NEW_OBJECTIVE && !onlyCreateNew) && (
        <ObjectiveTextArea
          index={index}
          fieldName={fieldName}
          fieldValue={field.value}
        />
        )}
        {onlyCreateNew && (
        <FormItem
          label="TTA objective"
          name={`${fieldName}[${index}].value`}
        >
          <ObjectiveTextArea
            index={index}
            fieldName={fieldName}
            fieldValue={field.value}
          />
        </FormItem>
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
