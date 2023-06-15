/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
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
      expect(isPageComplete({ getValues: jest.fn(() => true) })).toBe(true);
    });

    it('returns false otherwise', () => {
      expect(isPageComplete({ getValues: jest.fn(() => false) })).toBe(false);
    });
  });
  describe('review', () => {
    it('renders correctly', async () => {
      act(() => {
        render(<>{sessionSummary.reviewSection()}</>);
      });

      expect(await screen.findByRole('heading', { name: /event summary/i })).toBeInTheDocument();
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
    const RenderSessionSummary = ({ formValues = defaultFormValues }) => {
      const hookForm = useForm({
        mode: 'onBlur',
        defaultValues: formValues,
      });

      return (
        <AppLoadingContext.Provider value={{
          setIsAppLoading: jest.fn(), setAppLoadingText: jest.fn(),
        }}
        >
          <FormProvider {...hookForm}>
            <NetworkContext.Provider value={{ connectionActive: true }}>
              {sessionSummary.render(
                null,
                defaultFormValues,
                1,
                false,
                jest.fn(),
                onSaveDraft,
                jest.fn(),
                false,
                'key',
              )}
            </NetworkContext.Provider>
          </FormProvider>
        </AppLoadingContext.Provider>
      );
    };

    beforeEach(async () => {
      fetchMock.get('/api/topic', [
        { id: 1, name: 'Behavioral Health' },
        { id: 2, name: 'Complaint' },
      ]);
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

      await selectEvent.select(screen.getByLabelText(/topics/i), ['Complaint']);
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
        name: /This button will permanently delete the file/i,
      });

      act(() => {
        userEvent.click(confirmDelete);
      });

      await waitFor(() => expect(
        fetchMock.called(deleteUrl, { method: 'DELETE' }),
      ).toBe(true));

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

      const supportType = await screen.findByLabelText(/support type/i);
      act(() => {
        userEvent.selectOptions(supportType, 'Planning');
      });

      const saveDraftButton = await screen.findByRole('button', { name: /save session/i });
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
        name: /This button will permanently delete the file/i,
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
  });
});
