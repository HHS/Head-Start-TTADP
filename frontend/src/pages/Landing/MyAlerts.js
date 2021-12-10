/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Tag, Table } from '@trussworks/react-uswds';
import { Link, useHistory } from 'react-router-dom';
import moment from 'moment';
import Modal from '../../components/Modal';
import Container from '../../components/Container';
import ContextMenu from '../../components/ContextMenu';
import NewReport from './NewReport';
import 'uswds/dist/css/uswds.css';
import '@trussworks/react-uswds/lib/index.css';
import './index.css';
import { ALERTS_PER_PAGE } from '../../Constants';
import { deleteReport } from '../../fetchers/activityReports';
import TooltipWithCollection from '../../components/TooltipWithCollection';
import Tooltip from '../../components/Tooltip';
import TableHeader from '../../components/TableHeader';

export function ReportsRow({ reports, removeAlert, message }) {
  const history = useHistory();
  const [idToDelete, updateIdToDelete] = useState(0);
  const modalRef = useRef();

  const onDelete = async (reportId) => {
    if (modalRef && modalRef.current) {
      modalRef.current.toggleModal(false);
    }
    await deleteReport(reportId);
    removeAlert(reportId);
  };

  const tableRows = reports.map((report, index, { length }) => {
    const {
      id,
      displayId,
      activityRecipients,
      startDate,
      author,
      collaborators,
      calculatedStatus,
      pendingApprovals,
      approvers,
      createdAt,
    } = report;

    const justSubmitted = message && message.reportId === id;

    const recipients = activityRecipients.map((ar) => (
      ar.grant ? ar.grant.grantee.name : ar.name
    ));

    const approversToolTipText = approvers ? approvers.map((a) => a.User.fullName) : [];

    const collaboratorNames = collaborators && collaborators.map((collaborator) => (
      collaborator.fullName));

    const idKey = `my_alerts_${id}`;
    const idLink = `/activity-reports/${id}`;
    const contextMenuLabel = `View activity report ${id}`;
    let statusClassName = `smart-hub--table-tag-status smart-hub--status-${calculatedStatus}`;
    let displayStatus = calculatedStatus === 'needs_action' ? 'Needs action' : calculatedStatus;

    if (justSubmitted && message.status !== calculatedStatus) {
      displayStatus = message.status === 'unlocked' ? 'Needs action' : message.status;
      statusClassName = `smart-hub--table-tag-status smart-hub--status-${message.status === 'unlocked' ? 'needs_action' : message.status}`;
    }
    const menuItems = [
      {
        label: 'View',
        onClick: () => { history.push(idLink); },
      },
      {
        label: 'Delete',
        onClick: () => { updateIdToDelete(id); modalRef.current.toggleModal(true); },
      },
    ];

    return (
      <tr key={idKey}>
        <td>
          <Link
            to={idLink}
          >
            {displayId}
          </Link>
        </td>
        <td>
          <TooltipWithCollection collection={recipients} collectionTitle={`recipients for ${displayId}`} />
        </td>
        <td>{startDate}</td>
        <td>
          { author && (
          <Tooltip
            displayText={author.fullName}
            tooltipText={author.fullName}
            buttonLabel={`click to reveal: ${author.fullName} `}
            screenReadDisplayText={false}
          />
          )}
        </td>
        <td>
          {moment(createdAt).format('MM/DD/YYYY')}
        </td>
        <td>
          <TooltipWithCollection collection={collaboratorNames} collectionTitle={`collaborators for ${displayId}`} />
        </td>
        <td>
          {approversToolTipText.length > 0
            ? (
              <Tooltip
                displayText={pendingApprovals}
                tooltipText={approversToolTipText.join('\n')}
                buttonLabel={`pending approvals: ${approversToolTipText}. Click button to visually reveal this information.`}
              />
            )
            : ''}
        </td>
        <td>
          <Tag
            className={statusClassName}
          >
            {displayStatus}
          </Tag>
        </td>
        <td>
          <ContextMenu label={contextMenuLabel} menuItems={menuItems} up={index + 1 === length} />
        </td>
      </tr>
    );
  });

  return (
    <>
      <Modal
        modalRef={modalRef}
        onOk={() => onDelete(idToDelete)}
        modalId="DeleteReportModal"
        title="Delete Activity Report"
        okButtonText="Delete"
        okButtonAriaLabel="This button will permanently delete the report."
      >
        <div>
          Are you sure you want to delete this activity report?
          <br />
          This action
          {' '}
          <b>cannot</b>
          {' '}
          be undone.
        </div>
      </Modal>
      {tableRows}
    </>
  );
}

