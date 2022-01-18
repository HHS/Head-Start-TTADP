import React, { useState } from 'react';
import PropTypes from 'prop-types';
// import { Link, useHistory } from 'react-router-dom';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock, faCheckCircle, faExclamationCircle, faPencilAlt, faMinusCircle, faTimesCircle, faFlag,
} from '@fortawesome/free-solid-svg-icons';
import ContextMenu from '../ContextMenu';
// import TooltipWithCollection from '../TooltipWithCollection';
// import Tooltip from '../Tooltip';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import { reasonsToMonitor } from '../../pages/ActivityReport/constants';
import './GoalRow.css';

function GoalRow({
  goal,
  openMenuUp,
}) {
  const {
    id,
    goalStatus,
    createdOn,
    goalText,
    goalTopics,
    objectives,
    goalNumber,
    reasons,
  } = goal;

  const [trClassname, setTrClassname] = useState('tta-smarthub--goal-row');

  /* TODO: Setup Route for Edit Goal.
  /*
  const history = useHistory();
  // eslint-disable-next-line max-len
  const viewOrEditLink =
    calculatedStatus === 'approved'
    ? `/activity-reports/view/${id}`
    : `/activity-reports/${id}`;
  */

  const menuItems = [

    /* TODO: Add Goal menu items. */
    /*
    {
      label: 'Edit goal',
      onClick: () => { history.push(linkTarget); },
    },
    */
  ];

  const contextMenuLabel = `Actions for goal ${id}`;

  //              <FontAwesomeIcon color="black" icon={faClock} />

  /**
   * we manage the class of the row as a sort of "focus-within" workaround
   * this is entirely to show/hide the export reports button to keyboard users but
   * not blast screen-reader only users with a bunch of redundant buttons
   */
  const onFocus = () => setTrClassname('tta-smarthub--goal-row focused');

  const onBlur = (e) => {
    if (e.relatedTarget && e.relatedTarget.matches('.tta-smarthub--goal-row *')) {
      return;
    }
    setTrClassname('tta-smarthub--goal-row');
  };

  const getGoalStatusIcon = (status) => {
    if (status === 'In progress') {
      return <FontAwesomeIcon className="margin-right-1" size="16px" color="#0166ab" icon={faClock} />;
    } if (status === 'Closed') {
      return <FontAwesomeIcon className="margin-right-1" size="16px" color="#148439" icon={faCheckCircle} />;
    }
    if (status === 'Needs status') {
      return <FontAwesomeIcon className="margin-right-1" size="16px" color="#c5c5c5" icon={faExclamationCircle} />;
    }
    if (status === 'Draft') {
      return <FontAwesomeIcon className="margin-right-1" size="16px" color="#475260" icon={faPencilAlt} />;
    }
    if (status === 'Not started') {
      return <FontAwesomeIcon className="margin-right-1" size="16px" color="#e2a04d" icon={faMinusCircle} />;
    }
    if (status === 'Ceased/suspended') {
      return <FontAwesomeIcon className="margin-right-1" size="16px" color="#b50908" icon={faTimesCircle} />;
    }
    return null;
  };

  const determineFlagStatus = (goalReasons) => {
    const reasonsToWatch = goalReasons.filter((t) => reasonsToMonitor.includes(t));
    if (reasonsToWatch && reasonsToWatch.length > 0) {
      return <FontAwesomeIcon className="margin-left-1"  size="16px" color="#d42240" icon={faFlag} />;
    }
    return null;
  };

  return (
    <tr onFocus={onFocus} onBlur={onBlur} className={trClassname} key={`goal_row_${id}`}>
      <td>
        {getGoalStatusIcon(goalStatus)}
        { goalStatus }
      </td>
      <td>{moment(createdOn).format(DATE_DISPLAY_FORMAT)}</td>
      <td className="text-wrap maxw-mobile">
        {goalText}
        {' '}
        (
        {goalNumber}
        )
        {determineFlagStatus(reasons)}
      </td>
      <td className="text-wrap maxw-mobile">{goalTopics.join(', ')}</td>
      <td>
        <strong>{objectives}</strong>
        {' '}
        Objective(s)
      </td>
      <td>
        <ContextMenu label={contextMenuLabel} menuItems={menuItems} up={openMenuUp} />
      </td>
    </tr>
  );
}

export const goalPropTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  goalStatus: PropTypes.string.isRequired,
  createdOn: PropTypes.string.isRequired,
  goalText: PropTypes.string.isRequired,
  goalTopics: PropTypes.arrayOf(PropTypes.string).isRequired,
  reasons: PropTypes.arrayOf(PropTypes.string).isRequired,
  objectives: PropTypes.string.isRequired,
  goalNumber: PropTypes.string.isRequired,
});

GoalRow.propTypes = {
  goal: goalPropTypes.isRequired,
  openMenuUp: PropTypes.bool.isRequired,
};
export default GoalRow;
