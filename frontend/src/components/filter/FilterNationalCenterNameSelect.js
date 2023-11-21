import React, { useState, useEffect } from 'react';
import { getNationalCenters } from '../../fetchers/nationalCenters';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

export default function FilterNationalCenterNameSelect({
  onApply,
  inputId,
  query,
}) {
  const [nationalCenters, setNationalCenters] = useState([]);

  useEffect(() => {
    async function fetchNationalCenterNames() {
      try {
        const { centers } = await getNationalCenters();
        setNationalCenters(centers.map((c) => ({ value: c.name, label: c.name })));
      } catch (e) {
        setNationalCenters([]);
      }
    }

    fetchNationalCenterNames();
  }, []);

  const onApplyClick = (selected) => {
    onApply(selected);
  };
  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select national center to filter by"
      options={nationalCenters}
      selectedValues={query}
    />
  );
}

FilterNationalCenterNameSelect.propTypes = {
  ...filterSelectProps,
};
