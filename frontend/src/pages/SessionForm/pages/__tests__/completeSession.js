/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import {
  render, screen, act,
} from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import completeSession from '../completeSession';
import NetworkContext from '../../../../NetworkContext';
import AppLoadingContext from '../../../../AppLoadingContext';
import UserContext from '../../../../UserContext';

describe('completeSession', () => {
  describe('render', () => {
    const defaultPageState = {
      1: 'Complete',
      2: 'Complete',
      3: 'In progress',
    };
    const defaultFormValues = {
      id: 1,
      status: 'Not started',
      pageState: defaultPageState,
      event: {
        ownerId: 1,
        data: {
          vision: 'This is a vision',
        },
      },
    };

    const onSubmit = jest.fn();
    const onSaveForm = jest.fn();
    const onUpdatePage = jest.fn();
    const userId = 1;

    // eslint-disable-next-line react/prop-types
    const RenderCompleteSession = ({ defaultValues = defaultFormValues }) => {
      const hookForm = useForm({
        mode: 'onBlur',
        defaultValues,
      });

      const formData = hookForm.watch();

      return (
        <FormProvider {...hookForm}>
          <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn, isAppLoading: false }}>
            <UserContext.Provider value={{ user: { id: userId } }}>
              <NetworkContext.Provider value={{ connectionActive: true }}>
                {completeSession.render(
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
            </UserContext.Provider>
          </AppLoadingContext.Provider>
        </FormProvider>
      );
    };

    afterEach(() => {
      fetchMock.reset();
    });

    it('renders complete session page', async () => {
      act(() => {
        render(<RenderCompleteSession />);
      });

      // you can change the status
      const statusSelect = await screen.findByRole('combobox', { name: /status/i });
      act(() => {
        userEvent.selectOptions(statusSelect, 'Complete');
      });
      expect(statusSelect).toHaveValue('Complete');
    });

    it('calls onUpdatePage when the back button is clicked', async () => {
      act(() => {
        render(<RenderCompleteSession />);
      });

      const backButton = await screen.findByRole('button', { name: /back/i });
      act(() => {
        userEvent.click(backButton);
      });

      // We are on page 5, so we should go back to page 4.
      expect(onUpdatePage).toHaveBeenCalledWith(4);
    });

    it('calls saveDraft when the save draft button is clicked', async () => {
      act(() => {
        render(<RenderCompleteSession />);
      });

      const saveDraftButton = await screen.findByRole('button', { name: /save draft/i });
      act(() => {
        userEvent.click(saveDraftButton);
      });

      expect(onSaveForm).toHaveBeenCalled();
    });

    it('wont submit if the status is not complete', async () => {
      act(() => {
        render(<RenderCompleteSession />);
      });

      const submitButton = await screen.findByRole('button', { name: /submit/i });
      act(() => {
        userEvent.click(submitButton);
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('wont submit if the status is complete but all pages are not complete', async () => {
      act(() => {
        render(<RenderCompleteSession />);
      });

      const statusSelect = await screen.findByRole('combobox', { name: /status/i });
      act(() => {
        userEvent.selectOptions(statusSelect, 'Complete');
      });

      const submitButton = await screen.findByRole('button', { name: /submit/i });
      act(() => {
        userEvent.click(submitButton);
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('will submit if the status is complete and all pages are complete', async () => {
      act(() => {
        render(<RenderCompleteSession
          defaultValues={{
            ...defaultFormValues,
            pageState: {
              ...defaultPageState,
              3: 'Complete',
              4: 'Complete',
            },
          }}
        />);
      });

      const statusSelect = await screen.findByRole('combobox', { name: /status/i });
      act(() => {
        userEvent.selectOptions(statusSelect, 'Complete');
      });

      const submitButton = await screen.findByRole('button', { name: /submit/i });
      act(() => {
        userEvent.click(submitButton);
      });

      expect(onSubmit).toHaveBeenCalled();
    });

    it('sets a default status of in progress', async () => {
      act(() => {
        render(<RenderCompleteSession defaultValues={{ id: 1, pageState: defaultPageState }} />);
      });

      const statusSelect = await screen.findByRole('combobox', { name: /status/i });

      expect(statusSelect).toHaveValue('In progress');
    });

    it('poc cannot submit', async () => {
      act(() => {
        render(<RenderCompleteSession defaultValues={{
          id: 1,
          pageState: defaultPageState,
          event: {
            ownerId: 1,
            pocIds: [userId],
          },
        }}
        />);
      });

      const submitButton = screen.queryByRole('button', { name: /submit/i });
      expect(submitButton).toBeNull();
    });
  });
});
