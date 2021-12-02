import React from 'react';
import PropTypes from 'prop-types';
import RegionalSelect from '../RegionalSelect';
import UserContext from '../../UserContext';
import { getUserRegions } from '../../permissions';

export default function FilterRegionalSelect({ onApply, appliedRegion }) {
  const onApplyRegion = (option) => {
    const { value } = option;
    onApply(value);
  };

  return (
    <UserContext.Consumer>
      {(data) => {
        const { user } = data;
        const regions = getUserRegions(user);
        const hasCentralOffice = user && user.homeRegionId && user.homeRegionId === 14;

        return (
          <RegionalSelect
            regions={regions}
            onApply={onApplyRegion}
            hasCentralOffice={hasCentralOffice}
            appliedRegion={appliedRegion}
            styleAsSelect
          />
        );
      }}
    </UserContext.Consumer>
  );
}

FilterRegionalSelect.propTypes = {
  onApply: PropTypes.func.isRequired,
  appliedRegion: PropTypes.number.isRequired,
};
