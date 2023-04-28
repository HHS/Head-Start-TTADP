/* eslint-disable import/prefer-default-export */
import React from 'react';
import ConditionalMultiselect from './ConditionalMultiselect';

export const FIELD_DICTIONARY = {
  multiselect: {
    render: (field, validations, value = [], isOnReport) => (
      <ConditionalMultiselect
        fieldData={field}
        validations={validations}
        fieldName={field.title.replace(/\s/g, '-').toLowerCase()}
        defaultValue={value}
        isOnReport={isOnReport}
      />
    ),
  },
};
