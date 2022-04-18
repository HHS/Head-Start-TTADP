import React from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, Label,
} from '@trussworks/react-uswds';
import Select from 'react-select';
import selectOptionsReset from '../selectOptionsReset';

export default function ObjectiveTopics({
  error,
  savedTopics,
  topicOptions,
  validateObjectiveTopics,
  topics,
  onChangeTopics,
  status,
}) {
  const savedTopicIds = savedTopics ? savedTopics.map(({ value }) => value) : [];

  const filteredOptions = topicOptions.filter((option) => !savedTopicIds.includes(option.value));

  return (
    <>
      { savedTopics && savedTopics.length
        ? (
          <>
            <p className="usa-prose margin-bottom-0 text-bold">Topics</p>
            <p className="usa-prose margin-top-0">{savedTopics.map((topic) => topic.label).join(', ')}</p>
          </>
        )
        : null}

      { status !== 'Complete' ? (
        <FormGroup error={error.props.children}>
          <Label htmlFor="topics">
            { savedTopics && savedTopics.length
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
            inputId="topics"
            styles={selectOptionsReset}
            components={{
              DropdownIndicator: null,
            }}
            className="usa-select"
            isMulti
            options={filteredOptions}
            onBlur={validateObjectiveTopics}
            value={topics}
            onChange={onChangeTopics}
            closeMenuOnSelect={false}
          />
        </FormGroup>
      ) : null }
    </>
  );
}

ObjectiveTopics.propTypes = {
  error: PropTypes.node.isRequired,
  savedTopics: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.number,
  })),
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
};

ObjectiveTopics.defaultProps = {
  savedTopics: [],
};
