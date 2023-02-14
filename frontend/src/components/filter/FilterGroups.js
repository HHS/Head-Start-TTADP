import React, { useState, useEffect } from 'react';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';
import { fetchGroups } from '../../fetchers/groups';

export default function FilterGroups({
  onApply,
  inputId,
  query,
}) {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    fetchGroups().then((gr) => {
      setGroups(gr.map((g) => ({
        value: g.id,
        label: g.name,
      })));
    });
  }, []);

  const onApplyClick = (selected) => {
    onApply(selected);
  };
  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select group to filter by"
      options={groups}
      selectedValues={query}
    />
  );
}

FilterGroups.propTypes = filterSelectProps;
