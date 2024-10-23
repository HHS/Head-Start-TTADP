import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { uniqBy } from 'lodash';
import PropTypes from 'prop-types';
import { Label, Button, Checkbox } from '@trussworks/react-uswds';
import { useFormContext, useWatch, useController } from 'react-hook-form';
import Select from 'react-select';
import { getTopics } from '../../../../fetchers/topics';
import { getGoalTemplatePrompts } from '../../../../fetchers/goalTemplates';
import Req from '../../../../components/Req';
import Option from './GoalOption';
import SingleValue from './GoalValue';
import selectOptionsReset from '../../../../components/selectOptionsReset';
import { validateGoals } from './goalValidator';
import './GoalPicker.css';
import GoalForm from './GoalForm';
import Modal from '../../../../components/VanillaModal';

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
  isRttapa: null,
  isCurated: false,
});

const components = {
  Option,
  SingleValue,
};

const GoalPicker = ({
  availableGoals,
  grantIds,
  reportId,
  goalTemplates,
}) => {
  const {
    control, setValue, watch,
  } = useFormContext();
  const [topicOptions, setTopicOptions] = useState([]);
  // the date picker component, as always, presents special challenges, it needs a key updated
  // to re-render appropriately
  const [datePickerKey, setDatePickerKey] = useState('DPKEY-00');
  const [templatePrompts, setTemplatePrompts] = useState(false);
  const [useOhsStandardGoal, setOhsStandardGoal] = useState(false);
  const activityRecipientType = watch('activityRecipientType');

  const selectedGoals = useWatch({ name: 'goals' });
  const activityRecipients = watch('activityRecipients');
  const isMultiRecipientReport = activityRecipients && activityRecipients.length > 1;

  const modalRef = useRef();
  const [selectedGoal, setSelectedGoal] = useState(null);

  const { selectedIds, selectedNames } = (selectedGoals || []).reduce((acc, goal) => {
    const { id, name } = goal;
    const newSelectedIds = [...acc.selectedIds, id];
    const newSelectedNames = [...acc.selectedNames, name];

    return {
      selectedIds: newSelectedIds,
      selectedNames: newSelectedNames,
    };
  }, {
    selectedIds: [],
    selectedNames: [],
  });

  // excludes already selected goals from the dropdown by name and ID
  const allAvailableGoals = availableGoals
    .filter((goal) => goal.goalIds.every((id) => (
      !selectedIds.includes(id)
    )) && !selectedNames.includes(goal.name));

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
  // goal templates and "create new goal" to the front of all the options
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

  const onChangeGoal = async (goal) => {
    onChange(goal);
    if (goal.isCurated) {
      const prompts = await getGoalTemplatePrompts(goal.goalTemplateId, goal.goalIds);
      if (prompts) {
        setTemplatePrompts(prompts);
      }
    } else {
      setTemplatePrompts(false);
    }

    // update the goal date forcefully
    // also update the date picker key to force a re-render
    setValue('goalEndDate', goal.endDate || '');
    if (goal.goalIds) {
      setDatePickerKey(`DPKEY-${goal.goalIds.join('-')}`);
    }

    setSelectedGoal(null);
  };

  const onKeep = async () => {
    const savedObjectives = goalForEditing.objectives.map((o) => ({ ...o }));
    onChangeGoal(selectedGoal);
    setValue('goalForEditing.objectives', savedObjectives);
    modalRef.current.toggleModal();
  };

  const onRemove = async () => {
    setValue('goalForEditing.objectives', []);
    onChangeGoal(selectedGoal);
    modalRef.current.toggleModal();
  };

  const onSelectGoal = async (goal) => {
    const objectivesLength = (() => {
      if (goalForEditing) {
        return goalForEditing.objectives.length;
      }
      return 0;
    })();

    if (objectivesLength && modalRef.current) {
      setSelectedGoal(goal);
      modalRef.current.toggleModal();
      return;
    }

    setValue('goalForEditing.objectives', []);
    onChangeGoal(goal);
  };

  const pickerLabel = useOhsStandardGoal ? 'Select OHS standard goal' : 'Select recipient\'s goal';
  const pickerOptions = useOhsStandardGoal ? goalTemplates : options;

  return (
    <>
      <Modal
        modalRef={modalRef}
        heading="You have selected a different goal."
      >
        <p>Do you want to keep the current objective summary information or remove it?</p>
        <Button
          type="button"
          className="margin-right-1"
          onClick={onKeep}
          data-focus="true"
        >
          Keep objective
        </Button>
        <Button type="button" onClick={onRemove} className="usa-button--subtle">Remove objective</Button>
      </Modal>
      <div className="margin-top-3 position-relative">
        <Label>
          {pickerLabel}
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
            options={pickerOptions}
            styles={{
              ...selectOptionsReset,
              option: (provided) => ({
                ...provided,
                marginBottom: '0.5em',
              }),
            }}
            placeholder="- Select -"
            value={goalForEditing}
            required
          />
        </Label>
        <Checkbox
          label="Use OHS standard goal"
          id="useOhsStandardGoal"
          name="useOhsStandardGoal"
          checked={useOhsStandardGoal}
          className="margin-top-1"
          onChange={() => setOhsStandardGoal(!useOhsStandardGoal)}
        />
        {goalForEditing ? (
          <div>
            <GoalForm
              topicOptions={topicOptions}
              goal={goalForEditing}
              reportId={reportId}
              datePickerKey={datePickerKey}
              templatePrompts={templatePrompts}
              isMultiRecipientReport={isMultiRecipientReport}
            />
          </div>
        ) : null}
      </div>

    </>
  );
};

GoalPicker.propTypes = {
  goalTemplates: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    goalIds: PropTypes.arrayOf(PropTypes.number),
    goalTemplateId: PropTypes.number,
    objectives: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      description: PropTypes.string,
      goalId: PropTypes.number,
    })),
  })).isRequired,
  grantIds: PropTypes.arrayOf(PropTypes.number).isRequired,
  availableGoals: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  })).isRequired,
  reportId: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]).isRequired,
};

export default GoalPicker;
