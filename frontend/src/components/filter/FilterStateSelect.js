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
  [
    { label: 'Massachusetts (MA)', value: 'MA' },
    { label: 'Maine (ME)', value: 'ME' },
    { label: 'Connecticut (CT)', value: 'CT' },
    { label: 'Rhode Island (RI)', value: 'RI' },
    { label: 'Vermont (VT)', value: 'VT' },
    { label: 'New Hampshire (NH)', value: 'NH' },
  ],
  // Region 2 States
  [
    { label: 'New York (NY)', value: 'NY' },
    { label: 'New Jersey (NJ)', value: 'NJ' },
    { label: 'Puerto Rico (PR)', value: 'PR' },
  ],
  // Region 3 States
  [
    { label: 'Pennsylvania (PA)', value: 'PA' },
    { label: 'West Virginia (WV)', value: 'WV' },
    { label: 'Maryland (MD)', value: 'MD' },
    { label: 'Delaware (DE)', value: 'DE' },
    { label: 'Virginia (VA)', value: 'VA' },
    { label: 'District of Columbia (DC)', value: 'DC' },
  ],
  // Region 4 States
  [
    { label: 'Kentucky (KY)', value: 'KY' },
    { label: 'Tennessee (TN)', value: 'TN' },
    { label: 'North Carolina (NC)', value: 'NC' },
    { label: 'Alabama (AL)', value: 'AL' },
    { label: 'Mississippi (MS)', value: 'MS' },
    { label: 'Georgia (GA)', value: 'GA' },
    { label: 'South Carolina (SC)', value: 'SC' },
    { label: 'Florida (FL)', value: 'FL' },
  ],
  // Region 5 States
  [
    { label: 'Minnesota (MN)', value: 'MN' },
    { label: 'Wisconsin (WI)', value: 'WI' },
    { label: 'Illinois (IL)', value: 'IL' },
    { label: 'Indiana (IN)', value: 'AL' },
    { label: 'Michigan (MI)', value: 'MI' },
    { label: 'Ohio (OH)', value: 'OH' },
  ],
  // Region 6 States
  [
    { label: 'New Mexico (NM)', value: 'NM' },
    { label: 'Oklahoma (OK)', value: 'OK' },
    { label: 'Arkansas (AR)', value: 'AR' },
    { label: 'Texas (TX)', value: 'TX' },
    { label: 'Louisiana (LA)', value: 'LA' },
  ],
  // Region 7 States
  [
    { label: 'Nebraska (NE)', value: 'NE' },
    { label: 'Iowa (IA)', value: 'IA' },
    { label: 'Kansas (KS)', value: 'KS' },
    { label: 'Missouri (MO)', value: 'MO' },
  ],
  // Region 8 States
  [
    { label: 'Montana (MT)', value: 'MT' },
    { label: 'North Dakota (ND)', value: 'ND' },
    { label: 'South Dakota (SD)', value: 'SD' },
    { label: 'Wyoming (WY)', value: 'WY' },
    { label: 'Utah (UT)', value: 'UT' },
    { label: 'Colorado (CO)', value: 'CO' },
  ],
  // Region 9 States
  [
    { label: 'Nevada (NV)', value: 'NV' },
    { label: 'California (CA)', value: 'CA' },
    { label: 'Arizona (AZ)', value: 'AZ' },
    { label: 'Hawaii (HI)', value: 'HI' },
    { label: 'Guam (GU)', value: 'GU' },
    { label: 'American Samoa (AS)', value: 'AS' },
    { label: 'Virgin Islands (VI)', value: 'VI' },
    { label: 'Northern Mariana Islands (MP)', value: 'MP' },
    { label: 'Federated States of Micronesia (FM)', value: 'FM' },
    { label: 'Marshall Islands (MH)', value: 'MH' },
    { label: 'Republic of Palau (PW)', value: 'PW' },
  ],
  // 'Region 10 States
  [
    { label: 'Washington (WA)', value: 'WA' },
    { label: 'Oregon (OR)', value: 'OR' },
    { label: 'Idaho (ID)', value: 'ID' },
    { label: 'Alaska (AK)', value: 'AK' },
  ],
];

const ALL_STATES_FLATTENED = ALL_STATES.flat();

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
          const response = await getStateCodes();
          codes = response.map((code) => {
            const found = ALL_STATES_FLATTENED.find((c) => c.value === code);
            if (found) {
              return found;
            }

            return {
              value: code,
              label: code,
            };
          });
        } catch (err) {
          codes = ALL_STATES_FLATTENED;
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

      codes = codes.sort((firstCode, secondCode) => {
        if (firstCode.value < secondCode.value) {
          return -1;
        }
        if (firstCode.value > secondCode.value) {
          return 1;
        }

        return 0;
      });

      // return list sorted alphabetically
      setStateCodes(codes);
    }

    // we're only fetching these once
    if (!stateCodes.length) {
      fetchStateCodes();
    }
  }, [stateCodes, user]);

  const onApplyClick = (selected) => {
    // console.log(selected);
    onApply(selected);
  };

  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select state to filter by"
      options={stateCodes}
      selectedValues={query}
      mapByValue
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
