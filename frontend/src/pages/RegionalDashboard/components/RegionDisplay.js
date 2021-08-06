import React from 'react';
import PropTypes from 'prop-types';
import RegionalSelect from '../../../components/RegionalSelect';

export default function RegionDisplay({
  regions, onApplyRegion, hasCentralOffice, appliedRegion,
}) {
  return (
    <>
      {regions.length > 1
        && (
        <RegionalSelect
          regions={regions}
          onApply={onApplyRegion}
          hasCentralOffice={hasCentralOffice}
          appliedRegion={appliedRegion}
        />
        )}
    </>
  );
}

RegionDisplay.propTypes = {
  regions: PropTypes.arrayOf(PropTypes.number),
  onApplyRegion: PropTypes.func,
  hasCentralOffice: PropTypes.bool,
  appliedRegion: PropTypes.number.isRequired,
};

RegionDisplay.defaultProps = {
  regions: [],
  onApplyRegion: () => {},
  hasCentralOffice: false,
};
