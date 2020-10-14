/*
  This component is showing how to use the stepper. It will be
  updated in the future with actual activity report form
  components
*/
import React, { useState } from 'react';
import { Button } from '@trussworks/react-uswds';

import Container from '../../components/Container';
import Stepper from '../../components/Stepper';
import Step from './step';
import './index.css';

// Note how we receive most props from the caller of this
// method (the stepper or pager).
function renderStep(props, label) {
  const {
    first, last, onNextStep, onPreviousStep, data,
  } = props;
  return (
    <Step
      first={first}
      last={last}
      onNextStep={onNextStep}
      onPreviousStep={onPreviousStep}
      data={data}
      label={label}
    />
  );
}

const steps = [
  {
    label: 'Activity Summary',
    // This is the 'render-prop' used by the stepper/pager. The pager
    // doesn't know how to pass the 'label' prop, but we know what the
    // label should be at this point.
    pages: (props) => (
      renderStep(props, 'Activity Summary')
    ),
  },
  {
    // Show how the stepper supports multiple pages in a single
    // step
    label: 'Participants',
    pages: [
      (props) => (
        renderStep(props, 'Participants - Page 1')
      ),
      (props) => (
        renderStep(props, 'Participants - Page 2')
      ),
    ],
  },
  {
    label: 'Goals & Objectives',
    pages: (props) => (
      renderStep(props, 'Goals & Objectives')
    ),
  },
  {
    label: 'Next Steps',
    pages: (props) => (
      renderStep(props, 'Next Steps')
    ),
  },
  {
    label: 'Review & Submit',
    pages: (props) => (
      renderStep(props, 'Review & Submit')
    ),
  },
];

function ActivityReport() {
  const [data, updateData] = useState();
  const onSubmit = (formData) => {
    updateData(formData);
  };

  return (
    <>
      <div className="new-activity-report">New activity report for Region 14</div>
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
        <>
          <Stepper steps={steps} onSubmit={onSubmit} />
        </>
      )}
    </>
  );
}

export default ActivityReport;
