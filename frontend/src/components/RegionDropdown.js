import React from 'react';
import PropTypes from 'prop-types';
import {
  Label, Dropdown,
} from '@trussworks/react-uswds';

import { ALL_REGIONS, REGIONS } from '../Constants';

function RegionDropdown({
  id,
  name,
  value,
  onChange,
  includeCentralOffice,
  includeAll,
}) {
  return (
    <>
      <Label htmlFor={id}>Region</Label>
      <Dropdown id={id} name={name} value={value} onChange={onChange}>
        <option name="default" disabled hidden value={0}>Select a region...</option>
        {REGIONS.map((number) => (
          <option key={number} value={number}>{number}</option>
        ))}
        {includeCentralOffice
        && <option name="central-office" value={14}>Central Office</option>}
        {includeAll
        && <option name="central-office" value={ALL_REGIONS}>All</option>}
      </Dropdown>
    </>
  );
}

RegionDropdown.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.number,
  onChange: PropTypes.func.isRequired,
  includeCentralOffice: PropTypes.bool,
  includeAll: PropTypes.bool,
};

RegionDropdown.defaultProps = {
  value: 0,
  includeCentralOffice: false,
  includeAll: false,
};

export default RegionDropdown;
