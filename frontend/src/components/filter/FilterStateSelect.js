import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import FilterSelect from './FilterSelect';
import UserContext from '../../UserContext';
import { getStateCodes } from '../../fetchers/users';
import { allRegionsUserHasPermissionTo } from '../../permissions';

// List of states, by region
// see: https://www.acf.hhs.gov/oro/regional-offices
const ALL_STATES = [
  // Region 1 States
  ['MA', 'ME', 'CT', 'RI', 'VT', 'NH'],
  // Region 2 States
  ['NY', 'NJ', 'PR'],
  // Region 3 States
  ['PA', 'WV', 'MD', 'DE', 'VA', 'DC'],
  // Region 4 States
  ['KY', 'TN', 'NC', 'AL', 'MS', 'GA', 'SC', 'FL'],
  // Region 5 States
  ['MN', 'WI', 'IL', 'IN', 'MI', 'OH'],
  // Region 6 States
  ['NM', 'OK', 'AR', 'TX', 'LA'],
  // Region 7 States
  ['NE', 'IA', 'KS', 'MO'],
  // Region 8 States
  ['MT', 'ND', 'SD', 'WY', 'UT', 'CO'],
  // Region 9 States
  ['NV', 'CA', 'AZ', 'HI', 'GU', 'AS', 'VI', 'MP', 'FM', 'MH', 'PW'],
  // 'Region 10 States
  ['WA', 'OR', 'ID', 'AK'],
];
export default function FilterStateSelect({
  onApply,
  inputId,
  query,
}) {
  const { user } = useContext(UserContext);
  const [stateCodes, setStateCodes] = useState([]);

  useEffect(() => {
    async function fetchStateCodes() {
      const allowedRegions = allRegionsUserHasPermissionTo(user);

      let codes = [];

      // if we've permissions in region 11 or 12, we have to manually
      // build the list of state codes for our user
      if (allowedRegions.includes(11) || allowedRegions.includes(12)) {
        try {
          codes = await getStateCodes();
        } catch (err) {
          codes = ALL_STATES.flat();
        }
      }

      // and then, just in case they have permissions to other regions,
      // we loop through and add to the list
      codes = [...codes, ...Array.from(
        new Set(
          allowedRegions.reduce(
            (acc, curr) => {
              if (curr === 11 || curr === 12) {
                // we've already handled these in the fetch above
                return acc;
              }

              if (!ALL_STATES[curr - 1]) {
                return acc;
              }
              return [...acc, ...ALL_STATES[curr - 1]];
            }, [],
          ),
        ),
      )];

      // de-dupe state codes
      codes = Array.from(new Set(codes));

      // return list sorted alphabetically
      setStateCodes(codes.sort());
    }

    // we're only fetching these once
    if (!stateCodes.length) {
      fetchStateCodes();
    }
  }, [stateCodes, user]);

  const options = stateCodes.map((label, value) => ({
    value, label,
  }));

  const onApplyClick = (selected) => {
    onApply(selected);
  };

  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select state to filter by"
      options={options}
      selectedValues={query}
    />
  );
}

FilterStateSelect.propTypes = {
  inputId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
  query: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.string,
  ]).isRequired,
};
