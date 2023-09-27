/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import visionGoal, { isPageComplete } from '../visionGoal';
import NetworkContext from '../../../../NetworkContext';
import UserContext from '../../../../UserContext';

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
    const onSaveDraft = jest.fn();

    const defaultFormValues = {
      vision: 'test vision',
      goal: 'test goal',
    };

    const RenderVisionGoal = () => {
      const hookForm = useForm({
        mode: 'onBlur',
        defaultValues: defaultFormValues,
      });

      return (
        <UserContext.Provider value={{ user: { id: 1 } }}>
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
        </UserContext.Provider>
      );
    };

    it('renders vision & goal', async () => {
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
  });
});
