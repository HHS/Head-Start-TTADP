import '@testing-library/jest-dom';
import {
  render, screen, within, act, fireEvent, waitFor,
} from '@testing-library/react';
import React from 'react';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import Objective from '../Objective';

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

  const onUpdate = (obj) => {
    hookForm.setValue('objectives', [obj]);
  };

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <Objective
        objective={defaultObjective}
        topicOptions={[]}
        options={[]}
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
    </FormProvider>
  );
};

describe('Objective', () => {
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
    expect(fetchMock.called()).toBe(false);
    dispatchEvt(dropzone, 'drop', data);
    await flushPromises(rerender, <RenderObjective />);
    expect(fetchMock.called()).toBe(true);
    fetchMock.restore();
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
    expect(fetchMock.called()).toBe(false);
    dispatchEvt(dropzone, 'drop', data);
    await flushPromises(rerender, <RenderObjective />);
    expect(fetchMock.called()).toBe(true);
    await screen.findByText(/error uploading your file/i);
    fetchMock.restore();
  });
});
