/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import fetchMock from 'fetch-mock';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import ObjectivePicker from '../ObjectivePicker';

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
    title: 'title',
    ttaProvided: 'tta',
    status: 'In Progress',
    topics: [],
    resources: [],
    roles: [],
  },
  {
    title: 'title two',
    ttaProvided: 'tta two',
    status: 'In Progress',
    topics: [],
    resources: [],
    roles: [],
  },
];

describe('ObjectivePicker', () => {
  beforeEach(async () => {
    fetchMock.restore();
    fetchMock.get('/api/topic', []);
  });
  it('renders created objectives', async () => {
    render(<RenderObjective objectivesWithoutGoals={objectives} />);

    const title = await screen.findByText('title');
    expect(title).toBeVisible();
  });

  it('the button adds a new objective', async () => {
    render(<RenderObjective objectivesWithoutGoals={[]} />);
    const button = await screen.findByRole('button', { name: /Add new objective/i });
    expect(screen.queryByText(/objective status/i)).toBeNull();
    userEvent.click(button);
    await waitFor(() => expect(screen.queryByText(/objective status/i)).not.toBeNull());
  });
});
