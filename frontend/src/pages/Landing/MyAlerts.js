/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Tag, Table, useModal, connectModal,
} from '@trussworks/react-uswds';
import { Link, useHistory } from 'react-router-dom';

import DeleteReportModal from '../../components/DeleteReportModal';
import Container from '../../components/Container';
import ContextMenu from '../../components/ContextMenu';
import NewReport from './NewReport';
import 'uswds/dist/css/uswds.css';
import '@trussworks/react-uswds/lib/index.css';
import './index.css';
import { ALERTS_PER_PAGE } from '../../Constants';
import { deleteReport } from '../../fetchers/activityReports';
import Filter from './Filter';

function renderReports(reports, fetchReports) {
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

    const collaboratorsTitle = collaborators ? collaborators.reduce(
      (result, collaborator) => `${result + collaborator.fullName}\n`,
      '',
    ) : '';

    const collaboratorsWithTags = collaborators ? collaborators.map((collaborator) => (
      <Tag
        key={collaborator.id + Math.random().toString(36).substring(7)}
        className="smart-hub--table-collection"
      >
        {collaborator.fullName}
      </Tag>
    )) : '';

    const history = useHistory();
    const idKey = `my_alerts_${id}`;
    const idLink = `/activity-reports/${id}`;
    const contextMenuLabel = `View activity report ${id}`;
    const statusClassName = `smart-hub--table-tag-status smart-hub--status-${status}`;

    const { isOpen, openModal, closeModal } = useModal();
    const onDelete = (reportId) => {
      deleteReport(reportId);
      fetchReports();
      closeModal();
    };
    const ConnectModal = connectModal(DeleteReportModal);

    const menuItems = [
      {
        label: 'View',
        onClick: () => { history.push(idLink); },
      },
      {
        label: 'Delete',
        onClick: () => { openModal(); },
      },
    ];

    return (
      <>
        <ConnectModal
          onDelete={() => onDelete(id)}
          onClose={closeModal}
          isOpen={isOpen}
          openModal={openModal}
          closeModal={closeModal}
        />

        <tr key={idKey}>
          <td>
            <Link
              to={idLink}
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
            <span className="smart-hub--ellipsis" title={author ? author.fullName : ''}>
              {author ? author.fullName : ''}
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
          <td>
            <ContextMenu label={contextMenuLabel} menuItems={menuItems} />
          </td>
        </tr>
      </>
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
    fetchReports,
    hasFilters,
    updateReportFilters,
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

  return (
    <>
      {reports && reports.length === 0 && !hasFilters && (
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

      {reports && (reports.length > 0 || hasFilters) && (
      <Container className="landing inline-size maxw-full" padding={0}>
        <span className="smart-hub--table-nav">
          <Filter
            className="float-left"
            applyFilters={updateReportFilters}
            forMyAlerts
          />
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
        </span>
        <div className="usa-table-container--scrollable">
          <Table className="usa-table usa-table--borderless" fullWidth>
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
                <th scope="col" aria-label="..." />
              </tr>
            </thead>
            <tbody>{renderReports(reports, fetchReports)}</tbody>
          </Table>
        </div>
      </Container>
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
  fetchReports: PropTypes.func.isRequired,
  hasFilters: PropTypes.bool,
  updateReportFilters: PropTypes.func.isRequired,
};

MyAlerts.defaultProps = {
  reports: [],
  alertsSortConfig: { sortBy: 'startDate', direction: 'asc' },
  alertsOffset: 0,
  alertsPerPage: ALERTS_PER_PAGE,
  alertsActivePage: 1,
  hasFilters: false,
};

export default MyAlerts;
