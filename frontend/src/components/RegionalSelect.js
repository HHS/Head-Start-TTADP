import React from 'react';
import PropTypes from 'prop-types';
import ButtonSelect from './ButtonSelect';

export const getRegionOptions = (regions) => regions.map((region) => ({ value: region, label: `Region ${region}` })).sort((a, b) => a.value - b.value);

function RegionalSelect(props) {
  const {
    regions,
    onApply,
    hasCentralOffice,
    appliedRegion,
    disabled,
    styleAsSelect,
  } = props;

  let options = [...getRegionOptions(regions)];

  if (hasCentralOffice) {
    options = [...getRegionOptions(regions), { label: 'All Regions', value: 14 }];
  }

  const initialValue = hasCentralOffice ? { label: 'All Regions', value: 14 } : options[0];

  return (
    <ButtonSelect
      disabled={disabled}
      options={options}
      onApply={onApply}
      initialValue={initialValue}
      labelId="regionSelect"
      labelText="Region Select Options"
      applied={appliedRegion}
      ariaName="regional select menu"
      styleAsSelect={styleAsSelect}
    />
  );
}

RegionalSelect.propTypes = {
  regions: PropTypes.arrayOf(PropTypes.number).isRequired,
  onApply: PropTypes.func.isRequired,
  hasCentralOffice: PropTypes.bool,
  appliedRegion: PropTypes.number,
  disabled: PropTypes.bool,
  styleAsSelect: PropTypes.bool,
};

RegionalSelect.defaultProps = {
  hasCentralOffice: false,
  appliedRegion: 0,
  disabled: false,
  styleAsSelect: false,
};

export default RegionalSelect;
