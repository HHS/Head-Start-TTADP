/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import {
  render,
  screen,
  act,
} from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import nextSteps, { isPageComplete } from '../nextSteps';
import { nextStepsFields } from '../../constants';
import NetworkContext from '../../../../NetworkContext';
import { NOT_STARTED } from '../../../../components/Navigator/constants';
import AppLoadingContext from '../../../../AppLoadingContext';
import UserContext from '../../../../UserContext';

describe('nextSteps', () => {
  describe('isPageComplete', () => {
    it('returns true if form state is valid', () => {
      expect(isPageComplete({
        getValues: jest.fn(() => ({
          specialistNextSteps: [{
            note: 'Note',
            completeDate: '01/01/2021',
          }],
          recipientNextSteps: [{
            note: 'Note',
            completeDate: '01/01/2021',
          }],
        })),
      })).toBe(true);
    });

    it('returns false if missing a specialist note', () => {
      expect(isPageComplete({
        getValues: jest.fn(() => ({
          specialistNextSteps: [{
            note: '',
            completeDate: '01/01/2021',
          }],
          recipientNextSteps: [{
            note: 'Note',
            completeDate: '01/01/2021',
          }],
        })),
      })).toBe(false);
    });

    it('returns false if missing a recipient note', () => {
      expect(isPageComplete({
        getValues: jest.fn(() => ({
          specialistNextSteps: [{
            note: 'Note',
            completeDate: '01/01/2021',
          }],
          recipientNextSteps: [{
            note: '',
            completeDate: '01/01/2021',
          }],
        })),
      })).toBe(false);
    });

    it('returns false if missing a date', () => {
      expect(isPageComplete({
        getValues: jest.fn(() => ({
          specialistNextSteps: [{
            note: 'Note',
            completeDate: '',
          }],
          recipientNextSteps: [{
            note: '',
            completeDate: '01/01/2021',
          }],
        })),
      })).toBe(false);
    });
    it('returns false if invalid date', () => {
      expect(isPageComplete({
        getValues: jest.fn(() => ({
          specialistNextSteps: [{
            note: 'Note',
            completeDate: 'Invalid date',
          }],
          recipientNextSteps: [{
            note: '',
            completeDate: '01/01/2021',
          }],
        })),
      })).toBe(false);
    });

    it('returns false if empty', () => {
      expect(isPageComplete({
        getValues: jest.fn(() => ({
          specialistNextSteps: [],
          recipientNextSteps: [],
        })),
      })).toBe(false);
    });
  });
  describe('review', () => {
    it('renders correctly', async () => {
      act(() => {
        render(<>{nextSteps.reviewSection()}</>);
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
      regionId: 1,
      status: 'In progress',
      pageState: {
        1: NOT_STARTED,
        2: NOT_STARTED,
      },
      ...nextStepsFields,
    };

    // eslint-disable-next-line react/prop-types
    const RenderNextSteps = ({ formValues = defaultFormValues }) => {
      const hookForm = useForm({
        mode: 'onBlur',
        defaultValues: formValues,
      });

      return (
        <AppLoadingContext.Provider value={{
          setIsAppLoading: jest.fn(), setAppLoadingText: jest.fn(),
        }}
        >
          <UserContext.Provider value={{ user: { id: 1 } }}>
            <FormProvider {...hookForm}>
              <NetworkContext.Provider value={{ connectionActive: true }}>
                {nextSteps.render(
                  null,
                  defaultFormValues,
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

    it('renders next steps', async () => {
      act(() => {
        render(<RenderNextSteps />);
      });

      expect(await screen.findByText(/specialist's next steps/i)).toBeVisible();
      expect(await screen.findByLabelText(/When do you anticipate completing step 1/i)).toBeVisible();
      expect(await screen.findByText(/recipient's next steps/i)).toBeVisible();
      expect(await screen.findByText(/When does the recipient anticipate completing step 1\?/i)).toBeVisible();
      const textAreas = document.querySelectorAll('textarea');
      expect(textAreas.length).toBe(2);
    });
  });
});
