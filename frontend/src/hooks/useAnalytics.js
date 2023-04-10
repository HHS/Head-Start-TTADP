import { useCallback, useEffect } from 'react';

const useTrackBrowserSize = (dimensionIndex) => {
  const trackBrowserSize = useCallback((size) => {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'browser-size',
        [`dimension${dimensionIndex}`]: size,
      });
    }
  }, [dimensionIndex]);

  const trackWindowResize = useCallback(() => {
    const size = `${window.innerWidth}x${window.innerHeight}`;
    trackBrowserSize(size);
  }, [trackBrowserSize]);

  useEffect(() => {
    trackWindowResize();

    window.addEventListener('resize', trackWindowResize);

    return () => {
      window.removeEventListener('resize', trackWindowResize);
    };
  }, [trackWindowResize]);

  return { trackBrowserSize };
};

const useAnalytics = () => {
  const { trackBrowserSize } = useTrackBrowserSize(1);

  return { trackBrowserSize };
};

export default useAnalytics;
