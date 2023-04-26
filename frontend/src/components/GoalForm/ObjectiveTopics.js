import React, { useMemo, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import PropTypes from 'prop-types';
import {
  FormGroup, Label,
} from '@trussworks/react-uswds';
import Select from 'react-select';
import selectOptionsReset from '../selectOptionsReset';
import UnusedData from './UnusedData';
import Drawer from '../Drawer';
import Req from '../Req';
import ContentFromFeedByTag from '../ContentFromFeedByTag';

export default function ObjectiveTopics({
  error,
  topicOptions,
  validateObjectiveTopics,
  topics,
  onChangeTopics,
  goalStatus,
  inputName,
  isLoading,
  isOnReport,
  userCanEdit,
  editingFromActivityReport,
}) {
  const drawerTriggerRef = useRef(null);
  const readOnly = useMemo(() => !editingFromActivityReport
  && ((goalStatus === 'Not Started' && isOnReport) || goalStatus === 'Closed' || !userCanEdit),
  [goalStatus, isOnReport, userCanEdit, editingFromActivityReport]);

  if (readOnly && !topics.length) {
    return null;
  }
  if (readOnly && topics.length) {
    return (
      <>
        <p className="usa-prose text-bold margin-bottom-0">
          Topics
        </p>
        <ul className="usa-list usa-list--unstyled">
          {topics.map((topic) => (
            topic.onAnyReport || goalStatus === 'Not Started' ? (
              <li key={uuid()}>
                {topic.name}
              </li>
            ) : <UnusedData key={uuid()} value={topic.name} />
          ))}
        </ul>
      </>
    );
  }

  const { editableTopics, fixedTopics } = topics.reduce((acc, topic) => {
    if (!userCanEdit || topic.onAnyReport) {
      acc.fixedTopics.push(topic);
    } else {
      acc.editableTopics.push(topic);
    }

    return acc;
  }, { editableTopics: [], fixedTopics: [] });

  const savedTopicIds = fixedTopics ? fixedTopics.map(({ value }) => value) : [];
  const filteredOptions = topicOptions.filter((option) => !savedTopicIds.includes(option.id));

  return (
    <>
      { fixedTopics && fixedTopics.length
        ? (
          <>
            <p className="usa-prose margin-bottom-0 text-bold">Topics</p>
            <ul className="usa-list usa-list--unstyled">
              {fixedTopics.map((topic) => (<li key={topic.id}>{topic.name}</li>))}
            </ul>
          </>
        )
        : null}
      <Drawer
        triggerRef={drawerTriggerRef}
        stickyHeader
        stickyFooter
        title="Topic guidance"
      >
        <ContentFromFeedByTag tagName="topic" contentSelector="table" />
      </Drawer>
      <FormGroup error={error.props.children}>
        <Label htmlFor={inputName}>
          <>
            Topics
            {' '}
            <Req />
            <button
              type="button"
              className="usa-button usa-button--unstyled margin-left-1"
              ref={drawerTriggerRef}
            >
              Tell me more
            </button>
          </>
        </Label>
        {error}
        <Select
          objectiveTopicsInputName={inputName}
          inputId={inputName}
          name={inputName}
          styles={selectOptionsReset}
          components={{
            DropdownIndicator: null,
          }}
          className="usa-select"
          isMulti
          options={filteredOptions}
          onBlur={validateObjectiveTopics}
          value={editableTopics}
          onChange={onChangeTopics}
          closeMenuOnSelect={false}
          isDisabled={isLoading}
          getOptionLabel={(option) => option.name}
          getOptionValue={(option) => option.id}
        />
      </FormGroup>
    </>
  );
}

ObjectiveTopics.propTypes = {
  error: PropTypes.node.isRequired,
  topicOptions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  })).isRequired,
  validateObjectiveTopics: PropTypes.func.isRequired,
  topics: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  })).isRequired,
  onChangeTopics: PropTypes.func.isRequired,
  inputName: PropTypes.string,
  isLoading: PropTypes.bool,
  goalStatus: PropTypes.string.isRequired,
  isOnReport: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.number,
  ]).isRequired,
  userCanEdit: PropTypes.bool.isRequired,
  editingFromActivityReport: PropTypes.bool,
};

ObjectiveTopics.defaultProps = {
  inputName: 'topics',
  isLoading: false,
  editingFromActivityReport: false,
};
