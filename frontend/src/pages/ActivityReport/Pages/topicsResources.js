import React from 'react';
import PropTypes from 'prop-types';

import { Controller, useFormContext } from 'react-hook-form';
import { Helmet } from 'react-helmet';

import { Fieldset, Label } from '@trussworks/react-uswds';

import MultiSelect from '../../../components/MultiSelect';
import FileUploader from '../../../components/FileUploader';
import FormItem from '../../../components/FormItem';
import ResourceSelector from './components/ResourceSelector';
import { topics } from '../constants';

const TopicsResources = ({
  reportId,
}) => {
  const { control } = useFormContext();

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
        <div id="ECLKCResources" />
        <div className="smart-hub--form-section">
          <Label>
            Resources from OHS / ECLKC
            <br />
            Enter the URL for OHS resource(s) used.
            {' '}
            <a href="https://eclkc.ohs.acf.hhs.gov/">https://eclkc.ohs.acf.hhs.gov/</a>
            <ResourceSelector
              name="ECLKCResourcesUsed"
              ariaName="ECLKC Resources"
            />
          </Label>
        </div>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Non-ECLKC resources">
        <div id="nonECLKCResources" />
        <div className="smart-hub--form-section">
          <Label>
            For non-ECLKC resources enter URL.
            <br />
            If no URL is available, upload document in next section.
            <ResourceSelector
              name="nonECLKCResourcesUsed"
              ariaName="non-ECLKC Resources"
            />
          </Label>
        </div>
      </Fieldset>
      <Fieldset legend="Supporting attachments" className="smart-hub--report-legend smart-hub--form-section">
        <div id="attachments" />
        <Label htmlFor="attachments">Upload resources not available online, agenda, service plans, sign-in sheets, etc.</Label>
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
    title: 'OHS / ECLKC resources',
    anchor: 'ECLKCResources',
    items: [
      { label: 'ECLKC Resources', name: 'ECLKCResources', path: 'value' },
    ],
  },
  {
    title: 'Non-ECLKC resources',
    anchor: 'nonECLKCResources',
    items: [
      { label: 'Non-ECLKC Resources', name: 'nonECLKCResources', path: 'value' },
    ],
  },
  {
    title: 'Supporting attachments',
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