ReportsRow.propTypes = {
  reports: PropTypes.arrayOf(PropTypes.object).isRequired,
  removeAlert: PropTypes.func.isRequired,
  message: PropTypes.shape({
    time: PropTypes.string,
    reportId: PropTypes.string,
    displayId: PropTypes.string,
    status: PropTypes.string,
  }),
};

ReportsRow.defaultProps = {
  message: {
    time: '',
    reportId: '',
    displayId: '',
    status: '',
  },
};

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
    hasFilters,
    updateReportFilters,
    updateReportAlerts,
    setAlertReportsCount,
    handleDownloadAllAlerts,
    loading,
    message,
    showFilter,
  } = props;
  const getClassNamesFor = (name) => (alertsSortConfig.sortBy === name ? alertsSortConfig.direction : '');

  const renderColumnHeader = (displayName, name, disableSort = false) => {
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
        {
          disableSort
            ? displayName
            : (
              <a
                role="button"
                tabIndex={0}
                onClick={() => {
                  sortHandler(name);
                }}
                onKeyPress={() => sortHandler(name)}
                className={`sortable ${sortClassName}`}
                aria-label={`${displayName}. Activate to sort ${sortClassName === 'asc' ? 'descending' : 'ascending'
                }`}
              >
                {displayName}
              </a>
            )
        }
      </th>
    );
  };

  const removeAlert = (id) => {
    const newReports = reports.filter((report) => report.id !== id);
    setAlertReportsCount(alertReportsCount - 1);
    updateReportAlerts(newReports);
  };

  return (
    <>
      {reports && reports.length === 0 && !hasFilters && (
        <Container className="landing" padding={0} loading={loading}>
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
        <Container className="landing inline-size maxw-full" padding={0} loading={loading} loadingLabel="My activity report alerts loading">
          <TableHeader
            title="My activity report alerts"
            menuAriaLabel="My alerts report menu"
            showFilter={showFilter}
            forMyAlerts
            onUpdateFilters={updateReportFilters}
            handleDownloadAll={handleDownloadAllAlerts}
            count={alertReportsCount}
            activePage={alertsActivePage}
            offset={alertsOffset}
            perPage={alertsPerPage}
            hidePagination
          />
          <div className="usa-table-container--scrollable">
            <Table fullWidth striped>
              <caption className="smart-hub--table-caption usa-sr-only">
                My activity report alerts with sorting
              </caption>
              <thead>
                <tr>
                  {renderColumnHeader('Report ID', 'regionId')}
                  {renderColumnHeader('Grantee', 'activityRecipients')}
                  {renderColumnHeader('Start date', 'startDate')}
                  {renderColumnHeader('Creator', 'author')}
                  {renderColumnHeader('Created date', 'createdAt')}
                  {renderColumnHeader('Collaborator(s)', 'collaborators')}
                  {renderColumnHeader('Approvers(s)', 'approvals', true)}
                  {renderColumnHeader('Status', 'calculatedStatus')}
                  <th scope="col" aria-label="..." />
                </tr>
              </thead>
              <tbody>
                <ReportsRow reports={reports} removeAlert={removeAlert} message={message} />
              </tbody>
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
  hasFilters: PropTypes.bool,
  updateReportFilters: PropTypes.func,
  updateReportAlerts: PropTypes.func.isRequired,
  setAlertReportsCount: PropTypes.func.isRequired,
  handleDownloadAllAlerts: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  message: PropTypes.shape({
    time: PropTypes.string,
    reportId: PropTypes.string,
    displayId: PropTypes.string,
    status: PropTypes.string,
  }),
  showFilter: PropTypes.bool.isRequired,
};

MyAlerts.defaultProps = {
  updateReportFilters: () => { },
  reports: [],
  alertsSortConfig: { sortBy: 'startDate', direction: 'asc' },
  alertsOffset: 0,
  alertsPerPage: ALERTS_PER_PAGE,
  alertsActivePage: 1,
  hasFilters: false,
  message: {
    time: '',
    reportId: '',
    displayId: '',
    status: '',
  },
};

export default MyAlerts;
