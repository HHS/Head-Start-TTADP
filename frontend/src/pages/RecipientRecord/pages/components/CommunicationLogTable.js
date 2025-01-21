import React, { useContext, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import HorizontalTableWidget from '../../../../widgets/HorizontalTableWidget';
import './CommunicationLogTable.scss';
import UserContext from '../../../../UserContext';
import Modal from '../../../../components/Modal';
import { deleteCommunicationLogById } from '../../../../fetchers/communicationLog';

const DeleteLogModal = ({
  modalRef,
  onLogRemoved,
  log,
}) => {
  const onDeleteLog = () => {
    onLogRemoved(log)
      .then(modalRef.current.toggleModal(false));
  };

  return (
    <>
      <Modal
        modalRef={modalRef}
        onOk={onDeleteLog}
        modalId="DeleteLogModal"
        title="Are you sure you want to delete this log?"
        okButtonText="Delete"
        okButtonAriaLabel="Confirm delete"
        showCloseX
      >
        <p>This action cannot be undone.</p>
      </Modal>
    </>
  );
};

DeleteLogModal.propTypes = {
  modalRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape(),
  ]).isRequired,
  onLogRemoved: PropTypes.func.isRequired,
  log: PropTypes.shape({
    id: PropTypes.number,
    displayId: PropTypes.string,
    data: PropTypes.shape({
      communicationDate: PropTypes.string,
      purpose: PropTypes.string,
      result: PropTypes.string,
    }),
    userId: PropTypes.number,
  }),
};

DeleteLogModal.defaultProps = {
  log: null,
};

export default function CommunicationLogTable({
  requestSort,
  sortConfig,
  logs,
  recipientId,
  regionId,
}) {
  const { user } = useContext(UserContext);
  const history = useHistory();
  const modalRef = useRef();
  const [logToDelete, setLogToDelete] = useState(null);

  const handleDelete = (log) => {
    setLogToDelete(log);
    modalRef.current.toggleModal(true);
  };

  const deleteLog = async (log) => {
    try {
      await deleteCommunicationLogById(log.id);
      window.location.reload();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error deleting log:', err);
    }
  };

  const handleRowActionClick = (action, row) => {
    if (action === 'View') {
      history.push(`/recipient-tta-records/${recipientId}/region/${regionId}/communication/${row.id}/view`);
    } else if (action === 'Delete') {
      handleDelete(row);
    }
  };

  const headers = ['Date', 'Purpose', 'Goals', 'Creator name', 'Other TTA staff', 'Result'];

  const data = logs.map((log) => {
    const actions = [
      { label: 'View', onClick: () => handleRowActionClick('View', log) },
    ];

    if (log.userId === user.id) {
      actions.push({ label: 'Delete', onClick: () => handleRowActionClick('Delete', log) });
    }

    return {
      heading: log.displayId,
      isUrl: true,
      isInternalLink: true,
      link: `/recipient-tta-records/${recipientId}/region/${regionId}/communication/${log.id}/view`,
      data: [
        { title: 'Date', value: log.data.communicationDate },
        { title: 'Purpose', value: log.data.purpose },
        { title: 'Goals', value: (log.data.goals || []).map((g) => g.label).join(', ') },
        { title: 'Creator name', value: log.authorName },
        { title: 'Other TTA staff', value: (log.data.otherStaff || []).map((u) => u.label).join(', ') },
        { title: 'Result', value: log.data.result },
      ],
      actions,
    };
  });

  return (
    <>
      <DeleteLogModal
        modalRef={modalRef}
        onLogRemoved={deleteLog}
        log={logToDelete}
      />
      <div className="ttahub-communication-log-table">
        <HorizontalTableWidget
          headers={headers}
          data={data}
          firstHeading="Report ID"
          lastHeading="OK"
          enableSorting
          sortConfig={sortConfig}
          requestSort={requestSort}
          showTotalColumn={false}
        />
      </div>
    </>
  );
}

CommunicationLogTable.propTypes = {
  logs: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    displayId: PropTypes.string,
    data: PropTypes.shape({
      communicationDate: PropTypes.string,
      purpose: PropTypes.string,
      result: PropTypes.string,
    }),
    userId: PropTypes.number,
  })).isRequired,
  requestSort: PropTypes.func.isRequired,
  sortConfig: PropTypes.shape({
    sortBy: PropTypes.string,
    direction: PropTypes.string,
  }).isRequired,
  recipientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};
