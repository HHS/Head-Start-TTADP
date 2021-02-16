import React from 'react';
import PropTypes from 'prop-types';

import { Controller, useFormContext } from 'react-hook-form';
import { Helmet } from 'react-helmet';

import {
  Fieldset, Label, TextInput,
} from '@trussworks/react-uswds';

import MultiSelect from '../../../components/MultiSelect';
import FileUploader from '../../../components/FileUploader';
import FormItem from '../../../components/FormItem';
import { topics } from '../constants';

const TopicsResources = ({
  reportId,
}) => {
  const { register, control } = useFormContext();
  return (
    <>
      <Helmet>
        <title>Topics and resources</title>
      </Helmet>
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Topics Covered">
        <div id="topics-covered" />
        <div className="smart-hub--form-section">
          <FormItem
            label="Topic(s) covered. You may choose more than one."
            name="topics"
          >
            <MultiSelect
              name="topics"
              label="Topic(s) covered. You may choose more than one."
              control={control}
              placeholder="Select a topic..."
              required="Please select at least one topic"
              options={
              topics.map((topic) => ({ value: topic, label: topic }))
            }
            />
          </FormItem>
        </div>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="OHS / ECLKC resources">
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
            inputRef={register()}
          />
        </div>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Upload resources">
        <div className="smart-hub--form-section">
          <Label htmlFor="otherResources">Upload any resources used that are not available through ECLKC</Label>
          <Controller
            name="otherResources"
            defaultValue={[]}
            control={control}
            render={({ onChange, value }) => (
              <FileUploader files={value} onChange={onChange} reportId={reportId} id="otherResources" />
            )}
          />
        </div>
      </Fieldset>
      <Fieldset legend="Attachments" className="smart-hub--report-legend smart-hub--form-section">
        <div id="attachments" />
        <Label htmlFor="attachments">Agendas, service plans, sign-in sheets, etc.</Label>
        <Controller
          name="attachments"
          defaultValue={[]}
          control={control}
          render={({ onChange, value }) => (
            <FileUploader files={value} onChange={onChange} reportId={reportId} id="attachments" />
          )}
        />
      </Fieldset>
    </>
  );
};

TopicsResources.propTypes = {
  reportId: PropTypes.node.isRequired,
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
      { label: 'Other resources', name: 'otherResources', path: 'originalFileName' },
    ],
  },
  {
    title: 'Attachments',
    anchor: 'attachments',
    items: [
      { label: 'Attachments', name: 'attachments', path: 'originalFileName' },
    ],
  },
];

export default {
  position: 2,
  label: 'Topics and resources',
  path: 'topics-resources',
  sections,
  review: false,
  render: (additionalData, formData, reportId) => (
    <TopicsResources
      reportId={reportId}
    />
  ),
};
