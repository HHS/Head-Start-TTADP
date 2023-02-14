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
    fetchGroups().then((g) => {
    //   setGroups(g);
      console.log(g);
    });
  }, []);

  const onApplyClick = (selected) => {
    onApply(selected);
  };
  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select reasons to filter by"
      options={groups}
      selectedValues={query}
    />
  );
}

FilterGroups.propTypes = filterSelectProps;
