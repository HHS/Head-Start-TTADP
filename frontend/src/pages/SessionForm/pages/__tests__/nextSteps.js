/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import moment from 'moment';
import {
  render,
  screen,
  act,
} from '@testing-library/react';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
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
    const userId = 1;
    const todaysDate = moment().format('YYYY-MM-DD');

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

    const defaultUser = { user: { id: userId, roles: [{ name: 'GSM' }] } };
    const RenderNextSteps = ({
      formValues = defaultFormValues,
      user = defaultUser,
      additionalData = null,
    }) => {
      const hookForm = useForm({
        mode: 'onBlur',
        defaultValues: formValues,
      });

      return (
        <AppLoadingContext.Provider value={{
          setIsAppLoading: jest.fn(), setAppLoadingText: jest.fn(),
        }}
        >
          <UserContext.Provider value={user}>
            <FormProvider {...hookForm}>
              <NetworkContext.Provider value={{ connectionActive: true }}>
                {nextSteps.render(
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

    it('hides checkbox for poc if roles are invalid', async () => {
      act(() => {
        const updatedValues = {
          ...defaultFormValues,
          event: { pocIds: [userId] },
        };

        render(<RenderNextSteps
          formValues={updatedValues}
          user={{ user: { id: userId, roles: [{ name: 'BBB' }] } }}
        />);
      });

      expect(await screen.queryAllByText(/Email the event creator and collaborator to let them know my work is complete/i).length).toBe(0);
    });

    it('shows read only for pocs when pocComplete', async () => {
      act(() => {
        const updatedValues = {
          ...defaultFormValues,
          event: { pocIds: [userId] },
          pocComplete: true,
          pocCompleteId: userId,
          pocCompleteDate: todaysDate,
          specialistNextSteps: [{
            note: 'Very special note',
            completeDate: '01/01/2022',
          }],
          recipientNextSteps: [{
            note: 'Other note',
            completeDate: '01/01/2021',
          }],
        };

        render(<RenderNextSteps
          formValues={updatedValues}
        />);
      });

      // confirm read-only
      const checkbox = screen.queryByRole('checkbox');
      expect(checkbox).not.toBeInTheDocument();
      const textareas = document.querySelectorAll('textarea');
      expect(textareas.length).toBe(0);

      // confirm content
      expect(await screen.findByText(/very special note/i)).toBeVisible();
      expect(await screen.findByText('01/01/2022')).toBeVisible();
      expect(await screen.findByText(/other note/i)).toBeVisible();
      expect(await screen.findByText('01/01/2021')).toBeVisible();
    });

    it('hides the save draft button if the session is complete', async () => {
      act(() => {
        render(<RenderNextSteps formValues={{
          ...defaultFormValues,
          status: TRAINING_REPORT_STATUSES.COMPLETE,
        }}
        />);
      });

      expect(screen.queryByRole('button', { name: /review and submit/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument();
    });

    it('shows the save draft button if the session is complete', async () => {
      act(() => {
        render(<RenderNextSteps formValues={{
          ...defaultFormValues,
          status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        }}
        />);
      });
      expect(screen.queryByRole('button', { name: /review and submit/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /save draft/i })).toBeInTheDocument();
    });
  });
});
