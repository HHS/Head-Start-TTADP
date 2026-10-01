import React, { useContext } from 'react';
import { Helmet } from 'react-helmet';
import FilterPanel from '../../../components/filter/FilterPanel';
import ActiveTtaRequestsTable from '../../../components/TtaRequestsTable/ActiveTtaRequestsTable';
import ApprovedTtaRequestsTable from '../../../components/TtaRequestsTable/ApprovedTtaRequestsTable';
import useFilters from '../../../hooks/useFilters';
import UserContext from '../../../UserContext';

const FILTER_KEY = 'tta-request-filters';

// No filters have been defined for this tab yet. Declared at module scope so the
// memoized config inside useFilters keeps a stable reference between renders.
const TTA_REQUEST_FILTER_CONFIG = [];

interface TtaRequestProps {
  recipientId: string;
  regionId: string;
}

export default function TtaRequest({ recipientId, regionId }: TtaRequestProps): React.ReactElement {
  const { user } = useContext(UserContext);
  const { filters, onApplyFilters, onRemoveFilter, filterConfig } = useFilters(
    user,
    FILTER_KEY,
    false,
    [],
    TTA_REQUEST_FILTER_CONFIG
  );

  return (
    <>
      <Helmet>
        <title>TTA Requests</title>
      </Helmet>
      <div className="maxw-widescreen">
        <div
          className="display-flex flex-wrap flex-align-center flex-gap-1 margin-bottom-2"
          data-testid="tta-request-filter-panel"
        >
          <FilterPanel
            filters={filters}
            onApplyFilters={onApplyFilters}
            onRemoveFilter={onRemoveFilter}
            filterConfig={filterConfig}
            applyButtonAria="Apply filters to TTA requests"
            allUserRegions={[]}
            manageRegions={false}
          />
        </div>
        <ActiveTtaRequestsTable recipientId={recipientId} regionId={regionId} />
        <div className="margin-top-3">
          <ApprovedTtaRequestsTable recipientId={recipientId} regionId={regionId} />
        </div>
      </div>
    </>
  );
}
