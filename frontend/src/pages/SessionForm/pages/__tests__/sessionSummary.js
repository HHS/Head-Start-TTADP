/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { SUPPORT_TYPES } from '@ttahub/common';
import { MemoryRouter } from 'react-router-dom';
import join from 'url-join';
import {
  render,
  screen,
  act,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { useForm, FormProvider } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import sessionSummary, { isPageComplete } from '../sessionSummary';
import NetworkContext from '../../../../NetworkContext';
import { NOT_STARTED } from '../../../../components/Navigator/constants';
import AppLoadingContext from '../../../../AppLoadingContext';
import { mockRSSData } from '../../../../testHelpers';

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

describe('sessionSummary', () => {
  describe('isPageComplete', () => {
    it('returns true if form state is valid', () => {
      expect(isPageComplete({
        getValues: jest.fn(() => ({
          objectiveTrainers: [1],
          objectiveTopics: [1],
        })),
      })).toBe(true);
    });

    it('returns false otherwise', () => {
      expect(isPageComplete({ getValues: jest.fn(() => false) })).toBe(false);
    });
  });

  describe('render', () => {
    const onSaveDraft = jest.fn();

    const defaultFormValues = {
      id: 1,
      ownerId: null,
      eventId: 'sdfgsdfg',
      eventDisplayId: 'event-display-id',
      eventName: 'Event name',
      regionId: 0,
      status: 'In progress',
      pageState: {
        1: NOT_STARTED,
        2: NOT_STARTED,
      },
      files: [{
        originalFileName: 'fancy',
        fileSize: 104520,
        status: 'APPROVED',
        id: 2,
      }],
    };

    // eslint-disable-next-line react/prop-types
    const RenderSessionSummary = ({ formValues = defaultFormValues, additionalData = { status: 'Not started' } }) => {
      const hookForm = useForm({
        mode: 'onBlur',
        defaultValues: formValues,
      });

      return (
        <AppLoadingContext.Provider value={{
          setIsAppLoading: jest.fn(), setAppLoadingText: jest.fn(),
        }}
        >
          <MemoryRouter>
            <FormProvider {...hookForm}>
              <NetworkContext.Provider value={{ connectionActive: true }}>
                {sessionSummary.render(
                  additionalData,
                  defaultFormValues,
                  1,
                  false,
                  jest.fn(),
                  onSaveDraft,
                  jest.fn(),
                  false,
                  'key',
                  jest.fn(),
                  () => <></>,
                )}
              </NetworkContext.Provider>
            </FormProvider>
          </MemoryRouter>
        </AppLoadingContext.Provider>
      );
    };

    beforeEach(async () => {
      fetchMock.get('/api/topic', [
        { id: 1, name: 'Behavioral Health' },
        { id: 2, name: 'Complaint' },
      ]);

      fetchMock.get('/api/national-center', {
        centers: [
          { id: 1, name: 'DTL' },
          { id: 2, name: 'HBHS' },
          { id: 3, name: 'PFCE' },
          { id: 4, name: 'PFMO' },
        ],
        users: [],
      });

      fetchMock.get('/api/courses', [
        {
          id: 1,
          name: 'Sample Course 1',
        },
        {
          id: 2,
          name: 'Sample Course 2',
        },
        {
          id: 3,
          name: 'Sample Course 3',
        },
      ]);

      fetchMock.get('/api/feeds/item?tag=ttahub-topic', mockRSSData());
    });

    afterEach(async () => {
      fetchMock.restore();
    });

    it('renders session summary', async () => {
      const { rerender } = render(<RenderSessionSummary />);

      const sessionName = await screen.findByLabelText(/session name/i);
      act(() => {
        fireEvent.focus(sessionName);
        userEvent.tab();
        userEvent.type(sessionName, 'Session name');
      });

      const startDate = await screen.findByLabelText(/session start Date/i, { selector: '#startDate' });
      act(() => {
        userEvent.type(startDate, '01/01/2021');
      });

      const endDate = await screen.findByLabelText(/session end Date/i, { selector: '#endDate' });
      act(() => {
        userEvent.type(endDate, '01/02/2021');
      });

      act(() => {
        userEvent.clear(startDate);
        userEvent.type(startDate, '01/03/2021');
      });

      const duration = await screen.findByLabelText(/duration/i);
      act(() => {
        userEvent.type(duration, '1.25');
      });

      const sessionObjective = await screen.findByLabelText(/session objective/i);
      act(() => {
        userEvent.type(sessionObjective, 'Session objective');
      });

      await selectEvent.select(document.getElementById('objectiveTopics'), ['Complaint']);

      const trainers = await screen.findByLabelText(/Who were the trainers for this session?/i);
      await selectEvent.select(trainers, ['PFCE']);

      const resourceOne = await screen.findByLabelText(/resource 1/i);
      act(() => {
        userEvent.type(resourceOne, 'http://www.resource.com');
      });

      const addNewResource = await screen.findByRole('button', { name: /add new resource/i });
      act(() => {
        userEvent.click(addNewResource);
      });

      const resourceTwo = await screen.findByLabelText(/resource 2/i);

      act(() => {
        userEvent.type(resourceTwo, 'http://www.resource2.com');
        fireEvent.focus(addNewResource);
        userEvent.clear(resourceTwo);
        fireEvent.blur(resourceTwo);
      });

      act(() => {
        userEvent.type(resourceTwo, 'I AM NOT A RESOURCE');
      });

      const removeResourceOne = await screen.findByRole('button', { name: /remove resource 1/i });
      act(() => {
        userEvent.click(removeResourceOne);
      });

      const removeFile = document.querySelector('.smart-hub--file-tag-button');
      act(() => {
        userEvent.click(removeFile);
      });

      const deleteUrl = '/api/files/s/undefined/2';
      fetchMock.delete(deleteUrl, 200);

      const confirmDelete = await screen.findByRole('button', {
        name: /confirm delete/i,
      });

      act(() => {
        userEvent.click(confirmDelete);
      });

      await waitFor(() => expect(
        fetchMock.called(deleteUrl, { method: 'DELETE' }),
      ).toBe(true));

      // Select courses.
      let yesCourses = document.querySelector('#useIpdCourses-yes');
      act(async () => {
        userEvent.click(yesCourses);
      });

      const courseSelect = await screen.findByLabelText(/iPD course name/i);
      await selectEvent.select(courseSelect, ['Sample Course 2', 'Sample Course 3']);
      expect(await screen.findByText(/Sample Course 2/i)).toBeVisible();
      expect(await screen.findByText(/Sample Course 3/i)).toBeVisible();

      const noCourses = document.querySelector('#useIpdCourses-no');
      act(async () => {
        userEvent.click(noCourses);
      });

      expect(await screen.findByText(/Sample Course 2/i)).not.toBeVisible();
      expect(await screen.findByText(/Sample Course 3/i)).not.toBeVisible();

      yesCourses = document.querySelector('#useIpdCourses-yes');
      act(async () => {
        userEvent.click(yesCourses);
      });
      await selectEvent.select(courseSelect, ['Sample Course 1']);
      expect(await screen.findByText(/Sample Course 1/i)).toBeVisible();

      fetchMock.restore();

      const fileUrl = join('/', 'api', 'files');
      fetchMock.post(fileUrl, {});

      const data = mockData([file('testFile', 1)]);
      const dropzone = document.querySelector('.dropzone');
      expect(fetchMock.called('/api/files/objectives')).toBe(false);
      dispatchEvt(dropzone, 'drop', data);
      await flushPromises(rerender, <RenderSessionSummary />);
      await waitFor(() => expect(fetchMock.called(fileUrl, { method: 'POST' })).toBe(true));

      const noIsaidNoIsaidNoFilesSir = document.querySelector('#addObjectiveFilesNo');
      act(() => {
        userEvent.click(noIsaidNoIsaidNoFilesSir);
      });

      const yesOnTheFilesSir = document.querySelector('#addObjectiveFilesYes');
      act(() => {
        userEvent.click(yesOnTheFilesSir);
      });

      act(() => {
        userEvent.click(noIsaidNoIsaidNoFilesSir);
      });

      act(() => {
        userEvent.type(
          screen.getByLabelText(/TTA provided/i),
          'TTA provided',
        );
      });

      const supportType = await screen.findByRole('combobox', { name: /support type/i });
      act(() => {
        userEvent.selectOptions(supportType, SUPPORT_TYPES[1]);
      });

      const saveDraftButton = await screen.findByRole('button', { name: /save draft/i });
      userEvent.click(saveDraftButton);
      expect(onSaveDraft).toHaveBeenCalled();
    });

    it('handles errors uploading and deleting files', async () => {
      const { rerender } = render(<RenderSessionSummary />);

      const removeFile = document.querySelector('.smart-hub--file-tag-button');
      act(() => {
        userEvent.click(removeFile);
      });

      const deleteUrl = '/api/files/s/undefined/2';
      fetchMock.delete(deleteUrl, 500);

      const confirmDelete = await screen.findByRole('button', {
        name: /confirm delete/i,
      });

      act(() => {
        userEvent.click(confirmDelete);
      });

      await waitFor(() => expect(
        fetchMock.called(deleteUrl, { method: 'DELETE' }),
      ).toBe(true));

      const deleteMessage = await screen.findByText('File could not be deleted');
      expect(deleteMessage).toBeInTheDocument();

      fetchMock.restore();

      const fileUrl = join('/', 'api', 'files');
      fetchMock.post(fileUrl, 500);

      const data = mockData([file('testFile', 1)]);
      const dropzone = document.querySelector('.dropzone');
      expect(fetchMock.called('/api/files/objectives')).toBe(false);
      dispatchEvt(dropzone, 'drop', data);
      await flushPromises(rerender, <RenderSessionSummary />);
      await waitFor(() => expect(fetchMock.called(fileUrl, { method: 'POST' })).toBe(true));

      const uploadMessage = await screen.findByText('File could not be uploaded');
      expect(uploadMessage).toBeInTheDocument();
    });

    it('shows an error if there was one fetching topics', async () => {
      fetchMock.restore();
      fetchMock.get('/api/feeds/item?tag=ttahub-topic', mockRSSData());
      fetchMock.get('/api/topic', 500);
      act(() => {
        render(<RenderSessionSummary />);
      });

      expect(await screen.findByText(/There was an error fetching topics/i)).toBeInTheDocument();
    });

    it('defaults to a closed file uploader', async () => {
      const values = {
        ...defaultFormValues,
        files: [],
      };

      render(<RenderSessionSummary formValues={values} />);

      const noIsaidNoIsaidNoFilesSir = document.querySelector('#addObjectiveFilesNo');
      expect(noIsaidNoIsaidNoFilesSir).toBeChecked();

      const yesOnTheFilesSir = document.querySelector('#addObjectiveFilesYes');
      act(() => {
        userEvent.click(yesOnTheFilesSir);
      });

      expect(yesOnTheFilesSir).toBeChecked();
    });

    it('shows an error if there was one fetching trainers', async () => {
      fetchMock.restore();
      fetchMock.get('/api/feeds/item?tag=ttahub-topic', mockRSSData());
      fetchMock.get('/api/topic', [
        { id: 1, name: 'Behavioral Health' },
        { id: 2, name: 'Complaint' },
      ]);
      fetchMock.get('/api/national-center', 500);
      act(() => {
        render(<RenderSessionSummary />);
      });

      expect(await screen.findByText(/There was an error fetching objective trainers/i)).toBeInTheDocument();
    });

    it('hides the save draft button if the session status is complete', async () => {
      const values = {
        ...defaultFormValues,
        status: 'Complete',
      };

      render(<RenderSessionSummary formValues={values} additionalData={{ status: 'Complete' }} />);
      expect(screen.queryByRole('button', { name: /continue/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument();
    });

    it('shows the save draft button if the session status is not complete', async () => {
      const values = {
        ...defaultFormValues,
        status: 'In progress',
      };

      render(<RenderSessionSummary formValues={values} additionalData={{ status: 'In progress' }} />);
      expect(screen.queryByRole('button', { name: /save and continue/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /save draft/i })).toBeInTheDocument();
    });

    it('shows the save and continue button if the admin is editing the session and the session status is not complete', async () => {
      const values = {
        ...defaultFormValues,
        status: 'In progress',
      };

      render(<RenderSessionSummary formValues={values} additionalData={{ status: 'In progress', isAdminUser: true }} />);
      expect(screen.queryByRole('button', { name: /save and continue/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /review and submit/i })).not.toBeInTheDocument();
    });

    it('only shows the continue button if the admin is editing the session and the session status is complete', async () => {
      const values = {
        ...defaultFormValues,
        status: 'Complete',
      };

      render(<RenderSessionSummary formValues={values} additionalData={{ status: 'Complete', isAdminUser: true }} />);
      expect(screen.queryByRole('button', { name: /continue/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument();
    });
  });

  describe('ReviewSection', () => {
    it('exports a reviewSection function', () => {
      expect(typeof sessionSummary.reviewSection).toBe('function');
      expect(sessionSummary.reviewSection).toBeDefined();
    });

    it('has the correct review property', () => {
      expect(sessionSummary.review).toBe(false);
    });
  });
});
