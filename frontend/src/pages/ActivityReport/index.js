/*
  Activity report. Form sections are split up to make them easier to digest
  (instead of having a huge 400 line react component).
*/
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Form, Button } from '@trussworks/react-uswds';
import { useForm } from 'react-hook-form';

import Container from '../../components/Container';

import SectionOne from './SectionOne';
import SectionTwo from './SectionTwo';
import SectionThree from './SectionThree';

import './index.css';

function ActivityReport({ initialData }) {
  const [data, updateData] = useState();
  const hookForm = useForm({
    mode: 'all',
    defaultValues: initialData,
  });

  const onSubmit = (formData) => {
    // Console logging form data on submit until we can send the data to
    // the api
    // eslint-disable-next-line no-console
    console.log(formData);
    updateData(formData);
  };

  const {
    register,
    watch,
    setValue,
    control,
    formState,
    handleSubmit,
    getValues,
  } = hookForm;

  return (
    <>
      <h1 className="new-activity-report">New activity report for Region 14</h1>
      {data && (
        <Container>
          <h1>
            Data submitted!
          </h1>
          <Button onClick={() => { updateData(); }}>
            Reset Form
          </Button>
        </Container>
      )}
      {!data && (
        <Container>
          <Form onSubmit={handleSubmit(onSubmit)} large>
            <SectionOne
              register={register}
              watch={watch}
              setValue={setValue}
            />
            <SectionTwo
              register={register}
              control={control}
            />
            <SectionThree
              register={register}
              watch={watch}
              getValues={getValues}
              control={control}
            />
            <Button className="stepper-button" type="submit" disabled={!formState.isValid}>Submit</Button>
          </Form>
        </Container>
      )}
    </>
  );
}

ActivityReport.propTypes = {
  initialData: PropTypes.shape({}),
};

ActivityReport.defaultProps = {
  initialData: {},
};

export default ActivityReport;
