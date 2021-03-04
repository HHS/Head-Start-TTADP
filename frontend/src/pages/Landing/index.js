import React, { useState, useEffect } from 'react';
import {
  Tag, Table, Alert, Grid,
} from '@trussworks/react-uswds';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import SimpleBar from 'simplebar-react';
import 'simplebar/dist/simplebar.min.css';
import Pagination from 'react-js-pagination';

import UserContext from '../../UserContext';
import Container from '../../components/Container';
import { getReports, getReportAlerts } from '../../fetchers/activityReports';
import NewReport from './NewReport';
import 'uswds/dist/css/uswds.css';
import '@trussworks/react-uswds/lib/index.css';
import './index.css';
import MyAlerts from './MyAlerts';
import { hasReadWrite } from '../../permissions';
import { REPORTS_PER_PAGE, ALERTS_PER_PAGE } from '../../Constants';

function renderReports(reports) {
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

  return displayReports.map((report) => {
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

    return (
      <tr key={`landing_${id}`}>
        <th scope="row">
          <Link
            to={`/activity-reports/${id}/activity-summary`}
            href={`/activity-reports/${id}/activity-summary`}
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
          <button type="button" className="smart-hub--dotdotdot">
            ...
          </button>
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [reports, updateReports] = useState([]);
  const [reportAlerts, updateReportAlerts] = useState([]);
  const [error, updateError] = useState();
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
      try {
        const { count, rows } = await getReports(
          sortConfig.sortBy,
          sortConfig.direction,
          offset,
          perPage,
        );
        const { alertsCount, alerts } = await getReportAlerts(
          alertsSortConfig.sortBy,
          alertsSortConfig.direction,
          alertsOffset,
          alertsPerPage,
        );
        updateReports(rows);
        if (count) {
          setReportsCount(count);
        }
        updateReportAlerts(alerts);
        if (alertsCount) {
          setAlertReportsCount(alertsCount);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
        updateError('Unable to fetch reports');
      }
      setIsLoaded(true);
    }
    fetchReports();
  }, [sortConfig, offset, perPage, alertsSortConfig, alertsOffset, alertsPerPage]);

  const getClassNamesFor = (name) => (sortConfig.sortBy === name ? sortConfig.direction : '');

  const handlePageChange = (pageNumber) => {
    setActivePage(pageNumber);
    setOffset((pageNumber - 1) * perPage);
  };

  const handleAlertsPageChange = (pageNumber) => {
    setAlertsActivePage(pageNumber);
    setAlertsOffset((pageNumber - 1) * alertsPerPage);
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Helmet>
        <title>Landing</title>
      </Helmet>
      <UserContext.Consumer>
        {({ user }) => (
          <>
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
              handlePageChange={handleAlertsPageChange}
            />
            <SimpleBar>
              <Container className="landing inline-size" padding={0}>
                <Table className="usa-table usa-table--borderless usa-table--striped">
                  <caption>
                    Activity reports
                    <span className="smart-hub--table-nav">
                      <span className="smart-hub--total-count">
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
                        />
                      </span>
                    </span>
                  </caption>
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        onClick={() => {
                          requestSort('regionId');
                        }}
                        className={getClassNamesFor('regionId')}
                      >
                        Report ID
                      </th>
                      <th
                        scope="col"
                        onClick={() => {
                          requestSort('activityRecipients');
                        }}
                        className={getClassNamesFor('activityRecipients')}
                      >
                        Grantee
                      </th>
                      <th
                        scope="col"
                        onClick={() => {
                          requestSort('startDate');
                        }}
                        className={getClassNamesFor('startDate')}
                      >
                        Start date
                      </th>
                      <th
                        scope="col"
                        onClick={() => {
                          requestSort('author');
                        }}
                        className={getClassNamesFor('author')}
                      >
                        Creator
                      </th>
                      <th
                        scope="col"
                        onClick={() => {
                          requestSort('topics');
                        }}
                        className={getClassNamesFor('topics')}
                      >
                        Topic(s)
                      </th>
                      <th
                        scope="col"
                        onClick={() => {
                          requestSort('collaborators');
                        }}
                        className={getClassNamesFor('collaborators')}
                      >
                        Collaborator(s)
                      </th>
                      <th
                        scope="col"
                        onClick={() => {
                          requestSort('updatedAt');
                        }}
                        className={getClassNamesFor('updatedAt')}
                      >
                        Last saved
                      </th>
                      <th
                        scope="col"
                        onClick={() => {
                          requestSort('status');
                        }}
                        className={getClassNamesFor('status')}
                      >
                        Status
                      </th>
                      <th scope="col" aria-label="..." />
                    </tr>
                  </thead>
                  <tbody>{renderReports(reports)}</tbody>
                </Table>
              </Container>
            </SimpleBar>
          </>
        )}
      </UserContext.Consumer>
    </>
  );
}

export default Landing;
