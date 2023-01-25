/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Table, Checkbox, Grid, Alert,
} from '@trussworks/react-uswds';
import { getReports, downloadReports } from '../../fetchers/activityReports';
import { getReportsDownloadURL, getAllReportsDownloadURL } from '../../fetchers/helpers';
import Container from '../Container';
import { filtersToQueryString } from '../../utils';
import TableHeader from '../TableHeader';
import ReportRow from './ReportRow';
import { REPORTS_PER_PAGE } from '../../Constants';
import useSessionSort from '../../hooks/useSessionSort';
import './index.css';

function ActivityReportsTable({
  filters,
  tableCaption,
  exportIdPrefix,
}) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportCheckboxes, setReportCheckboxes] = useState({});
  const [allReportsChecked, setAllReportsChecked] = useState(false);
  const [perPage] = useState(REPORTS_PER_PAGE);
  const [reportsCount, setReportsCount] = useState(0);
  const [downloadError, setDownloadError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [sortConfig, setSortConfig] = useSessionSort({
    sortBy: 'updatedAt',
    direction: 'desc',
    activePage: 1,
  }, 'activityReportsTable');

  const { activePage } = sortConfig;

  const [offset, setOffset] = useState((activePage - 1) * perPage);

  const downloadAllButtonRef = useRef();
  const downloadSelectedButtonRef = useRef();

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
        setError('');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
        setError('Unable to fetch reports');
      } finally {
        setLoading(false);
      }
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
      // copy state
      const sort = { ...sortConfig };

      // mutate
      sort.activePage = pageNumber;

      // store it
      setSortConfig(sort);
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

    setOffset(0);
    setSortConfig({ sortBy, direction, activePage: 1 });
  };

  const handleDownloadAllReports = async () => {
    const filterQuery = filtersToQueryString(filters);
    const downloadURL = getAllReportsDownloadURL(filterQuery);

    try {
      // changed the way this works ever so slightly because I was thinking
      // you'd want a try/catch around the fetching of the reports and not the
      // window.location.assign
      setIsDownloading(true);
      const blob = await downloadReports(downloadURL);
      const csv = URL.createObjectURL(blob);
      window.location.assign(csv);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
      setDownloadError(true);
    } finally {
      setIsDownloading(false);
      downloadAllButtonRef.current.focus();
    }
  };

  const handleDownloadClick = async () => {
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
      try {
        setIsDownloading(true);
        const blob = await downloadReports(downloadURL);
        const csv = URL.createObjectURL(blob);
        window.location.assign(csv);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log(err);
        setDownloadError(true);
      } finally {
        setIsDownloading(false);
        downloadSelectedButtonRef.current.focus();
      }
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
          onKeyDown={() => requestSort(name)}
          className={`sortable ${sortClassName}`}
          aria-label={`${displayName}. Activate to sort ${sortClassName === 'asc' ? 'descending' : 'ascending'
          }`}
        >
          {displayName}
        </a>
      </th>
    );
  };

  const displayReports = reports.length ? reports : [];
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

      <Container className="landing inline-size-auto maxw-full" paddingX={0} paddingY={0} loading={loading} loadingLabel="Activity reports table loading">
        <TableHeader
          title={tableCaption}
          numberOfSelected={numberOfSelectedReports}
          toggleSelectAll={toggleSelectAll}
          handleDownloadAll={handleDownloadAllReports}
          handleDownloadClick={handleDownloadClick}
          count={reportsCount}
          activePage={activePage}
          offset={offset}
          perPage={perPage}
          handlePageChange={handlePageChange}
          downloadError={downloadError}
          setDownloadError={setDownloadError}
          isDownloading={isDownloading}
          downloadAllButtonRef={downloadAllButtonRef}
          downloadSelectedButtonRef={downloadSelectedButtonRef}
          exportIdPrefix={exportIdPrefix}
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
                {renderColumnHeader('Recipient', 'activityRecipients')}
                {renderColumnHeader('Date started', 'startDate')}
                {renderColumnHeader('Creator', 'author')}
                {renderColumnHeader('Created date', 'createdAt')}
                {renderColumnHeader('Topics', 'topics')}
                {renderColumnHeader('Collaborators', 'collaborators')}
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
                  openMenuUp={index > displayReports.length - 5}
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
  exportIdPrefix: PropTypes.string.isRequired,
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      condition: PropTypes.string,
      id: PropTypes.string,
      query: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.arrayOf(PropTypes.string),
        PropTypes.arrayOf(PropTypes.number),
      ]),
      topic: PropTypes.string,
    }),
  ).isRequired,
  tableCaption: PropTypes.string.isRequired,
};

export default ActivityReportsTable;
