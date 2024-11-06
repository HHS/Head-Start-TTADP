import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import FocusTrap from 'focus-trap-react';
import PropTypes from 'prop-types';
import './Drawer.scss';

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
  const [headerHeight, setHeaderHeight] = useState(0);
  const elementRef = useRef(null);
  const closeButtonRef = useRef(null);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const header = document.querySelector('.smart-hub-header');
    setHeaderHeight(header ? header.offsetHeight : 0);
  }, [isOpen]);

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

  const onEscape = useCallback(
    (event) => {
      if (event.keyCode === ESCAPE_KEY_CODE) setIsOpen(false);
    },
    [setIsOpen],
  );

  useEffect(() => {
    document.addEventListener('keydown', onEscape, false);
    return () => {
      document.removeEventListener('keydown', onEscape, false);
      setIsOpen(false);
    };
  }, [onEscape]);

  const classNames = [
    'smart-hub-drawer',
    'bg-transparent',
    'position-fixed',
    'pin-right',
    'pin-bottom',
    'z-100',
    'overflow-y-auto',
    'flex-column',
    'flex-align-end',
  ];

  if (isOpen) {
    classNames.push('smart-hub-drawer--open');
    classNames.push('display-flex');
    classNames.push('slide-in-right');
  }

  const Trap = isOpen ? FocusTrap : React.Fragment;

  return (
    <div
      hidden={!isOpen}
      className={classNames.join(' ')}
      ref={elementRef}
      style={{
        top: headerHeight,
      }}
    >
      <Trap>
        <div className="bg-white shadow-3">
          {title && (
            <div
              className={`smart-hub-drawer-header bg-base-lightest padding-105 display-flex flex-row flex-justify flex-align-center ${
                stickyHeader ? 'position-sticky pin-top' : ''
              }`}
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

          <div className="overflow-y-auto padding-1 margin-1">
            {children}
          </div>
        </div>
      </Trap>

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
