import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import ObjectiveTitle from '../../../../components/GoalForm/ObjectiveTitle';
import { REPORT_STATUSES } from '../../../../Constants';
import SpecialistRole from './SpecialistRole';
import ObjectiveTopics from '../../../../components/GoalForm/ObjectiveTopics';
import ResourceRepeater from '../../../../components/GoalForm/ResourceRepeater';
import ObjectiveTta from './ObjectiveTta';
import ObjectiveStatus from './ObjectiveStatus';

export default function Objective({
  objective,
  topicOptions,
  onChange,
}) {
  const isOnApprovedReport = objective.activityReports && objective.activityReports.some(
    (report) => report.status === REPORT_STATUSES.APPROVED,
  );

  const onChangeTitle = (newTitle) => {
    onChange({ ...objective, label: newTitle });
  };

  const onChangeTopics = (topics) => {
    onChange({ ...objective, topics });
  };

  const onChangeStatus = (status) => {
    onChange({ ...objective, status });
  };

  const setResources = (resources) => {
    onChange({ ...objective, resources });
  };

  const onChangeTTA = (ttaProvided) => {
    onChange({ ...objective, ttaProvided });
  };

  let savedTopics = [];
  let savedResources = [];

  if (isOnApprovedReport) {
    savedTopics = objective.topics;
    savedResources = objective.resources;
  }

  const resourcesForRepeater = objective.resources.length ? objective.resources : [{ key: uuidv4(), value: '' }];

  return (
    <>
      <ObjectiveTitle
        error={<></>}
        isOnApprovedReport={isOnApprovedReport || false}
        title={objective.title}
        onChangeTitle={onChangeTitle}
        validateObjectiveTitle={() => {}}
        status={objective.status}
      />
      <SpecialistRole
        objective={objective}
      />
      <ObjectiveTopics
        error={<></>}
        savedTopics={savedTopics}
        topicOptions={topicOptions}
        validateObjectiveTopics={() => {}}
        topics={isOnApprovedReport ? [] : objective.topics}
        onChangeTopics={onChangeTopics}
        status={objective.status}
      />
      <ResourceRepeater
        resources={isOnApprovedReport ? [] : resourcesForRepeater}
        setResources={setResources}
        error={<></>}
        validateResources={() => {}}
        savedResources={savedResources}
        status={objective.status}
      />
      <ObjectiveTta
        ttaProvided={objective.ttaProvided}
        onChangeTTA={onChangeTTA}
        status={objective.status}
        isOnApprovedReport={isOnApprovedReport || false}
      />
      <ObjectiveStatus
        status={objective.status}
        onChangeStatus={onChangeStatus}
      />
    </>
  );
}

Objective.propTypes = {
  objective: PropTypes.shape({
    title: PropTypes.string,
    ttaProvided: PropTypes.string,
    status: PropTypes.string,
    id: PropTypes.number,
    topics: PropTypes.arrayOf(PropTypes.shape({
      value: PropTypes.number,
      label: PropTypes.string,
    })),
    resources: PropTypes.arrayOf(PropTypes.shape({
      value: PropTypes.number,
      label: PropTypes.string,
    })),
    activityReports: PropTypes.arrayOf(PropTypes.shape({
      status: PropTypes.string,
    })),
  }).isRequired,
  topicOptions: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
  })).isRequired,
  onChange: PropTypes.func.isRequired,
};
