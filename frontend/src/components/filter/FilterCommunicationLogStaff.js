import React, { useContext } from 'react';
import { CommunicationLogUsersContext } from '../CommunicationLogUsersProvider';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

export default function FilterCommunicationLogStaff({ onApply, inputId, query }) {
  const { users } = useContext(CommunicationLogUsersContext);

  return (
    <FilterSelect
      onApply={onApply}
      inputId={inputId}
      labelText="Select user to filter by"
      options={users}
      selectedValues={query}
      labelProp="name"
      valueProp="id"
      mapByValue
    />
  );
}

FilterCommunicationLogStaff.propTypes = {
  ...filterSelectProps,
};
