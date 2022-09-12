import React, { useRef } from 'react';
import { v4 as uuid } from 'uuid';
import PropTypes from 'prop-types';
import {
  FormGroup, Label,
} from '@trussworks/react-uswds';
import Select from 'react-select';
import selectOptionsReset from '../selectOptionsReset';
import UnusedData from './UnusedData';

export default function ObjectiveTopics({
  error,
  topicOptions,
  validateObjectiveTopics,
  topics,
  onChangeTopics,
  status,
  inputName,
  isOnReport,
  isOnApprovedReport,
  isLoading,
}) {
  const initialSelection = useRef(topics.length);

  const readOnly = status === 'Suspended' || (status === 'Not Started' && isOnReport);

  if (readOnly && initialSelection.current) {
    if (!topics.length) {
      return null;
    }

    return (
      <>
        <p className="usa-prose text-bold margin-bottom-0">
          Topics
        </p>
        <ul className="usa-list usa-list--unstyled">
          {topics.map((topic) => (<li key={uuid()}>{topic.label}</li>))}
        </ul>
      </>
    );
  }

  const { editableTopics, fixedTopics } = topics.reduce((acc, topic) => {
    if (topic.isOnApprovedReport) {
      acc.fixedTopics.push(topic);
    } else {
      acc.editableTopics.push(topic);
    }

    return acc;
  }, { editableTopics: [], fixedTopics: [] });

  const savedTopicIds = fixedTopics ? fixedTopics.map(({ value }) => value) : [];
  const filteredOptions = topicOptions.filter((option) => !savedTopicIds.includes(option.value));

  return (
    <>
      { fixedTopics && fixedTopics.length
        ? (
          <>
            <p className="usa-prose margin-bottom-0 text-bold">Topics</p>
            <ul className="usa-list usa-list--unstyled">
              {fixedTopics.map((topic) => (<li key={topic.value}>{topic.label}</li>))}
              {isOnApprovedReport
                ? editableTopics.map((topic) => (
                  <UnusedData key={topic.value} value={topic.label} />
                ))
                : null}
            </ul>
          </>
        )
        : null}

      { !isOnApprovedReport ? (
        <FormGroup error={error.props.children}>
          <Label htmlFor={inputName}>
            { topics && topics.length
              ? <>Add more topics</>
              : (
                <>
                  Topics
                  {' '}
                  <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>
                </>
              )}
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
          />
        </FormGroup>
      ) : null }
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
  status: PropTypes.string.isRequired,
  inputName: PropTypes.string,
  isOnReport: PropTypes.bool.isRequired,
  isOnApprovedReport: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool,
};

ObjectiveTopics.defaultProps = {
  inputName: 'topics',
  isLoading: false,
};
