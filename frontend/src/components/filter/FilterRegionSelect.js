import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { Dropdown } from '@trussworks/react-uswds';
import UserContext from '../../UserContext';
import { getUserRegions } from '../../permissions';
import { DropdownMenuContext } from '../DropdownMenu';

export default function FilterRegionalSelect({ onApply, appliedRegion }) {
  const onApplyRegion = (e) => {
    const { target: { value } } = e;
    onApply(value);
  };

  const { user } = useContext(UserContext);
  const { onKeyDown } = useContext(DropdownMenuContext);
  const regions = getUserRegions(user);
  const hasCentralOffice = user && user.homeRegionId && user.homeRegionId === 14;

  return (
    <>
      { /* eslint-disable-next-line jsx-a11y/label-has-associated-control */ }
      <label className="sr-only" htmlFor="region">Select region to filter by</label>
      <Dropdown name="region" id="region" value={appliedRegion} onChange={onApplyRegion} onKeyDown={onKeyDown}>
        {regions.map((region) => (
          <option key={region} value={region}>
            Region
            {' '}
            {region}
          </option>
        ))}
        {hasCentralOffice
        && <option value="14">All regions</option>}
      </Dropdown>
    </>
  );
}

FilterRegionalSelect.propTypes = {
  onApply: PropTypes.func.isRequired,
  appliedRegion: PropTypes.string.isRequired,
};
