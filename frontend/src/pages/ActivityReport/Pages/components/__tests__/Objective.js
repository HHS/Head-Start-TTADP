/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import {
  render, screen, within, act, fireEvent, waitFor,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import React from 'react';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import Objective from '../Objective';
import AppLoadingContext from '../../../../../AppLoadingContext';
import UserContext from '../../../../../UserContext';

const defaultObjective = {
  id: 1,
  resources: [],
  topics: [],
  title: 'This is an objective title',
  ttaProvided: '<p><ul><li>What</li></ul></p>',
  status: 'Not started',
  ids: [1],
};

const mockData = (files) => ({
  dataTransfer: {
    files,
    items: files.map((file) => ({
      kind: 'file',
      type: file.type,
      getAsFile: () => file,
    })),
    types: ['Files'],
  },
});

const file = (name, id, status = 'Uploaded') => ({
  originalFileName: name, id, fileSize: 2000, status, lastModified: 123456,
});

const dispatchEvt = (node, type, data) => {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, data);
  fireEvent(node, event);
};

const flushPromises = async (rerender, ui) => {
  await act(() => waitFor(() => rerender(ui)));
};

let getValues;

const RenderObjective = ({
  // eslint-disable-next-line react/prop-types
  objective = defaultObjective, onRemove = () => {},
}) => {
  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues: {
      objectives: [objective],
      collaborators: [],
      author: {
        role: 'Central office',
      },
    },
  });

  hookForm.register('goals');
  hookForm.register('objectives');

  getValues = hookForm.getValues;

  const onUpdate = (obj) => {
    hookForm.setValue('objectives', [obj]);
  };

  return (
    <UserContext.Provider value={{ user: { id: 1, flags: [] } }}>
      <FormProvider {...hookForm}>
        <AppLoadingContext.Provider value={
        {
          setAppLoadingText: jest.fn(),
          setIsAppLoading: jest.fn(),
        }
      }
        >
          <Objective
            objective={defaultObjective}
            topicOptions={[]}
            options={[
              {
                label: 'Create a new objective',
                value: 'Create a new objective',
                topics: [],
                resources: [],
                files: [],
                status: 'Not Started',
                title: '',
              },
              {
                label: 'Existing objective',
                value: 123,
                topics: [],
                resources: [],
                files: [],
                status: 'Complete',
                title: 'Existing objective',
              }]}
            index={1}
            remove={onRemove}
            fieldArrayName="objectives"
            goalId={1}
            onRemove={onRemove}
            onUpdate={onUpdate}
            parentLabel="goals"
            objectiveAriaLabel="1 on goal 1"
            goalIndex={0}
            objectiveIndex={0}
            errors={{}}
            onObjectiveChange={jest.fn()}
            onSaveDraft={jest.fn()}
            parentGoal={{ status: 'In Progress' }}
            initialObjectiveStatus="Not Started"
            reportId={98123}
          />
        </AppLoadingContext.Provider>
      </FormProvider>
    </UserContext.Provider>
  );
};

