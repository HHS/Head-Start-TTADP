/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import {
  render, screen, within, act, fireEvent, waitFor,
} from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import selectEvent from 'react-select-event';
import React from 'react';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { GOAL_STATUS } from '@ttahub/common/src/constants';
import Objective from '../Objective';
import AppLoadingContext from '../../../../../AppLoadingContext';
import UserContext from '../../../../../UserContext';
import { mockRSSData } from '../../../../../testHelpers';
import { OBJECTIVE_STATUS } from '../../../../../Constants';

const history = createMemoryHistory();

const defaultObjective = {
  id: 1,
  resources: [],
  topics: [],
  title: 'This is an objective title',
  ttaProvided: '<p><ul><li>What</li></ul></p>',
  status: OBJECTIVE_STATUS.NOT_STARTED,
  ids: [1],
  objectiveCreatedHere: true,
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
  objective = defaultObjective,
  onRemove = () => {},
  citationOptions = [],
  rawCitations = [],
  additionalHookFormData = {},
  isMonitoringGoal = false,
}) => {
  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues: {
      ...additionalHookFormData,
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
    <Router history={history}>
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
              citationOptions={citationOptions}
              rawCitations={rawCitations}
              isMonitoringGoal={isMonitoringGoal}
              options={[
                {
                  label: 'Create a new objective',
                  value: 'Create a new objective',
                  topics: [],
                  resources: [],
                  files: [],
                  status: OBJECTIVE_STATUS.NOT_STARTED,
                  title: '',
                  courses: [],
                  supportType: '',
                  objectiveCreatedHere: true,
                },
                {
                  courses: [],
                  supportType: '',
                  label: 'Existing objective',
                  value: 123,
                  topics: [],
                  resources: [],
                  files: [],
                  status: OBJECTIVE_STATUS.COMPLETE,
                  title: 'Existing objective',
                  objectiveCreatedHere: false,
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
              parentGoal={{ status: GOAL_STATUS.IN_PROGRESS }}
              initialObjectiveStatus={OBJECTIVE_STATUS.NOT_STARTED}
              reportId={98123}
            />
          </AppLoadingContext.Provider>
        </FormProvider>
      </UserContext.Provider>
    </Router>
  );
};

describe('Objective', () => {
  afterEach(() => fetchMock.restore());
  beforeEach(async () => {
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', mockRSSData());
    fetchMock.get('/api/feeds/item?tag=ttahub-tta-support-type', mockRSSData());
    fetchMock.get('/api/courses', [{ id: 1, name: 'Course 1' }, { id: 2, name: 'Course 2' }]);
  });

  it('renders an objective', async () => {
    render(<RenderObjective />);
    expect(await screen.findByText(/This is an objective title/i, { selector: 'textarea' })).toBeVisible();
  });

  it('renders an objective that doesn\'t have a status', async () => {
    render(<RenderObjective objective={{ ...defaultObjective, status: '' }} />);
    expect(await screen.findByLabelText(/objective status/i)).toBeVisible();
  });

  it('renders the citations dropdown when there are citations available', async () => {
    const citationOptions = [{
      label: 'Label 1',
      options: [
        { name: 'Citation 1', id: 1 },
      ],
    }];

    const rawCitations = [{
      citation: 'Citation 1',
      standardId: 1,
      grants: [{
        acro: 'DEF',
        citation: 'Citation 1',
        grantId: 1,
        grantNumber: '12345',
      }],
    }];

    render(<RenderObjective
      citationOptions={citationOptions}
      rawCitations={rawCitations}
      isMonitoringGoal
    />);
    const helpButton = screen.getByRole('button', { name: /get help choosing citation/i });
    expect(helpButton).toBeVisible();
    const citationsButton = screen.getByRole('button', { name: /Citation/i });
    expect(citationsButton).toBeVisible();

    const citationSelect = await screen.findByRole('combobox', { name: /citation/i });
    await selectEvent.select(citationSelect, [/Citation 1/i]);

    expect(await screen.findByText(/Citation 1/i)).toBeVisible();
  });

  it('uploads a file', async () => {
    fetchMock.post('/api/files', [{ objectiveIds: [] }]);
    const { rerender } = render(<RenderObjective />);
    const files = screen.getByText(/Did you use any other TTA resources that aren't available as link\?/i);
    const fieldset = files.parentElement;
    const yes = await within(fieldset).findByText('Yes');
    userEvent.click(yes);
    const data = mockData([file('testFile', 1)]);
    const dropzone = document.querySelector('.ttahub-objective-files-dropzone div');
    expect(fetchMock.called('/api/files')).toBe(false);
    dispatchEvt(dropzone, 'drop', data);
    await flushPromises(rerender, <RenderObjective />);
    expect(fetchMock.called('/api/files')).toBe(true);
  });

  it('handles a file upload error', async () => {
    fetchMock.post('/api/files', 500);
    const { rerender } = render(<RenderObjective />);
    const files = screen.getByText(/Did you use any other TTA resources that aren't available as link?/i);
    const fieldset = files.parentElement;
    const yes = await within(fieldset).findByText('Yes');
    userEvent.click(yes);
    const data = mockData([file('testFile', 1)]);
    const dropzone = document.querySelector('.ttahub-objective-files-dropzone div');
    expect(fetchMock.called('/api/files')).toBe(false);
    dispatchEvt(dropzone, 'drop', data);
    await flushPromises(rerender, <RenderObjective />);
    expect(fetchMock.called('/api/files')).toBe(true);
    await screen.findByText(/error uploading your file/i);
  });

  it('keeps the iPD course choice selected when switched to "Yes"', async () => {
    render(<RenderObjective />);

    const ipdFieldset = screen.getByText(/Did you use an iPD course as a resource/i).closest('fieldset');
    const yesRadio = within(ipdFieldset).getByLabelText('Yes');
    const noRadio = within(ipdFieldset).getByLabelText('No');

    expect(noRadio).toBeChecked();

    await userEvent.click(yesRadio);

    expect(yesRadio).toBeChecked();
    expect(noRadio).not.toBeChecked();
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
    expect(await screen.findByText(/Existing objective/i, { selector: 'div.usa-prose' })).toBeVisible();
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
    userEvent.selectOptions(select, OBJECTIVE_STATUS.SUSPENDED);

    const recipientRequestReason = await screen.findByLabelText(/Recipient request/i);
    userEvent.click(recipientRequestReason);

    const context = await screen.findByLabelText(/Additional context/i);
    userEvent.type(context, 'This is the context');

    userEvent.click(await screen.findByText(/Submit/i));

    expect(await screen.findByLabelText(/objective status/i)).toBeVisible();
    expect(await screen.findByText(/reason suspended/i)).toBeVisible();
    expect(await screen.findByText(/recipient request - this is the context/i)).toBeVisible();
  });

  it('you can change status to in progress', async () => {
    render(<RenderObjective />);
    expect(await screen.findByText(/This is an objective title/i, { selector: 'textarea' })).toBeVisible();
    const select = await screen.findByLabelText(/objective status/i);
    userEvent.selectOptions(select, OBJECTIVE_STATUS.IN_PROGRESS);

    expect(await screen.findByLabelText(/objective status/i)).toHaveValue(OBJECTIVE_STATUS.IN_PROGRESS);
  });

  it('when changing status to suspended, you can cancel', async () => {
    render(<RenderObjective />);
    expect(await screen.findByText(/This is an objective title/i, { selector: 'textarea' })).toBeVisible();
    const select = await screen.findByLabelText(/objective status/i);
    userEvent.selectOptions(select, OBJECTIVE_STATUS.SUSPENDED);

    const recipientRequestReason = await screen.findByLabelText(/Recipient request/i);
    userEvent.click(recipientRequestReason);

    const context = await screen.findByLabelText(/Additional context/i);
    userEvent.type(context, 'This is the context');

    userEvent.click(await screen.findByText(/cancel/i, { selector: '[aria-controls^="modal-suspend-objective-"]' }));

    expect(await screen.findByLabelText(/objective status/i)).toBeVisible();
    expect(await screen.findByText(/not started/i)).toBeVisible();
  });

  it('shows a warning when the citations selected are not for all the grants selected', async () => {
    const citationOptions = [{
      label: 'Label 1',
      options: [
        { name: 'Citation 1', id: 1 },
      ],
    }];

    const rawCitations = [{
      citation: 'Citation 1',
      standardId: 1,
      grants: [{
        acro: 'DEF',
        citation: 'Citation 1',
        grantId: 1,
        grantNumber: '12345',
      }],
    }];

    const additionalHookFormData = {
      activityRecipients: [
        {
          id: 1,
          activityRecipientId: 1,
          name: 'Recipient 1',
        },
        {
          id: 2,
          activityRecipientId: 2,
          name: 'Recipient 2',
        },
      ],
    };

    render(<RenderObjective
      citationOptions={citationOptions}
      rawCitations={rawCitations}
      additionalHookFormData={additionalHookFormData}
      isMonitoringGoal
    />);

    const helpButton = screen.getByRole('button', { name: /get help choosing citation/i });
    expect(helpButton).toBeVisible();
    const citationsButton = screen.getByRole('button', { name: /Citation/i });
    expect(citationsButton).toBeVisible();

    const citationSelect = await screen.findByRole('combobox', { name: /citation/i });
    await selectEvent.select(citationSelect, [/Citation 1/i]);

    expect(await screen.findByText(/Citation 1/i)).toBeVisible();

    expect(await screen.findByText(/This grant does not have any of the citations selected/i)).toBeVisible();
    expect(await screen.findByText(/Recipient 2/i)).toBeVisible();
    expect(await screen.findByText(/To avoid errors when submitting the report, you can either/i)).toBeVisible();
  });
});
