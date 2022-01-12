import React, { useState } from 'react';
import PropTypes from 'prop-types';
// import { Link, useHistory } from 'react-router-dom';
import moment from 'moment';
import ContextMenu from '../ContextMenu';
// import TooltipWithCollection from '../TooltipWithCollection';
// import Tooltip from '../Tooltip';
import { DATE_DISPLAY_FORMAT } from '../../Constants';
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

  return (
    <tr onFocus={onFocus} onBlur={onBlur} className={trClassname} key={`goal_row_${id}`}>
      <td>{goalStatus}</td>
      <td>{moment(createdOn).format(DATE_DISPLAY_FORMAT)}</td>
      <td className="text-wrap maxw-mobile">{goalText}</td>
      <td className="text-wrap maxw-mobile">{goalTopics}</td>
      <td>{objectives}</td>
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
  goalTopics: PropTypes.string,
  objectives: PropTypes.string.isRequired,
});

GoalRow.propTypes = {
  goal: goalPropTypes.isRequired,
  openMenuUp: PropTypes.bool.isRequired,
};
export default GoalRow;
