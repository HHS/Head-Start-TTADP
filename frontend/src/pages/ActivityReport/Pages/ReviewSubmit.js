import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Form, Label, Fieldset, Textarea, Alert, Button, Accordion,
} from '@trussworks/react-uswds';
import { useForm } from 'react-hook-form';
import { Helmet } from 'react-helmet';

import { fetchApprovers } from '../../../fetchers/activityReports';
import MultiSelect from '../../../components/MultiSelect';
import Container from '../../../components/Container';

const defaultValues = {
  approvingManagers: null,
  additionalNotes: null,
};

const ReviewSubmit = ({
  initialData, allComplete, onSubmit, submitted, reviewItems,
}) => {
  const [loading, updateLoading] = useState(true);
  const [possibleApprovers, updatePossibleApprovers] = useState([]);

  useEffect(() => {
    updateLoading(true);
    const fetch = async () => {
      const approvers = await fetchApprovers();
      updatePossibleApprovers(approvers);
      updateLoading(false);
    };
    fetch();
  }, []);

  const {
    handleSubmit, register, formState, control,
  } = useForm({
    mode: 'onChange',
    defaultValues: { ...defaultValues, ...initialData },
  });

  const onFormSubmit = (data) => {
    onSubmit(data);
  };

  const {
    isValid,
  } = formState;

  const valid = allComplete && isValid;

  return (
    <>
      <Helmet>
        <title>Review and submit</title>
      </Helmet>
      <Accordion bordered={false} items={reviewItems} />
      <Container skipTopPadding className="margin-top-2 padding-top-2">
        <h3>Submit Report</h3>
        {submitted
        && (
        <Alert noIcon className="margin-y-4" type="success">
          <b>Success</b>
          <br />
          This report was successfully submitted for approval
        </Alert>
        )}
        {!allComplete
        && (
        <Alert noIcon className="margin-y-4" type="error">
          <b>Incomplete report</b>
          <br />
          This report cannot be submitted until all sections are complete
        </Alert>
        )}
        <Form className="smart-hub--form-large" onSubmit={handleSubmit(onFormSubmit)}>
          <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Additional Notes">
            <Label htmlFor="additionalNotes">Additional notes for this activity (optional)</Label>
            <Textarea inputRef={register} id="additionalNotes" name="additionalNotes" />
          </Fieldset>
          <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Review and submit report">
            <p className="margin-top-4">
              Submitting this form for approval means that you will no longer be in draft mode.
              Please review all information in each section before submitting to your manager for
              approval.
            </p>
            <MultiSelect
              label="Manager - you may choose more than one."
              name="approvingManagers"
              options={possibleApprovers.map((user) => ({
                label: user.name,
                value: user.id,
              }))}
              control={control}
              disabled={loading}
            />
          </Fieldset>
          <Button type="submit" disabled={!valid}>Submit report for approval</Button>
        </Form>
      </Container>
    </>
  );
};

ReviewSubmit.propTypes = {
  initialData: PropTypes.shape({}),
  allComplete: PropTypes.bool.isRequired,
  onSubmit: PropTypes.func.isRequired,
  submitted: PropTypes.bool.isRequired,
  reviewItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.node.isRequired,
    }),
  ).isRequired,
};

ReviewSubmit.defaultProps = {
  initialData: {},
};

export default ReviewSubmit;
