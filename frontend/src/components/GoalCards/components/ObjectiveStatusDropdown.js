import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { DECIMAL_BASE } from '@ttahub/common';
import UserContext from '../../../UserContext';
import { canChangeObjectiveStatus } from '../../../permissions';
import STATUSES from './StatusDropdownStatuses';
import StatusDropdown from './StatusDropdown';
import useValidObjectiveStatuses from '../../../hooks/useValidObjectiveStatuses';

export default function ObjectiveStatusDropdown({
  currentStatus,
  onUpdateObjectiveStatus,
  regionId,
  className,
  objectiveId,
  goalStatus,
  forceReadOnly,
}) {
  const { user } = useContext(UserContext);
  const [statusOptions, isReadOnly] = useValidObjectiveStatuses(
    goalStatus,
    canChangeObjectiveStatus(user, parseInt(regionId, DECIMAL_BASE)),
    currentStatus,
  );

  const key = currentStatus || 'Needs Status';
  const { icon, display } = STATUSES[key] || STATUSES['Needs Status'];

  if (isReadOnly || forceReadOnly) {
    return (
      <div className={className}>
        {icon}
        {display}
      </div>
    );
  }

  const getOptions = () => statusOptions.map((status) => ({
    label: status,
    onClick: () => onUpdateObjectiveStatus(status),
  }));

  const options = getOptions();

  return (
    <StatusDropdown
      label={`Change status for goal ${objectiveId}`}
      options={options}
      className={className}
      icon={icon}
      display={display}
    />
  );
}

ObjectiveStatusDropdown.propTypes = {
  onUpdateObjectiveStatus: PropTypes.func.isRequired,
  goalStatus: PropTypes.string,
  currentStatus: PropTypes.string,
  objectiveId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  regionId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  className: PropTypes.string,
  forceReadOnly: PropTypes.bool,
};

ObjectiveStatusDropdown.defaultProps = {
  goalStatus: '',
  currentStatus: '',
  className: '',
  forceReadOnly: false,
};
