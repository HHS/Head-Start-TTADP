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

  const [focusableElements, setFocusableElements] = useState([]);
  const [firstFocusableElement, setFirstFocusableElement] = useState(null);
  const [lastFocusableElement, setLastFocusableElement] = useState(null);

  const close = useCallback(() => {
    setIsOpen(false);
    if (triggerRef && triggerRef.current) triggerRef.current.focus();
  }, [triggerRef]);

  useEffect(() => {
    if (isOpen) {
      setFocusableElements(
        Array.from(elementRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')),
      );
    }
  }, [elementRef, isOpen]);

  useEffect(() => {
    if (!focusableElements.length) return;
    setFirstFocusableElement(focusableElements[0]);
    setLastFocusableElement(focusableElements[focusableElements.length - 1]);
  }, [focusableElements]);

  useOnClickOutside(useCallback(() => {
    close();
  }, [close]), [elementRef, triggerRef]);

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
    }

    const onKeyDown = (event) => {
      if (event.keyCode === ESCAPE_KEY_CODE) {
        close();
        return;
      }

      const isTab = event.key === 'Tab' || event.keyCode === 9;

      if (!isTab) return;

      if (event.shiftKey) {
        if (document.activeElement === firstFocusableElement) {
          event.preventDefault();
          lastFocusableElement.focus();
        }
        return;
      }

      if (document.activeElement === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [close, isOpen, firstFocusableElement, lastFocusableElement]);

  const onEscape = useCallback((event) => {
    if (event.keyCode === ESCAPE_KEY_CODE) {
      close();
    }
  }, [close]);

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
      className="smart-hub-drawer slide-in-right bg-white position-fixed pin-right pin-bottom z-100 overflow-y-auto shadow-3 display-flex flex-column flex-justify"
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
              onClick={close}
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
