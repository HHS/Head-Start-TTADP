import React from 'react';
import PropTypes from 'prop-types';
import ApproverStatusList from '../components/ApproverStatusList';

const Approved = ({
  approverStatusList,
}) => (
  <div className="no-print">
    <h2>Report approved</h2>
    <div className="margin-top-3">
      <ApproverStatusList approverStatus={approverStatusList} />
    </div>
  </div>
);

Approved.propTypes = {
  approverStatusList: PropTypes.arrayOf(PropTypes.shape({
    approver: PropTypes.string,
    status: PropTypes.string,
  })).isRequired,
};

export default Approved;
