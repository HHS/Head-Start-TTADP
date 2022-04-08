import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';

export default function PlusButton({
  onClick,
  text,
}) {
  return (
    <Button type="button" unstyled onClick={onClick}>
      <FontAwesomeIcon className="margin-right-1" color="#005ea2" icon={faPlusCircle} />
      {text}
    </Button>
  );
}

PlusButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  text: PropTypes.string.isRequired,
};
