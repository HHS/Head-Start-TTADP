import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import useMediaCapture from '../hooks/useMediaCapture';

export default function MediaCaptureButton({
  reference, className, buttonText, id, title,
}) {
  const capture = useMediaCapture(reference, title);

  return (
    <Button
      unstyled
      onClick={capture}
      data-html2canvas-ignore
      className={className}
      id={id}
    >
      {buttonText}
    </Button>
  );
}

MediaCaptureButton.propTypes = {
  reference: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
  className: PropTypes.string,
  buttonText: PropTypes.string,
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
};

MediaCaptureButton.defaultProps = {
  className: '',
  buttonText: 'Save image',
};
