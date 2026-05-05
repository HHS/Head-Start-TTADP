import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Dropdown } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React, { useContext, useState } from 'react';
import { useHistory } from 'react-router-dom';
import AppLoadingContext from '../AppLoadingContext';
import colors from '../colors';
import WidgetContainer from '../components/WidgetContainer';
import { getMonitoringRelatedTtaCsv } from '../fetchers/monitoring';
import fetchWidget from '../fetchers/Widgets';
import useCheckboxSelection from '../hooks/useCheckboxSelection';
import useFetch from '../hooks/useFetch';
import { filtersToQueryString } from '../utils';
import RegionalDashboardCitationCards from './monitoring/RegionalDashboardCitationCards';

const PER_PAGE_NUMBER = 10;

export default function MonitoringRelatedTta({ filters }) {
  const history = useHistory();
  const [sortConfig, setSortConfig] = useState({
    sortBy: 'recipient_finding',
    direction: 'asc',
    offset: 0,
  });

  const { setIsAppLoading } = useContext(AppLoadingContext);

  const { data: response, loading } = useFetch(
    null,
    async () => {
      const query = filtersToQueryString(filters);
      const sortQuery = `sortBy=${sortConfig.sortBy}&direction=${sortConfig.direction}&offset=${sortConfig.offset}&perPage=${PER_PAGE_NUMBER}`;
      return fetchWidget('monitoringTta', `${query}&${sortQuery}`);
    },
    [filters, sortConfig],
    'Failed to load monitoring related TTA',
    true
  );

  const data = response?.data || [];
  const total = response?.total || 0;

  const { numberOfSelected, handleCheckboxSelect, isChecked, getIdsForAction, clearAll } =
    useCheckboxSelection({
      items: data,
      getItemId: (item) => String(item.id),
    });

  const handleCsv = async (query) => {
    let url;
    let link;
    try {
      setIsAppLoading(true);
      const blob = await getMonitoringRelatedTtaCsv(query);

      url = window.URL.createObjectURL(blob);
      link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'monitoring-related-tta.csv');
      document.body.appendChild(link);
      link.click();
    } finally {
      if (link?.parentNode) {
        link.parentNode.removeChild(link);
      }
      if (url) {
        window.URL.revokeObjectURL(url);
      }
      setIsAppLoading(false);
    }
  };

  const exportAll = async () => {
    const query = filtersToQueryString(filters);
    const sortQuery = `sortBy=${sortConfig.sortBy}&direction=${sortConfig.direction}&perPage=${total}`;
    await handleCsv(`${query}&${sortQuery}`);
  };

  const exportSelected = async () => {
    const idsToExport = getIdsForAction();
    if (!idsToExport.length) {
      return;
    }
    const filterQuery = filtersToQueryString(
      idsToExport.map((id) => ({
        topic: 'citationRecipient',
        condition: 'is',
        query: String(id),
      }))
    );

    const sortQuery = `sortBy=${sortConfig.sortBy}&direction=${sortConfig.direction}&perPage=${idsToExport.length}`;
    await handleCsv(`${filterQuery}&${sortQuery}`);
  };

  const setSortBy = (e) => {
    const [sortBy, direction] = e.target.value.split('-');
    setSortConfig({
      sortBy,
      direction,
      offset: 0,
    });
  };

  const onPrint = () => {
    const idsToPrint = getIdsForAction();
    if (!idsToPrint.length) {
      return;
    }

    history.push('/dashboards/regional-dashboard/monitoring/print-selected-citations', {
      selectedIds: idsToPrint,
      sortConfig,
      filters,
    });
  };

  const subtitle = (
    <>
      <div className="margin-bottom-2">
        <p className="smart-hub-widget--subtitle usa-prose margin-x-0 margin-y-0">
          The date filter applies to the review received date.
        </p>
      </div>
      <div
        className="desktop:display-flex flex-align-center margin-bottom-3"
        data-testid="monitoring-related-tta-sort-container"
        data-sortby={sortConfig.sortBy}
        data-direction={sortConfig.direction}
      >
        {/* Label is associated with Dropdown below (a thin wrapper for  <select>) */}
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label
          className="display-block margin-right-1 margin-bottom-1 desktop:margin-bottom-0"
          style={{ minWidth: 'max-content' }}
          htmlFor="sortBy"
        >
          Sort by
        </label>
        <Dropdown
          onChange={setSortBy}
          value={`${sortConfig.sortBy}-${sortConfig.direction}`}
          className="margin-top-0"
          id="sortBy"
          name="sortBy"
        >
          <option value="recipient_finding-asc">Recipient (A to Z), then Finding type</option>
          <option value="recipient_finding-desc">Recipient (Z to A), then Finding type</option>
          <option value="recipient_citation-asc">Recipient (A to Z), then Citation number</option>
          <option value="recipient_citation-desc">Recipient (Z to A), then Citation number</option>
          <option value="finding-asc">Finding category (A to Z), then Citation number</option>
          <option value="finding-desc">Finding category (Z to A), then Citation number</option>
          <option value="citation-asc">Citation number (low to high), then Recipient</option>
          <option value="citation-desc">Citation number (high to low), then Recipient</option>
        </Dropdown>
      </div>

      {numberOfSelected > 0 && (
        <div className="margin-bottom-3 display-flex flex-row flex-align-center">
          <span className="filter-pill-container smart-hub-border-blue-primary border-2px margin-right-1 radius-pill padding-right-1 padding-left-2 padding-y-05">
            <span>{numberOfSelected} selected </span>
            <Button
              className="smart-hub--select-tag__button"
              unstyled
              aria-label="deselect all citations"
              onClick={clearAll}
            >
              <FontAwesomeIcon
                className="margin-left-1 margin-top-2px filter-pills-cursor"
                color={colors.ttahubMediumBlue}
                icon={faTimesCircle}
              />
            </Button>
          </span>
        </div>
      )}
    </>
  );

  return (
    <WidgetContainer
      loading={loading}
      title="Monitoring related TTA"
      subtitle={subtitle}
      showHeaderBorder
      menuItems={[
        {
          label: 'Export selected rows',
          onClick: exportSelected,
        },
        {
          label: 'Export table',
          onClick: exportAll,
        },
        {
          label: 'Print selected rows',
          onClick: onPrint,
        },
      ]}
      showPagingBottom
      currentPage={Math.floor(sortConfig.offset / PER_PAGE_NUMBER) + 1}
      totalCount={total}
      offset={sortConfig.offset}
      perPage={PER_PAGE_NUMBER}
      handlePageChange={(newPage) =>
        setSortConfig((prev) => ({ ...prev, offset: (newPage - 1) * PER_PAGE_NUMBER }))
      }
    >
      <div className="margin-3">
        <RegionalDashboardCitationCards
          data={data}
          regionId={0}
          isChecked={(citation) => isChecked(String(citation.id))}
          onCheckboxSelect={handleCheckboxSelect}
        />
      </div>
    </WidgetContainer>
  );
}

MonitoringRelatedTta.propTypes = {
  filters: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};
