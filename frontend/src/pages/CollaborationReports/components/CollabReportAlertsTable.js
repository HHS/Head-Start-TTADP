import React, { useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { REPORT_STATUSES } from '@ttahub/common/src/constants';
import { Tag } from '@trussworks/react-uswds';
import { Link, useHistory } from 'react-router-dom';
import CollabReportApproverTableDisplay from '../../../components/CollabReportApproverTableDisplay';
import Container from '../../../components/Container';
import WidgetContainer from '../../../components/WidgetContainer';
import HorizontalTableWidget from '../../../widgets/HorizontalTableWidget';
import Modal from '../../../components/Modal';
import { DATE_DISPLAY_FORMAT } from '../../../Constants';
import { getCollabReportStatusDisplayAndClassnames } from '../../../utils';
import TooltipWithCollection from '../../../components/TooltipWithCollection';
import UserContext from '../../../UserContext';
import { deleteReport as deleteReportById } from '../../../fetchers/collaborationReports';

export const getReportLink = (report, userId) => {
  const isSubmitted = report.submissionStatus === REPORT_STATUSES.SUBMITTED;
  const isApprover = report.approvers.some(({ user }) => user.id === userId);
  const isNeedsAction = report.calculatedStatus === REPORT_STATUSES.NEEDS_ACTION;
  const isCreator = report.author.id === userId;

  if (isCreator && isNeedsAction) {
    return `/collaboration-reports/${report.id}/review`;
  }

  if (isSubmitted && !isApprover && !isNeedsAction) {
    return `/collaboration-reports/view/${report.id}`;
  }

  if (isSubmitted && isApprover) {
    return `/collaboration-reports/${report.id}/review`;
  }

  return report.link;
};

export const ReportLink = ({ report, userId }) => {
  const link = getReportLink(report, userId);

  return <Link to={link}>{report.displayId}</Link>;
};

ReportLink.propTypes = {
  userId: PropTypes.number.isRequired,
  report: PropTypes.shape({
    author: PropTypes.shape({
      id: PropTypes.number,
    }),
    id: PropTypes.number,
    link: PropTypes.string,
    displayId: PropTypes.string,
    submissionStatus: PropTypes.string,
    calculatedStatus: PropTypes.string,
    approvers: PropTypes.arrayOf(PropTypes.shape({
      userId: PropTypes.number,
    })),
  }).isRequired,
};

const DeleteReportModal = ({
  modalRef,
  onReportRemoved,
  report,
}) => {
  const onDeleteReport = () => {
    // istanbul ignore next - tested elsewhere
    onReportRemoved(report);
    modalRef.current.toggleModal(false);
  };

  return (
    <>
      <Modal
        modalRef={modalRef}
        onOk={onDeleteReport}
        modalId="DeleteReportModal"
        title="Are you sure you want to delete the report?"
        okButtonText="Delete"
        okButtonAriaLabel="Confirm delete and reload page"
        showCloseX
      >
        <p>This action cannot be undone.</p>
      </Modal>
    </>
  );
};

DeleteReportModal.propTypes = {
  modalRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape(),
  ]).isRequired,
  onReportRemoved: PropTypes.func.isRequired,
  report: PropTypes.shape({
    id: PropTypes.number,
    userId: PropTypes.number,
  }),
};

DeleteReportModal.defaultProps = {
  report: null,
};

