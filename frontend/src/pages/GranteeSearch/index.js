import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import RegionalSelect from '../../components/RegionalSelect';
import { getUserRegions } from '../../permissions';
import { searchGrantees } from '../../fetchers/grantee';
import './index.css';

function GranteeSearch({ user }) {
  const hasCentralOffice = user && user.homeRegionId && user.homeRegionId === 14;
  const regions = getUserRegions(user);

  // eslint-disable-next-line max-len
  const [appliedRegion, setAppliedRegion] = useState(hasCentralOffice ? 14 : regions[0]);
  const [query, setQuery] = useState('');
  const [granteeResults, setGranteeResults] = useState([]);

  function onApplyRegion(region) {
    setAppliedRegion(region.value);
  }

  async function onSubmit(e) {
    e.preventDefault();

    if (!query) {
      return;
    }

    const results = await searchGrantees(query, appliedRegion);
    setGranteeResults(results);
  }

  return (
    <>
      <Helmet>
        <title>Grantee Records Search</title>
      </Helmet>
      <div className="ttahub-grantee-search">
        <h1 className="landing">Grantee Records</h1>
        <Grid className="ttahub-grantee-search--filter-row flex-fill display-flex flex-align-center flex-align-self-center flex-row flex-wrap margin-bottom-2">
          {regions.length > 1
              && (
                <div className="margin-right-2">
                  <RegionalSelect
                    regions={regions}
                    onApply={onApplyRegion}
                    hasCentralOffice={hasCentralOffice}
                    appliedRegion={appliedRegion}
                  />
                </div>
              )}
          <form role="search" className="ttahub-grantee-search--search-form display-flex" onSubmit={onSubmit}>
            <input type="search" name="search" value={query} className="ttahub-grantee-search--search-input" onChange={(e) => setQuery(e.target.value)} />
            <button type="submit" className="ttahub-grantee-search--submit-button usa-button">
              <FontAwesomeIcon color="white" icon={faSearch} />
              {' '}
              <span className="sr-only">Search for matching grantees</span>
            </button>
          </form>
        </Grid>
        <div>
          {granteeResults.map((grantee) => <h1>{grantee.name}</h1>)}
        </div>
      </div>
    </>
  );
}

export default GranteeSearch;

GranteeSearch.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.arrayOf(PropTypes.string),
    homeRegionId: PropTypes.number,
    permissions: PropTypes.arrayOf(PropTypes.shape({
      userId: PropTypes.number,
      scopeId: PropTypes.number,
      regionId: PropTypes.number,
    })),
  }),
};

GranteeSearch.defaultProps = {
  user: null,
};
