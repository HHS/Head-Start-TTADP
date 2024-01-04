/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import { useForm, FormProvider } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import completeEvent from '../completeEvent';
import NetworkContext from '../../../../NetworkContext';
import AppLoadingContext from '../../../../AppLoadingContext';
import UserContext from '../../../../UserContext';

describe('completeEvent', () => {
  describe('render', () => {
    const defaultPageState = {
      1: 'In progress',
      2: 'Complete',
    };

    const defaultFormValues = {
      id: 1,
      status: 'Not started',
      pageState: defaultPageState,
      ownerId: 1,
      eventId: 'R01-PD-1234',
    };

    const sessionsUrl = '/api/session-reports/eventId/1234';
    const onSubmit = jest.fn();
    const onSaveForm = jest.fn();
    const onUpdatePage = jest.fn();

    // eslint-disable-next-line react/prop-types
    const RenderCompleteEvent = ({ defaultValues = defaultFormValues }) => {
      const hookForm = useForm({
        mode: 'onBlur',
        defaultValues,
      });

      const history = createMemoryHistory();

      const formData = hookForm.watch();

      return (
        <Router history={history}>
          <FormProvider {...hookForm}>
            <UserContext.Provider value={{ user: { id: 1 } }}>
              <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn, isAppLoading: false }}>
                <NetworkContext.Provider value={{ connectionActive: true }}>
                  {completeEvent.render(
                    {},
                    formData,
                    1,
                    false,
                    jest.fn(),
                    onSaveForm,
                    onUpdatePage,
                    false,
                    '',
                    onSubmit,
                    () => <></>,
                  )}
                </NetworkContext.Provider>
              </AppLoadingContext.Provider>
            </UserContext.Provider>
          </FormProvider>
        </Router>
      );
    };

    afterEach(() => {
      fetchMock.reset();
    });

    it('renders complete event page', async () => {
      fetchMock.getOnce(sessionsUrl, [
        { id: 2, eventId: 1, data: { sessionName: 'Toothbrushing vol 2', status: 'Complete' } },
        { id: 3, eventId: 1, data: { sessionName: 'Toothbrushing vol 3', status: 'Complete' } },
        { id: 4, eventId: 1, data: { sessionName: '', status: 'Not started' } },
      ]);

      act(() => {
        render(<RenderCompleteEvent />);
      });

      expect(await screen.findByRole('cell', { name: /toothbrushing vol 2/i })).toBeInTheDocument();
      expect(await screen.findByRole('cell', { name: /toothbrushing vol 3/i })).toBeInTheDocument();
      expect(await screen.findAllByRole('cell', { name: /complete/i })).toHaveLength(2); // sessions without names are filtered out

      // you can change the status
      const statusSelect = await screen.findByRole('combobox', { name: /status/i });
      act(() => {
        userEvent.selectOptions(statusSelect, 'Complete');
      });
      expect(statusSelect).toHaveValue('Complete');
    });

    it('not started and suspended are options when there are no sessions', async () => {
      fetchMock.getOnce(sessionsUrl, []);

      act(() => {
        render(<RenderCompleteEvent />);
      });

      const statusLabel = await screen.findByText('Event status');
      expect(statusLabel).toBeInTheDocument();
      const status = await screen.findByText('Not started');
      expect(status).toBeInTheDocument();

      // but there should be no select
      const statusSelect = screen.queryByRole('combobox', { name: /status/i });
      expect(statusSelect).not.toBeNull();
      const options = screen.queryAllByRole('option');
      const optionTexts = options.map((option) => option.textContent);
      expect(optionTexts).toEqual(['Not started', 'Suspended']);
    });

    it('suspended events change the button text and call "onSave"', async () => {
      fetchMock.getOnce(sessionsUrl, []);

      act(() => {
        render(<RenderCompleteEvent />);
      });

      const statusSelect = await screen.findByRole('combobox', { name: /status/i });

      act(() => {
        userEvent.selectOptions(statusSelect, 'Suspended');
      });

      const submitButton = await screen.findByRole('button', { name: /suspend event/i });
      userEvent.click(submitButton);

      expect(onSaveForm).toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('handles an error fetching sessions', async () => {
      fetchMock.getOnce(sessionsUrl, 500);

      act(() => {
        render(<RenderCompleteEvent />);
      });

      await waitFor(() => screen.findByText('Unable to load sessions'));

      const statusLabel = await screen.findByText('Event status');
      expect(statusLabel).toBeInTheDocument();
      const status = await screen.findByText('Not started');
      expect(status).toBeInTheDocument();

      const statusSelect = screen.queryByRole('combobox', { name: /status/i });
      expect(statusSelect).not.toBeNull();
      const options = screen.queryAllByRole('option');
      const optionTexts = options.map((option) => option.textContent);
      expect(optionTexts).toEqual(['Not started', 'Suspended']);
    });

    it('calls onUpdatePage when the back button is clicked', async () => {
      fetchMock.getOnce(sessionsUrl, []);

      act(() => {
        render(<RenderCompleteEvent />);
      });

      const backButton = await screen.findByRole('button', { name: /back/i });
      act(() => {
        userEvent.click(backButton);
      });

      // 2 is the complete event page position (3) - 1
      expect(onUpdatePage).toHaveBeenCalledWith(2);
    });

    it('calls saveDraft when the save draft button is clicked', async () => {
      fetchMock.getOnce(sessionsUrl, []);

      act(() => {
        render(<RenderCompleteEvent />);
      });

      const saveDraftButton = await screen.findByRole('button', { name: /save draft/i });
      act(() => {
        userEvent.click(saveDraftButton);
      });

      expect(onSaveForm).toHaveBeenCalled();
    });

    it('wont submit if there are no sessions', async () => {
      fetchMock.getOnce(sessionsUrl, []);

      act(() => {
        render(<RenderCompleteEvent />);
      });

      const statusLabel = await screen.findByText('Event status');
      expect(statusLabel).toBeInTheDocument();
      const status = await screen.findByText('Not started');
      expect(status).toBeInTheDocument();

      const statusSelect = screen.queryByRole('combobox', { name: /status/i });
      expect(statusSelect).not.toBeNull();
      const options = screen.queryAllByRole('option');
      const optionTexts = options.map((option) => option.textContent);
      expect(optionTexts).toEqual(['Not started', 'Suspended']);

      const submitButton = await screen.findByRole('button', { name: /submit/i });
      act(() => {
        userEvent.click(submitButton);
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('wont submit if some sessions aren\'t complete', async () => {
      fetchMock.getOnce(sessionsUrl, [
        { id: 2, eventId: 1, data: { sessionName: 'Toothbrushing vol 2', status: 'Complete' } },
        { id: 3, eventId: 1, data: { sessionName: 'Toothbrushing vol 3', status: 'Not started' } },
      ]);

      act(() => {
        render(<RenderCompleteEvent />);
      });

      const statusSelect = await screen.findByRole('combobox', { name: /status/i });
      act(() => {
        userEvent.selectOptions(statusSelect, 'Complete');
      });
      expect(statusSelect).toHaveValue('Complete');

      const submitButton = await screen.findByRole('button', { name: /submit/i });
      act(() => {
        userEvent.click(submitButton);
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('will not submit if all sessions but not all pages are complete', async () => {
      fetchMock.getOnce(sessionsUrl, [
        { id: 2, eventId: 1, data: { sessionName: 'Toothbrushing vol 2', status: 'Complete' } },
        { id: 3, eventId: 1, data: { sessionName: 'Toothbrushing vol 3', status: 'Complete' } },
      ]);

      act(() => {
        render(<RenderCompleteEvent />);
      });

      const statusSelect = await screen.findByRole('combobox', { name: /status/i });
      act(() => {
        userEvent.selectOptions(statusSelect, 'Complete');
      });
      expect(statusSelect).toHaveValue('Complete');

      const submitButton = await screen.findByRole('button', { name: /submit/i });
      act(() => {
        userEvent.click(submitButton);
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('will submit if all sessions and pages are complete', async () => {
      fetchMock.getOnce(sessionsUrl, [
        { id: 2, eventId: 1, data: { sessionName: 'Toothbrushing vol 2', status: 'Complete' } },
        { id: 3, eventId: 1, data: { sessionName: 'Toothbrushing vol 3', status: 'Complete' } },
      ]);

      act(() => {
        render(<RenderCompleteEvent defaultValues={{
          ...defaultFormValues,
          pageState: {
            1: 'Complete',
            2: 'Complete',
          },
        }}
        />);
      });

      const statusSelect = await screen.findByRole('combobox', { name: /status/i });
      act(() => {
        userEvent.selectOptions(statusSelect, 'Complete');
      });
      expect(statusSelect).toHaveValue('Complete');

      const submitButton = await screen.findByRole('button', { name: /submit/i });
      act(() => {
        userEvent.click(submitButton);
      });

      expect(onSubmit).toHaveBeenCalledWith('Complete');
    });

    it('will not submit if all sessions and pages are complete and user is not owner', async () => {
      fetchMock.getOnce(sessionsUrl, [
        { id: 2, eventId: 1, data: { sessionName: 'Toothbrushing vol 2', status: 'Complete' } },
        { id: 3, eventId: 1, data: { sessionName: 'Toothbrushing vol 3', status: 'Complete' } },
      ]);

      act(() => {
        render(<RenderCompleteEvent defaultValues={{
          ...defaultFormValues,
          ownerId: 2,
          pageState: {
            1: 'Complete',
            2: 'Complete',
          },
        }}
        />);
      });

      // combobox isn't even present
      const statusSelect = screen.queryByRole('combobox', { name: /status/i });
      expect(statusSelect).toBeNull();

      // the status will be displayed as read only
      const statusLabel = await screen.findByText('Event status');
      expect(statusLabel).toBeInTheDocument();
      const status = await screen.findByText('In progress');
      expect(status).toBeInTheDocument();

      // and the submit button is disabled
      const submitButton = screen.queryByRole('button', { name: /submit/i });
      expect(submitButton).toBeNull();
    });

    it('sets a default status of not started if there is no form status and there are no sessions', async () => {
      fetchMock.getOnce(sessionsUrl, []);

      act(() => {
        render(<RenderCompleteEvent defaultValues={{ id: 1, pageState: defaultPageState, eventId: 'R01-PD-1234' }} />);
      });

      const statusLabel = await screen.findByText('Event status');
      expect(statusLabel).toBeInTheDocument();
      const status = await screen.findByText('Not started');
      expect(status).toBeInTheDocument();

      // there should be no select
      const statusSelect = screen.queryByRole('combobox', { name: /status/i });
      expect(statusSelect).toBeNull();
    });
  });
});
