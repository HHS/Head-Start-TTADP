/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';

import {
  render, screen,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import RecipientReviewSection from '../RecipientReviewSection';
import GoalFormContext from '../../../../../GoalFormContext';

const defaultGoalsAndObjectives = [{
  id: 1,
  name: 'This is my goal title',
  goalNumber: '1234',
  endDate: '2023-10-02',
  objectives: [{
    id: 1,
    title: 'Objective 1',
    topics: [],
    ttaProvided: '<p>TTA Provided</p>',
    status: 'In Progress',
    resources: [
      {
        value: 'https://www.govtest1.com',
      },
      {
        value: 'https://www.govtest2.com',
      },
    ],
    files: [
      {
        url: {
          url: 'https://www.file1.com',
        },
        originalFileName: 'test.txt',
      },
      {
        url: {
          url: 'https://www.file2.com',
        },
        originalFileName: 'test.csv',
      },
    ],
  }],
}];

const RenderRecipientReviewSection = ({ goalsAndObjectives }) => {
  const history = createMemoryHistory();
  const hookForm = useForm();

  hookForm.watch = () => ({
    goalsAndObjectives,
    calculatedStatus: 'Draft',
  });

  return (
    <Router history={history}>
      <FormProvider {...hookForm}>
        <RecipientReviewSection />
      </FormProvider>
    </Router>
  );
};

const RenderReviewSection = (goalsAndObjectives) => {
  render(
    <GoalFormContext.Provider>
      <RenderRecipientReviewSection goalsAndObjectives={goalsAndObjectives} />
    </GoalFormContext.Provider>,
  );
};

describe('RecipientReviewSection', () => {
  beforeEach(async () => {
  });
  afterEach(() => fetchMock.restore());
  it('renders all values correctly', async () => {
    RenderReviewSection(defaultGoalsAndObjectives);

    expect(screen.getByText(/this is my goal title \(1234\)/i)).toBeInTheDocument();
    expect(screen.getByText(/2023-10-02/i)).toBeInTheDocument();
    expect(screen.getByText(/Objective 1/)).toBeInTheDocument();
    expect(screen.getByText(/TTA Provided/)).toBeInTheDocument();
    expect(screen.getByText(/In Progress/)).toBeInTheDocument();
    expect(screen.getByText(/test.txt/)).toBeInTheDocument();
    expect(screen.getByText(/test.csv/)).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/www.govtest1.com/)).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/www.govtest2.com/)).toBeInTheDocument();
    expect(screen.getByText(/TTA Provided/)).toBeInTheDocument();
  });

  it('renders without goalsAndObjectives', async () => {
    RenderReviewSection(undefined);
    expect(screen.getByText(/Goals summary/i)).toBeInTheDocument();
  });
});
