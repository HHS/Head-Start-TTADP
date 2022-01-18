import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import FilterSelect from './FilterSelect';
import UserContext from '../../UserContext';
import { getStateCodes } from '../../fetchers/users';
import { allRegionsUserHasPermissionTo } from '../../permissions';

const ALL_STATES = [
  ['MA', 'ME', 'CT', 'RI', 'VT', 'NH'],
  ['NY', 'NJ', 'PR'],
  ['PA', 'WV', 'MD', 'DE', 'VA'],
  ['KY', 'TN', 'NC', 'AL', 'MS', 'GA', 'SC', 'FL'],
  ['MN', 'WI', 'IL', 'IN', 'MI', 'OH'],
  ['NM', 'OK', 'AR', 'TX', 'LA'],
  ['NE', 'IA', 'KS', 'MO'],
  ['MT', 'ND', 'SD', 'WY', 'UT', 'CO'],
  ['NV', 'CA', 'AZ', 'HI', 'GU', 'AS', 'VI', 'MP'],
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

      if (allowedRegions.includes(11) || allowedRegions.includes(12)) {
        try {
          codes = await getStateCodes();
        } catch (err) {
          codes = ALL_STATES.flat();
        }
      }

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

      codes.sort();

      setStateCodes(codes);
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
