import React from 'react';
import PropTypes from 'prop-types';
import { Label } from '@trussworks/react-uswds';
import Select from 'react-select';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import Req from '../../../../components/Req';
import selectOptionsReset from '../../../../components/selectOptionsReset';
import Objective from './Objective';

export default function Objectives({ goal, objectives, topicOptions }) {
  const { objectives: selectedObjectives } = goal;
  const { setValue } = useFormContext();
  const options = [
    {
      id: 'new',
      value: 'new',
      label: 'Create a new objective',
      text: '',
      ttaProvided: '',
      activityReports: [],
      resources: [],
      topics: [],
    },
    ...objectives.map((objective) => ({
      label: objective.title,
      value: objective.id,
      ...objective,
    })),
  ];

  const onChange = (objective) => {
    const goalToUpdate = { ...goal };
    goalToUpdate.objectives = [{ ...objective }];
    setValue('goalForEditing', goalToUpdate);
  };

  return (
    <>
      <Label>
        Select TTA objective
        <Req />
        <Select
          name="objectives"
          onChange={onChange}
          className="usa-select"
          options={options}
          styles={selectOptionsReset}
          placeholder="- Select -"
          value={selectedObjectives}
        />
      </Label>
      {selectedObjectives.map((objective) => (
        <Objective
          key={objective.id}
          objective={objective}
          topicOptions={topicOptions}
          onChange={onChange}
        />
      ))}
    </>
  );
}

const OBJECTIVE_PROP = PropTypes.shape({
  label: PropTypes.string,
});

Objectives.propTypes = {
  goal: PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
    objectives: PropTypes.arrayOf(
      OBJECTIVE_PROP,
    ),
  }).isRequired,
  topicOptions: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
  })).isRequired,
  objectives: PropTypes.arrayOf(
    OBJECTIVE_PROP,
  ).isRequired,
};
