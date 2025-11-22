import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlag } from '@fortawesome/free-solid-svg-icons';
import colors from '../../colors';
import { reasonsToMonitor } from '../../pages/ActivityReport/constants';
import Tooltip from '../Tooltip';

const FlagStatus = ({ reasons, goalNumbers }) => {
  const reasonsToWatch = reasons.find((t) => reasonsToMonitor.includes(t));
  if (reasonsToWatch) {
    return (
      <>
        <Tooltip
          displayText={<FontAwesomeIcon className="margin-left-1" size="1x" color={colors.error} icon={faFlag} />}
          screenReadDisplayText={false}
          buttonLabel={`Reason for flag on goal ${goalNumbers} is monitoring.`}
          tooltipText="Related to monitoring"
          hideUnderline
        />
      </>
    );
  }
  return null;
};

FlagStatus.propTypes = {
  reasons: PropTypes.arrayOf(PropTypes.string),
  goalNumbers: PropTypes.string,
};

FlagStatus.defaultProps = {
  reasons: [],
  goalNumbers: '',
};

export default FlagStatus;
