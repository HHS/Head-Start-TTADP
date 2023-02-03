import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import './Drawer.scss';
import useOnClickOutside from '../hooks/useOnOutsideClick';

const ESCAPE_KEY_CODE = 27;

export default function Drawer({
  title,
  footer,
  stickyHeader,
  stickyFooter,
  children,
  triggerRef,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const elementRef = useRef(null);
  const closeButtonRef = useRef(null);

  const headerHeight = useMemo(() => {
    const header = document.querySelector('.smart-hub-header');
    return header ? header.offsetHeight : 0;
  }, []);

  useOnClickOutside(useCallback(() => setIsOpen(false), []), [elementRef, triggerRef]);

  useEffect(() => {
    const triggerElement = triggerRef.current;
    if (triggerElement) triggerElement.addEventListener('click', () => setIsOpen(true));
    return () => {
      if (triggerElement) triggerElement.removeEventListener('click', () => setIsOpen(true));
    };
  }, [triggerRef]);

  useEffect(() => {
    if (isOpen) {
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      }

      const onKeyDown = (event) => {
        if (event.keyCode === ESCAPE_KEY_CODE) setIsOpen(false);
      };
      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
    }
    return undefined;
  }, [isOpen]);

  const onEscape = useCallback((event) => {
    if (event.keyCode === ESCAPE_KEY_CODE) setIsOpen(false);
  }, [setIsOpen]);

  useEffect(() => {
    document.addEventListener('keydown', onEscape, false);
    return () => {
      document.removeEventListener('keydown', onEscape, false);
      setIsOpen(false);
    };
  }, [onEscape]);

  if (!isOpen) return null;

  return (
    <div
      className="smart-hub-drawer bg-white position-fixed pin-right pin-bottom z-100 overflow-y-auto shadow-3 display-flex flex-column flex-justify"
      ref={elementRef}
      style={{
        top: headerHeight,
      }}
    >
      <div>
        {title && (
          <div
            className={`bg-base-lightest padding-105 display-flex flex-row flex-justify flex-align-center ${stickyHeader ? 'position-sticky pin-top' : ''}`}
          >
            <span className="text-bold font-serif-lg">{title}</span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setIsOpen(false)}
              className="usa-button usa-button--outline smart-hub-button--no-margin"
            >
              Close
            </button>
          </div>
        )}

        <div
          className="overflow-y-auto padding-1 margin-1"
          // eslint-disable-next-line
          tabIndex="0"
        >
          {children}
        </div>
      </div>

      {footer && (
      <div
        className={`bg-base-lightest padding-105 ${
          stickyFooter ? 'position-sticky pin-bottom' : ''
        }`}
      >
        {footer}
      </div>
      )}
    </div>
  );
}

Drawer.propTypes = {
  stickyHeader: PropTypes.bool,
  stickyFooter: PropTypes.bool,
  title: PropTypes.string,
  footer: PropTypes.string,
  triggerRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  children: PropTypes.node,
};

Drawer.defaultProps = {
  stickyHeader: false,
  stickyFooter: false,
  title: '',
  footer: '',
  triggerRef: null,
  children: null,
};
