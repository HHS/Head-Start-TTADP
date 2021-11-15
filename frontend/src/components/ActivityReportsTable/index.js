/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Table, Button, Checkbox, Grid, Alert,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';

import Pagination from 'react-js-pagination';

import { getReports, downloadReports } from '../../fetchers/activityReports';
import { getReportsDownloadURL, getAllReportsDownloadURL } from '../../fetchers/helpers';
import Container from '../Container';
import Filter, { filtersToQueryString } from '../Filter';
import ReportMenu from '../../pages/Landing/ReportMenu';
import ReportRow from './ReportRow';
import { REPORTS_PER_PAGE } from '../../Constants';

import './index.css';

const emptyReport = {
  id: 0,
  displayId: '',
  activityRecipients: [],
  startDate: '',
  author: {},
  legacyId: '',
  topics: [],
  collaborators: [],
  lastSaved: '',
  calculatedStatus: '',
};

export function renderTotal(offset, perPage, activePage, reportsCount) {
  const from = offset >= reportsCount ? 0 : offset + 1;
  const offsetTo = perPage * activePage;
  let to;
  if (offsetTo > reportsCount) {
    to = reportsCount;
  } else {
    to = offsetTo;
  }
  return `${from}-${to} of ${reportsCount}`;
}

function ActivityReportsTable({
  filters,
  showFilter,
  onUpdateFilters,
  tableCaption,
}) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportCheckboxes, setReportCheckboxes] = useState({});
  const [allReportsChecked, setAllReportsChecked] = useState(false);
  const [offset, setOffset] = useState(0);
  const [perPage] = useState(REPORTS_PER_PAGE);
  const [activePage, setActivePage] = useState(1);
  const [reportsCount, setReportsCount] = useState(0);
  const [downloadError, setDownloadError] = useState(false);
  const [sortConfig, setSortConfig] = React.useState({
    sortBy: 'updatedAt',
    direction: 'desc',
  });

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      const filterQuery = filtersToQueryString(filters);
      try {
        const { count, rows } = await getReports(
          sortConfig.sortBy,
          sortConfig.direction,
          offset,
          perPage,
          filterQuery,
        );
        setReports(rows);
        setReportsCount(count || 0);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
        setError('Unable to fetch reports');
      }
      setLoading(false);
    }
    fetchReports();
  }, [sortConfig, offset, perPage, filters]);

  const makeReportCheckboxes = (reportsArr, checked) => (
    reportsArr.reduce((obj, r) => ({ ...obj, [r.id]: checked }), {})
  );

  // The all-reports checkbox can select/deselect all visible reports
  const toggleSelectAll = (event) => {
    const { target: { checked = null } = {} } = event;

    if (checked === true) {
      setReportCheckboxes(makeReportCheckboxes(reports, true));
      setAllReportsChecked(true);
    } else {
      setReportCheckboxes(makeReportCheckboxes(reports, false));
      setAllReportsChecked(false);
    }
  };

  // When reports are updated, make sure all checkboxes are unchecked
  useEffect(() => {
    setReportCheckboxes(makeReportCheckboxes(reports, false));
  }, [reports]);

  useEffect(() => {
    const checkValues = Object.values(reportCheckboxes);
    if (checkValues.every((v) => v === true)) {
      setAllReportsChecked(true);
    } else if (allReportsChecked === true) {
      setAllReportsChecked(false);
    }
  }, [reportCheckboxes, allReportsChecked]);

  const handleReportSelect = (event) => {
    const { target: { checked = null, value = null } = {} } = event;
    if (checked === true) {
      setReportCheckboxes({ ...reportCheckboxes, [value]: true });
    } else {
      setReportCheckboxes({ ...reportCheckboxes, [value]: false });
    }
  };

  const handlePageChange = (pageNumber) => {
    if (!loading) {
      setActivePage(pageNumber);
      setOffset((pageNumber - 1) * perPage);
    }
  };

  const requestSort = (sortBy) => {
    let direction = 'asc';
    if (
      sortConfig
      && sortConfig.sortBy === sortBy
      && sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }
    setActivePage(1);
    setOffset(0);
    setSortConfig({ sortBy, direction });
  };

  const handleDownloadAllReports = async () => {
    const filterQuery = filtersToQueryString(filters);
    const downloadURL = getAllReportsDownloadURL(filterQuery);

    try {
      // changed the way this works ever so slightly because I was thinking
      // you'd want a try/catch around the fetching of the reports and not the
      // window.location.assign

      const blob = await downloadReports(downloadURL);
      const csv = URL.createObjectURL(blob);
      window.location.assign(csv);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
      setDownloadError(true);
    }
  };

  const handleDownloadClick = () => {
    const toDownloadableReportIds = (accumulator, entry) => {
      if (!reports) return accumulator;
      const [key, value] = entry;
      if (value === false) return accumulator;
      accumulator.push(key);
      return accumulator;
    };

    const downloadable = Object.entries(reportCheckboxes).reduce(toDownloadableReportIds, []);
    if (downloadable.length) {
      const downloadURL = getReportsDownloadURL(downloadable);
      window.location.assign(downloadURL);
    }
  };

  const getClassNamesFor = (name) => (sortConfig.sortBy === name ? sortConfig.direction : '');
  const renderColumnHeader = (displayName, name) => {
    const sortClassName = getClassNamesFor(name);
    let fullAriaSort;
    switch (sortClassName) {
      case 'asc':
        fullAriaSort = 'ascending';
        break;
      case 'desc':
        fullAriaSort = 'descending';
        break;
      default:
        fullAriaSort = 'none';
        break;
    }
    return (
      <th scope="col" aria-sort={fullAriaSort}>
        <a
          role="button"
          tabIndex={0}
          onClick={() => {
            requestSort(name);
          }}
          onKeyPress={() => requestSort(name)}
          className={`sortable ${sortClassName}`}
          aria-label={`${displayName}. Activate to sort ${sortClassName === 'asc' ? 'descending' : 'ascending'
          }`}
        >
          {displayName}
        </a>
      </th>
    );
  };

  const displayReports = reports.length ? reports : [emptyReport];
  const numberOfSelectedReports = Object.values(reportCheckboxes).filter((c) => c).length;

  return (
    <>
      <Grid row>
        {error && (
        <Alert type="error" role="alert">
          {error}
        </Alert>
        )}
      </Grid>
      <Container className="landing inline-size maxw-full" padding={0} loading={loading} loadingLabel="Activity reports table loading">
        <span className="smart-hub--table-controls display-flex flex-row flex-align-center">
          {numberOfSelectedReports > 0
        && (
          <span className="padding-y-05 padding-left-105 padding-right-1 text-white smart-hub-bg-vivid radius-pill font-sans-xs text-middle margin-right-1 smart-hub--selected-tag">
            {numberOfSelectedReports}
            {' '}
            selected
            {' '}
            <Button
              className="smart-hub--select-tag__button"
              unstyled
              aria-label="deselect all reports"
              onClick={() => {
                toggleSelectAll({ target: { checked: false } });
              }}
            >
              <FontAwesomeIcon
                color="blue"
                inverse
                icon={faTimesCircle}
              />
            </Button>
          </span>
        )}
          {showFilter && <Filter applyFilters={onUpdateFilters} />}
          <ReportMenu
            hasSelectedReports={numberOfSelectedReports > 0}
            onExportAll={handleDownloadAllReports}
            onExportSelected={handleDownloadClick}
            count={reportsCount}
            downloadError={downloadError}
          />
        </span>
        <span className="smart-hub--table-nav">
          <span aria-label="Pagination for activity reports">
            <span
              className="smart-hub--total-count"
              aria-label={`Page ${activePage}, displaying rows ${renderTotal(
                offset,
                perPage,
                activePage,
                reportsCount,
              )}`}
            >
              {renderTotal(offset, perPage, activePage, reportsCount)}
              <Pagination
                hideFirstLastPages
                prevPageText="<Prev"
                nextPageText="Next>"
                activePage={activePage}
                itemsCountPerPage={perPage}
                totalItemsCount={reportsCount}
                pageRangeDisplayed={4}
                onChange={handlePageChange}
                linkClassPrev="smart-hub--link-prev"
                linkClassNext="smart-hub--link-next"
                tabIndex={0}
              />
            </span>
          </span>
        </span>
        <div className="usa-table-container--scrollable">
          <Table className="usa-table usa-table--borderless usa-table--striped" fullWidth>
            <caption>
              {tableCaption}
              <p className="usa-sr-only">with sorting and pagination</p>
            </caption>
            <thead>
              <tr>
                <th className="width-8" aria-label="Select">
                  <Checkbox
                    id="all-reports"
                    label=""
                    onChange={toggleSelectAll}
                    checked={allReportsChecked}
                    aria-label="Select or de-select all reports"
                  />
                </th>
                {renderColumnHeader('Report ID', 'regionId')}
                {renderColumnHeader('Grantee', 'activityRecipients')}
                {renderColumnHeader('Start date', 'startDate')}
                {renderColumnHeader('Creator', 'author')}
                {renderColumnHeader('Created date', 'createdAt')}
                {renderColumnHeader('Topic(s)', 'topics')}
                {renderColumnHeader('Collaborator(s)', 'collaborators')}
                {renderColumnHeader('Last saved', 'updatedAt')}
                {renderColumnHeader('Approved date', 'approvedAt')}
                <th scope="col" aria-label="context menu" />
              </tr>
            </thead>
            <tbody>
              {displayReports.map((report, index) => (
                <ReportRow
                  key={report.id}
                  report={report}
                  handleReportSelect={handleReportSelect}
                  isChecked={reportCheckboxes[report.id] || false}
                  openMenuUp={index > displayReports.length - 1}
                />
              ))}
            </tbody>
          </Table>
        </div>
      </Container>
    </>
  );
}

ActivityReportsTable.propTypes = {
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      condition: PropTypes.string,
      id: PropTypes.string,
      query: PropTypes.string,
      topic: PropTypes.string,
    }),
  ).isRequired,
  showFilter: PropTypes.bool.isRequired,
  onUpdateFilters: PropTypes.func.isRequired,
  tableCaption: PropTypes.string.isRequired,
};

export default ActivityReportsTable;
