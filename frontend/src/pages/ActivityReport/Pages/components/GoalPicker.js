import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { uniqBy } from 'lodash';
import PropTypes from 'prop-types';
import { Label } from '@trussworks/react-uswds';
import { useFormContext, useWatch, useController } from 'react-hook-form/dist/index.ie11';
import Select from 'react-select';
import { getTopics } from '../../../../fetchers/topics';
import Req from '../../../../components/Req';
import Option from './GoalOption';
import SingleValue from './GoalValue';
import selectOptionsReset from '../../../../components/selectOptionsReset';
import { validateGoals } from './goalValidator';
import './GoalPicker.css';
import GoalForm from './GoalForm';

export const newGoal = (grantIds) => ({
  value: uuidv4(),
  number: false,
  label: 'Create new goal',
  objectives: [],
  name: '',
  goalNumber: '',
  id: 'new',
  isNew: true,
  endDate: '',
  onApprovedAR: false,
  grantIds,
  goalIds: [],
  oldGrantIds: [],
  status: 'Draft',
  isRttapa: '',
});

const components = {
  Option,
  SingleValue,
};

const GoalPicker = ({
  availableGoals, grantIds, reportId,
}) => {
  const {
    control, setValue, watch,
  } = useFormContext();
  const [topicOptions, setTopicOptions] = useState([]);
  // the date picker component, as always, presents special challenges, it needs a key updated
  // to re-render appropriately
  const [datePickerKey, setDatePickerKey] = useState('DPKEY-00');
  const activityRecipientType = watch('activityRecipientType');

  // this is commented out because it's used by the code below, which is pending a todo resolve
  // const { toggleGoalForm } = useContext(GoalFormContext);

  const selectedGoals = useWatch({ name: 'goals' });
  const selectedIds = selectedGoals ? selectedGoals.map((g) => g.id) : [];
  const allAvailableGoals = availableGoals // excludes already selected goals from the dropdown
    .filter((goal) => goal.goalIds.every((id) => !selectedIds.includes(id)));

  const {
    field: {
      onChange,
      value: goalForEditing,
    },
  } = useController({
    name: 'goalForEditing',
    rules: {
      validate: {
        validateGoal: (g) => activityRecipientType === 'other-entity' || validateGoals(g ? [g] : []) === true,
      },
    },
    defaultValue: '',
  });

  // for fetching topic options from API
  useEffect(() => {
    async function fetchTopics() {
      const topics = await getTopics();
      setTopicOptions(topics);
    }

    fetchTopics();
  }, []);

  const uniqueAvailableGoals = uniqBy(allAvailableGoals, 'name');

  // We need options with the number and also we need to add the
  // "create new goal to the front of all the options"
  const options = [
    newGoal(grantIds),
    ...uniqueAvailableGoals.map(({
      goalNumber,
      ...goal
    }) => (
      {
        value: goal.id,
        number: goalNumber,
        label: goal.name,
        objectives: [],
        isNew: false,
        ...goal,
      }
    )),
  ];

  const onSelectGoal = (goal) => {
    setValue('goalForEditing.objectives', []);
    onChange(goal);

    // update the goal date forcefully
    // also update the date picker key to force a re-render
    setValue('goalEndDate', goal.endDate || '');
    if (goal.goalIds) {
      setDatePickerKey(`DPKEY-${goal.goalIds.join('-')}`);
    }
  };

  console.log({ goalForEditing });

  return (
    <>
      <div className="margin-top-3 position-relative">
        <Label>
          Select recipient&apos;s goal
          {' '}
          <Req />
          <Select
            name="goalForEditing"
            control={control}
            components={components}
            onChange={onSelectGoal}
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
            value={goalForEditing}
          />
        </Label>
        {goalForEditing ? (
          <div>
            <GoalForm
              topicOptions={topicOptions}
              goal={goalForEditing}
              reportId={reportId}
              datePickerKey={datePickerKey}
            />
          </div>
        ) : null}
      </div>

    </>
  );
};

GoalPicker.propTypes = {
  grantIds: PropTypes.arrayOf(PropTypes.number).isRequired,
  availableGoals: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    }),
  ).isRequired,
  reportId: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]).isRequired,
};

export default GoalPicker;
