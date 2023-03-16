import React, {
  useState,
  useEffect,
} from 'react';
import PropTypes from 'prop-types';
import { useFormContext, useFieldArray } from 'react-hook-form/dist/index.ie11';
import { Alert } from '@trussworks/react-uswds';
import Objective from './Objective';
import { getTopics } from '../../../../fetchers/topics';
import { createObjectiveForOtherEntity } from '../../../../fetchers/objectives';
import PlusButton from '../../../../components/GoalForm/PlusButton';
import { NEW_OBJECTIVE } from './constants';
import { DECIMAL_BASE } from '../../../../Constants';

const OBJECTIVE_LABEL = 'objectivesWithoutGoals';

export default function OtherEntity({
  recipientIds,
  onSaveDraft,
  reportId,
  regionId,
}) {
  const { errors } = useFormContext();
  const [topicOptions, setTopicOptions] = useState([]);

  // for fetching topic options from API
  useEffect(() => {
    async function fetchTopics() {
      const topics = await getTopics();
      setTopicOptions(topics);
    }

    fetchTopics();
  }, []);

  const {
    fields: objectives,
    remove,
    append,
  } = useFieldArray({
    name: OBJECTIVE_LABEL,
    keyName: 'key', // because 'id' is the default key switch it to use 'key'.
    defaultValues: [{ ...NEW_OBJECTIVE(), recipientIds }],
  });

  const onAddNew = async () => {
    const newObjective = await createObjectiveForOtherEntity(recipientIds, regionId);
    const toAppend = { ...NEW_OBJECTIVE(), ...newObjective };
    append(toAppend);
  };

  return (
    <div>
      <Alert type="info" noIcon>
        <p className="usa-prose margin-top-0">
          You&apos;re creating an activity report for an entity that&apos;s not a grant
          recipient, so you only need to create objectives. The goal section is removed.
        </p>
        <p className="usa-prose margin-bottom-0">Create at least one objective for this activity.</p>
      </Alert>
      {objectives.map((objective, index) => {
        const objectiveErrors = errors[OBJECTIVE_LABEL]
          && errors[OBJECTIVE_LABEL][index]
          ? errors[OBJECTIVE_LABEL][index]
          : {};

        return (
          <Objective
            index={index}
            key={objective.id}
            objective={objective}
            topicOptions={topicOptions}
            options={[]}
            errors={objectiveErrors}
            remove={remove}
            fieldArrayName={OBJECTIVE_LABEL}
            onSaveDraft={onSaveDraft}
            reportId={parseInt(reportId, DECIMAL_BASE)}
            hideSelect
          />
        );
      })}
      <PlusButton text="Add new objective" onClick={onAddNew} />
    </div>
  );
}

OtherEntity.propTypes = {
  recipientIds: PropTypes.arrayOf(PropTypes.number).isRequired,
  onSaveDraft: PropTypes.func.isRequired,
  reportId: PropTypes.string.isRequired,
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};
