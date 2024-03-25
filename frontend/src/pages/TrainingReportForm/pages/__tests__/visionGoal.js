/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import moment from 'moment';
import fetchMock from 'fetch-mock';
import { render, screen, act } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import visionGoal, { isPageComplete } from '../visionGoal';
import NetworkContext from '../../../../NetworkContext';
import UserContext from '../../../../UserContext';
import AppLoadingContext from '../../../../AppLoadingContext';

describe('visionGoal', () => {
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
        render(<>{visionGoal.reviewSection()}</>);
      });

      expect(await screen.findByRole('heading', { name: /vision and goal/i })).toBeInTheDocument();
    });
  });
  describe('render', () => {
    afterEach(() => fetchMock.restore());

    const onSaveDraft = jest.fn();
    const userId = 1;
    const todaysDate = moment().format('YYYY-MM-DD');

    const defaultFormValues = {
      vision: 'test vision',
      goal: 'test goal',
      eventId: 'R01-TR-23-1111',
    };

    const defaultUser = { user: { id: userId, roles: [] } };

    // eslint-disable-next-line react/prop-types
    const RenderVisionGoal = ({ formValues = defaultFormValues, user = defaultUser }) => {
      const hookForm = useForm({
        mode: 'onBlur',
        defaultValues: formValues,
      });

      return (
        <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
          <UserContext.Provider value={user}>
            <FormProvider {...hookForm}>
              <NetworkContext.Provider value={{ connectionActive: true }}>
                {visionGoal.render(
                  {
                    users: {
                      pointOfContact: [{
                        id: 1,
                        fullName: 'Ted User',
                      }],
                      collaborators: [
                        {
                          id: 2,
                          fullName: 'Tedwina User',
                        },
                      ],
                    },
                  },
                  formValues,
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
          </UserContext.Provider>
        </AppLoadingContext.Provider>
      );
    };

    it('renders vision & goal', async () => {
      fetchMock.get('/api/session-reports/eventId/1111', []);
      act(() => {
        render(<RenderVisionGoal />);
      });

      const visionInput = await screen.findByLabelText(/vision/i);
      expect(visionInput).toHaveValue('test vision');

      const goalInput = await screen.findByLabelText(/goal/i);
      expect(goalInput).toHaveValue('test goal');

      userEvent.clear(visionInput);
      userEvent.type(visionInput, 'new vision');

      const saveDraftButton = await screen.findByRole('button', { name: /save draft/i });
      userEvent.click(saveDraftButton);
      expect(onSaveDraft).toHaveBeenCalled();
    });

    it('renders checkbox for POC', async () => {
      fetchMock.get('/api/session-reports/eventId/1111', []);
      const updatedValues = {
        ...defaultFormValues,
        pocIds: [userId],
        pocComplete: false,
      };
      act(() => {
        render(<RenderVisionGoal formValues={updatedValues} user={{ user: { id: userId, roles: [{ name: 'TTT' }, { name: 'GSM' }, { name: 'ECM' }] } }} />);
      });

      const visionInput = await screen.findByLabelText(/vision/i);
      expect(visionInput).toHaveValue('test vision');

      const goalInput = await screen.findByLabelText(/goal/i);
      expect(goalInput).toHaveValue('test goal');

      userEvent.clear(visionInput);
      userEvent.type(visionInput, 'new vision');
      const checkbox = await screen.findByLabelText(/Email the event creator and collaborator to let them know my work is complete/i);
      expect(checkbox).not.toBeChecked();

      act(() => {
        userEvent.click(checkbox);
      });

      expect(checkbox).toBeChecked();

      const hiddenInputs = document.querySelectorAll('input[type="hidden"]');
      expect(hiddenInputs.length).toBe(2);

      const hiddenInputValues = Array.from(hiddenInputs).map((input) => input.value);
      expect(hiddenInputValues.includes(todaysDate)).toBe(true);
      expect(hiddenInputValues.includes(userId.toString())).toBe(true);

      const saveDraftButton = await screen.findByRole('button', { name: /save draft/i });
      userEvent.click(saveDraftButton);
      expect(onSaveDraft).toHaveBeenCalled();
    });

    it('hides checkbox for POC with incorrect roles', async () => {
      fetchMock.get('/api/session-reports/eventId/1111', []);
      const updatedValues = {
        ...defaultFormValues,
        pocIds: [userId],
        pocComplete: false,
      };
      act(() => {
        render(<RenderVisionGoal formValues={updatedValues} user={{ user: { id: userId, roles: [{ name: 'TTT' }] } }} />);
      });

      const visionInput = await screen.findByLabelText(/vision/i);
      expect(visionInput).toHaveValue('test vision');

      const goalInput = await screen.findByLabelText(/goal/i);
      expect(goalInput).toHaveValue('test goal');

      userEvent.clear(visionInput);
      userEvent.type(visionInput, 'new vision');
      expect(await screen.queryAllByText(/Email the event creator and collaborator to let them know my work is complete/i).length).toBe(0);

      const hiddenInputs = document.querySelectorAll('input[type="hidden"]');
      expect(hiddenInputs.length).toBe(3);

      const saveDraftButton = await screen.findByRole('button', { name: /save draft/i });
      userEvent.click(saveDraftButton);
      expect(onSaveDraft).toHaveBeenCalled();
    });

    it('shows read only data', async () => {
      fetchMock.get('/api/session-reports/eventId/1111', []);
      const updatedValues = {
        ...defaultFormValues,
        pocIds: [userId],
        pocComplete: true,
        pocCompleteId: userId,
        pocCompleteDate: todaysDate,
        vision: 'incredible new vision',
        goal: 'thoughtful new goal',
      };
      act(() => {
        render(<RenderVisionGoal formValues={updatedValues} />);
      });

      // confirm alert
      const alert = await screen.findByText(/sent an email to the event creator and collaborator/i);
      expect(alert).toBeVisible();

      // confirm read-only
      const checkbox = screen.queryByRole('checkbox');
      expect(checkbox).not.toBeInTheDocument();
      const textareas = document.querySelectorAll('textarea');
      expect(textareas.length).toBe(0);

      const vision = await screen.findByText('incredible new vision');
      expect(vision).toBeVisible();
      const goal = await screen.findByText('thoughtful new goal');
      expect(goal).toBeVisible();
    });

    it('shows the goal as read-only once the session is complete', async () => {
      fetchMock.get('/api/session-reports/eventId/1111', [{
        id: 1,
        data: {
          status: 'Complete',
        },
      }]);

      const updatedValues = {
        ...defaultFormValues,
        goal: 'thoughtful new goal',
      };

      act(() => {
        render(<RenderVisionGoal formValues={updatedValues} />);
      });

      const visionInput = await screen.findByLabelText(/vision/i);
      expect(visionInput).toHaveValue('test vision');

      const textareas = document.querySelectorAll('textarea');
      expect(textareas.length).toBe(1);

      const goal = await screen.findByText('thoughtful new goal');
      expect(goal).toBeVisible();
    });
  });
});
