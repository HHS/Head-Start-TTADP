import React from 'react'
import PropTypes from 'prop-types'
import { Accordion } from '../../../../components/Accordion'
import ApproverStatusList from '../components/ApproverStatusList'

const Approved = ({ approverStatusList, reviewItems }) => (
  <div className="no-print">
    <h2>Report approved</h2>
    {reviewItems && reviewItems.length > 0 && (
      <div className="margin-bottom-3">
        <Accordion bordered items={reviewItems} multiselectable />
      </div>
    )}
    <div className="margin-top-3">
      <ApproverStatusList approverStatus={approverStatusList} />
    </div>
  </div>
)

Approved.propTypes = {
  approverStatusList: PropTypes.arrayOf(
    PropTypes.shape({
      approver: PropTypes.string,
      status: PropTypes.string,
    })
  ).isRequired,
  reviewItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.node.isRequired,
    })
  ).isRequired,
}

export default Approved
