import React from 'react';
import PropTypes from 'prop-types';
// import { Link, useHistory } from 'react-router-dom';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock, faCheckCircle, faExclamationCircle, faPencilAlt, faMinusCircle, faTimesCircle, faFlag,
} from '@fortawesome/free-solid-svg-icons';
import ContextMenu from '../ContextMenu';
import Tooltip from '../Tooltip';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import { reasonsToMonitor } from '../../pages/ActivityReport/constants';
import { updateGoalStatus } from '../../fetchers/goals';
import './ObjectiveRow.css';

function ObjectiveRow({
  objective,
}) {
  const {
    id,
    title,
    arNumber,
    ttaProvided,
    endDate,
    reasons,
    status,
  } = objective;

  /* TODO: Setup Route for Edit Goal (TTAHUB-568).
    /*
    const history = useHistory();
    // eslint-disable-next-line max-len
    const viewOrEditLink =
      calculatedStatus === 'approved'
      ? `/activity-reports/view/${id}`
      : `/activity-reports/${id}`;
    */
  return (
    <>
      <tr className="tta-smarthub--objective-row">
        <td>{title}</td>
        <td>{arNumber}</td>
        <td>{endDate}</td>
        <td>{reasons}</td>
        <td>{status}</td>
      </tr>
    </>
  );
}

export const objectivePropTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  arNumber: PropTypes.string.isRequired,
  ttaProvided: PropTypes.string.isRequired,
  endDate: PropTypes.arrayOf(PropTypes.string).isRequired,
  reasons: PropTypes.arrayOf(PropTypes.string).isRequired,
  status: PropTypes.number.isRequired,
});

/*
objectivePropTypes.defaultProps = {
    goalStatus: null,
  };
*/
ObjectiveRow.propTypes = {
  goal: objectivePropTypes.isRequired,
};
export default ObjectiveRow;
