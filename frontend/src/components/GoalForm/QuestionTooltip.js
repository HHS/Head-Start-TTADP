import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import Tooltip from '../Tooltip';
import './QuestionTooltip.css';
import colors from '../../colors';

export default function QuestionTooltip({ text }) {
  return (
    <Tooltip
      displayText={<FontAwesomeIcon color={colors.ttahubMediumBlue} icon={faQuestionCircle} />}
      tooltipText={text}
      hideUnderline
      buttonLabel={text}
      screenReadDisplayText={false}
      className="smart-hub-tooltip--question margin-left-1"
    />
  );
}

QuestionTooltip.propTypes = {
  text: PropTypes.string.isRequired,
};
