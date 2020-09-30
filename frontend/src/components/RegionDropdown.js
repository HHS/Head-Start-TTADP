import React from 'react';
import PropTypes from 'prop-types';
import {
  Label, Dropdown,
} from '@trussworks/react-uswds';

import { REGIONS } from '../Constants';

function RegionDropdown({
  id, name, value, onChange, includeCentralOffice,
}) {
  return (
    <>
      <Label htmlFor={id}>Region</Label>
      <Dropdown id={id} name={name} value={value} onChange={onChange}>
        <option name="default" disabled hidden value="default">Select a region...</option>
        {REGIONS.map(({ number, name: description }) => (
          <option key={number} value={number}>{`${number} - ${description}`}</option>
        ))}
        {includeCentralOffice
        && <option name="central-office" value="co">Central Office</option>}
      </Dropdown>
    </>
  );
}

RegionDropdown.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  includeCentralOffice: PropTypes.bool,
};

RegionDropdown.defaultProps = {
  value: 'default',
  includeCentralOffice: false,
};

export default RegionDropdown;
