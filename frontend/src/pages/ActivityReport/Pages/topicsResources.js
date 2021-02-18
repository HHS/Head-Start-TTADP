import React from 'react';
import PropTypes from 'prop-types';
import { Controller, useFormContext } from 'react-hook-form';
import { Helmet } from 'react-helmet';
import {
  Fieldset, Label, TextInput,
} from '@trussworks/react-uswds';

import { isUndefined } from 'lodash';
import Section from './Review/ReviewSection';
import ReviewItem from './Review/ReviewItem';
import FileReviewItem from './Review/FileReviewItem';
import MultiSelect from '../../../components/MultiSelect';
import FileUploader from '../../../components/FileUploader';
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
        <Label htmlFor="attachments">Upload any resources used that are not available through ECLKC</Label>
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

const ReviewSection = () => {
  const { getValues } = useFormContext();
  const {
    otherResources,
    resourcesUsed,
    attachments,
    topics: formTopics,
  } = getValues();

  return (
    <>
      <Section
        hidePrint={isUndefined(formTopics)}
        key="Topics covered"
        basePath="topics-resources"
        anchor="topics-resources"
        title="Topics covered"
      >
        <ReviewItem
          label="Topics"
          name="topics"
        />
      </Section>
      <Section
        hidePrint={!!otherResources.length <= 0 && isUndefined(resourcesUsed)}
        key="Resources"
        basePath="resources"
        anchor="resources"
        title="Resources"
      >
        <ReviewItem
          label="Resources used"
          name="resourcesUsed"
        />
        {otherResources.map((file) => (
          <FileReviewItem
            filename={file.originalFileName}
            url={file.url.url}
            accepted={file.status}
          />
        ))}
      </Section>
      <Section
        hidePrint={!!attachments.length <= 0}
        key="Attachments"
        basePath="attachments"
        anchor="attachments"
        title="Attachments"
      >
        {attachments.map((file) => (
          <FileReviewItem
            filename={file.originalFileName}
            url={file.url.url}
            accepted={file.status}
          />
        ))}
      </Section>
    </>
  );
};

export default {
  position: 2,
  label: 'Topics and resources',
  path: 'topics-resources',
  reviewSection: () => <ReviewSection />,
  review: false,
  render: (additionalData, formData, reportId) => (
    <TopicsResources
      reportId={reportId}
    />
  ),
};
