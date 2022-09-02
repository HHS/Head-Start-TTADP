import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useFormContext, useFieldArray } from 'react-hook-form/dist/index.ie11';
import { Alert } from '@trussworks/react-uswds';
import Objective from './Objective';
import { getTopics } from '../../../../fetchers/topics';
import PlusButton from '../../../../components/GoalForm/PlusButton';
import { NEW_OBJECTIVE } from './constants';

const OBJECTIVE_LABEL = 'objectivesWithoutGoals';

export default function OtherEntity({ roles, recipientIds }) {
  const { errors, formState } = useFormContext();
  const { dirtyFields } = formState;
  const defaultRoles = useMemo(() => (roles.length === 1 ? roles : []), [roles]);
  const [topicOptions, setTopicOptions] = useState([]);

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

  const {
    fields: objectives,
    remove,
    append,
  } = useFieldArray({
    name: OBJECTIVE_LABEL,
    keyName: 'key', // because 'id' is the default key switch it to use 'key'.
    defaultValues: [{ ...NEW_OBJECTIVE(), roles: defaultRoles, recipientIds }],
  });

  const onAddNew = () => {
    append({ ...NEW_OBJECTIVE(), roles: defaultRoles, recipientIds });
  };

  const options = [{ ...NEW_OBJECTIVE() }];

  useEffect(() => {
    // Only add default value on initial load if there are no entries.
    if (objectives.length === 0 && !dirtyFields[OBJECTIVE_LABEL]) {
      append({ ...NEW_OBJECTIVE(), roles: defaultRoles, recipientIds });
    }
  }, [append, defaultRoles, objectives.length, recipientIds, dirtyFields]);

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
            options={options}
            errors={objectiveErrors}
            remove={remove}
            fieldArrayName={OBJECTIVE_LABEL}
            roles={roles}
          />
        );
      })}
      <PlusButton text="Add new objective" onClick={onAddNew} />
    </div>
  );
}

OtherEntity.propTypes = {
  roles: PropTypes.arrayOf(PropTypes.string).isRequired,
  recipientIds: PropTypes.arrayOf(PropTypes.number).isRequired,
};
