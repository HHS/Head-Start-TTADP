import React from 'react';
import PropTypes from 'prop-types';

import { useFormContext, useFieldArray } from 'react-hook-form';

import { Button, TextInput } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { faCircle } from '@fortawesome/free-regular-svg-icons';

const ResourceSelector = ({ name, ariaName }) => {
  const { register, control, getValues } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  const canDelete = fields.length > 1;

  return (
    <>
      {fields.map((item, index) => (
        <div key={item.id} className="display-flex flex-align-center">
          <TextInput
            name={`${name}[${index}].value`}
            type="text"
            defaultValue={item.value}
            inputRef={register()}
          />
          {canDelete && (
          <Button onClick={() => remove(index)} aria-label={`remove ${ariaName} ${index + 1}`} className="smart-hub--remove-resource" unstyled type="button">
            <FontAwesomeIcon color="black" icon={faTrash} />
          </Button>
          )}
        </div>
      ))}
      <Button
        unstyled
        type="button"
        onClick={() => {
          const allValues = getValues();
          const fieldArray = allValues[name] || [];
          const canAdd = fieldArray.every((field) => field.value !== '');
          if (canAdd) {
            append({ value: '' });
          }
        }}
      >
        <span className="fa-layers fa-fw">
          <FontAwesomeIcon color="#0166ab" size="lg" icon={faCircle} />
          <FontAwesomeIcon color="#0166ab" size="xs" icon={faPlus} />
        </span>
        <span className="margin-left-1">
          Add New Resource
        </span>
      </Button>
    </>
  );
};

ResourceSelector.propTypes = {
  name: PropTypes.string.isRequired,
  ariaName: PropTypes.string.isRequired,
};

export default ResourceSelector;
