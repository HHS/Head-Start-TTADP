import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import SimilarGoal from '../SimilarGoal';

describe('SimilarGoal', () => {
  const goal = {
    name: 'Test Goal',
    status: 'Test Status',
    ids: [1, 2, 3],
  };
  const setDismissSimilar = jest.fn();

  const RenderSimilarGoal = () => {
    const hookForm = useForm({
      mode: 'onBlur',
      defaultValues: {
        similarGoals: null, // the IDS of a goal from the similarity API
        goalIds: [], // the goal ids that the user has selected
        selectedGrants: [], // the grants that the user has selected
        goalName: '', // the goal name in the textbox
        goalStatus: '', // the status of the goal, only tracked to display in alerts
        goalSource: '', // only used for curated templates
        goalStatusReason: '',
        useOhsInitiativeGoal: false, // the checkbox to toggle the controls
        isGoalNameEditable: true,
      },
      shouldUnregister: false,
    });
    return (
      // eslint-disable-next-line react/jsx-props-no-spreading
      <FormProvider {...hookForm}>
        <SimilarGoal
          goal={goal}
          setDismissSimilar={setDismissSimilar}
        />
        <input type="text" id="tab-stop" />
      </FormProvider>
    );
  };

  it('renders the goal name and status', () => {
    render(<RenderSimilarGoal />);
    expect(screen.getByText('Test Goal')).toBeInTheDocument();
    expect(screen.getByText(/(Test Status)/i)).toBeInTheDocument();
  });

  it('calls setDismissSimilar when escape is pressed', () => {
    render(<RenderSimilarGoal />);

    userEvent.type(screen.getByText('Test Goal'), '{esc}');
    expect(setDismissSimilar).toHaveBeenCalled();
  });

  it('calls setDismissSimilar when blurred', () => {
    render(<RenderSimilarGoal />);

    for (let i = 0; i < 3; i += 1) {
      act(() => {
        userEvent.tab();
      });
    }

    expect(setDismissSimilar).toHaveBeenCalled();
  });
});
