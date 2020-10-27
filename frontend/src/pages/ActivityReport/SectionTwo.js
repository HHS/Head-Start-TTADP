import React from 'react';
import PropTypes from 'prop-types';
import { Controller } from 'react-hook-form';

import {
  Fieldset, TextInput, Label, Dropdown,
} from '@trussworks/react-uswds';

import FileUploader from '../../components/FileUploader';

const topics = [
  'first',
  'second',
];

const PageTwo = ({
  register,
  control,
}) => (
  <>
    <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Topics Covered">
      <div className="smart-hub--form-section">
        <legend>
          Select all topics covered during this activity.
          Topics are aligned with SOW’s and ECLKC topics used by National Centers.
        </legend>
        <Label htmlFor="topics">Choose all topics covered</Label>
        <Dropdown id="topics" name="topics" defaultValue="" inputRef={register({ required: true })}>
          <option name="default" disabled hidden value="">Select a topic...</option>
          {topics.map((topic) => (
            <option key={topic} value={topic}>{topic}</option>
          ))}
        </Dropdown>
      </div>
    </Fieldset>
    <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Resources Provided">
      <div className="smart-hub--form-section">
        <Label htmlFor="resources-used">Enter the URL for the ECLKC resources used</Label>
        <TextInput
          id="resources-used"
          name="resources-used"
          type="text"
          inputRef={register({ required: true })}
        />
      </div>
      <div className="smart-hub--form-section">
        <Label htmlFor="file-uploader">Attach other resources used</Label>
        <Controller
          name="files"
          defaultValue={[]}
          control={control}
          render={({ onChange, value }) => (
            <FileUploader files={value} onChange={onChange} id="file-uploader" />
          )}
        />
      </div>
    </Fieldset>
  </>
);

PageTwo.propTypes = {
  register: PropTypes.func.isRequired,
  // control is an object from react-hook-form
  // eslint-disable-next-line react/forbid-prop-types
  control: PropTypes.object.isRequired,
};

export default PageTwo;
