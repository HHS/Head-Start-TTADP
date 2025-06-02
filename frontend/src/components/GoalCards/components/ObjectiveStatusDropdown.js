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
  goalStatus,
  forceReadOnly,
  objectiveTitle,
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
      label={`Change status for objective ${objectiveTitle}`}
      options={options}
      className={className}
      icon={icon}
      display={display}
      buttonTestId="objective-status-dropdown"
    />
  );
}

ObjectiveStatusDropdown.propTypes = {
  onUpdateObjectiveStatus: PropTypes.func.isRequired,
  goalStatus: PropTypes.string,
  currentStatus: PropTypes.string,
  regionId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  className: PropTypes.string,
  forceReadOnly: PropTypes.bool,
  objectiveTitle: PropTypes.string,
};

ObjectiveStatusDropdown.defaultProps = {
  goalStatus: '',
  currentStatus: '',
  objectiveTitle: '',
  className: '',
  forceReadOnly: false,
};
