/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import PropTypes from 'prop-types';
import { Tag, Table } from '@trussworks/react-uswds';
import { Link } from 'react-router-dom';
import SimpleBar from 'simplebar-react';
import 'simplebar/dist/simplebar.min.css';

import Container from '../../components/Container';
import NewReport from './NewReport';
import 'uswds/dist/css/uswds.css';
import '@trussworks/react-uswds/lib/index.css';
import './index.css';

function renderReports(reports) {
  return reports.map((report) => {
    const {
      id,
      displayId,
      activityRecipients,
      startDate,
      author,
      collaborators,
      status,
    } = report;

    const recipientsTitle = activityRecipients.reduce(
      (result, ar) => `${result + (ar.grant ? ar.grant.grantee.name : ar.name)}\n`,
      '',
    );

    const recipients = activityRecipients.map((ar) => (
      <Tag
        key={ar.name.slice(1, 3) + ar.id}
        className="smart-hub--table-collection"
      >
        {ar.grant ? ar.grant.grantee.name : ar.name}
      </Tag>
    ));

    const collaboratorsTitle = collaborators.reduce(
      (result, collaborator) => `${result + collaborator.fullName}\n`,
      '',
    );

    const collaboratorsWithTags = collaborators.map((collaborator) => (
      <Tag
        key={collaborator.fullName.slice(1, 3) + collaborator.id}
        className="smart-hub--table-collection"
      >
        {collaborator.fullName}
      </Tag>
    ));

    const idKey = `my_alerts_${id}`;
    const idLink = `/activity-reports/${id}`;
    const statusClassName = `smart-hub--table-tag-status smart-hub--status-${status}`;

    return (
      <tr key={idKey}>
        <td>
          <Link
            to={idLink}
            href={idLink}
          >
            {displayId}
          </Link>
        </td>
        <td>
          <span className="smart-hub--ellipsis" title={recipientsTitle}>
            {recipients}
          </span>
        </td>
        <td>{startDate}</td>
        <td>
          <span className="smart-hub--ellipsis" title={author.fullName}>
            {author.fullName}
          </span>
        </td>
        <td>
          <span className="smart-hub--ellipsis" title={collaboratorsTitle}>
            {collaboratorsWithTags}
          </span>
        </td>
        <td>
          <Tag
            className={statusClassName}
          >
            {status === 'needs_action' ? 'Needs action' : status}
          </Tag>
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

function MyAlerts(props) {
  const {
    reports,
    newBtn,
    alertsSortConfig,
    alertsOffset,
    alertsPerPage,
    alertsActivePage,
    alertReportsCount,
    sortHandler,
  } = props;
  const getClassNamesFor = (name) => (alertsSortConfig.sortBy === name ? alertsSortConfig.direction : '');

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
            sortHandler(name);
          }}
          onKeyPress={() => sortHandler(name)}
          className={sortClassName}
          aria-label={`${displayName}. Activate to sort ${
            sortClassName === 'asc' ? 'descending' : 'ascending'
          }`}
        >
          {displayName}
        </a>
      </th>
    );
  };

  return (
    <>
      {reports && reports.length === 0 && (
        <Container className="landing" padding={0}>
          <div id="caughtUp">
            <div>
              <h2>You&apos;re all caught up!</h2>
            </div>
            {newBtn && (
              <p id="beginNew">
                Would you like to begin a new activity report?
              </p>
            )}
            {newBtn && <NewReport />}
          </div>
        </Container>
      )}
      {reports && reports.length > 0 && (
        <SimpleBar>
          <Container className="landing inline-size" padding={0}>
            <span
              id="alertsTotalCount"
              aria-label={`Displaying rows ${renderTotal(
                alertsOffset,
                alertsPerPage,
                alertsActivePage,
                alertReportsCount,
              )}`}
            >
              {renderTotal(
                alertsOffset,
                alertsPerPage,
                alertsActivePage,
                alertReportsCount,
              )}
            </span>

            <Table bordered={false}>
              <caption className="smart-hub--table-caption">
                My activity report alerts
                <p id="arTblDesc">with sorting</p>
              </caption>
              <thead>
                <tr>
                  {renderColumnHeader('Report ID', 'regionId')}
                  {renderColumnHeader('Grantee', 'activityRecipients')}
                  {renderColumnHeader('Start date', 'startDate')}
                  {renderColumnHeader('Creator', 'author')}
                  {renderColumnHeader('Collaborator(s)', 'collaborators')}
                  {renderColumnHeader('Status', 'status')}
                </tr>
              </thead>
              <tbody>{renderReports(reports)}</tbody>
            </Table>
          </Container>
        </SimpleBar>
      )}
    </>
  );
}

MyAlerts.propTypes = {
  reports: PropTypes.arrayOf(PropTypes.object),
  newBtn: PropTypes.bool.isRequired,
  alertsSortConfig: PropTypes.shape({ sortBy: PropTypes.string, direction: PropTypes.string }),
  alertsOffset: PropTypes.number,
  alertsPerPage: PropTypes.number,
  alertsActivePage: PropTypes.number,
  alertReportsCount: PropTypes.number.isRequired,
  sortHandler: PropTypes.func.isRequired,
};

MyAlerts.defaultProps = {
  reports: [],
  alertsSortConfig: { sortBy: 'startDate', direction: 'asc' },
  alertsOffset: 0,
  alertsPerPage: 7,
  alertsActivePage: 1,
};

export default MyAlerts;
