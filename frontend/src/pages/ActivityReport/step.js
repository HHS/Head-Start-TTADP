/*
  Simple example "form" with no fields to be used by the stepper/pager
*/
import React from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import { Form } from '@trussworks/react-uswds';

import Footer from '../../components/Stepper/components/Footer';

const Step = ({
  first, last, onNextStep, onPreviousStep, data, label,
}) => {
  const {
    handleSubmit, formState,
  } = useForm({
    mode: 'onTouched',
    defaultValues: data,
  });

  return (
    <Form onSubmit={handleSubmit(onNextStep)} large>
      <h1>{label}</h1>
      <Footer
        first={first}
        last={last}
        valid={formState.isValid}
        onPreviousStep={onPreviousStep}
      />
    </Form>
  );
};

Step.propTypes = {
  first: PropTypes.bool.isRequired,
  last: PropTypes.bool.isRequired,
  onNextStep: PropTypes.func.isRequired,
  onPreviousStep: PropTypes.func.isRequired,
  data: PropTypes.shape({}).isRequired,
  label: PropTypes.string.isRequired,
};

export default Step;
