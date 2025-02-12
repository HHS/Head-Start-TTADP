/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import {
  render,
  screen,
  act,
} from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import supportingAttachments, { isPageComplete } from '../supportingAttachments';
import { nextStepsFields } from '../../constants';
import NetworkContext from '../../../../NetworkContext';
import { NOT_STARTED } from '../../../../components/Navigator/constants';
import AppLoadingContext from '../../../../AppLoadingContext';
import UserContext from '../../../../UserContext';

describe('supportingAttachments', () => {
  describe('isPageComplete', () => {
    it('returns true if form state is valid', () => {
      expect(isPageComplete({
        getValues: jest.fn(() => (true)),
      })).toBe(true);
    });

    it('returns false if missing a key', () => {
      expect(isPageComplete({
        getValues: jest.fn(() => (false)),
      })).toBe(false);
    });
  });

  describe('render', () => {
    const onSaveDraft = jest.fn();
    const userId = 1;

    const defaultFormValues = {
      id: 1,
      ownerId: null,
      eventId: 'sdfgsdfg',
      eventDisplayId: 'event-display-id',
      eventName: 'Event name',
      regionId: 1,
      status: 'In progress',
      pageState: {
        1: NOT_STARTED,
        2: NOT_STARTED,
      },
      event: {
        pocIds: [],
      },
      ...nextStepsFields,
    };

    // eslint-disable-next-line react/prop-types
    const RenderSupportingAttachments = ({ formValues = defaultFormValues, additionalData = { status: 'In progress' } }) => {
      const hookForm = useForm({
        mode: 'onBlur',
        defaultValues: formValues,
      });

      return (
        <AppLoadingContext.Provider value={{
          setIsAppLoading: jest.fn(), setAppLoadingText: jest.fn(),
        }}
        >
          <UserContext.Provider value={{ user: { id: userId } }}>
            <FormProvider {...hookForm}>
              <NetworkContext.Provider value={{ connectionActive: true }}>
                {supportingAttachments.render(
                  additionalData,
                  formValues,
                  1,
                  false,
                  jest.fn(),
                  onSaveDraft,
                  jest.fn(),
                  false,
                  'key',
                  () => {},
                  () => <></>,
                )}
              </NetworkContext.Provider>
            </FormProvider>
          </UserContext.Provider>
        </AppLoadingContext.Provider>
      );
    };

    it('renders supporting attachments', async () => {
      act(() => {
        render(<RenderSupportingAttachments />);
      });

      expect(await screen.findByText(/upload any relevant attachments, such as:/i)).toBeVisible();
      expect(await screen.findByText(/meetings agendas/i)).toBeVisible();
      expect(await screen.findByText(/sign-in or attendance sheets/i)).toBeVisible();
      expect(await screen.findByText(/other non-resource items not available online/i)).toBeVisible();
      expect(await screen.findByText(/File types accepted/i)).toBeVisible();
    });

    it('shows the the coninue button when status is complete', async () => {
      act(() => {
        render(<RenderSupportingAttachments additionalData={{ status: 'Complete' }} />);
      });
      expect(screen.queryByRole('button', { name: 'Save and continue' })).not.toBeInTheDocument();
      expect(await screen.findByText(/continue/i)).toBeVisible();
    });
  });
});
