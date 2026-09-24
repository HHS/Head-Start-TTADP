import { Grid } from '@trussworks/react-uswds';
import React, { useContext } from 'react';
import { Helmet } from 'react-helmet';
import AddTtaRequestButton from '../../components/AddTtaRequestButton';
import FilterPanel from '../../components/filter/FilterPanel';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import ActiveTtaRequestsTable from '../../components/TtaRequestsTable/ActiveTtaRequestsTable';
import ApprovedTtaRequestsTable from '../../components/TtaRequestsTable/ApprovedTtaRequestsTable';
import useFilters from '../../hooks/useFilters';
import UserContext from '../../UserContext';
import { showFilterWithMyRegions } from '../regionHelpers';

const FILTER_KEY = 'tta-requests-filters';
const ADMIN_REGION = 14;

// No filters have been defined for this page yet. Declared at module scope so the
// memoized config inside useFilters keeps a stable reference between renders.
const TTA_REQUESTS_FILTER_CONFIG = [];

export default function TtaRequests(): React.ReactElement {
  const { user } = useContext(UserContext);
  const {
    regions,
    defaultRegion,
    allRegionsFilters,
    hasMultipleRegions,
    filters,
    setFilters,
    onApplyFilters,
    onRemoveFilter,
    filterConfig,
  } = useFilters(
    user,
    FILTER_KEY,
    true, // manage regions
    [],
    TTA_REQUESTS_FILTER_CONFIG
  );

  const regionLabel = () => {
    if (defaultRegion === ADMIN_REGION || hasMultipleRegions) {
      return 'your regions';
    }
    return 'your region';
  };

  return (
    <div className="ttahub-tta-requests">
      <Helmet>
        <title>TTA Requests</title>
      </Helmet>
      <RegionPermissionModal
        filters={filters}
        user={user}
        showFilterWithMyRegions={
          // istanbul ignore next = not easily tested
          () => showFilterWithMyRegions(allRegionsFilters, filters, setFilters)
        }
      />
      <Grid>
        <Grid row>
          <div className="display-flex flex-align-center flex-gap-2 margin-bottom-3">
            <h1 className="landing margin-top-0 margin-bottom-0">
              {`TTA requests - ${regionLabel()}`}
            </h1>
            <AddTtaRequestButton label="Add request" />
          </div>
        </Grid>
        <Grid col={12}>
          <div className="maxw-widescreen">
            <div
              className="display-flex flex-wrap flex-align-center flex-gap-1 margin-bottom-2"
              data-testid="tta-requests-filter-panel"
            >
              <FilterPanel
                applyButtonAria="apply filters for TTA requests"
                filters={filters}
                onApplyFilters={onApplyFilters}
                onRemoveFilter={onRemoveFilter}
                filterConfig={filterConfig}
                allUserRegions={regions}
              />
            </div>
            {/* these tables span every recipient the user can see, so they name each one */}
            <ActiveTtaRequestsTable showRecipientColumns />
            <div className="margin-top-3">
              <ApprovedTtaRequestsTable showRecipientColumns />
            </div>
          </div>
        </Grid>
      </Grid>
    </div>
  );
}
