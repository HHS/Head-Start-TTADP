import React, { useState, useEffect } from 'react';
import { getTopics } from '../../fetchers/topics';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

export default function FilterTopicSelect({
  onApply,
  inputId,
  query,
}) {
  const [topicOptions, setTopicOptions] = useState([]);

  useEffect(() => {
    getTopics().then((topics) => {
      setTopicOptions(topics.map((topic) => ({ value: topic.id, label: topic.name })));
    });
  }, []);

  const onApplyClick = (selected) => {
    onApply(selected);
  };
  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select topics to filter by"
      options={topicOptions}
      selectedValues={query}
    />
  );
}

FilterTopicSelect.propTypes = filterSelectProps;
