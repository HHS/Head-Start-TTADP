/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
// import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';

import ObjectivePicker from '../ObjectivePicker';
// import { withText } from '../../../../../testHelpers';

// eslint-disable-next-line react/prop-types
const RenderObjective = ({ objectivesWithoutGoals }) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: {
      objectivesWithoutGoals,
      collaborators: [],
      author: {
        role: 'Central Office',
      },
    },
  });

  return (
    <FormProvider {...hookForm}>
      <ObjectivePicker />
    </FormProvider>
  );
};

const objectives = [
  {
    title: 'title', ttaProvided: 'tta', status: 'In Progress', topics: [], resources: [], roles: [],
  },
  {
    title: 'title two', ttaProvided: 'tta two', status: 'In Progress', topics: [], resources: [], roles: [],
  },
];

describe('ObjectivePicker', () => {
  it('renders created objectives', async () => {
    render(<RenderObjective objectivesWithoutGoals={objectives} />);

    const title = await screen.findByText('title');
    expect(title).toBeVisible();
  });
});
