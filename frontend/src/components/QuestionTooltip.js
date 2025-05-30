import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import Tooltip from './Tooltip';
import './QuestionTooltip.css';
import colors from '../colors';

export default function QuestionTooltip({ text, customClass }) {
  return (
    <Tooltip
      displayText={<FontAwesomeIcon color={colors.ttahubMediumBlue} icon={faQuestionCircle} />}
      tooltipText={text}
      hideUnderline
      buttonLabel={text}
      screenReadDisplayText={false}
      className={customClass ? 'smart-hub-tooltip--question margin-left-1' : customClass}
    />
  );
}

QuestionTooltip.propTypes = {
  text: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.node,
  ]).isRequired,
  customClass: PropTypes.string,
};

QuestionTooltip.defaultProps = {
  customClass: null,
};
