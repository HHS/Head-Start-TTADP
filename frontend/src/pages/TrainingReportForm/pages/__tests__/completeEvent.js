/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import completeEvent from '../completeEvent';
import NetworkContext from '../../../../NetworkContext';
import AppLoadingContext from '../../../../AppLoadingContext';

describe('completeEvent', () => {
  describe('render', () => {
    const defaultFormValues = {
      id: 1,
      status: 'Not started',
    };

    const sessionsUrl = '/api/session-reports/eventId/1';
    const onSubmit = jest.fn();
    const onSaveForm = jest.fn();
    const onUpdatePage = jest.fn();

    // eslint-disable-next-line react/prop-types
    const RenderCompleteEvent = ({ defaultValues = defaultFormValues }) => {
      const hookForm = useForm({
        mode: 'onBlur',
        defaultValues,
      });

      return (
        <FormProvider {...hookForm}>
          <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn, isAppLoading: false }}>
            <NetworkContext.Provider value={{ connectionActive: true }}>
              {completeEvent.render(
                defaultFormValues,
                onSubmit,
                {},
                jest.fn(),
                false,
                false,
                jest.fn(),
                onSaveForm,
                [],
                null,
                null,
                onUpdatePage,
              )}
            </NetworkContext.Provider>
          </AppLoadingContext.Provider>
        </FormProvider>
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

      expect(await screen.findByRole('heading', { name: /complete event/i })).toBeInTheDocument();
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

    it('not started is an option when there are no sessions', async () => {
      fetchMock.getOnce(sessionsUrl, []);

      act(() => {
        render(<RenderCompleteEvent />);
      });

      const statusSelect = await screen.findByRole('combobox', { name: /status/i });
      expect(statusSelect).toHaveValue('Not started');
    });

    it('handles an error fetching sessions', async () => {
      fetchMock.getOnce(sessionsUrl, 500);

      act(() => {
        render(<RenderCompleteEvent />);
      });

      await waitFor(() => screen.findByText('Unable to load sessions'));

      const statusSelect = await screen.findByRole('combobox', { name: /status/i });
      expect(statusSelect).toHaveValue('Not started');
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

    it('will submit if all sessions are complete', async () => {
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

      expect(onSubmit).toHaveBeenCalledWith('Complete');
    });

    it('sets a default status of not started if there is no form status and there are no sessions', async () => {
      fetchMock.getOnce(sessionsUrl, []);

      act(() => {
        render(<RenderCompleteEvent defaultValues={{ id: 1 }} />);
      });

      const statusSelect = await screen.findByRole('combobox', { name: /status/i });

      expect(statusSelect).toHaveValue('Not started');
    });
  });
});
