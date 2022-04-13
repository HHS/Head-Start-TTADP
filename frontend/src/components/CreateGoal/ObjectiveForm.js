import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
} from '@trussworks/react-uswds';
import ObjectiveTitle from './ObjectiveTitle';
import ObjectiveTopics from './ObjectiveTopics';
import ResourceRepeater from './ResourceRepeater';
import {
  OBJECTIVE_FORM_FIELD_INDEXES, validateListOfResources, OBJECTIVE_ERROR_MESSAGES,
} from './constants';
import { REPORT_STATUSES } from '../../Constants';

const [
  objectiveTitleError, objectiveTopicsError, objectiveResourcesError,
] = OBJECTIVE_ERROR_MESSAGES;

export default function ObjectiveForm({
  index,
  removeObjective,
  setObjectiveError,
  objective,
  setObjective,
  errors,
  topicOptions,
  unchangingApiData,
}) {
  // the parent objective data from props
  const {
    title, topics, resources,
  } = objective;
  const isOnReport = useMemo(() => (
    objective.activityReports && objective.activityReports.length > 0
  ), [objective.activityReports]);

  const isOnApprovedReport = useMemo(() => (
    (objective.activityReports && objective.activityReports.some((report) => (
      report.status === REPORT_STATUSES.APPROVED
    )))
  ), [objective.activityReports]);

  const data = unchangingApiData[objective.id];

  // onchange handlers
  const onChangeTitle = (e) => setObjective({ ...objective, title: e.target.value });
  const onChangeTopics = (newTopics) => setObjective({ ...objective, topics: newTopics });
  const setResources = (newResources) => setObjective({ ...objective, resources: newResources });

  // validate different fields
  const validateObjectiveTitle = () => {
    if (!title) {
      const newErrors = [...errors];
      newErrors.splice(OBJECTIVE_FORM_FIELD_INDEXES.TITLE, 1, <span className="usa-error-message">{objectiveTitleError}</span>);
      setObjectiveError(index, newErrors);
    } else {
      const newErrors = [...errors];
      newErrors.splice(OBJECTIVE_FORM_FIELD_INDEXES.TITLE, 1, <></>);
      setObjectiveError(index, newErrors);
    }
  };

  const validateObjectiveTopics = () => {
    if (!topics.length) {
      const newErrors = [...errors];
      newErrors.splice(OBJECTIVE_FORM_FIELD_INDEXES.TOPICS, 1, <span className="usa-error-message">{objectiveTopicsError}</span>);
      setObjectiveError(index, newErrors);
    } else {
      const newErrors = [...errors];
      newErrors.splice(OBJECTIVE_FORM_FIELD_INDEXES.TOPICS, 1, <></>);
      setObjectiveError(index, newErrors);
    }
  };
  const validateResources = () => {
    let error = <></>;

    const validated = validateListOfResources(resources);

    if (!validated) {
      error = <span className="usa-error-message">{objectiveResourcesError}</span>;
    }

    const newErrors = [...errors];
    newErrors.splice(OBJECTIVE_FORM_FIELD_INDEXES.RESOURCES, 1, error);
    setObjectiveError(index, newErrors);
  };

  return (
    <div className="margin-top-2 ttahub-create-goals-objective-form">
      <div className="display-flex flex-justify maxw-mobile-lg">
        <h3>Objective summary</h3>
        { !isOnReport
          && (<Button type="button" unstyled onClick={() => removeObjective(index)} aria-label={`Remove objective ${index + 1}`}>Remove this objective</Button>)}
      </div>

      <ObjectiveTitle
        error={errors[OBJECTIVE_FORM_FIELD_INDEXES.TITLE]}
        isOnReport={isOnReport || false}
        title={title}
        onChangeTitle={onChangeTitle}
        validateObjectiveTitle={validateObjectiveTitle}
      />

      <ObjectiveTopics
        error={errors[OBJECTIVE_FORM_FIELD_INDEXES.TOPICS]}
        savedTopics={data && data.topics ? data.topics : []}
        topicOptions={topicOptions}
        validateObjectiveTopics={validateObjectiveTopics}
        topics={topics}
        onChangeTopics={onChangeTopics}
      />

      <ResourceRepeater
        resources={resources}
        savedResources={data && data.resources ? data.resources : []}
        setResources={setResources}
        validateResources={validateResources}
        error={errors[OBJECTIVE_FORM_FIELD_INDEXES.RESOURCES]}
        isOnReport={isOnReport || false}
        isOnApprovedReport={isOnApprovedReport || false}
      />
    </div>
  );
}

ObjectiveForm.propTypes = {
  unchangingApiData: PropTypes.objectOf(
    PropTypes.shape({
      resources: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        value: PropTypes.string,
      })),
      topics: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string,
        value: PropTypes.number,
      })),
    }),
  ).isRequired,
  index: PropTypes.number.isRequired,
  removeObjective: PropTypes.func.isRequired,
  errors: PropTypes.arrayOf(PropTypes.node).isRequired,
  setObjectiveError: PropTypes.func.isRequired,
  setObjective: PropTypes.func.isRequired,
  objective: PropTypes.shape({
    id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ]),
    title: PropTypes.string,
    topics: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    })),
    activityReports: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number,
    })),
    resources: PropTypes.arrayOf(PropTypes.shape({
      key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      value: PropTypes.string,
    })),
    status: PropTypes.string,
  }).isRequired,
  topicOptions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  })).isRequired,
};
