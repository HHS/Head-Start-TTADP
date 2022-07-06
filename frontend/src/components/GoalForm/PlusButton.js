import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/pro-regular-svg-icons';
import colors from '../../colors';

export default function PlusButton({
  onClick,
  text,
}) {
  return (
    <Button type="button" unstyled onClick={onClick}>
      <FontAwesomeIcon className=" margin-right-1" color={colors.ttahubMediumBlue} icon={faPlusCircle} />
      {text}
    </Button>
  );
}

PlusButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  text: PropTypes.string.isRequired,
};
