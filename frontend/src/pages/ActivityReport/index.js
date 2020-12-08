/*
  Activity report. Makes use of the navigator to split the long form into
  multiple pages. Each "page" is defined in the `./Pages` directory. To add
  a new page define a new "pages" array item with a label and renderForm function
  that accepts a react-hook-form useForm object as an argument (see
  https://react-hook-form.com/api/)
*/
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Button } from '@trussworks/react-uswds';

import ActivitySummary from './Pages/ActivitySummary';
import TopicsResources from './Pages/TopicsResources';
import NextSteps from './Pages/NextSteps';
import ReviewSubmit from './Pages/ReviewSubmit';
import GoalsObjectives from './Pages/GoalsObjectives';
import Navigator from '../../components/Navigator';
import Container from '../../components/Container';

import './index.css';

const pages = [
  {
    label: 'Activity summary',
    renderForm: (hookForm) => {
      const {
        register, watch, setValue, getValues, control,
      } = hookForm;
      return (
        <ActivitySummary
          register={register}
          watch={watch}
          setValue={setValue}
          getValues={getValues}
          control={control}
        />
      );
    },
  },
  {
    label: 'Topics and resources',
    renderForm: (hookForm) => {
      const { control, register } = hookForm;
      return (
        <TopicsResources
          register={register}
          control={control}
        />
      );
    },
  },
  {
    label: 'Goals and objectives',
    renderForm: () => (
      <GoalsObjectives />
    ),
  },
  {
    label: 'Next steps',
    renderForm: () => (
      <NextSteps />
    ),
  },
  {
    label: 'Review and submit',
    renderForm: () => (
      <ReviewSubmit />
    ),
  },
];

const defaultValues = {
  'activity-method': [],
  'activity-type': [],
  attachments: [],
  cdi: '',
  duration: '',
  'end-date': null,
  grantees: [],
  'number-of-participants': '',
  'other-users': [],
  'participant-category': '',
  participants: [],
  'program-types': [],
  reason: [],
  requester: '',
  'resources-used': '',
  'start-date': null,
  'target-populations': [],
  topics: [],
};

function ActivityReport({ initialData }) {
  const [submitted, updateSubmitted] = useState(false);

  const onFormSubmit = (data) => {
    // eslint-disable-next-line no-console
    console.log('Submit form data', data);
    updateSubmitted(true);
  };

  const resetForm = () => {
    updateSubmitted(false);
  };

  return (
    <>
      <Helmet titleTemplate="%s - Activity Report - TTA Smart Hub" defaultTitle="TTA Smart Hub - Activity Report" />
      <h1 className="new-activity-report">New activity report for Region 14</h1>
      {submitted
        && (
        <Container>
          Thank you for submitted the form!
          <Button onClick={() => { resetForm(); }}>
            Reset Form
          </Button>
        </Container>
        )}
      {!submitted
      && (
      <Navigator
        defaultValues={{ ...defaultValues, ...initialData }}
        pages={pages}
        onFormSubmit={onFormSubmit}
      />
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
