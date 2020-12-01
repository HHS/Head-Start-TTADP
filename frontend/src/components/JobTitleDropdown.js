import React from 'react';
import PropTypes from 'prop-types';
import {
  Label, Dropdown,
} from '@trussworks/react-uswds';

import { ROLES } from '../Constants';

function JobTitleDropdown({
  id, name, value, onChange,
}) {
  return (
    <>
      <Label htmlFor={id}>Role</Label>
      <Dropdown id={id} name={name} value={value} onChange={onChange}>
        <option name="default" disabled hidden value="default">Select a Job Title...</option>
        {ROLES.map((jobTitle) => (
          <option key={jobTitle} value={jobTitle}>{jobTitle}</option>
        ))}
      </Dropdown>
    </>
  );
}

JobTitleDropdown.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

JobTitleDropdown.defaultProps = {
  value: 'default',
};

export default JobTitleDropdown;
