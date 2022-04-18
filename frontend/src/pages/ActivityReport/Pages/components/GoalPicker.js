import React, { useState, useEffect } from 'react';
import { uniqBy } from 'lodash';
import PropTypes from 'prop-types';
import { Label } from '@trussworks/react-uswds';
import { useFormContext, useWatch } from 'react-hook-form/dist/index.ie11';
import Select from 'react-select';
import { getTopics } from '../../../../fetchers/topics';
import Req from '../../../../components/Req';
import Option from './GoalOption';
import SingleValue from './GoalValue';
import selectOptionsReset from '../../../../components/selectOptionsReset';
import { validateGoals } from './goalValidator';
import './GoalPicker.css';
import GoalForm from './GoalForm';

const components = {
  Option,
  SingleValue,
};

const GoalPicker = ({
  availableGoals,
}) => {
  const {
    control, setValue,
  } = useFormContext();
  const [inMemoryGoals] = useState([]);
  const [topicOptions, setTopicOptions] = useState([]);
  const selectedGoals = useWatch({ name: 'goals' });
  // availableGoals: goals passed into GoalPicker. getGoals returns GrantGoals
  // inMemoryGoals: unsaved goals, deselected goals
  // selectedGoals: goals selected by user in MultiSelect
  const allAvailableGoals = [...selectedGoals, ...inMemoryGoals, ...availableGoals];

  const onChange = (goal) => {
    // need to build this out for when multiple goals are selected
    setValue('goals', [goal]);
  };

  // for fetching topic options from API
  useEffect(() => {
    async function fetchTopics() {
      const topicsFromApi = await getTopics();

      const topicsAsOptions = topicsFromApi.map((topic) => ({
        label: topic.name,
        value: topic.id,
      }));
      setTopicOptions(topicsAsOptions);
    }

    fetchTopics();
  }, []);

  const uniqueAvailableGoals = uniqBy(allAvailableGoals, 'id');

  // We need options with the number and also we need to add the
  // "create new goal to the front of all the options"
  const options = [
    {
      value: 'new', number: false, label: 'Create new goal', objectives: [],
    },
    ...uniqueAvailableGoals.map(({
      goalNumber, ...goal
    }) => (
      {
        value: goal.id, number: goalNumber, label: goal.name, objectives: [], ...goal,
      }
    )),
  ];

  return (
    <div className="margin-top-4">
      <Label>
        Select recipient&apos;s goal
        <Req />
        <Select
          name="goals"
          control={control}
          components={components}
          onChange={onChange}
          rules={{
            validate: validateGoals,
          }}
          className="usa-select"
          options={options}
          styles={{
            ...selectOptionsReset,
            option: (provided) => ({
              ...provided,
              marginBottom: '0.5em',
            }),
          }}
          placeholder="- Select -"
          value={selectedGoals}
        />
      </Label>
      <div>
        {selectedGoals.map((goal) => (
          <GoalForm key={goal.id} topicOptions={topicOptions} goal={goal} />
        ))}
      </div>
    </div>
  );
};

GoalPicker.propTypes = {
  availableGoals: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    }),
  ).isRequired,
};

export default GoalPicker;
