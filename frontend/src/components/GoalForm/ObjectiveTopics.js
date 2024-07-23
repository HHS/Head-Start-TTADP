import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, Label,
} from '@trussworks/react-uswds';
import Select from 'react-select';
import selectOptionsReset from '../selectOptionsReset';
import Drawer from '../Drawer';
import Req from '../Req';
import ContentFromFeedByTag from '../ContentFromFeedByTag';
import DrawerTriggerButton from '../DrawerTriggerButton';
import './ObjectiveTopics.scss';

export default function ObjectiveTopics({
  error,
  topicOptions,
  validateObjectiveTopics,
  topics,
  onChangeTopics,
  inputName,
  isLoading,
}) {
  const drawerTriggerRef = useRef(null);
  topicOptions.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <Drawer
        triggerRef={drawerTriggerRef}
        stickyHeader
        stickyFooter
        title="Topic guidance"
      >
        <ContentFromFeedByTag className="ttahub-drawer--objective-topics-guidance" tagName="ttahub-topic" contentSelector="table" />
      </Drawer>
      <FormGroup error={error.props.children}>
        <div className="display-flex">
          <Label htmlFor={inputName}>
            <>
              Topics
              {' '}
              <Req />
            </>
          </Label>
          <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef}>
            Get help choosing topics
          </DrawerTriggerButton>
        </div>
        {error}
        <Select
          inputName={inputName}
          inputId={inputName}
          name={inputName}
          styles={selectOptionsReset}
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
          isDisabled={isLoading}
          getOptionLabel={(option) => option.name}
          getOptionValue={(option) => option.id}
          required
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
};

ObjectiveTopics.defaultProps = {
  inputName: 'topics',
  isLoading: false,
};
