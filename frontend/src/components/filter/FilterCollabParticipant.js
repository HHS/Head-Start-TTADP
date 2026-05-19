import { COLLAB_REPORT_PARTICIPANTS } from '@ttahub/common';
import React from 'react';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

const COLLAB_PARTICIPANT_OPTIONS = COLLAB_REPORT_PARTICIPANTS.map((participant) => ({
  value: participant,
  label: participant,
}));

export default function FilterCollabParticipant({ onApply, inputId, query }) {
  return (
    <FilterSelect
      onApply={onApply}
      inputId={inputId}
      labelText="Select participants to filter by"
      options={COLLAB_PARTICIPANT_OPTIONS}
      selectedValues={query}
      mapByValue
    />
  );
}

FilterCollabParticipant.propTypes = filterSelectProps;
