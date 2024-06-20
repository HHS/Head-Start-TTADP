/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';

import {
  render, screen,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { MemoryRouter } from 'react-router-dom';
import RecipientReviewSection from '../RecipientReviewSection';
import GoalFormContext from '../../../../../GoalFormContext';

const defaultGoalsAndObjectives = [{
  id: 1,
  name: 'This is my 1st goal title',
  goalNumber: '1234',
  endDate: '2023-10-02',
  source: 'Goal Source 1',
  objectives: [{
    id: 1,
    title: 'Goal 1 - Objective 1',
    topics: [],
    ttaProvided: '<p>TTA Provided for Goal 1 - Objective 1</p>',
    status: 'In Progress',
    courses: [],
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
  },
  {
    id: 2,
    title: 'Goal 1 - Objective 2',
    topics: [],
    ttaProvided: '<p>TTA Provided for Goal 1 - Objective 2</p>',
    status: 'Not Started',
    courses: [],
    resources: [
      {
        value: 'https://www.govtest3.com',
      },
    ],
    files: [
      {
        url: {
          url: 'https://www.file4.com',
        },
        originalFileName: 'test4.txt',
      },
    ],
  },
  ],
},
{
  id: 2,
  name: 'This is my 2nd goal title',
  goalNumber: '1234',
  endDate: '2024-10-02',
  source: 'Goal Source 2',
  objectives: [{
    id: 3,
    title: 'Goal 2 - Objective 1',
    topics: [{ name: 'Topic 1' }, { name: 'Topic 2' }],
    ttaProvided: '<p>TTA Provided for Goal 2 - Objective 1</p>',
    status: 'Suspended',
    courses: [],
    resources: [
      {
        value: 'https://www.govtest5.com',
      },
    ],
    files: [
      {
        url: {
          url: 'https://www.file5.com',
        },
        originalFileName: 'test5.txt',
      },
      {
        url: {
          url: 'https://www.file6.com',
        },
        originalFileName: 'test6.csv',
      },
    ],
  },
  ],
},
];

const RenderRecipientReviewSection = ({ goalsAndObjectives }) => {
  const hookForm = useForm();

  hookForm.watch = () => ({
    goalsAndObjectives,
    calculatedStatus: 'Draft',
  });

  return (
    <MemoryRouter>
      <FormProvider {...hookForm}>
        <RecipientReviewSection />
      </FormProvider>
    </MemoryRouter>
  );
};

const RenderReviewSection = (goalsAndObjectives) => {
  render(
    <GoalFormContext.Provider value={{ isGoalFormClosed: true, toggleGoalForm: jest.fn() }}>
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

    // Make sure we have the correct number of goal and objective headers.
    expect(screen.queryAllByText(/Goal summary/i).length).toBe(2);
    expect(screen.queryAllByText(/Objective summary/i).length).toBe(3);

    // Goal 1
    expect(screen.getByText(/this is my 1st goal title/i)).toBeInTheDocument();
    expect(screen.getByText(/2023-10-02/i)).toBeInTheDocument();
    expect(screen.getByText(/Goal Source 1/i)).toBeInTheDocument();

    // Goal 1 - Objective 1
    expect(screen.getByText('Goal 1 - Objective 1')).toBeInTheDocument();
    expect(screen.getByText('TTA Provided for Goal 1 - Objective 1')).toBeInTheDocument();
    expect(screen.getByText(/In Progress/)).toBeInTheDocument();
    expect(screen.getByText(/test.txt/)).toBeInTheDocument();
    expect(screen.getByText(/test.csv/)).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/www.govtest1.com/)).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/www.govtest2.com/)).toBeInTheDocument();

    // Goal 1 - Objective 2
    expect(screen.getByText('Goal 1 - Objective 2')).toBeInTheDocument();
    expect(screen.getByText('TTA Provided for Goal 1 - Objective 2')).toBeInTheDocument();
    expect(screen.getByText(/Not Started/)).toBeInTheDocument();
    expect(screen.getByText(/test4.txt/)).toBeInTheDocument();
    expect(screen.queryByText(/test5.txt/)).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/www.govtest3.com/)).toBeInTheDocument();

    // Goal 2
    expect(screen.getByText(/this is my 2nd goal title/i)).toBeInTheDocument();
    expect(screen.getByText(/2024-10-02/i)).toBeInTheDocument();
    expect(screen.getByText(/Goal Source 2/i)).toBeInTheDocument();

    // Goal 2 - Objective 1
    expect(screen.getByText('Goal 2 - Objective 1')).toBeInTheDocument();
    expect(screen.getByText('TTA Provided for Goal 2 - Objective 1')).toBeInTheDocument();
    expect(screen.getByText(/Suspended/)).toBeInTheDocument();
    expect(screen.getByText(/test5.txt/)).toBeInTheDocument();
    expect(screen.getByText(/test6.csv/)).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/www.govtest5.com/)).toBeInTheDocument();
    expect(screen.getByText(/Topic 1/)).toBeInTheDocument();
    expect(screen.getByText(/Topic 2/)).toBeInTheDocument();

    // Make sure we have the correct number of resources and files.
    expect(screen.queryAllByText(/Resource links/i).length).toBe(3);
    expect(screen.queryAllByText(/Resource attachments/i).length).toBe(3);
  });

  it('renders fei response correctly', async () => {
    RenderReviewSection([{
      ...defaultGoalsAndObjectives[0],
      promptsForReview: [
        {
          key: 'Root Cause 1',
          promptId: 1,
          prompt: 'Prompt 1',
          recipients: [{ id: 1, name: 'Recipient 1' }, { id: 2, name: 'Recipient 2' }],
          responses: ['Response 1', 'Response 2'],
        },
        {
          key: 'Root Cause 2',
          promptId: 1,
          prompt: 'Prompt 2',
          recipients: [{ id: 3, name: 'Recipient 3' }, { id: 4, name: 'Recipient 4' }],
          responses: ['Response 3'],
        },
        {
          key: 'Root Cause 3',
          promptId: 1,
          prompt: 'Prompt 3',
          recipients: [{ id: 3, name: 'Recipient 5' }],
          responses: [],
        },
      ],
    }]);

    // Assert generic goal information is displayed.
    expect(screen.queryAllByText(/Goal summary/i).length).toBe(1);
    expect(screen.getByText(/this is my 1st goal title/i)).toBeInTheDocument();

    // Expect the text 'Root cause' to be displayed 3 times.
    expect(screen.queryAllByText(/Root cause/i).length).toBe(3);

    // Assert Response 1 and Response 2 are displayed.
    expect(screen.getByText(/response 1, response 2/i)).toBeInTheDocument();

    // Assert Response 3 is displayed.
    expect(screen.getByText('Response 3')).toBeInTheDocument();

    // Assert that the correct number of recipients are displayed.
    expect(screen.queryAllByText(/Recipient 1/).length).toBe(1);
    expect(screen.queryAllByText(/Recipient 2/).length).toBe(1);
    expect(screen.queryAllByText(/Recipient 3/).length).toBe(1);
    expect(screen.queryAllByText(/Recipient 5/).length).toBe(1);

    // Assert 'Missing information' is displayed once.
    expect(screen.queryAllByText(/Missing Information/).length).toBe(1);
  });
});
