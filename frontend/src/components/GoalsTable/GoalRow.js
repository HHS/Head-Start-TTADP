/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faCheckCircle,
  faExclamationCircle,
  faPencilAlt,
  faMinusCircle,
  faTimesCircle,
  faFlag,
  faAngleUp,
  faAngleDown,
} from '@fortawesome/free-solid-svg-icons';
import ContextMenu from '../ContextMenu';
import Tooltip from '../Tooltip';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
import { reasonsToMonitor } from '../../pages/ActivityReport/constants';
import { updateGoalStatus } from '../../fetchers/goals';
import ObjectiveRow from './ObjectiveRow';
import CloseSuspendReasonModal from '../CloseSuspendReasonModal';
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
    objectives,
  } = goal;

  // Close/Suspend Reason Modal.
  const [closeSuspendGoalId, setCloseSuspendGoalId] = useState(0);
  const [closeSuspendStatus, setCloseSuspendStatus] = useState('');
  const closeSuspendModalRef = useRef();

  const showCloseSuspendGoalModal = (status, goalId) => {
    setCloseSuspendGoalId(goalId);
    setCloseSuspendStatus(status);
    closeSuspendModalRef.current.toggleModal(true);
  };

  const expandObjectivesRef = useRef();

  const [objectivesExpanded, setObjectivesExpanded] = useState(false);

  const contextMenuLabel = `Actions for goal ${id}`;

  const mapToDisplay = [
    {
      stored: 'In Progress',
      display: 'In progress',
      color: '#0166ab',
    },
    {
      stored: 'Completed',
      display: 'Closed',
      color: '#148439',
    },
    {
      stored: 'Draft',
      display: 'Draft',
      color: '#475260',
    },
    {
      stored: 'Not Started',
      display: 'Not started',
      color: '#e2a04d',
    },
    {
      stored: 'Ceased/Suspended',
      display: 'Suspended',
      color: '#b50908',
    },
    {
      stored: 'Needs Status',
      display: 'Needs status',
      color: '#c5c5c5',
    },
  ];

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
      status: 'Suspended',
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

  const performGoalStatusUpdate = async (
    goalId,
    status,
    closeSuspendReason = null,
    closeSuspendContext = null,
  ) => {
    const updatedGoal = await updateGoalStatus(
      goalId,
      status,
      closeSuspendReason,
      closeSuspendContext,
    );
    if (closeSuspendReason && closeSuspendModalRef.current.modalIsOpen) {
      // Close from a submit.
      closeSuspendModalRef.current.toggleModal(false);
    }
    updateGoal(updatedGoal);
  };

  const onUpdateGoalStatus = (status) => {
    const changeGoalType = mapToStoredStatus.find((m) => m.status === status);
    if (changeGoalType) {
      if (changeGoalType.stored === 'Completed' || changeGoalType.stored === 'Ceased/Suspended') {
        // Must provide reason for Close or Suspend.
        showCloseSuspendGoalModal(changeGoalType.stored, id);
      } else {
        performGoalStatusUpdate(id, changeGoalType.stored);
      }
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
            buttonLabel={`Reason for flag on goal ${goalNumber} is monitoring. Click button to visually reveal this information.`}
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

  const closeOrOpenObjectives = (collapseFromObjectives) => {
    if (collapseFromObjectives && expandObjectivesRef.current) {
      expandObjectivesRef.current.focus();
    }

    setObjectivesExpanded(!objectivesExpanded);
  };

  const getStatusColor = () => {
    if (goalStatus) {
      const goalStatusDisplay = mapToDisplay.find((m) => m.stored === goalStatus);
      if (goalStatusDisplay) {
        return goalStatusDisplay.color;
      }
    }
    return '#c5c5c5';
  };

  return (
    <>
      <CloseSuspendReasonModal
        goalId={closeSuspendGoalId}
        newStatus={closeSuspendStatus}
        modalRef={closeSuspendModalRef}
        onSubmit={performGoalStatusUpdate}
      />
      <tr className={`tta-smarthub--goal-row ${!objectivesExpanded ? 'tta-smarthub--goal-row-collapsed' : ''}`} key={`goal_row_${id}`}>
        <td style={{ borderLeft: objectivesExpanded ? `4px solid ${getStatusColor()}` : '' }}>
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
          {showToolTip
            ? (
              <Tooltip
                displayText={displayGoalTopics}
                screenReadDisplayText={false}
                buttonLabel={`goal topics: ${goalTopics}. Click button to visually reveal this information.`}
                tooltipText={goalTopics.join(', ')}
                hideUnderline={false}
                svgLineTo={300}
              />
            )
            : displayGoalTopics}
        </td>
        <td>
          <button
            type="button"
            ref={expandObjectivesRef}
            className={`usa-button--unstyled text-middle tta-smarthub--goal-row-objectives-${objectiveCount > 0 ? 'enabled' : 'disabled'}`}
            onClick={() => closeOrOpenObjectives(false)}
            aria-label={`${objectivesExpanded ? 'Collapse' : 'Expand'} objective's for goal ${goalNumber}`}
            tabIndex={0}
          >
            <strong className="margin-left-1">{objectiveCount}</strong>
            {' '}
            Objective(s)
            {
              objectiveCount > 0
                ? (
                  <FontAwesomeIcon className="margin-left-1 margin-right-1" size="1x" color="#000000" icon={objectivesExpanded ? faAngleUp : faAngleDown} />
                )
                : null
            }
          </button>
        </td>
        <td>
          {showContextMenu
            ? (
              <ContextMenu
                label={contextMenuLabel}
                menuItems={menuItems}
                up={openMenuUp}
              />
            )
            : null}
        </td>
      </tr>
      <tr className="tta-smarthub--objective-rows">
        <td style={{ borderLeft: objectivesExpanded ? `4px solid ${getStatusColor()}` : '' }} colSpan="6">
          <table>
            <caption className="usa-sr-only">
              Objectives for goal
              {' '}
              {goalNumber}
            </caption>
            <thead>
              <tr>
                <th scope="col">Objective</th>
                <th scope="col">Activity report</th>
                <th scope="col">End date</th>
                <th scope="col">Reasons</th>
                <th scope="col">Objectives status</th>
              </tr>
            </thead>
            <tbody>
              {objectives.map((obj) => (
                <ObjectiveRow
                  key={`objective_${obj.id}`}
                  objective={obj}
                  onCollapseObjectives={closeOrOpenObjectives}
                />
              ))}
            </tbody>
          </table>
        </td>
      </tr>
      <tr className="height-1" aria-hidden />
    </>
  );
}

export const objectivePropTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  arNumber: PropTypes.string.isRequired,
  ttaProvided: PropTypes.string.isRequired,
  endDate: PropTypes.string,
  reasons: PropTypes.arrayOf(PropTypes.string).isRequired,
  status: PropTypes.string.isRequired,
});

objectivePropTypes.defaultProps = {
  endDate: null,
};

export const goalPropTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  goalStatus: PropTypes.string,
  createdOn: PropTypes.string.isRequired,
  goalText: PropTypes.string.isRequired,
  goalTopics: PropTypes.arrayOf(PropTypes.string).isRequired,
  reasons: PropTypes.arrayOf(PropTypes.string).isRequired,
  objectiveCount: PropTypes.number.isRequired,
  goalNumber: PropTypes.string.isRequired,
  objectives: PropTypes.arrayOf(objectivePropTypes),
});

goalPropTypes.defaultProps = {
  goalStatus: null,
  objectives: [],
};
GoalRow.propTypes = {
  goal: goalPropTypes.isRequired,
  openMenuUp: PropTypes.bool.isRequired,
  updateGoal: PropTypes.func.isRequired,
};
export default GoalRow;
