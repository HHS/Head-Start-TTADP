import React from 'react';
import { uniqueId } from 'lodash';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle, faCheck, faClock } from '@fortawesome/free-solid-svg-icons';
import colors from '../../../../colors';

const getStatusIcon = (status) => {
  if (status && status === 'needs_action') {
    return <FontAwesomeIcon className="margin-right-105" size="1x" color={colors.errorDark} icon={faExclamationCircle} />;
  }
  if (status && status === 'approved') {
    return <FontAwesomeIcon className="margin-right-105" size="1x" color={colors.success} icon={faCheck} />;
  }

  return <FontAwesomeIcon className="margin-right-105" size="1x" color={colors.warning} icon={faClock} />;
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
    <li className="margin-bottom-205" key={uniqueId('approver-status-list-')}>
      {getStatusIcon(s.status)}
      <b>{getDisplayStatus(s.status)}</b>
      {s.status === 'approved' ? ' by ' : ' from '}
      {s.user.fullName}
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
