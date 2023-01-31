import React from 'react';
import PropTypes from 'prop-types';
import html2canvas from 'html2canvas';
import { Button } from '@trussworks/react-uswds';

export default function ElementCaptureButton({
  reference, className, buttonText, id,
}) {
  const capture = async () => {
    try {
      // capture the element, setting the width and height
      // we just calculated, and setting the background to white
      // and then converting it to a data url
      // and triggering a download
      const canvas = await html2canvas(reference.current, {
        onclone: (_document, element) => {
          // set the first child to be white (we can always make this configurable later)
          element.firstChild.classList.add('bg-white');

          // make sure we get the entire element and nothing is cut off
          element.classList.remove('overflow-x-scroll');
        },
      });
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

ElementCaptureButton.propTypes = {
  reference: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
  className: PropTypes.string,
  buttonText: PropTypes.string,
  id: PropTypes.string.isRequired,
};

ElementCaptureButton.defaultProps = {
  className: '',
  buttonText: 'Save image',
};
