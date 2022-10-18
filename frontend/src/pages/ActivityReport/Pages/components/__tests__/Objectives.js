import '@testing-library/jest-dom';
import {
  render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import selectEvent from 'react-select-event';
import { REPORT_STATUSES } from '../../../../../Constants';
import Objectives from '../Objectives';

// eslint-disable-next-line react/prop-types
const RenderObjectives = ({ objectiveOptions, goalId = 12, collaborators = [] }) => {
  let goalForEditing = null;

  if (goalId) {
    goalForEditing = {
      id: goalId,
      objectives: [],
      status: 'Not Started',
    };
  }

  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues: {
      collaborators,
      author: {
        role: 'Central office',
      },
      goalForEditing,
    },
  });

  const { setValue } = hookForm;

  setValue('goalForEditing', goalForEditing);

  const topicOptions = [
    {
      value: 1,
      label: 'Fencing',
    },
    {
      value: 2,
      label: 'Boating',
    },
  ];

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <Objectives
        objectives={objectiveOptions}
        topicOptions={topicOptions}
        goalId={goalId}
        noObjectiveError={<></>}
        goalStatus="In Progress"
        reportId={12}
        onSaveDraft={jest.fn()}
      />
      <button type="button">blur me</button>
    </FormProvider>
  );
};

describe('Objectives', () => {
  it('you can create a new objective', async () => {
    const objectiveOptions = [];
    const collabs = [{ role: 'Snake charmer' }, { role: 'lion tamer' }];
    render(<RenderObjectives objectiveOptions={objectiveOptions} collaborators={collabs} />);
    const select = await screen.findByLabelText(/Select TTA objective/i);
    expect(screen.queryByText(/objective status/i)).toBeNull();
    await selectEvent.select(select, ['Create a new objective']);
    await waitFor(() => expect(screen.queryByText(/objective status/i)).not.toBeNull());
  });
  it('allows for the selection and changing of an objective', async () => {
    const objectiveOptions = [{
      value: 3,
      label: 'Test objective 1',
      title: 'Test objective 1',
      ttaProvided: '<p>hello</p>',
      activityReports: [],
      resources: [],
      topics: [],
      status: 'Not Started',
    },
    {
      value: 4,
      label: 'Test objective 2',
      title: 'Test objective 2',
      ttaProvided: '<p>hello 2</p>',
      activityReports: [],
      resources: [],
      topics: [],
      status: 'Not Started',
    }];
    render(<RenderObjectives objectiveOptions={objectiveOptions} />);
    let select = await screen.findByLabelText(/Select TTA objective/i);
    expect(screen.queryByText(/objective status/i)).toBeNull();

    // Initial objective select.
    await selectEvent.select(select, ['Test objective 1']);
    const r = await screen.findByLabelText(/resource 1/i);
    userEvent.type(r, 'GARG');
    userEvent.click(await screen.findByText(/blur me/i));
    await waitFor(() => expect(screen.queryByText(/objective status/i)).not.toBeNull());

    // Change Objective.
    select = await screen.findByLabelText(/Select TTA objective/i);
    await selectEvent.select(select, ['Test objective 2']);
    await screen.findByLabelText(/test objective 2/i);
  });

  it('removing an existing objective add it back to the list of available objectives', async () => {
    const objectiveOptions = [{
      value: 3,
      label: 'Test objective 1',
      title: 'Test objective 1',
      ttaProvided: '<p>hello</p>',
      activityReports: [],
      resources: [],
      topics: [],
      status: 'In Progress',
    },
    {
      value: 4,
      label: 'Test objective 2',
      title: 'Test objective 2',
      ttaProvided: '<p>hello 2</p>',
      activityReports: [],
      resources: [],
      topics: [],
      status: 'Not Started',
    }];
    render(<RenderObjectives objectiveOptions={objectiveOptions} />);
    let select = await screen.findByLabelText(/Select TTA objective/i);

    // Initial objective select.
    await selectEvent.select(select, ['Test objective 1']);
    await waitFor(() => expect(screen.queryByText(/objective status/i)).not.toBeNull());

    // Add second objective.
    const addObjBtn = screen.getByRole('button', { name: /add new objective/i });
    userEvent.click(addObjBtn);
    select = screen.queryAllByLabelText(/Select TTA objective/i);
    await selectEvent.select(select[1], ['Test objective 2']);

    // Remove first objective.
    const removeObjBtns = screen.queryAllByRole('button', { name: /remove this objective/i });
    userEvent.click(removeObjBtns[0]);
    const removeBtns = screen.queryAllByRole('button', { name: /this button will remove the objective from the activity report/i, hidden: true });
    userEvent.click(removeBtns[0]);

    // Attempt to select objective 1 now available.
    select = await screen.findByLabelText(/Select TTA objective/i);
    await selectEvent.select(select, ['Test objective 1']);
    expect(await screen.findByText('In Progress')).toBeVisible();
  });

  it('the button adds a new objective', async () => {
    const objectiveOptions = [{
      value: 3,
      label: 'Test objective',
      title: 'Test objective',
      ttaProvided: '<p>hello</p>',
      activityReports: [],
      resources: [],
      topics: [],
      status: 'Not Started',
    }];
    render(<RenderObjectives objectiveOptions={objectiveOptions} />);
    const button = await screen.findByRole('button', { name: /Add new objective/i });
    expect(screen.queryByText(/objective status/i)).toBeNull();
    userEvent.click(button);
    await waitFor(() => expect(screen.queryByText(/objective status/i)).not.toBeNull());
  });

  it('is on approved reports hides options', async () => {
    const objectiveOptions = [{
      value: 3,
      label: 'Test objective',
      title: 'Test objective',
      ttaProvided: '<p>hello</p>',
      activityReports: [{
        status: REPORT_STATUSES.APPROVED,
      }],
      resources: [],
      topics: [],
      status: 'Not Started',
    }];
    render(<RenderObjectives objectiveOptions={objectiveOptions} />);
    const select = await screen.findByLabelText(/Select TTA objective/i);
    expect(screen.queryByText(/objective status/i)).toBeNull();
    await selectEvent.select(select, ['Test objective']);
    const role = await screen.findByText(/Test objective/i, { ignore: 'div' });
    expect(role.tagName).toBe('P');
  });

  it('handles a "new" goal', async () => {
    const objectiveOptions = [{
      value: 3,
      label: 'Test objective',
      title: 'Test objective',
      ttaProvided: '<p>hello</p>',
      activityReports: [],
      resources: [],
      topics: [],
      status: 'Not Started',
    }];
    render(<RenderObjectives objectiveOptions={objectiveOptions} goalId="new" />);
    const button = await screen.findByRole('button', { name: /Add new objective/i });
    expect(screen.queryByText(/objective status/i)).toBeNull();
    userEvent.click(button);
    await waitFor(() => expect(screen.queryByText(/objective status/i)).not.toBeNull());
  });
});
