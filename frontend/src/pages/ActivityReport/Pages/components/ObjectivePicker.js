import React, { useMemo, useState, useEffect } from 'react';
import { useFormContext, useWatch, useFieldArray } from 'react-hook-form/dist/index.ie11';
import Objective from './Objective';
import { getTopics } from '../../../../fetchers/topics';
import ObjectiveSelect from './ObjectiveSelect';
import PlusButton from '../../../../components/GoalForm/PlusButton';
import { NEW_OBJECTIVE } from './constants';

const OBJECTIVE_LABEL = 'objectivesWithoutGoals';

const ObjectivePicker = () => {
  const [topicOptions, setTopicOptions] = useState([]);

  const { errors } = useFormContext();

  const {
    fields: objectives,
    remove,
    append,
  } = useFieldArray({
    name: OBJECTIVE_LABEL,
    defaultValues: [],
  });

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

  // we need to figure out our options based on author/collaborator roles
  const collaborators = useWatch({ name: 'collaborators' });
  const author = useWatch({ name: 'author' });

  // create an exclusive set of roles
  // from the collaborators & author
  const roles = useMemo(() => {
    const collabs = collaborators || [];
    const auth = author || { role: '' };

    return Array.from(
      new Set(
        [...collabs, auth].map(({ role }) => role).flat(),
      ),
    );
  }, [author, collaborators]);

  const onAddNew = () => {
    const defaultRoles = roles.length === 1 ? roles : [];
    append({ ...NEW_OBJECTIVE(), roles: defaultRoles });
  };

  const options = [{ ...NEW_OBJECTIVE() }];

  const onSelect = (objective) => {
    const defaultRoles = roles.length === 1 ? roles : objective.roles;
    append({ ...objective, roles: defaultRoles });
  };

  return (
    <div>
      {objectives.length < 1
        ? (
          <ObjectiveSelect
            onChange={onSelect}
            options={options}
            selectedObjectives={[]}
          />
        )
        : objectives.map((objective, index) => {
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
};

export default ObjectivePicker;
