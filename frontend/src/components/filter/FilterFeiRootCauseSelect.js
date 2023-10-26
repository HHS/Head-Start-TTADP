import React, { useState, useEffect } from 'react';
import { getGoalTemplatePromptOptionsByName } from '../../fetchers/goalTemplates';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

export default function FilterRootCauseSelect({
  onApply,
  inputId,
  query,
}) {
  const [goalTemplatePrompts, setGoalTemplatePrompts] = useState([]);

  useEffect(() => {
    async function fetchGoalTemplatePrompts() {
      const gtPrompts = await getGoalTemplatePromptOptionsByName('FEI root cause');
      setGoalTemplatePrompts(gtPrompts.options.map((label, value) => ({ value, label })));
    }

    fetchGoalTemplatePrompts();
  }, [setGoalTemplatePrompts]);

  const onApplyClick = (selected) => {
    onApply(selected);
  };
  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select root cause to filter by"
      options={goalTemplatePrompts}
      selectedValues={query}
    />
  );
}

FilterRootCauseSelect.propTypes = filterSelectProps;
