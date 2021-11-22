/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Table, Checkbox, Grid, Alert,
} from '@trussworks/react-uswds';
import { getReports, downloadReports } from '../../fetchers/activityReports';
import { getReportsDownloadURL, getAllReportsDownloadURL } from '../../fetchers/helpers';
import Container from '../Container';
import { filtersToQueryString } from '../Filter';
import TableHeader from '../TableHeader';
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
        <TableHeader
          title={tableCaption}
          numberOfSelected={numberOfSelectedReports}
          toggleSelectAll={toggleSelectAll}
          showFilter={showFilter}
          onUpdateFilters={onUpdateFilters}
          handleDownloadAll={handleDownloadAllReports}
          handleDownloadClick={handleDownloadClick}
          count={reportsCount}
          activePage={activePage}
          offset={offset}
          perPage={perPage}
          handlePageChange={handlePageChange}
          downloadError={downloadError}
        />
        <div className="usa-table-container--scrollable">
          <Table fullWidth striped>
            <caption className="usa-sr-only">
              {tableCaption}
              with sorting and pagination
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
                  numberOfSelectedReports={numberOfSelectedReports}
                  exportSelected={handleDownloadClick}
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
  onUpdateFilters: PropTypes.func,
  tableCaption: PropTypes.string.isRequired,
};

ActivityReportsTable.defaultProps = {
  onUpdateFilters: () => {},
};

export default ActivityReportsTable;
