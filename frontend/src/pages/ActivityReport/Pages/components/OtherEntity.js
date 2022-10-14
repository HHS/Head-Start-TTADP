import React, {
  useState, useEffect, useMemo, useContext,
} from 'react';
import PropTypes from 'prop-types';
import { useFormContext, useFieldArray } from 'react-hook-form/dist/index.ie11';
import { Alert } from '@trussworks/react-uswds';
import Objective from './Objective';
import { getTopics } from '../../../../fetchers/topics';
import PlusButton from '../../../../components/GoalForm/PlusButton';
import { NEW_OBJECTIVE } from './constants';
import Loader from '../../../../components/Loader';
import GoalFormContext from '../../../../GoalFormContext';
import { DECIMAL_BASE } from '../../../../Constants';

const OBJECTIVE_LABEL = 'objectivesWithoutGoals';

export default function OtherEntity({
  roles, recipientIds, onSaveDraft, reportId,
}) {
  const { errors } = useFormContext();
  const defaultRoles = useMemo(() => (roles.length === 1 ? roles : []), [roles]);
  const [topicOptions, setTopicOptions] = useState([]);

  const { isLoading } = useContext(GoalFormContext);

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

  return (
    <div>
      <Alert type="info" noIcon>
        <p className="usa-prose margin-top-0">
          You&apos;re creating an activity report for an entity that&apos;s not a grant
          recipient, so you only need to create objectives. The goal section is removed.
        </p>
        <p className="usa-prose margin-bottom-0">Create at least one objective for this activity.</p>
      </Alert>
      <Loader loading={isLoading} loadingLabel="Loading" text="Saving" />
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
            roleOptions={roles}
            onSaveDraft={onSaveDraft}
            reportId={parseInt(reportId, DECIMAL_BASE)}
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
  onSaveDraft: PropTypes.func.isRequired,
  reportId: PropTypes.string.isRequired,
};
