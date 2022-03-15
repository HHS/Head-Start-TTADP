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

      overflow: state.isFocused ? 'visible' : 'hidden',
      position: !state.isFocused ? 'absolute' : 'relative',
      top: 0,
      left: 0,
      right: 0,
      bottom: state.isFocused && selected.length ? 'auto' : 0,
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
    maxHeight: '100%',
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
  text: '',
  topics: [],
  resources: [{ key: uuidv4(), value: '' }],
  id: `new${l}`,
});

export const OBJECTIVE_FORM_FIELD_INDEXES = {
  TEXT: 0,
  TOPICS: 1,
  RESOURCES: 2,
};

export const OBJECTIVE_DEFAULT_ERRORS = [<></>, <></>, <></>];
export const OBJECTIVE_ERROR_MESSAGES = [
  'Please enter objective text',
  'Please select at least one topic',
  'Please enter only valid URLs',
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
