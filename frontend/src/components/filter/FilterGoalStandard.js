import React, { useEffect, useState } from 'react';
import { getGoalTemplateFilterStandards } from '../../fetchers/goalTemplates';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

export default function FilterGoalStandard({ onApply, inputId, query }) {
  const [standards, setStandards] = useState([]);

  useEffect(() => {
    getGoalTemplateFilterStandards()
      .then((data) => {
        setStandards((data || []).map((standard) => ({ label: standard, value: standard })));
      })
      .catch(() => setStandards([]));
  }, []);

  return (
    <FilterSelect
      onApply={onApply}
      inputId={inputId}
      labelText="Select goal standard to filter by"
      options={standards}
      selectedValues={query}
    />
  );
}

FilterGoalStandard.propTypes = filterSelectProps;
