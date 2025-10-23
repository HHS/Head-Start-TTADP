/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import {
  render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import selectEvent from 'react-select-event';
import { GOAL_STATUS } from '@ttahub/common/src/constants';
import fetchMock from 'fetch-mock';
import Objectives from '../Objectives';
import UserContext from '../../../../../UserContext';
import { OBJECTIVE_STATUS } from '../../../../../Constants';

// eslint-disable-next-line react/prop-types
const RenderObjectives = ({ objectiveOptions, goalId = 12, collaborators = [] }) => {
  let goalForEditing = null;

  if (goalId) {
    goalForEditing = {
      id: goalId,
      objectives: [],
      status: GOAL_STATUS.NOT_STARTED,
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
      name: 'Fencing',
    },
    {
      value: 2,
      name: 'Boating',
    },
  ];

  return (
    <UserContext.Provider value={{ user: { id: 1, flags: [] } }}>
      <FormProvider {...hookForm}>
        <Objectives
          objectiveOptions={objectiveOptions}
          topicOptions={topicOptions}
          goalId={goalId}
          noObjectiveError={<></>}
          goalStatus={GOAL_STATUS.IN_PROGRESS}
          reportId={12}
          onSaveDraft={jest.fn()}
          objectiveOptionsLoaded
        />
        <button type="button">blur me</button>
      </FormProvider>
    </UserContext.Provider>
  );
};

describe('Objectives', () => {
  beforeAll(() => {
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <title>Whats New</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
    <subtitle>Confluence Syndication Feed</subtitle>
    <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
  });

  afterAll(() => {
    fetchMock.restore();
  });

  it('you can create a new objective', async () => {
    const objectiveOptions = [];
    const collabs = [{ role: 'Snake charmer' }, { role: 'lion tamer' }];
    render(<RenderObjectives objectiveOptions={objectiveOptions} collaborators={collabs} />);
    await waitFor(() => expect(screen.queryByText(/objective status/i)).not.toBeNull());
  });
  it('allows for the selection and changing of an objective', async () => {
    const objectiveOptions = [{
      value: 3,
      label: 'Test objective 1',
      title: 'Test objective 1',
      ttaProvided: '<p>hello</p>',
      onAR: false,
      onApprovedAR: false,
      resources: [],
      topics: [],
      status: OBJECTIVE_STATUS.NOT_STARTED,
      id: 3,
      objectiveCreatedHere: false,
    },
    {
      id: 4,
      value: 4,
      label: 'Test objective 2',
      title: 'Test objective 2',
      ttaProvided: '<p>hello 2</p>',
      onAR: false,
      onApprovedAR: false,
      resources: [],
      topics: [],
      status: OBJECTIVE_STATUS.NOT_STARTED,
      objectiveCreatedHere: false,
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
      onAR: false,
      onApprovedAR: false,
      resources: [],
      topics: [],
      status: OBJECTIVE_STATUS.IN_PROGRESS,
      id: 3,
      objectiveCreatedHere: false,
    },
    {
      id: 4,
      value: 4,
      label: 'Test objective 2',
      title: 'Test objective 2',
      ttaProvided: '<p>hello 2</p>',
      onAR: false,
      onApprovedAR: false,
      resources: [],
      topics: [],
      status: OBJECTIVE_STATUS.NOT_STARTED,
      objectiveCreatedHere: false,
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
    expect(await screen.findByText(OBJECTIVE_STATUS.IN_PROGRESS)).toBeVisible();
  });

  it('the button adds a new objective', async () => {
    const objectiveOptions = [{
      value: 3,
      label: 'Test objective',
      title: 'Test objective',
      ttaProvided: '<p>hello</p>',
      onAR: false,
      onApprovedAR: false,
      resources: [],
      topics: [],
      status: OBJECTIVE_STATUS.NOT_STARTED,
      objectiveCreatedHere: true,
    }];
    render(<RenderObjectives objectiveOptions={objectiveOptions} />);
    expect(screen.queryByText(/objective status/i)).toBeNull();
    const select = await screen.findByLabelText(/Select TTA objective/i);
    await selectEvent.select(select, ['Test objective']);
    await waitFor(() => expect(screen.queryByText(/objective status/i)).not.toBeNull());
  });

  it('hides and shows add objective button', async () => {
    const objectiveOptions = [{
      value: 3,
      label: 'Test objective',
      title: 'Test objective',
      ttaProvided: '<p>hello</p>',
      onAR: false,
      onApprovedAR: false,
      resources: [],
      topics: [],
      status: OBJECTIVE_STATUS.NOT_STARTED,
      objectiveCreatedHere: false,
    }];
    render(<RenderObjectives objectiveOptions={objectiveOptions} />);
    expect(screen.queryByText(/objective status/i)).toBeNull();

    // We shouldn't show add objective button.
    expect(screen.queryByRole('button', { name: /Add new objective/i })).toBeNull();

    // Add an objective.
    const select = await screen.findByLabelText(/Select TTA objective/i);
    await selectEvent.select(select, ['Test objective']);
    await waitFor(() => expect(screen.queryByText(/objective status/i)).not.toBeNull());

    // We should show add objective button.
    expect(screen.queryByRole('button', { name: /Add new objective/i })).not.toBeNull();

    // Remove objective.
    const removeObjButton = await screen.findByRole('button', { name: /remove this objective/i });
    userEvent.click(removeObjButton);

    // We shouldn't show add objective button after we remove the objective.
    expect(screen.queryByRole('button', { name: /Add new objective/i })).toBeNull();
  });

  it('handles a "new" goal', async () => {
    const objectiveOptions = [{
      value: 3,
      label: 'Test objective',
      title: 'Test objective',
      ttaProvided: '<p>hello</p>',
      onAR: false,
      onApprovedAR: false,
      resources: [],
      topics: [],
      status: OBJECTIVE_STATUS.NOT_STARTED,
      objectiveCreatedHere: false,
    }];
    render(<RenderObjectives objectiveOptions={objectiveOptions} goalId="new" />);

    expect(screen.queryByText(/objective status/i)).toBeNull();
    const select = await screen.findByLabelText(/Select TTA objective/i);
    await selectEvent.select(select, ['Test objective']);
    await waitFor(() => expect(screen.queryByText(/objective status/i)).not.toBeNull());
  });

  it('suspends without setting a reason and displays an error', async () => {
    const objectiveOptions = [{
      value: 3,
      label: 'Test objective',
      title: 'Test objective',
      ttaProvided: '<p>hello</p>',
      onAR: false,
      onApprovedAR: false,
      resources: [],
      topics: [],
      status: OBJECTIVE_STATUS.NOT_STARTED,
      id: 3,
      objectiveCreatedHere: false,
    }];
    render(<RenderObjectives objectiveOptions={objectiveOptions} />);
    const select = await screen.findByLabelText(/Select TTA objective/i);
    await selectEvent.select(select, ['Test objective']);
    await waitFor(() => expect(screen.queryByText(/objective status/i)).not.toBeNull());

    // Find the label 'Objective status' and select the suspend option.
    const statusLabel = await screen.findByText(/objective status/i);
    const statusSelect = statusLabel.parentElement.querySelector('select');
    expect(statusSelect).toBeInTheDocument();
    await selectEvent.select(statusSelect, [OBJECTIVE_STATUS.SUSPENDED]);

    // Wait for the modal to appear.
    const modal = await screen.findByRole('dialog', { name: /why are you suspending this objective/i });
    expect(modal).toBeVisible();

    // Click the submit button without selecting a reason.
    const submitButton = screen.getByRole('button', { name: /submit/i });
    userEvent.click(submitButton);

    // Expect to see the error message "Reason for suspension is required".
    const errorMessage = await screen.findByText(/reason for suspension is required/i);
    expect(errorMessage).toBeVisible();
  });

  it('automatically selects the create a new objective option when there are no objective options', async () => {
    const objectiveOptions = [];
    render(<RenderObjectives objectiveOptions={objectiveOptions} />);
    expect(screen.getByText(/create a new objective/i)).toBeVisible();
    await waitFor(() => expect(screen.queryByText(/objective status/i)).not.toBeNull());
  });
});
