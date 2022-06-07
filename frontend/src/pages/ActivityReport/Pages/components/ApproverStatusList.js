import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle, faCheck, faMinus } from '@fortawesome/free-solid-svg-icons';

const getStatusIcon = (status) => {
  if (status && status === 'needs_action') {
    return <FontAwesomeIcon className="margin-right-105" size="1x" color="#eb6689" icon={faExclamationCircle} />;
  }
  if (status && status === 'approved') {
    return <FontAwesomeIcon className="margin-right-105" size="1x" color="#4fbe82" icon={faCheck} />;
  }

  return <FontAwesomeIcon className="margin-right-105" size="1x" color="#f2cf95" icon={faMinus} />;
};

const getDisplayStatus = (status) => {
  if (status && status === 'needs_action') {
    return 'Needs Action';
  }
  if (status && status === 'approved') {
    return 'Approved';
  }
  return 'Pending Approval';
};

const ApproverStatusList = ({
  approverStatus,
}) => {
  const displayApproverStatusList = () => approverStatus.map((s) => (
    <li className="margin-bottom-205" key={s.User.fullName}>
      {getStatusIcon(s.status)}
      <b>{getDisplayStatus(s.status)}</b>
      {s.status === 'approved' ? ' by ' : ' from '}
      {s.User.fullName}
    </li>
  ));

  if (!approverStatus) {
    return null;
  }

  return (
    <>
      <ul className="add-list-reset">
        {
          displayApproverStatusList()
        }
      </ul>
    </>
  );
};

ApproverStatusList.propTypes = {
  approverStatus: PropTypes.arrayOf(PropTypes.shape({
    approver: PropTypes.string,
    status: PropTypes.string,
  })).isRequired,
};

export default ApproverStatusList;
