/* eslint-disable no-console */
import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { Button } from '@trussworks/react-uswds';
import { uniqueId } from 'lodash';
import { getCommunicationLogsByRecipientId } from '../../../fetchers/communicationLog';
import AppLoadingContext from '../../../AppLoadingContext';
import WidgetContainer from '../../../components/WidgetContainer';
import CommunicationLogTable from './components/CommunicationLogTable';
import FilterPanel from '../../../components/filter/FilterPanel';
import UserContext from '../../../UserContext';
import useFilters from '../../../hooks/useFilters';
import {
  communicationDateFilter,
  creatorFilter,
  methodFilter,
  resultFilter,
} from '../../../components/filter/communicationLogFilters';

const COMMUNICATION_LOG_PER_PAGE = 10;
const FILTER_KEY = 'communication-log-filters';

const COMMUNICATION_LOG_FILTER_CONFIG = [
  methodFilter,
  resultFilter,
  creatorFilter,
  communicationDateFilter,
];

COMMUNICATION_LOG_FILTER_CONFIG.sort((a, b) => a.display.localeCompare(b.display));

export default function CommunicationLog({ regionId, recipientId }) {
  const [logs, setLogs] = useState();
  const [error, setError] = useState();
  const [sortConfig, setSortConfig] = useState({
    sortBy: 'communicationDate',
    direction: 'desc',
    offset: 0,
    activePage: 1,
  });

  const { user } = useContext(UserContext);
  const { setIsAppLoading } = useContext(AppLoadingContext);

  const {
    filters,
    onApplyFilters,
    onRemoveFilter,
  } = useFilters(
    user,
    FILTER_KEY,
    false,
    [],
    COMMUNICATION_LOG_FILTER_CONFIG,
  );

  useDeepCompareEffect(() => {
    async function fetchLogs() {
      try {
        setError(null);
        setIsAppLoading(true);
        const response = await getCommunicationLogsByRecipientId(
          String(regionId),
          String(recipientId),
          sortConfig.sortBy,
          sortConfig.direction,
          sortConfig.offset,
          COMMUNICATION_LOG_PER_PAGE,
          filters,
        );

        setLogs(response);
      } catch (err) {
        setError('Error fetching communication logs');
      } finally {
        setIsAppLoading(false);
      }
    }
    fetchLogs();
  }, [
    recipientId,
    regionId,
    setIsAppLoading,
    sortConfig,
    filters,
  ]);

  const exportLog = async () => {
    try {
      const blob = await getCommunicationLogsByRecipientId(
        String(regionId),
        String(recipientId),
        'communicationDate', // default values for sort
        'desc', // and direction
        0, // no offset
        false,
        filters,
        'csv',
      );
      const csv = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = csv;
      a.download = `${uniqueId('communication-log-')}.csv`;
      document.body.appendChild(a);
      a.click();
    } catch (err) {
      console.log(err);
      setError('There was an error exporting logs');
    }
  };

  const AddCommunication = () => (
    <Link
      to={`/recipient-tta-records/${recipientId}/region/${regionId}/communication/new`}
      className="usa-button smart-hub--new-report-btn"
    >
      <span className="smart-hub--plus">+</span>
      <span className="smart-hub--new-report">Add communication</span>
    </Link>
  );

  const ExportLog = () => (
    <Button
      type="button"
      onClick={exportLog}
      className="margin-bottom-1 desktop:margin-bottom-0"
      outline
    >
      Export log
    </Button>
  );

  const TitleSlot = () => (
    <div className="desktop:display-flex">
      <ExportLog />
      <AddCommunication />
    </div>
  );

  const requestSort = (sortBy) => {
    let direction = 'asc';
    if (
      sortConfig
      && sortConfig.sortBy === sortBy
      && sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }

    setSortConfig({
      sortBy,
      direction,
      activePage: 1,
      offset: 0,
    });
  };

  const handlePageChange = (pageNumber) => {
    // copy state
    const sort = { ...sortConfig };

    // mutate
    sort.activePage = pageNumber;
    sort.offset = (pageNumber - 1) * COMMUNICATION_LOG_PER_PAGE;

    // store it
    setSortConfig(sort);
  };

  return (
    <>
      <Helmet>
        <title>Communication</title>
      </Helmet>
      <div className="display-flex flex-wrap flex-align-center flex-gap-1 margin-bottom-2">
        <FilterPanel
          applyButtonAria="apply filters on communication logs"
          filters={filters}
          onApplyFilters={onApplyFilters}
          onRemoveFilter={onRemoveFilter}
          filterConfig={COMMUNICATION_LOG_FILTER_CONFIG}
          allUserRegions={[]}
          manageRegions={false}
        />
      </div>
      <WidgetContainer
        className="maxw-widescreen"
        title="Communication log"
        showPagingBottom={logs && logs.count > 0}
        showPagingTop={logs && logs.count > 0}
        loading={false}
        currentPage={sortConfig.activePage}
        totalCount={logs ? logs.count : 0}
        offset={sortConfig.offset}
        perPage={COMMUNICATION_LOG_PER_PAGE}
        handlePageChange={handlePageChange}
        error={error}
        titleSlot={<TitleSlot />}
      >
        {(logs && logs.count > 0) ? (
          <CommunicationLogTable
            sortConfig={sortConfig}
            requestSort={requestSort}
            logs={logs.rows}
            recipientId={recipientId}
            regionId={regionId}
          />
        ) : (
          <div className="display-flex flex-align-center flex-justify-center width-full padding-4">
            <p className="usa-prose text-center">
              There are no communication logs for this recipient.
            </p>
          </div>
        )}
      </WidgetContainer>
    </>
  );
}

CommunicationLog.propTypes = {
  recipientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};
