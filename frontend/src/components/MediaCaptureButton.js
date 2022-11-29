import React from 'react';
import PropTypes from 'prop-types';
import html2canvas from 'html2canvas';
import { Button } from '@trussworks/react-uswds';

export default function ElementCaptureButton({ reference, className }) {
  const capture = async () => {
    try {
      // get the entire height and width of the element
      // in case some of it is off screen
      const width = reference.current.scrollWidth;
      const height = reference.current.scrollHeight;
      // capture the element, setting the width and height
      // we just calculated, and setting the background to white
      // and then converting it to a data url
      // and triggering a download
      const canvas = await html2canvas(reference.current, {
        width,
        height,
        onclone: (document, element) => {
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
    >
      Save image
    </Button>
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