const CollabReportAlertsTable = ({
  emptyMsg,
  loading,
  offset,
  showCreateMsgOnEmpty,
  title,
  data,
  requestSort,
  sortConfig,
}) => {
  const { user: { id: userId } } = useContext(UserContext);
  const [reportToDelete, setReportToDelete] = React.useState(null);
  const modalRef = React.useRef();
  const history = useHistory();

  const isCreatorOrCollaborator = (report) => {
    const isCreator = report.author.id === userId;
    const isCollaborator = report.collaboratingSpecialists.some((c) => c.id === userId);
    return isCreator || isCollaborator;
  };

  const handleDelete = (report) => {
    setReportToDelete(report);
    modalRef.current.toggleModal(true);
  };

  const handleRowActionClick = (action, row) => {
    if (action === 'View') {
      const link = getReportLink(row, userId);
      history.push(link);
    } else if (action === 'Delete') {
      handleDelete(row);
    }
  };

  const deleteReport = async (report) => {
    try {
      await deleteReportById(report.id);
      window.location.reload();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error deleting report:', err);
    }
  };

  const tabularData = useMemo(() => data.rows.map((r) => ({
    heading: <ReportLink userId={userId} report={r} />,
    id: r.id,
    data: [
      {
        title: 'Activity name',
        value: r.name,
        tooltip: r.name,
      },
      {
        title: 'Date started',
        value: r.startDate,
      },
      {
        title: 'Creator',
        value: r.author.fullName,
        tooltip: r.author.fullName,
      },
      {
        title: 'Created date',
        value: moment(r.createdAt).format(DATE_DISPLAY_FORMAT),
      },
      {
        title: 'Collaborators',
        value: <TooltipWithCollection collection={r.collaboratingSpecialists.map((c) => c.fullName)} collectionTitle={`collaborators for ${r.displayId}`} />,
      },
      {
        title: 'Approvers',
        value: <CollabReportApproverTableDisplay
          approvers={r.approvers}
        />,
      },
      {
        value: (() => {
          const { displayStatus, statusClassName } = getCollabReportStatusDisplayAndClassnames(
            userId,
            r,
          );
          return (
            <Tag
              className={statusClassName}
            >
              {displayStatus}
            </Tag>
          );
        }
        )(),
      },
    ],
    actions: isCreatorOrCollaborator(r) ? [
      { label: 'View', onClick: () => handleRowActionClick('View', r) },
      { label: 'Delete', onClick: () => handleRowActionClick('Delete', r) },
    ] : [
      { label: 'View', onClick: () => handleRowActionClick('View', r) },
    ],
  })), [data.rows, userId, isCreatorOrCollaborator]);

  return (
    <>
      <WidgetContainer
        title={title}
        className="collab-alerts-table-container"
        // enableCheckboxes
        showPagingBottom={false}
        showPagingTop={false}
        loading={loading}
        loadingLabel="Collaboration reports table loading"
        totalCount={data.count}
        offset={offset}
        perPage={10}
        titleMargin={{ bottom: 3 }}
      >
        { data.rows.length === 0 && (
        <Container className="landing" paddingX={0} paddingY={0}>
          <div className="text-center padding-10">
            <p className="usa-prose text-center bold">
              <strong>{ emptyMsg }</strong>
              { showCreateMsgOnEmpty && (
              <>
                <br />
                Document your work connecting Head Start programs with state-level systems.
                <br />
                To get started, click the &quot;New Collaboration Report&quot; button.
              </>
              )}
            </p>
          </div>
        </Container>
        )}
        { data.rows.length > 0 && (
        <HorizontalTableWidget
          headers={[
            'Activity name',
            'Date started',
            'Creator',
            'Created date',
            'Collaborators',
            'Approvers',
            'Status',
          ]}
          data={tabularData}
          firstHeading="Report ID"
          enableSorting
          sortConfig={sortConfig}
          requestSort={requestSort}
          showTotalColumn={false}
          showDashForNullValue
        />
        )}
      </WidgetContainer>
      <DeleteReportModal
        report={reportToDelete}
        modalRef={modalRef}
        onReportRemoved={deleteReport}
      />
    </>
  );
};

CollabReportAlertsTable.defaultProps = {
  offset: 0,
  loading: false,
  emptyMsg: 'You have no Collaboration Reports',
  showCreateMsgOnEmpty: false,
};

CollabReportAlertsTable.propTypes = {
  emptyMsg: PropTypes.string,
  loading: PropTypes.bool,
  offset: PropTypes.number,
  data: PropTypes.shape({
    rows: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number })),
    count: PropTypes.number,
  }).isRequired,
  // setData: PropTypes.func.isRequired,
  requestSort: PropTypes.func.isRequired,
  sortConfig: PropTypes.shape({}).isRequired,
  showCreateMsgOnEmpty: PropTypes.bool,
  title: PropTypes.string.isRequired,

};

export default CollabReportAlertsTable;
