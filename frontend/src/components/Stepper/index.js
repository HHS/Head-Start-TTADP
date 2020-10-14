/*
  This component is the stepper. It contains a stepper indicator section to show
  where in the stepper process the user currently is. It also contains a
  section to show the current form. It is responsible for stepping through
  each step, gathering data to send to the parent (via `onSubmit`) once all
  steps are complete and the user clicks "submit". The "steps" prop is an
  array of objects with label and pages properties. Label is a string
  and what is displayed in the stepper indicator. Pages is a single render function
  or an array of render functions. The pages property makes use of a technique
  called 'render-props' (https://reactjs.org/docs/render-props.html). This allows
  the stepper component to inject props into the component as well as having
  props injected into the form component where defined. All forms should use
  the `react-hook-form` library and stepper footer.

  Each step in the form can have multiple "pages". This is accomplished by
  using the <Pager /> component. If pages is an array the <Pager /> Component
  will be used. If not the pages function will be used without the pager.
*/

import React, { useState } from 'react';
import { Grid } from '@trussworks/react-uswds';
import _ from 'lodash';
import PropTypes from 'prop-types';

import Pager from './Pager';
import Container from '../Container';
import StepperIndicator from './components/StepperIndicator';
import StepperHeader from './components/StepperHeader';
import { usePrevious } from '../../hooks';

const defaultSegment = (label) => (
  {
    current: false,
    complete: false,
    label,
  }
);

export const getUpdatedSegments = (segments, previousStep, nextStep, complete) => {
  const prevSegment = {
    ...segments[previousStep], current: false, complete,
  };

  const nextSegment = {
    ...segments[nextStep], current: true, complete: false,
  };

  const updatedSegments = [...segments];
  updatedSegments[previousStep] = prevSegment;
  updatedSegments[nextStep] = nextSegment;

  return updatedSegments;
};

function Stepper({ steps, onSubmit }) {
  const [currentStep, updateCurrentStep] = useState(0);
  const [formData, updateFormData] = useState({});

  const stepperSegments = steps.map((step) => defaultSegment(step.label));
  stepperSegments[currentStep] = { ...stepperSegments[currentStep], current: true };
  const [segments, updateSegments] = useState(stepperSegments);

  const totalSteps = steps.length;
  const firstStep = currentStep === 0;
  const lastStep = currentStep === totalSteps - 1;

  const onNextStep = (data) => {
    if (lastStep) {
      onSubmit(formData);
      return;
    }

    updateSegments(() => getUpdatedSegments(segments, currentStep, currentStep + 1, true));
    updateFormData({ ...formData, ...data });
    updateCurrentStep((current) => current + 1);
  };

  const onPreviousStep = () => {
    if (firstStep) {
      return;
    }

    updateSegments(() => getUpdatedSegments(segments, currentStep, currentStep - 1, false));
    updateCurrentStep((current) => current - 1);
  };

  const previousStep = usePrevious(currentStep);
  const fromNextStep = previousStep > currentStep;
  const pages = _.get(steps[currentStep], 'pages');
  const label = _.get(steps[currentStep], 'label');
  const usePager = Array.isArray(pages);

  return (
    <div>
      <Grid row gap>
        <Grid col={12}>
          <Container className="height-12" padding={2}>
            <StepperIndicator segments={segments} />
          </Container>
        </Grid>
        <Grid col={12}>
          <Container className="height-viewport">
            <StepperHeader
              currentStep={currentStep + 1}
              totalSteps={totalSteps}
              label={label}
            />
            {usePager
            && (
            <Pager
              firstStep={firstStep}
              lastStep={lastStep}
              data={formData}
              onNextStep={onNextStep}
              onPreviousStep={onPreviousStep}
              fromNextStep={fromNextStep}
              pages={pages}
            />
            )}
            {!usePager
            && (
              pages({
                first: firstStep, last: lastStep, data: formData, onNextStep, onPreviousStep,
              })
            )}
          </Container>
        </Grid>
      </Grid>
    </div>
  );
}

Stepper.propTypes = {
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      pages: PropTypes.oneOfType([
        PropTypes.func,
        PropTypes.arrayOf(PropTypes.func.isRequired),
      ]),
    }),
  ).isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default Stepper;
