import React from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, Label,
} from '@trussworks/react-uswds';
import Select from 'react-select';
import { SELECT_STYLES } from './constants';

export default function ObjectiveTopics({
  error,
  savedTopics,
  topicOptions,
  validateObjectiveTopics,
  topics,
  onChangeTopics,
}) {
  return (
    <>
      { savedTopics && savedTopics.length
        ? (
          <>
            <span>Topics</span>
            {savedTopics.map((topic) => topic.value).join(', ')}
          </>
        )
        : null}

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
          styles={SELECT_STYLES}
          components={{
            DropdownIndicator: null,
          }}
          className="usa-select"
          isMulti
          options={topicOptions}
          onBlur={validateObjectiveTopics}
          value={topics}
          onChange={onChangeTopics}
          closeMenuOnSelect={false}
        />

      </FormGroup>
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
};

ObjectiveTopics.defaultProps = {
  savedTopics: [],
};
