/* eslint-disable react/forbid-prop-types */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useRef, useContext } from 'react';
import PropTypes from 'prop-types';
import { Tag, Table } from '@trussworks/react-uswds';
import { APPROVER_STATUSES, REPORT_STATUSES } from '@ttahub/common';
import { Link, useHistory } from 'react-router-dom';
import moment from 'moment';
import Modal from '../../components/Modal';
import Container from '../../components/Container';
import ContextMenu from '../../components/ContextMenu';
import NewReport from './NewReport';
import './index.scss';
import { ALERTS_PER_PAGE } from '../../Constants';
import { deleteReport } from '../../fetchers/activityReports';
import TooltipWithCollection from '../../components/TooltipWithCollection';
import Tooltip from '../../components/Tooltip';
import TableHeader from '../../components/TableHeader';
import { cleanupLocalStorage } from '../ActivityReport';
import UserContext from '../../UserContext';
import {
  PendingApprovalIcon,
  Closed as ApprovedIcon,
  NeedsActionIcon,
} from '../../components/icons';

const isCollaborator = (report, user) => {
  if (!report.activityReportCollaborators) return false;
  return report.activityReportCollaborators.find((u) => u.userId === user.id);
};

const isCreator = (report, user) => report.userId === user.id;

const ProperIcon = ({ approvalStatus }) => {
  switch (approvalStatus) {
    case APPROVER_STATUSES.APPROVED:
      return <ApprovedIcon />;
    case APPROVER_STATUSES.NEEDS_ACTION:
      return <NeedsActionIcon />;
    case APPROVER_STATUSES.PENDING:
    default:
      return <PendingApprovalIcon />;
  }
};

ProperIcon.propTypes = {
  approvalStatus: PropTypes.string,
};

ProperIcon.defaultProps = {
  approvalStatus: APPROVER_STATUSES.PENDING,
};

