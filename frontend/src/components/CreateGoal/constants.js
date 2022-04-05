import React from 'react';
import { v4 as uuidv4 } from 'uuid';

export const isValidUrl = (attempted) => {
  try {
    const u = new URL(attempted);
    return u !== '';
  } catch (e) {
    return false;
  }
};

export const SELECT_STYLES = {
  container: (provided, state) => {
    // To match the focus indicator provided by uswds
    const outline = state.isFocused ? '0.25rem solid #2491ff;' : '';
    return {
      ...provided,
      outline,
      padding: 0,
      height: 'auto',
    };
  },
  control: (provided, state) => {
    const selected = state.getValue();
    return {
      ...provided,
      background: state.isFocused || selected.length ? 'white' : 'transparent',
      border: 'none',
      borderRadius: 0,
      boxShadow: '0',
      // Match uswds disabled style
      opacity: state.isDisabled ? '0.7' : '1',
    };
  },
  indicatorsContainer: (provided) => ({
    ...provided,
    display: 'inline',
    // The arrow dropdown icon is too far to the right, this pushes it back to the left
    marginRight: '4px',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  menu: (provided) => ({
    ...provided,
    zIndex: 2,
  }),
  multiValue: (provided) => ({ ...provided }),
  multiValueLabel: (provided) => ({ ...provided }),
  valueContainer: (provided) => ({
    ...provided,
  }),
};

export const FORM_FIELD_INDEXES = {
  GRANTS: 0,
  NAME: 1,
  END_DATE: 2,
  OBJECTIVES: 3,
};

export const FORM_FIELD_DEFAULT_ERRORS = [<></>, <></>, <></>, []];

export const OBJECTIVE_DEFAULTS = (l) => ({
  title: '',
  topics: [],
  resources: [{ key: uuidv4(), value: '' }],
  id: `new${l}`,
  status: 'Not started',
});

export const OBJECTIVE_FORM_FIELD_INDEXES = {
  TITLE: 0,
  TOPICS: 1,
  RESOURCES: 2,
  STATUS: 3,
};

export const OBJECTIVE_DEFAULT_ERRORS = [<></>, <></>, <></>];
export const OBJECTIVE_ERROR_MESSAGES = [
  'Enter the TTA objective',
  'Select at least one topic',
  'Enter a valid link',
  'Select a status',
];

export const validateListOfResources = (resources) => {
  if (resources.length > 1 || (resources.length === 1 && resources[0].value)) {
    const allValidResources = resources.reduce((a, c) => {
      if (a) {
        return isValidUrl(c.value);
      }
      return a;
    }, true);

    return allValidResources;
  }

  return true;
};
