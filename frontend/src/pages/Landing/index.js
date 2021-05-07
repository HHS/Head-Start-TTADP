/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect } from 'react';
import {
  Tag, Table, Alert, Grid, Button, Checkbox,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { Helmet } from 'react-helmet';
import { Link, useHistory } from 'react-router-dom';

import Pagination from 'react-js-pagination';

import UserContext from '../../UserContext';
import Container from '../../components/Container';
import { getReports, getReportAlerts } from '../../fetchers/activityReports';
import { getReportsDownloadURL, getAllReportsDownloadURL, getAllAlertsDownloadURL } from '../../fetchers/helpers';
import NewReport from './NewReport';
import 'uswds/dist/css/uswds.css';
import '@trussworks/react-uswds/lib/index.css';
import './index.css';
import MyAlerts from './MyAlerts';
import { hasReadWrite } from '../../permissions';
import { REPORTS_PER_PAGE, ALERTS_PER_PAGE } from '../../Constants';
import ContextMenu from '../../components/ContextMenu';
import Filter, { filtersToQueryString } from './Filter';
import ReportMenu from './ReportMenu';

function renderReports(reports, history, reportCheckboxes, handleReportSelect) {
  const emptyReport = {
    id: '',
    displayId: '',
    activityRecipients: [],
    startDate: '',
    author: '',
    topics: [],
    collaborators: [],
    lastSaved: '',
    status: '',
  };

  const displayReports = reports.length ? reports : [emptyReport];

  return displayReports.map((report, index, { length }) => {
    const {
      id,
      displayId,
      activityRecipients,
      startDate,
      author,
      topics,
      collaborators,
      lastSaved,
      status,
      legacyId,
    } = report;

    const authorName = author ? author.fullName : '';

    const recipientsTitle = activityRecipients && activityRecipients.reduce(
      (result, ar) => `${result + (ar.grant ? ar.grant.grantee.name : ar.name)}\n`,
      '',
    );

    const recipients = activityRecipients && activityRecipients.map((ar) => (
      <Tag
        key={`${ar.name.slice(1, 3)}_${ar.id}`}
        className="smart-hub--table-collection"
      >
        {ar.grant ? ar.grant.grantee.name : ar.name}
      </Tag>
    ));

    const topicsTitle = (topics || []).reduce(
      (result, topic) => `${result + topic}\n`,
      '',
    );

    const topicsWithTags = (topics || []).map((topic) => (
      <Tag
        key={topic.slice(1, 13)}
        className="smart-hub--table-collection"
      >
        {topic}
      </Tag>
    ));

    const collaboratorsTitle = collaborators && collaborators.reduce(
      (result, collaborator) => `${result + collaborator.fullName}\n`,
      '',
    );

    const collaboratorsWithTags = collaborators && collaborators.map((collaborator) => (
      <Tag
        key={collaborator.fullName.slice(1, 13)}
        className="smart-hub--table-collection"
      >
        {collaborator.fullName}
      </Tag>
    ));

    const linkTarget = legacyId ? `/activity-reports/legacy/${legacyId}` : `/activity-reports/${id}`;
    const menuItems = [
      {
        label: 'View',
        onClick: () => { history.push(linkTarget); },
      },
    ];

    if (!legacyId) {
      const downloadMenuItem = {
        label: 'Download',
        onClick: () => {
          const downloadURL = getReportsDownloadURL([id]);
          window.location.assign(downloadURL);
        },
      };
      menuItems.push(downloadMenuItem);
    }

    const contextMenuLabel = `Actions for activity report ${displayId}`;

    const selectId = `report-${id}`;
    const isChecked = reportCheckboxes[id] || false;

    return (
      <tr key={`landing_${id}`}>
        <td className="width-8">
          <Checkbox id={selectId} label="" value={id} checked={isChecked} onChange={handleReportSelect} aria-label={`Select ${displayId}`} />
        </td>
        <th scope="row" className="smart-hub--blue">
          <Link
            to={linkTarget}
          >
            {displayId}
          </Link>
        </th>
        <td>
          <span className="smart-hub--ellipsis" title={recipientsTitle}>
            {recipients}
          </span>
        </td>
        <td>{startDate}</td>
        <td>
          <span className="smart-hub--ellipsis" title={authorName}>
            {authorName}
          </span>
        </td>
        <td>
          <span className="smart-hub--ellipsis" title={topicsTitle}>
            {topicsWithTags}
          </span>
        </td>
        <td>
          <span className="smart-hub--ellipsis" title={collaboratorsTitle}>
            {collaboratorsWithTags}
          </span>
        </td>
        <td>{lastSaved}</td>
        <td>
          <Tag
            className={`smart-hub--table-tag-status smart-hub--status-${status}`}
          >
            {status === 'needs_action' ? 'Needs action' : status}
          </Tag>
        </td>
        <td>
          <ContextMenu label={contextMenuLabel} menuItems={menuItems} up={index + 1 === length} />
        </td>
      </tr>
    );
  });
}

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

function Landing() {
  const history = useHistory();
  const [isLoaded, setIsLoaded] = useState(false);
  const [reports, updateReports] = useState([]);
  const [reportAlerts, updateReportAlerts] = useState([]);
  const [error, updateError] = useState();
  const [showAlert, updateShowAlert] = useState(true);
  const [sortConfig, setSortConfig] = React.useState({
    sortBy: 'updatedAt',
    direction: 'desc',
  });
  const [offset, setOffset] = useState(0);
  const [perPage] = useState(REPORTS_PER_PAGE);
  const [activePage, setActivePage] = useState(1);
  const [reportsCount, setReportsCount] = useState(0);

  const [alertsSortConfig, setAlertsSortConfig] = React.useState({
    sortBy: 'startDate',
    direction: 'desc',
  });
  const [alertsOffset, setAlertsOffset] = useState(0);
  const [alertsPerPage] = useState(ALERTS_PER_PAGE);
  const [alertsActivePage, setAlertsActivePage] = useState(1);
  const [alertReportsCount, setAlertReportsCount] = useState(0);
  const [filters, setFilters] = useState([]);
  const [alertFilters, setAlertFilters] = useState([]);

  const [reportCheckboxes, setReportCheckboxes] = useState({});
  const [allReportsChecked, setAllReportsChecked] = useState(false);

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

  const handleReportSelect = (event) => {
    const { target: { checked = null, value = null } = {} } = event;
    if (checked === true) {
      setReportCheckboxes({ ...reportCheckboxes, [value]: true });
    } else {
      setReportCheckboxes({ ...reportCheckboxes, [value]: false });
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

  const requestAlertsSort = (sortBy) => {
    let direction = 'asc';
    if (
      alertsSortConfig
      && alertsSortConfig.sortBy === sortBy
      && alertsSortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }
    setAlertsActivePage(1);
    setAlertsOffset(0);
    setAlertsSortConfig({ sortBy, direction });
  };

  useEffect(() => {
    async function fetchReports() {
      const filterQuery = filtersToQueryString(filters);
      try {
        const { count, rows } = await getReports(
          sortConfig.sortBy,
          sortConfig.direction,
          offset,
          perPage,
          filterQuery,
        );
        updateReports(rows);
        setReportsCount(count || 0);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
        updateError('Unable to fetch reports');
      }
      setIsLoaded(true);
    }
    fetchReports();
  }, [sortConfig, offset, perPage, filters]);

  useEffect(() => {
    async function fetchReports() {
      const filterQuery = filtersToQueryString(alertFilters);
      try {
        const { alertsCount, alerts } = await getReportAlerts(
          alertsSortConfig.sortBy,
          alertsSortConfig.direction,
          alertsOffset,
          alertsPerPage,
          filterQuery,
        );
        updateReportAlerts(alerts);
        if (alertsCount) {
          setAlertReportsCount(alertsCount);
        }
        setAllReportsChecked(false);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
        updateError('Unable to fetch reports');
      }
      setIsLoaded(true);
    }
    fetchReports();
  }, [alertsSortConfig, alertsOffset, alertsPerPage, alertFilters]);

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

  const handleDownloadAllReports = () => {
    const filterQuery = filtersToQueryString(filters);
    const downloadURL = getAllReportsDownloadURL(filterQuery);
    window.location.assign(downloadURL);
  };

  const handleDownloadAllAlerts = () => {
    const filterQuery = filtersToQueryString(alertFilters);
    const downloadURL = getAllAlertsDownloadURL(filterQuery);
    window.location.assign(downloadURL);
  };

  const getClassNamesFor = (name) => (sortConfig.sortBy === name ? sortConfig.direction : '');
  const numberOfSelectedReports = Object.values(reportCheckboxes).filter((c) => c).length;

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
          aria-label={`${displayName}. Activate to sort ${
            sortClassName === 'asc' ? 'descending' : 'ascending'
          }`}
        >
          {displayName}
        </a>
      </th>
    );
  };

  const handlePageChange = (pageNumber) => {
    setActivePage(pageNumber);
    setOffset((pageNumber - 1) * perPage);
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  let msg;
  const message = history.location.state && history.location.state.message;
  if (message) {
    msg = (
      <>
        You successfully
        {' '}
        {message.status}
        {' '}
        report
        {' '}
        <Link to={`/activity-reports/${message.reportId}`}>
          {message.displayId}
        </Link>
        {' '}
        on
        {' '}
        {message.time}
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Landing</title>
      </Helmet>
      <UserContext.Consumer>
        {({ user }) => (
          <>
            {showAlert && message && (
            <Alert
              type="success"
              role="alert"
              noIcon
              cta={(
                <Button
                  role="button"
                  unstyled
                  aria-label="dismiss alert"
                  onClick={() => updateShowAlert(false)}
                >
                  <span className="fa-sm">
                    <FontAwesomeIcon color="black" icon={faTimesCircle} />
                  </span>
                </Button>
              )}
            >
              {msg}
            </Alert>
            )}
            <Grid row gap>
              <Grid>
                <h1 className="landing">Activity Reports</h1>
              </Grid>
              <Grid className="flex-align-self-center">
                {reportAlerts
                  && reportAlerts.length > 0
                  && hasReadWrite(user) && <NewReport />}
              </Grid>
            </Grid>
            <Grid row>
              {error && (
              <Alert type="error" role="alert">
                {error}
              </Alert>
              )}
            </Grid>
            <MyAlerts
              reports={reportAlerts}
              newBtn={hasReadWrite(user)}
              alertsSortConfig={alertsSortConfig}
              alertsOffset={alertsOffset}
              alertsPerPage={alertsPerPage}
              alertsActivePage={alertsActivePage}
              alertReportsCount={alertReportsCount}
              sortHandler={requestAlertsSort}
              updateReportFilters={setAlertFilters}
              hasFilters={alertFilters.length > 0}
              handleDownloadAllAlerts={handleDownloadAllAlerts}
            />
            <Container className="landing inline-size maxw-full" padding={0}>
              <span className="smart-hub--table-controls">
                {numberOfSelectedReports > 0
                  && (
                  <span className="smart-hub--selected-tag margin-right-1">
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
                      <FontAwesomeIcon color="blue" inverse icon={faTimesCircle} />
                    </Button>
                  </span>
                  )}
                <Filter applyFilters={setFilters} />
                <ReportMenu
                  hasSelectedReports={numberOfSelectedReports > 0}
                  onExportAll={handleDownloadAllReports}
                  onExportSelected={handleDownloadClick}
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
                <Table className="usa-table usa-table--borderless usa-table--striped">
                  <caption>
                    Activity reports
                    <p id="arTblDesc">with sorting and pagination</p>
                  </caption>
                  <thead>
                    <tr>
                      <th className="width-8" aria-label="Select">
                        <Checkbox id="all-reports" label="" onChange={toggleSelectAll} checked={allReportsChecked} aria-label="Select or de-select all reports" />
                      </th>
                      {renderColumnHeader('Report ID', 'regionId')}
                      {renderColumnHeader('Grantee', 'activityRecipients')}
                      {renderColumnHeader('Start date', 'startDate')}
                      {renderColumnHeader('Creator', 'author')}
                      {renderColumnHeader('Topic(s)', 'topics')}
                      {renderColumnHeader('Collaborator(s)', 'collaborators')}
                      {renderColumnHeader('Last saved', 'updatedAt')}
                      {renderColumnHeader('Status', 'status')}
                      <th scope="col" aria-label="context menu" />
                    </tr>
                  </thead>
                  <tbody>
                    {renderReports(reports, history, reportCheckboxes, handleReportSelect)}
                  </tbody>
                </Table>
              </div>
            </Container>
          </>
        )}
      </UserContext.Consumer>
    </>
  );
}

export default Landing;
