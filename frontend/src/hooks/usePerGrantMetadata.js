import { useState } from 'react';
import { uniq } from 'lodash';

export default function usePerGrantMetadata(
  currentValue,
  onChange,
) {
  const data = uniq(Object.values(currentValue || {}));
  const [divergence, setDivergence] = useState(data.length > 1);

  const updateSingle = (grantNumber, newSource) => {
    onChange({
      ...currentValue,
      [grantNumber]: newSource,
    });
  };

  const updateAll = (newSource) => {
    // set all keys to the newSource value
    const newSources = Object.keys(currentValue).reduce((acc, key) => {
      acc[key] = newSource;
      return acc;
    }, {});

    onChange(newSources);
  };

  return {
    data,
    divergence,
    setDivergence,
    updateSingle,
    updateAll,
  };
}
