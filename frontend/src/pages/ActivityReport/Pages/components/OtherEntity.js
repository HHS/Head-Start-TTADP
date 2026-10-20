import { Alert } from '@trussworks/react-uswds';
import { DECIMAL_BASE } from '@ttahub/common';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import PlusButton from '../../../../components/GoalForm/PlusButton';
import { getTopics } from '../../../../fetchers/topics';
import { NEW_OBJECTIVE } from './constants';
import Objective from './Objective';

const OBJECTIVE_LABEL = 'objectivesWithoutGoals';

export default function OtherEntity({ recipientIds, reportId }) {
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

  const onAddNew = () => {
    append({ ...NEW_OBJECTIVE(), recipientIds });
  };

  const options = [{ ...NEW_OBJECTIVE() }];

  return (
    <div>
      <Alert type="info" noIcon>
        <p className="usa-prose margin-top-0">
          You&apos;re creating an activity report for an entity that&apos;s not a grant recipient,
          so you only need to create objectives. The goal section is removed.
        </p>
        <p className="usa-prose margin-bottom-0">
          Create at least one objective for this activity.
        </p>
      </Alert>
      {objectives.map((objective, index) => {
        const objectiveErrors =
          errors[OBJECTIVE_LABEL] && errors[OBJECTIVE_LABEL][index]
            ? errors[OBJECTIVE_LABEL][index]
            : {};

        return (
          <Objective
            index={index}
            key={objective.id}
            objective={objective}
            topicOptions={topicOptions}
            options={options}
            errors={objectiveErrors}
            remove={remove}
            fieldArrayName={OBJECTIVE_LABEL}
            reportId={parseInt(reportId, DECIMAL_BASE)}
          />
        );
      })}
      {recipientIds.length > 0 && <PlusButton text="Add new objective" onClick={onAddNew} />}
    </div>
  );
}

OtherEntity.propTypes = {
  recipientIds: PropTypes.arrayOf(PropTypes.number).isRequired,
  reportId: PropTypes.string.isRequired,
};
