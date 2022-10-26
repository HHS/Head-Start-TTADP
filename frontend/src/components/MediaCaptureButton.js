import React from 'react';
import PropTypes from 'prop-types';
import html2canvas from 'html2canvas';
import { Button } from '@trussworks/react-uswds';

export default function ElementCaptureButton({ reference, className }) {
  const capture = async () => {
    try {
      const canvas = await html2canvas(reference.current);
      const base64image = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = base64image;
      a.setAttribute('download', '');
      a.click();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
  };

  return (
    <Button unstyled onClick={capture} className={className}>Save image</Button>
  );
}

ElementCaptureButton.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  reference: PropTypes.object.isRequired,
  className: PropTypes.string,
};

ElementCaptureButton.defaultProps = {
  className: '',
};
