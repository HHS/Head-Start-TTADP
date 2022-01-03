import React, { useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Dropdown } from '@trussworks/react-uswds';
import UserContext from '../../UserContext';
import { getUserRegions } from '../../permissions';

export default function FilterRegionalSelect({ onApply, appliedRegion }) {
  const onApplyRegion = (e) => {
    const { target: { value } } = e;
    onApply(value);
  };

  const { user } = useContext(UserContext);

  const regions = getUserRegions(user);
  const firstRegion = user.homeRegionId || regions[0];

  /**
   * I'm Helping
   *
   * by making sure a region is selected
   */
  useEffect(() => {
    if (!appliedRegion && firstRegion) {
      onApplyRegion({
        target: {
          value: firstRegion.toString(),
        },
      });
    }
  });

  return (
    <>
      { /* eslint-disable-next-line jsx-a11y/label-has-associated-control */ }
      <label className="sr-only" htmlFor="region">Select region to filter by</label>
      <Dropdown name="region" id="region" value={appliedRegion} onChange={onApplyRegion}>
        {regions.map((region) => (
          <option key={region} value={region}>
            Region
            {' '}
            {region}
          </option>
        ))}
      </Dropdown>
    </>
  );
}

FilterRegionalSelect.propTypes = {
  onApply: PropTypes.func.isRequired,
  appliedRegion: PropTypes.string.isRequired,
};