export function ReportsRow({ reports, removeAlert, message }) {
  const history = useHistory();
  const [idToDelete, updateIdToDelete] = useState(0);
  const modalRef = useRef();
  const { user } = useContext(UserContext);

  const onDelete = async (reportId) => {
    if (modalRef && modalRef.current) {
      modalRef.current.toggleModal(false);
    }
    await deleteReport(reportId);
    removeAlert(reportId);
    cleanupLocalStorage(reportId);
  };

  const tableRows = reports.map((report, index, { length }) => {
    const {
      id,
      displayId,
      activityRecipients,
      startDate,
      calculatedStatus,
      approvers,
      createdAt,
      creatorName,
      activityReportCollaborators,
    } = report;

    const recipients = activityRecipients.map((ar) => (
      ar.grant ? ar.grant.recipient.name : ar.otherEntity.name
    ));

    const approverNames = approvers ? approvers.sort((a, b) => (
      a.user.fullName.localeCompare(b.user.fullName)
    )).map((a) => (
      <span key={a.id}>
        <ProperIcon approvalStatus={a.status} />
        {a.user.fullName}
      </span>
    )) : [];

    const collaboratorNames = activityReportCollaborators
      ? activityReportCollaborators.map((collaborator) => (
        collaborator.fullName)) : [];

    const idKey = `my_alerts_${id}`;
    const idLink = `/activity-reports/${id}`;
    const contextMenuLabel = `View activity report ${id}`;
    let statusClassName = `smart-hub--table-tag-status smart-hub--status-${calculatedStatus}`;
    let displayStatus = calculatedStatus;

    const justSubmitted = message && Number(message.reportId) === id;
    if (justSubmitted) {
      displayStatus = 'Submitted';
      statusClassName = `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`;
    }

    if (calculatedStatus === REPORT_STATUSES.NEEDS_ACTION) {
      displayStatus = 'Needs action';
      statusClassName = `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.NEEDS_ACTION}`;
    }

    if (
      calculatedStatus !== REPORT_STATUSES.NEEDS_ACTION
      && approvers && approvers.length > 0
      && approvers.some((a) => a.status === APPROVER_STATUSES.APPROVED)
    ) {
      displayStatus = 'Reviewed';
      statusClassName = 'smart-hub--table-tag-status smart-hub--status-reviewed';
    }

    if (
      calculatedStatus !== REPORT_STATUSES.NEEDS_ACTION
      && approvers && approvers.length > 0
      && approvers.some((a) => a.status === APPROVER_STATUSES.NEEDS_ACTION)
    ) {
      displayStatus = 'Needs action';
      statusClassName = `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.NEEDS_ACTION}`;
    }

    if (
      calculatedStatus !== REPORT_STATUSES.APPROVED
      && approvers && approvers.length > 0
      && approvers.every((a) => a.status === APPROVER_STATUSES.APPROVED)
    ) {
      displayStatus = REPORT_STATUSES.APPROVED;
      statusClassName = `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.APPROVED}`;
    }

    const menuItems = [
      {
        label: 'View',
        onClick: () => { history.push(idLink); },
      },
    ];

    if (isCollaborator(report, user) || isCreator(report, user)) {
      menuItems.push({
        label: 'Delete',
        onClick: () => { updateIdToDelete(id); modalRef.current.toggleModal(true); },
      });
    }

    return (
      <tr key={idKey}>
        <td>
          <Link
            to={idLink}
          >
            {displayId}
          </Link>
        </td>
        <td label="Surname" type="text">
          <TooltipWithCollection collection={recipients} collectionTitle={`recipients for ${displayId}`} />
        </td>
        <td aria-label="start date">{startDate}</td>
        <td>
          { creatorName && (
          <Tooltip
            displayText={creatorName}
            tooltipText={creatorName}
            buttonLabel={`click to reveal: ${creatorName} `}
            screenReadDisplayText={false}
          />
          )}
        </td>
        <td>
          {moment(createdAt).format('MM/DD/YYYY')}
        </td>
        <td aria-label="??">
          <TooltipWithCollection collection={collaboratorNames} collectionTitle={`collaborators for ${displayId}`} />
        </td>
        <td className="ttahub-approver-cell">
          <div className="display-flex flex-column flex-justify">
            {approverNames}
          </div>
        </td>
        <td>
          <Tag
            className={statusClassName}
          >
            {displayStatus}
          </Tag>
        </td>
        <td>
          <ContextMenu
            label={contextMenuLabel}
            menuItems={menuItems}
            menuWidthOffset={110}
            menuHeightOffset={80}
            up={index + 1 === length}
            fixed
          />
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
  // eslint-disable-next-line react/forbid-prop-types
  reports: PropTypes.arrayOf(PropTypes.object).isRequired,
  removeAlert: PropTypes.func.isRequired,
  message: PropTypes.shape({
    time: PropTypes.string,
    reportId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
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
    updateReportFilters,
    updateReportAlerts,
    setAlertReportsCount,
    handleDownloadAllAlerts,
    loading,
    isDownloadingAlerts,
    downloadAlertsError,
    setDownloadAlertsError,
    downloadAllAlertsButtonRef,
    downloadSelectedAlertsButtonRef,
    message,
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
      {reports && reports.length === 0 && (
        <Container className="landing" paddingX={0} paddingY={0} loading={loading}>
          <div className="text-center padding-10">
            <div>
              <h2>You&apos;re all caught up!</h2>
            </div>
            {newBtn && (
              <p className="padding-bottom-2">
                Would you like to begin a new activity report?
              </p>
            )}
            {newBtn && <NewReport />}
          </div>
        </Container>
      )}

      {reports && (reports.length > 0) && (
        <Container className="landing inline-size-auto maxw-full" paddingX={0} paddingY={0} loading={loading} loadingLabel="My activity report alerts loading">
          <TableHeader
            title="My activity report alerts"
            menuAriaLabel="My alerts report menu"
            forMyAlerts
            onUpdateFilters={updateReportFilters}
            handleDownloadAll={handleDownloadAllAlerts}
            count={alertReportsCount}
            activePage={alertsActivePage}
            offset={alertsOffset}
            perPage={alertsPerPage}
            hidePagination
            isDownloading={isDownloadingAlerts}
            downloadError={downloadAlertsError}
            setDownloadError={setDownloadAlertsError}
            downloadAllButtonRef={downloadAllAlertsButtonRef}
            downloadSelectedButtonRef={downloadSelectedAlertsButtonRef}
            exportIdPrefix="my-alerts-"
          />
          <div className="usa-table-container--scrollable">
            <Table fullWidth striped>
              <caption className="smart-hub--table-caption usa-sr-only">
                My activity report alerts with sorting
              </caption>
              <thead>
                <tr>
                  {renderColumnHeader('Report ID', 'regionId')}
                  {renderColumnHeader('Recipient', 'activityRecipients')}
                  {renderColumnHeader('Date started', 'startDate')}
                  {renderColumnHeader('Creator', 'author')}
                  {renderColumnHeader('Created date', 'createdAt')}
                  {renderColumnHeader('Collaborators', 'collaborators')}
                  {renderColumnHeader('Approvers', 'approvals', true)}
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
  // eslint-disable-next-line react/forbid-prop-types
  reports: PropTypes.arrayOf(PropTypes.object),
  newBtn: PropTypes.bool.isRequired,
  alertsSortConfig: PropTypes.shape({ sortBy: PropTypes.string, direction: PropTypes.string }),
  alertsOffset: PropTypes.number,
  alertsPerPage: PropTypes.number,
  alertsActivePage: PropTypes.number,
  alertReportsCount: PropTypes.number.isRequired,
  sortHandler: PropTypes.func.isRequired,
  updateReportFilters: PropTypes.func,
  updateReportAlerts: PropTypes.func.isRequired,
  setAlertReportsCount: PropTypes.func.isRequired,
  handleDownloadAllAlerts: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  isDownloadingAlerts: PropTypes.bool,
  downloadAlertsError: PropTypes.bool,
  setDownloadAlertsError: PropTypes.func.isRequired,
  downloadAllAlertsButtonRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  ]),
  downloadSelectedAlertsButtonRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  ]),
  message: PropTypes.shape({
    time: PropTypes.string,
    reportId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    displayId: PropTypes.string,
    status: PropTypes.string,
  }),
};

MyAlerts.defaultProps = {
  updateReportFilters: () => { },
  reports: [],
  alertsSortConfig: { sortBy: 'startDate', direction: 'asc' },
  alertsOffset: 0,
  alertsPerPage: ALERTS_PER_PAGE,
  alertsActivePage: 1,
  isDownloadingAlerts: false,
  downloadAlertsError: false,
  downloadAllAlertsButtonRef: () => {},
  downloadSelectedAlertsButtonRef: () => {},
  message: {
    time: '',
    reportId: '',
    displayId: '',
    status: '',
  },
};

export default MyAlerts;