describe('Objective', () => {
  afterEach(() => fetchMock.restore());
  beforeEach(() => fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <title>Whats New</title>
  <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
  <subtitle>Confluence Syndication Feed</subtitle>
  <id>https://acf-ohs.atlassian.net/wiki</id></feed>`));

  it('renders an objective', async () => {
    render(<RenderObjective />);
    expect(await screen.findByText(/This is an objective title/i, { selector: 'textarea' })).toBeVisible();
  });

  it('renders an objective that doesn\'t have a status', async () => {
    render(<RenderObjective objective={{ ...defaultObjective, status: '' }} />);
    expect(await screen.findByLabelText(/objective status/i)).toBeVisible();
  });

  it('uploads a file', async () => {
    fetchMock.post('/api/files/objectives', [{ objectiveIds: [] }]);
    const { rerender } = render(<RenderObjective />);
    const files = screen.getByText(/Did you use any TTA resources that aren't available as link?/i);
    const fieldset = files.parentElement;
    const yes = await within(fieldset).findByText('Yes');
    userEvent.click(yes);
    const data = mockData([file('testFile', 1)]);
    const dropzone = document.querySelector('.ttahub-objective-files-dropzone div');
    expect(fetchMock.called('/api/files/objectives')).toBe(false);
    dispatchEvt(dropzone, 'drop', data);
    await flushPromises(rerender, <RenderObjective />);
    expect(fetchMock.called('/api/files/objectives')).toBe(true);
  });

  it('handles a file upload error', async () => {
    fetchMock.post('/api/files/objectives', 500);
    const { rerender } = render(<RenderObjective />);
    const files = screen.getByText(/Did you use any TTA resources that aren't available as link?/i);
    const fieldset = files.parentElement;
    const yes = await within(fieldset).findByText('Yes');
    userEvent.click(yes);
    const data = mockData([file('testFile', 1)]);
    const dropzone = document.querySelector('.ttahub-objective-files-dropzone div');
    expect(fetchMock.called('/api/files/objectives')).toBe(false);
    dispatchEvt(dropzone, 'drop', data);
    await flushPromises(rerender, <RenderObjective />);
    expect(fetchMock.called('/api/files/objectives')).toBe(true);
    await screen.findByText(/error uploading your file/i);
  });

  it('does not clear TTA provided between objective changes', async () => {
    render(<RenderObjective />);
    await screen.findByText('What');
    await act(async () => selectEvent.select(screen.getByLabelText(/Select TTA objective/i), ['Create a new objective']));
    expect(await screen.findByText('What')).toBeVisible();

    const values = getValues();
    const { objectives } = values;
    const ttas = objectives.map((o) => o.ttaProvided);
    expect(ttas).toEqual(['<p><ul><li>What</li></ul></p>', '<p><ul><li>What</li></ul></p>']);
  });

  it('switches the title to read only if the objective changes', async () => {
    render(<RenderObjective />);
    await screen.findByText('What');
    expect(await screen.findByText(/This is an objective title/i, { selector: 'textarea' })).toBeVisible();
    await act(async () => selectEvent.select(screen.getByLabelText(/Select TTA objective/i), ['Existing objective']));
    expect(await screen.findByText(/Existing objective/i, { selector: 'p' })).toBeVisible();
    expect(screen.queryByText(/This is an objective title/i, { selector: 'textarea' })).toBeNull();
    expect(Array.from(document.querySelectorAll('textarea.ttahub--objective-title'))).toHaveLength(0);
    await act(async () => selectEvent.select(screen.getByLabelText(/Select TTA objective/i), ['Create a new objective']));
    expect(await screen.findByText(/Create a new objective/i)).toBeVisible();
    expect(Array.from(document.querySelectorAll('textarea.ttahub--objective-title'))).toHaveLength(1);
  });

  it('you can change status to suspended', async () => {
    render(<RenderObjective />);
    expect(await screen.findByText(/This is an objective title/i, { selector: 'textarea' })).toBeVisible();
    const select = await screen.findByLabelText(/objective status/i);
    userEvent.selectOptions(select, 'Suspended');

    const recipientRequestReason = await screen.findByLabelText(/Recipient request/i);
    userEvent.click(recipientRequestReason);

    const context = await screen.findByLabelText(/Additional context/i);
    userEvent.type(context, 'This is the context');

    userEvent.click(await screen.findByText(/Submit/i));

    expect(await screen.findByLabelText(/objective status/i)).toBeVisible();
    expect(await screen.findByText(/reason suspended/i)).toBeVisible();
    expect(await screen.findByText(/recipient request - this is the context/i)).toBeVisible();
  });

  it('when changing status to suspended, you can cancel', async () => {
    render(<RenderObjective />);
    expect(await screen.findByText(/This is an objective title/i, { selector: 'textarea' })).toBeVisible();
    const select = await screen.findByLabelText(/objective status/i);
    userEvent.selectOptions(select, 'Suspended');

    const recipientRequestReason = await screen.findByLabelText(/Recipient request/i);
    userEvent.click(recipientRequestReason);

    const context = await screen.findByLabelText(/Additional context/i);
    userEvent.type(context, 'This is the context');

    userEvent.click(await screen.findByText(/cancel/i, { selector: '[aria-controls="modal-suspend-objective--"]' }));

    expect(await screen.findByLabelText(/objective status/i)).toBeVisible();
    expect(await screen.findByText(/not started/i)).toBeVisible();
  });
});
