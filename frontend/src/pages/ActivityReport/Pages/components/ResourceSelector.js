import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

import { useFormContext, useFieldArray } from 'react-hook-form/dist/index.ie11';

import { Button, Textarea } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { faCircle } from '@fortawesome/free-regular-svg-icons';
import colors from '../../../../colors';

const ResourceSelector = ({ name, ariaName }) => {
  const { register, control, getValues } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  const canDelete = fields.length > 1;

  const onAddNewResource = () => {
    const allValues = getValues();
    const fieldArray = allValues[name] || [];
    const canAdd = fieldArray.every((field) => field.value !== '');
    if (canAdd) {
      append({ value: '' });
    }
  };

  useEffect(() => {
    if (fields.length === 0) {
      append({ value: '' });
    }
  }, [append, fields]);

  return (
    <>
      {fields.map((item, index) => (
        <div key={item.id} className="display-flex flex-align-center">
          <Textarea
            className="maxh-10 smart-hub--text-area__resize-vertical"
            name={`${name}[${index}].value`}
            type="text"
            defaultValue={item.value}
            inputRef={register()}
          />
          {canDelete && (
          <Button onClick={() => remove(index)} aria-label={`remove ${ariaName} ${index + 1}`} className="smart-hub--remove-resource padding-left-2" unstyled type="button">
            <FontAwesomeIcon color={colors.textInk} icon={faTrash} />
          </Button>
          )}
        </div>
      ))}
      <Button
        unstyled
        type="button"
        onClick={onAddNewResource}
      >
        <span className="fa-layers fa-fw">
          <FontAwesomeIcon color={colors.ttahubMediumBlue} size="lg" icon={faCircle} />
          <FontAwesomeIcon color={colors.ttahubMediumBlue} size="xs" icon={faPlus} />
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
