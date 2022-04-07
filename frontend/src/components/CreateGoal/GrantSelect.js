import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import {
  FormGroup, Label,
} from '@trussworks/react-uswds';

import {
  SELECT_STYLES,
} from './constants';

export default function GrantSelect({
  error,
  selectedGrants,
  isOnReport,
  setSelectedGrants,
  possibleGrants,
  validateGrantNumbers,
}) {
  return (
    <FormGroup error={error.props.children}>
      <Label htmlFor="recipientGrantNumbers" className={isOnReport ? 'text-bold' : ''}>
        Recipient grant numbers
        {' '}
        <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>
      </Label>
      {selectedGrants.length === 1 || isOnReport ? (
        <span className="margin-bottom-1">{selectedGrants.map((grant) => grant.label).join(', ')}</span>
      ) : (
        <>
          {error}
          <Select
            placeholder=""
            inputId="recipientGrantNumbers"
            onChange={setSelectedGrants}
            options={possibleGrants}
            styles={SELECT_STYLES}
            components={{
              DropdownIndicator: null,
            }}
            className="usa-select"
            closeMenuOnSelect={false}
            value={selectedGrants}
            isMulti
            onBlur={validateGrantNumbers}
          />
        </>
      )}
    </FormGroup>
  );
}

GrantSelect.propTypes = {
  error: PropTypes.node.isRequired,
  selectedGrants: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  })).isRequired,
  isOnReport: PropTypes.bool.isRequired,
  setSelectedGrants: PropTypes.func.isRequired,
  possibleGrants: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  })).isRequired,
  validateGrantNumbers: PropTypes.func.isRequired,
};
