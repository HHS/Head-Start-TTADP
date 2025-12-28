import React, { useContext } from 'react';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';
import useFetch from '../../hooks/useFetch';
import { getAllTrainerOptionsByUser } from '../../fetchers/users';
import UserContext from '../../UserContext';

export default function FilterTrainingReportStaff({
  onApply,
  inputId,
  query,
}) {
  const { user } = useContext(UserContext);

  const {
    data,
  } = useFetch(
    [],
    async () => getAllTrainerOptionsByUser(String(user.id)),
    [user.id],
  );

  const onApplyClick = (selected) => {
    onApply(selected);
  };

  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select user to filter by"
      options={data}
      selectedValues={query}
      labelProp="fullName"
      valueProp="id"
      mapByValue
    />
  );
}

FilterTrainingReportStaff.propTypes = {
  ...filterSelectProps,
};
