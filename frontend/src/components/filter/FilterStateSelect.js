import React, { useMemo, useContext } from 'react';
import PropTypes from 'prop-types';
import FilterSelect from './FilterSelect';
import UserContext from '../../UserContext';
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

  const stateCodes = useMemo(() => {
    const allowedRegions = allRegionsUserHasPermissionTo(user);

    if (allowedRegions.includes(11) || allowedRegions.includes(12)) {
      return ALL_STATES.flat().sort();
    }

    const codes = Array.from(
      new Set(
        allowedRegions.reduce(
          (acc, curr) => {
            if (!ALL_STATES[curr - 1]) {
              return acc;
            }
            return [...acc, ...ALL_STATES[curr - 1]];
          }, [],
        ),
      ),
    );

    return codes.sort();
  }, [user]);

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
