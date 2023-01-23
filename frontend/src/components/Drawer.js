import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

const ESCAPE_KEY_CODE = 27;

export default function Drawer({ stickyHeader, stickyFooter }) {
  const [isOpen, setIsOpen] = useState(false);
  const elementRef = useRef(null);

  /* const onOpen = () => { */
  /**/
  /* }; */

  const onEscape = useCallback((event) => {
    if (event.keyCode === ESCAPE_KEY_CODE) {
      setIsOpen(false);
    }
  }, [setIsOpen]);

  useEffect(() => {
    document.addEventListener('keydown', onEscape, false);
    return () => {
      document.removeEventListener('keydown', onEscape, false);
      setIsOpen(false);
    };
  }, [onEscape]);

  return (
    <div ref={elementRef}>
      hello
    </div>
  );
}

Drawer.propTypes = {
  stickyHeader: PropTypes.bool,
  stickyFooter: PropTypes.bool,
};

Drawer.defaultProps = {
  stickyHeader: false,
  stickyFooter: false,
};
