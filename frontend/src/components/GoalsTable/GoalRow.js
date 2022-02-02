import React, { useState } from 'react';
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
import { updateRecipientGoalStatus } from '../../fetchers/recipient';
import './GoalRow.css';

function GoalRow({
  goal,
  openMenuUp,
  updateGoal,
}) {
  const {
    id,
    goalStatus,
    createdOn,
    goalText,
    goalTopics,
    objectiveCount,
    goalNumber,
    reasons,
  } = goal;

  const [trClassname, setTrClassname] = useState('tta-smarthub--goal-row');

  /* TODO: Setup Route for Edit Goal (TTAHUB-568).
  /*
  const history = useHistory();
  // eslint-disable-next-line max-len
  const viewOrEditLink =
    calculatedStatus === 'approved'
    ? `/activity-reports/view/${id}`
    : `/activity-reports/${id}`;
  */

  const contextMenuLabel = `Actions for goal ${id}`;

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

  const getGoalStatusIcon = () => {
    if (goalStatus) {
      if (goalStatus === 'In Progress') {
        return <FontAwesomeIcon className="margin-right-1" size="1x" color="#0166ab" icon={faClock} />;
      } if (goalStatus === 'Completed') {
        return <FontAwesomeIcon className="margin-right-1" size="1x" color="#148439" icon={faCheckCircle} />;
      }
      if (goalStatus === 'Draft') {
        return <FontAwesomeIcon className="margin-right-1" size="1x" color="#475260" icon={faPencilAlt} />;
      }
      if (goalStatus === 'Not Started') {
        return <FontAwesomeIcon className="margin-right-1" size="1x" color="#e2a04d" icon={faMinusCircle} />;
      }
      if (goalStatus === 'Ceased/Suspended') {
        return <FontAwesomeIcon className="margin-right-1" size="1x" color="#b50908" icon={faTimesCircle} />;
      }
    }
    return <FontAwesomeIcon className="margin-right-1" size="1x" color="#c5c5c5" icon={faExclamationCircle} />;
  };

  const mapToDisplay = [
    {
      stored: 'In Progress',
      display: 'In progress',
    },
    {
      stored: 'Completed',
      display: 'Closed',
    },
    {
      stored: 'Draft',
      display: 'Draft',
    },
    {
      stored: 'Not Started',
      display: 'Not started',
    },
    {
      stored: 'Ceased/Suspended',
      display: 'Ceased/suspended',
    },
    {
      stored: 'Needs Status',
      display: 'Needs status',
    },
  ];

  const getGoalDisplayStatusText = () => {
    if (goalStatus) {
      const displayStatus = mapToDisplay.find((m) => m.stored === goalStatus);
      return displayStatus ? displayStatus.display : 'Needs status';
    }
    return 'Needs status';
  };

  const displayStatus = getGoalDisplayStatusText();

  let showContextMenu = false;
  const availableMenuItems = [
    {
      status: 'Needs status',
      values: ['Mark not started', 'Mark in progress', 'Close goal', 'Cease/suspend goal'],
    },
    {
      status: 'Not started',
      values: ['Close goal', 'Cease/suspend goal'],
    },
    {
      status: 'In progress',
      values: ['Close goal', 'Cease/suspend goal'],
    },
    {
      status: 'Closed',
      values: ['Re-open goal'],
    },
    {
      status: 'Ceased/suspended',
      values: ['Re-open goal'],
    },
  ];

  const mapToStoredStatus = [
    {
      status: 'Mark not started',
      stored: 'Not Started',
    },
    {
      status: 'Mark in progress',
      stored: 'In Progress',
    },
    {
      status: 'Close goal',
      stored: 'Completed',
    },
    {
      status: 'Cease/suspend goal',
      stored: 'Ceased/Suspended',
    },
    {
      status: 'Re-open goal',
      stored: 'In Progress',
    },
  ];

  const onUpdateGoalStatus = async (status) => {
    const goalToSave = mapToStoredStatus.find((m) => m.status === status);
    if (goalToSave) {
      const updatedGoal = await updateRecipientGoalStatus(id, goalToSave.stored);
      updateGoal(updatedGoal);
    }
  };

  const determineAvailableMenuItems = () => {
    const menuItemsToDisplay = availableMenuItems.find((m) => m.status === displayStatus);

    let menuItemsToReturn = [];
    if (menuItemsToDisplay) {
      showContextMenu = true;
      menuItemsToReturn = menuItemsToDisplay.values.map((v) => (
        {
          label: v,
          onClick: () => { onUpdateGoalStatus(v); },
        }
      ));
    }
    return menuItemsToReturn;
  };

  const menuItems = determineAvailableMenuItems();

  const determineFlagStatus = () => {
    const reasonsToWatch = reasons.find((t) => reasonsToMonitor.includes(t));
    if (reasonsToWatch) {
      return (
        <>
          <Tooltip
            displayText={<FontAwesomeIcon className="margin-left-1" size="1x" color="#d42240" icon={faFlag} />}
            screenReadDisplayText={false}
            buttonLabel={`Click to reveal reason for flag ${goalNumber}`}
            tooltipText="Related to monitoring"
            hideUnderline
          />
        </>
      );
    }
    return null;
  };

  let showToolTip = false;
  const toolTipChars = 39;
  const truncateGoalTopics = (goalTopicsToTruncate) => {
    let queryToReturn = goalTopicsToTruncate.join(', ');
    if (queryToReturn.length > toolTipChars) {
      queryToReturn = queryToReturn.substring(0, toolTipChars);
      queryToReturn += '...';
      showToolTip = true;
    }
    return queryToReturn;
  };

  const displayGoalTopics = truncateGoalTopics(goalTopics);

  return (
    <tr onFocus={onFocus} onBlur={onBlur} className={trClassname} key={`goal_row_${id}`}>
      <td>
        {getGoalStatusIcon()}
        {displayStatus}
      </td>
      <td>{moment(createdOn).format(DATE_DISPLAY_FORMAT)}</td>
      <td className="text-wrap maxw-mobile">
        {goalText}
        {' '}
        (
        {goalNumber}
        )
        {determineFlagStatus()}
      </td>
      <td className="text-wrap maxw-mobile">
        {
          showToolTip
            ? (
              <Tooltip
                displayText={displayGoalTopics}
                screenReadDisplayText={false}
                buttonLabel={`Click to reveal topics for goal ${goalNumber}`}
                tooltipText={goalTopics.join(', ')}
                hideUnderline={false}
                svgLineTo={300}
              />
            )
            : displayGoalTopics
        }
      </td>
      <td>
        <strong>{objectiveCount}</strong>
        {' '}
        Objective(s)
      </td>
      <td>
        {
          showContextMenu
            ? (
              <ContextMenu
                label={contextMenuLabel}
                menuItems={menuItems}
                up={openMenuUp}
              />
            )
            : null
        }
      </td>
    </tr>
  );
}

export const goalPropTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  goalStatus: PropTypes.string,
  createdOn: PropTypes.string.isRequired,
  goalText: PropTypes.string.isRequired,
  goalTopics: PropTypes.arrayOf(PropTypes.string).isRequired,
  reasons: PropTypes.arrayOf(PropTypes.string).isRequired,
  objectiveCount: PropTypes.number.isRequired,
  goalNumber: PropTypes.string.isRequired,
});

goalPropTypes.defaultProps = {
  goalStatus: null,
};
GoalRow.propTypes = {
  goal: goalPropTypes.isRequired,
  openMenuUp: PropTypes.bool.isRequired,
  updateGoal: PropTypes.func.isRequired,
};
export default GoalRow;
