import React from 'react';
import FilterSelect from './FilterSelect';
import { RECIPIENT_PARTICIPANTS, OTHER_ENTITY_PARTICIPANTS } from '../../Constants';
import { filterSelectProps } from './props';

const AllParticipants = [
  'Recipient participants',
  ...RECIPIENT_PARTICIPANTS,
  'Other entity participants',
  ...OTHER_ENTITY_PARTICIPANTS];

const PARTICIPANT_OPTIONS = AllParticipants.map(
  (label, value) => ({
    value,
    label,
    isDisabled: (label === 'Recipient participants' || label === 'Other entity participants'),
  }),
);

export default function FilterParticipantSelect({
  onApply,
  inputId,
  query,
}) {
  const onApplyClick = (selected) => {
    onApply(selected);
  };
  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select participants to filter by"
      options={PARTICIPANT_OPTIONS}
      selectedValues={query}
    />
  );
}

FilterParticipantSelect.propTypes = filterSelectProps;
