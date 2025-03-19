import React, { useState, useEffect, useRef } from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { v4 as uuidv4 } from 'uuid';
import { uniqBy } from 'lodash';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  Label, Button, Checkbox, Alert,
} from '@trussworks/react-uswds';
import { useFormContext, useWatch, useController } from 'react-hook-form';
import Select from 'react-select';
import { getTopics } from '../../../../fetchers/topics';
import { getGoalTemplatePrompts, getGoalTemplateSource } from '../../../../fetchers/goalTemplates';
import Req from '../../../../components/Req';
import Option from './GoalOption';
import SingleValue from './GoalValue';
import selectOptionsReset from '../../../../components/selectOptionsReset';
import { validateGoals } from './goalValidator';
import './GoalPicker.css';
import GoalForm from './GoalForm';
import Modal from '../../../../components/VanillaModal';
import { fetchCitationsByGrant } from '../../../../fetchers/citations';

export const newGoal = (grantIds) => ({
  value: uuidv4(),
  number: false,
  label: 'Create new goal',
  objectives: [],
  name: '',
  goalNumber: '',
  id: 'new',
  isNew: true,
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
  const [templatePrompts, setTemplatePrompts] = useState(false);
  const [useOhsStandardGoal, setOhsStandardGoal] = useState(false);
  const activityRecipientType = watch('activityRecipientType');

  const [citationOptions, setCitationOptions] = useState([]);
  const [rawCitations, setRawCitations] = useState([]);
  const [grantsWithoutMonitoring, setGrantsWithoutMonitoring] = useState([]);

  const selectedGoals = useWatch({ name: 'goals' });
  const activityRecipients = watch('activityRecipients');
  const regionId = watch('regionId');
  const startDate = watch('startDate');
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

  const isMonitoringGoal = goalForEditing
  && goalForEditing.standard
  && goalForEditing.standard === 'Monitoring';

  // for fetching topic options from API
  useEffect(() => {
    async function fetchTopics() {
      const topics = await getTopics();
      setTopicOptions(topics);
    }
    fetchTopics();
  }, []);

  // Fetch citations for the goal if the source is CLASS or RANs.
  useDeepCompareEffect(() => {
    async function fetchCitations() {
      // If we have no other goals except a monitoring goal
      //  and the source is CLASS or RANs, fetch the citations.
      if (isMonitoringGoal) {
        const retrievedCitationOptions = await fetchCitationsByGrant(
          regionId,
          grantIds,
          startDate,
        );

        if (retrievedCitationOptions) {
          // Reduce the citation options to only unique values.
          const uniqueCitationOptions = Object.values(retrievedCitationOptions.reduce(
            (acc, current) => {
              current.grants.forEach((currentGrant) => {
                const { findingType } = currentGrant;
                if (!acc[findingType]) {
                  acc[findingType] = { label: findingType, options: [] };
                }

                const findingKey = `${currentGrant.acro} - ${currentGrant.citation} - ${currentGrant.findingSource}`;
                if (!acc[findingType].options.find((option) => option.name === findingKey)) {
                  acc[findingType].options.push({
                    name: findingKey,
                    id: current.standardId,
                  });
                }
              });

              return acc;
            }, {},
          ));
          setCitationOptions(uniqueCitationOptions);
          setRawCitations(retrievedCitationOptions);
        }
      } else {
        setCitationOptions([]);
        setRawCitations([]);
      }
    }
    fetchCitations();
  }, [goalForEditing, regionId, startDate, grantIds, isMonitoringGoal]);

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
    try {
      if (goal.isCurated) {
        const [prompts, source] = await Promise.all([
          getGoalTemplatePrompts(goal.goalTemplateId, goal.goalIds),
          // eslint-disable-next-line max-len
          getGoalTemplateSource(goal.goalTemplateId, activityRecipients.map((ar) => ar.activityRecipientId)),
        ]);

        onChange({
          ...goal,
          source: source.source,
        });

        if (prompts) {
          setTemplatePrompts(prompts);
        }
      } else {
        onChange(goal);
        setTemplatePrompts(false);
      }

      setSelectedGoal(null);
    } catch (err) {
      onChange(goal);
      setTemplatePrompts(false);
    }
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

  useDeepCompareEffect(() => {
    // We have only a single monitoring goal selected.
    if (isMonitoringGoal && (!selectedGoals || selectedGoals.length === 0)) {
      // Get the monitoring goal from the templates.
      const monitoringGoal = goalTemplates.find((goal) => goal.standard === 'Monitoring');
      if (monitoringGoal) {
        // Find any grants that are missing from the monitoring goal.
        const missingGrants = grantIds.filter(
          (grantId) => !monitoringGoal.goals.find((g) => g.grantId === grantId),
        );

        if (missingGrants.length > 0) {
        // get the names of the grants that are missing from goalForEditing.grants
          const grantsIdsMissingMonitoringFullNames = activityRecipients.filter(
            (ar) => missingGrants.includes(ar.activityRecipientId),
          ).map((grant) => grant.name);
          setGrantsWithoutMonitoring(grantsIdsMissingMonitoringFullNames);
        } else {
          setGrantsWithoutMonitoring([]);
        }
      }
    } else if (grantsWithoutMonitoring.length > 0) {
      setGrantsWithoutMonitoring([]);
    }
  }, [goalForEditing,
    grantIds,
    selectedGoals,
    activityRecipients,
    isMonitoringGoal,
    goalTemplates]);

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
        {
          grantsWithoutMonitoring.length > 0 && (
            <Alert type="warning" className="margin-bottom-2">
              <span>
                <span className="margin-top-0">
                  {grantsWithoutMonitoring.length > 1
                    ? 'These grants do not have the standard monitoring goal:'
                    : 'This grant does not have the standard monitoring goal:'}
                  <ul className="margin-top-2">
                    {grantsWithoutMonitoring.map((grant) => (
                      <li key={grant}>{grant}</li>
                    ))}
                  </ul>
                </span>
                <span className="margin-top-2 margin-bottom-0">
                  To avoid errors when submitting the report, you can either:
                  <ul className="margin-top-2 margin-bottom-0">
                    <li>
                      Add a different goal to the report
                    </li>
                    <li>
                      Remove the grant from the
                      {' '}
                      <Link to={`/activity-reports/${reportId}/activity-summary`}>Activity summary</Link>
                    </li>
                  </ul>
                </span>
              </span>
            </Alert>
          )
       }
        <Label>
          Select recipient&apos;s goal
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
              templatePrompts={templatePrompts}
              isMultiRecipientReport={isMultiRecipientReport}
              citationOptions={citationOptions}
              rawCitations={rawCitations}
              isMonitoringGoal={isMonitoringGoal}
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
