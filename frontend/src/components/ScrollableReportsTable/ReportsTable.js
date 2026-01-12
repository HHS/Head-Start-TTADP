import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Table,
  Checkbox,
} from '@trussworks/react-uswds';
import Container from '../Container';
import TableHeader from '../TableHeader';
import { parseCheckboxEvent, REPORTS_PER_PAGE } from '../../Constants';
import './ReportsTable.css';

const downloadBlob = (blob) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `download-tr-${new Date().toISOString()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function ReportsTable({
  loading,
  reports,
  sortConfig,
  setSortConfig,
  offset,
  setOffset,
  tableCaption,
  exportIdPrefix,
  reportsCount,
  activePage,
  getReportsDownloadUrl,
  getAllReportsDownloadUrl,
  downloadReports,
  filterQuery,
  columns,
  RowComponent,
  loadingLabel,
}) {
  const [reportCheckboxes, setReportCheckboxes] = useState({});
  const [allReportsChecked, setAllReportsChecked] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const downloadAllButtonRef = useRef();
  const downloadSelectedButtonRef = useRef();

  const handleDownloadAllReports = async (
    setIsDownloadingState,
    setDownloadErrorState,
    buttonRef,
  ) => {
    const downloadURL = getAllReportsDownloadUrl(filterQuery);

    try {
      setIsDownloadingState(true);
      const blob = await downloadReports(downloadURL);
      downloadBlob(blob);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
      setDownloadErrorState(true);
    } finally {
      setIsDownloadingState(false);
      buttonRef.current.focus();
    }
  };

  const handleDownloadClick = async (
    reportCheckboxesState,
    setIsDownloadingState,
    setDownloadErrorState,
    buttonRef,
  ) => {
    const toDownloadableReportIds = (accumulator, entry) => {
      if (!reports) return accumulator;
      const [key, value] = entry;
      if (value === false) return accumulator;
      accumulator.push(key);
      return accumulator;
    };

    const downloadable = Object.entries(reportCheckboxesState).reduce(toDownloadableReportIds, []);
    if (downloadable.length) {
      const downloadURL = getReportsDownloadUrl(downloadable);
      try {
        setIsDownloadingState(true);
        const blob = await downloadReports(downloadURL);
        downloadBlob(blob);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log(err);
        setDownloadErrorState(true);
      } finally {
        setIsDownloadingState(false);
        buttonRef.current.focus();
      }
    }
  };

  const makeReportCheckboxes = (reportsArr, checked) => (
    reportsArr.reduce((obj, r) => ({ ...obj, [r.id]: checked }), {})
  );

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

  // The all-reports checkbox can select/deselect all visible reports
  const toggleSelectAll = (event) => {
    const { checked } = parseCheckboxEvent(event);

    if (checked === true) {
      setReportCheckboxes(makeReportCheckboxes(reports, true));
      setAllReportsChecked(true);
    } else {
      setReportCheckboxes(makeReportCheckboxes(reports, false));
      setAllReportsChecked(false);
    }
  };

  const handleReportSelect = (event) => {
    const { checked, value } = parseCheckboxEvent(event);
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
      setOffset((pageNumber - 1) * REPORTS_PER_PAGE);
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

  // Handle keyboard events for sortable headers, but only Enter and Space
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      e.target.click();
    }
  };

  const getClassNamesFor = (name) => (sortConfig.sortBy === name ? sortConfig.direction : '');
  const renderColumnHeader = (displayName, name, key) => {
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
      <th key={key} scope="col" aria-sort={fullAriaSort} className="tta-smarthub--report-heading">
        <button
          tabIndex={0}
          type="button"
          onClick={() => {
            requestSort(name);
          }}
          onKeyDown={handleKeyDown}
          className={`sortable ${sortClassName} ttahub-button--unstyled text-bold`}
          aria-label={`${displayName}. Activate to sort ${sortClassName === 'asc' ? 'descending' : 'ascending'
          }`}
        >
          {displayName}
        </button>
      </th>
    );
  };
  const displayReports = reports.length ? reports : [];
  const numberOfSelectedReports = Object.values(reportCheckboxes).filter((c) => c).length;

  return (
    <Container className="landing inline-size-auto minw-full width-full maxw-full position-relative" paddingX={0} paddingY={0} loading={loading} loadingLabel={loadingLabel}>
      <TableHeader
        title={tableCaption}
        numberOfSelected={numberOfSelectedReports}
        toggleSelectAll={toggleSelectAll}
        handleDownloadAll={async () => handleDownloadAllReports(
          setIsDownloading,
          setDownloadError,
          downloadAllButtonRef,
        )}
        handleDownloadClick={async () => handleDownloadClick(
          reportCheckboxes,
          setIsDownloading,
          setDownloadError,
          downloadSelectedButtonRef,
        )}
        count={reportsCount}
        activePage={activePage}
        offset={offset}
        perPage={REPORTS_PER_PAGE}
        handlePageChange={handlePageChange}
        downloadError={downloadError}
        setDownloadError={setDownloadError}
        isDownloading={isDownloading}
        downloadAllButtonRef={downloadAllButtonRef}
        downloadSelectedButtonRef={downloadSelectedButtonRef}
        exportIdPrefix={exportIdPrefix}
      />
      <div className="usa-table-container--scrollable">
        <Table fullWidth striped stackedStyle="default">
          <caption className="usa-sr-only">
            {tableCaption}
            with sorting and pagination
          </caption>
          <thead>
            <tr>
              <th
                className="width-8 tta-smarthub--report-heading"
                aria-label="Select"
              >
                <Checkbox
                  id="all-reports"
                  label=""
                  onChange={toggleSelectAll}
                  checked={allReportsChecked}
                  aria-label="Select or de-select all reports"
                />
              </th>
              {columns.map(({ displayName, fieldName }) => (
                renderColumnHeader(displayName, fieldName, fieldName)
              ))}
              <th scope="col" aria-label="context menu" />
            </tr>
          </thead>
          <tbody>
            {displayReports.map((report, index) => (
              <RowComponent
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
  );
}

ReportsTable.propTypes = {
  loading: PropTypes.bool.isRequired,
  reports: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
  })).isRequired,
  sortConfig: PropTypes.shape({
    sortBy: PropTypes.string,
    direction: PropTypes.string,
    activePage: PropTypes.number,
  }).isRequired,
  setSortConfig: PropTypes.func.isRequired,
  offset: PropTypes.number.isRequired,
  setOffset: PropTypes.func.isRequired,
  tableCaption: PropTypes.string.isRequired,
  exportIdPrefix: PropTypes.string.isRequired,
  reportsCount: PropTypes.number.isRequired,
  activePage: PropTypes.number.isRequired,
  getReportsDownloadUrl: PropTypes.func.isRequired,
  getAllReportsDownloadUrl: PropTypes.func.isRequired,
  downloadReports: PropTypes.func.isRequired,
  filterQuery: PropTypes.string.isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      displayName: PropTypes.string.isRequired,
      fieldName: PropTypes.string.isRequired,
    }),
  ).isRequired,
  RowComponent: PropTypes.elementType.isRequired,
  loadingLabel: PropTypes.string.isRequired,
};
