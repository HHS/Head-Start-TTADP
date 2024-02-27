import { useCallback, useMemo } from 'react';

/**
 *
 * @param {fn} onUpdateFilter
 * @returns fn
 */
export default function useGaFilterItem(filter, onUpdateFilter) {
  const {
    id,
    topic,
    condition,
    query,
  } = useMemo(() => filter, [filter]);

  return useCallback((name, value) => {
    try {
      const event = {
        event: 'filterSelection',
        topic,
        condition,
        query,
      };

      if (window.dataLayer) {
        window.dataLayer.push({
          ...event,
          [name]: value,
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error sending filter data to Google Analytics', err);
    }

    onUpdateFilter(id, name, value);
  }, [topic, condition, query, onUpdateFilter, id]);
}
