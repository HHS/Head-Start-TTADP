import React from 'react';
import PropTypes from 'prop-types';
import { Controller, useFormContext } from 'react-hook-form/dist/index.ie11';
import { Helmet } from 'react-helmet';
import {
  Fieldset, Label,
} from '@trussworks/react-uswds';

import { isUndefined } from 'lodash';
import Section from './Review/ReviewSection';
import ReviewItem from './Review/ReviewItem';
import FileReviewItem from './Review/FileReviewItem';
import MultiSelect from '../../../components/MultiSelect';
import FileUploader from '../../../components/FileUploader';
import FormItem from '../../../components/FormItem';
import ResourceSelector from './components/ResourceSelector';
import { topics } from '../constants';
import { reportIsEditable } from '../../../utils';

const TopicsResources = ({
  reportId,
}) => {
  const { control } = useFormContext();

  return (
    <>
      <Helmet>
        <title>Topics and resources</title>
      </Helmet>
      <Fieldset className="smart-hub--report-legend margin-top-4" legend="Topics Covered">
        <div id="topics-covered" />
        <div className="margin-top-4">
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
      <Fieldset className="smart-hub--report-legend margin-top-4" legend="OHS / ECLKC resources">
        <div id="ECLKCResources" />
        <div className="margin-top-4">
          <Label>
            Resources from OHS / ECLKC
            <br />
            Enter the URL for OHS resource(s) used.
            {' '}
            {/* eslint-disable-next-line react/jsx-no-target-blank */}
            <a target="_blank" rel="noopener" href="https://eclkc.ohs.acf.hhs.gov/">https://eclkc.ohs.acf.hhs.gov/</a>
            <ResourceSelector
              name="ECLKCResourcesUsed"
              ariaName="ECLKC Resources"
            />
          </Label>
        </div>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend margin-top-4" legend="Non-ECLKC resources">
        <div id="nonECLKCResources" />
        <div className="margin-top-4">
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
      <Fieldset legend="Supporting attachments" className="smart-hub--report-legend margin-top-4">
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

const ReviewSection = () => {
  const { watch } = useFormContext();
  const {
    nonECLKCResources,
    ECLKCResources,
    attachments,
    status,
    topics: formTopics,
  } = watch();

  const hasAttachments = attachments && attachments.length > 0;
  const canEdit = reportIsEditable(status);

  return (
    <>
      <Section
        hidePrint={isUndefined(formTopics)}
        key="Topics covered"
        basePath="topics-resources"
        anchor="topics-resources"
        title="Topics covered"
        canEdit={canEdit}
      >
        <ReviewItem
          label="Topics"
          name="topics"
          sortValues
        />
      </Section>
      <Section
        hidePrint={isUndefined(ECLKCResources)}
        key="OHS / ECLKC resources"
        basePath="topics-resources"
        anchor="ECLKCResources"
        title="OHS / ECLKC resources"
        canEdit={canEdit}
      >
        <ReviewItem
          label="ECLKC resources"
          name="ECLKCResourcesUsed"
          path="value"
        />
      </Section>
      <Section
        hidePrint={isUndefined(nonECLKCResources)}
        key="Non-ECLKC resources"
        basePath="topics-resources"
        anchor="nonECLKCResources"
        title="Non-ECLKC resources"
        canEdit={canEdit}
      >
        <ReviewItem
          label="Non-ECLKC resources"
          name="nonECLKCResourcesUsed"
          path="value"
        />
      </Section>
      <Section
        hidePrint={!hasAttachments}
        key="Attachments"
        basePath="topics-resources"
        anchor="attachments"
        title="Attachments"
        canEdit={canEdit}
      >
        {attachments.map((file) => (
          <FileReviewItem
            key={file.url.url}
            filename={file.originalFileName}
            url={file.url.url}
            status={file.status}
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
