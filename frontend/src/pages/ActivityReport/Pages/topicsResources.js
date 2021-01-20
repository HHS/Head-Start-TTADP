import React from 'react';
import PropTypes from 'prop-types';

import { Controller } from 'react-hook-form';
import { Helmet } from 'react-helmet';

import {
  Fieldset, Label, TextInput,
} from '@trussworks/react-uswds';

import MultiSelect from '../../../components/MultiSelect';
import FileUploader from '../../../components/FileUploader';
import { topics } from '../constants';

const TopicsResources = ({
  register,
  control,
}) => (
  <>
    <Helmet>
      <title>Topics and resources</title>
    </Helmet>
    <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Topics Covered">
      <div id="topics-covered" />
      <div className="smart-hub--form-section">
        <MultiSelect
          name="topics"
          label="Topic(s) covered. You may choose more than one."
          control={control}
          placeholder="Select a topic..."
          options={
              topics.map((topic) => ({ value: topic, label: topic }))
            }
        />
      </div>
    </Fieldset>
    <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Resources">
      <div id="resources" />
      <div className="smart-hub--form-section">
        <Label htmlFor="resourcesUsed">
          Resources from OHS / ECLKC
          <br />
          Enter the URL for OHS resource(s) used. https://eclkc.ohs.acf.hhs.gov/
        </Label>
        <TextInput
          id="resourcesUsed"
          name="resourcesUsed"
          type="text"
          inputRef={register({ required: true })}
        />
      </div>
      <div className="smart-hub--form-section">
        <Label htmlFor="other-resources">Upload any resources used that are not available through ECLKC</Label>
        <Controller
          name="other-resources"
          defaultValue={[]}
          control={control}
          render={({ onChange, value }) => (
            <FileUploader files={value} onChange={onChange} id="other-resources" />
          )}
        />
      </div>
    </Fieldset>
    <Fieldset legend="Attachments" className="smart-hub--report-legend smart-hub--form-section">
      <div id="attachments" />
      <Label htmlFor="attachments">Upload any resources used that are not available through ECLKC</Label>
      <Controller
        name="attachments"
        defaultValue={[]}
        control={control}
        render={({ onChange, value }) => (
          <FileUploader files={value} onChange={onChange} id="attachments" />
        )}
      />
    </Fieldset>
  </>
);

TopicsResources.propTypes = {
  register: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  control: PropTypes.object.isRequired,
};

const sections = [
  {
    title: 'Topics covered',
    anchor: 'topics-resources',
    items: [
      { label: 'Topics', name: 'topics' },
    ],
  },
  {
    title: 'Resources',
    anchor: 'resources',
    items: [
      { label: 'Resources used', name: 'resourcesUsed' },
      { label: 'Other resources', name: 'other-resources', path: 'name' },
    ],
  },
  {
    title: 'Attachments',
    anchor: 'attachments',
    items: [
      { label: 'Attachments', name: 'attachments' },
    ],
  },
];

export default {
  position: 2,
  label: 'Topics and resources',
  path: 'topics-resources',
  sections,
  review: false,
  render: (hookForm) => {
    const { control, register } = hookForm;
    return (
      <TopicsResources
        register={register}
        control={control}
      />
    );
  },
};
