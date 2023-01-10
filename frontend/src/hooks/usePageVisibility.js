import { useState, useEffect, useMemo } from 'react';

// adapted from https://blog.sethcorker.com/harnessing-the-page-visibility-api-with-react/
// (to help with browser compat), basically an onchange handler for browser visibility

export function getBrowserProps() {
  if (typeof document.hidden !== 'undefined') {
    // Opera 12.10 and Firefox 18 and later support
    return {
      visiblity: 'visibilitychange',
      hidden: 'hidden',
    };
  } if (typeof document.msHidden !== 'undefined') {
    return {
      visiblity: 'msvisibilitychange',
      hidden: 'msHidden',
    };
  } if (typeof document.webkitHidden !== 'undefined') {
    return {
      visiblity: 'webkitvisibilitychange',
      hidden: 'webkitHidden',
    };
  }
  return {
    visiblity: null,
    hidden: null,
  };
}

export function getIsDocumentHidden(prop) {
  if (!prop) {
    return false;
  }
  return !document[prop];
}

export default function usePageVisibility() {
  const browserProps = useMemo(() => getBrowserProps(), []);

  const [isVisible, setIsVisible] = useState(getIsDocumentHidden(browserProps.hidden));
  const onVisibilityChange = () => setIsVisible(getIsDocumentHidden(browserProps.hidden));

  useEffect(() => {
    const visibilityChange = browserProps.visiblity;

    if (visibilityChange) {
      document.addEventListener(visibilityChange, onVisibilityChange, false);
    }

    return () => {
      document.removeEventListener(visibilityChange, onVisibilityChange);
    };
  });

  return isVisible;
}
