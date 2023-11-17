import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getNationalCenters } from '../../fetchers/nationalCenters';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

export default function FilterNationalCenterNameSelect({
  onApply,
  inputId,
  query,
  title,
}) {
  const [nationalCenters, setNationalCenters] = useState([]);

  useEffect(() => {
    async function fetchNationalCenterNames() {
      const { centers } = await getNationalCenters(title);
      setNationalCenters(centers.map((c) => ({ value: c.name, label: c.name })));
    }

    fetchNationalCenterNames();
  }, [setNationalCenters, title]);

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
  title: PropTypes.string.isRequired,
};
