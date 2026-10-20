import React, { useContext } from 'react';
import { MyGroupsContext } from '../MyGroupsProvider';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

export default function FilterGroups({ onApply, inputId, query }) {
  const { myGroups } = useContext(MyGroupsContext);
  const groups = myGroups.map((g) => ({
    value: String(g.id),
    label: g.name,
  }));

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
      mapByValue // this returns the value instead of the label through "selected" via onApplyClick
    />
  );
}

FilterGroups.propTypes = filterSelectProps;
