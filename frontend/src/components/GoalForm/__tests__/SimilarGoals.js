import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import SimilarGoals from '../SimilarGoals';

describe('SimilarGoal', () => {
  const defaultSimilar = [
    {
      id: 1,
      name: 'Similar goal 1',
      description: 'Similar goal 1 description',
    },
    {
      id: 2,
      name: 'Similar goal 2',
      description: 'Similar goal 2 description',
    },
  ];
  const setDismissSimilar = jest.fn();

  // eslint-disable-next-line react/prop-types
  const RenderTest = ({ dismissSimilar = false, similar = defaultSimilar }) => {
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
        <SimilarGoals
          similar={similar}
          dismissSimilar={dismissSimilar}
          setDismissSimilar={setDismissSimilar}
        />
      </FormProvider>
    );
  };

  it('renders similar goals', () => {
    render(
      <RenderTest />,
    );

    expect(screen.getByText('Similar goals (2)')).toBeInTheDocument();
    expect(screen.getByText('Similar goal 1')).toBeInTheDocument();
    expect(screen.getByText('Similar goal 2')).toBeInTheDocument();
  });

  it('calls setDismissSimilar when close button is clicked', () => {
    render(
      <RenderTest />,
    );

    userEvent.click(screen.getByLabelText('Dismiss similar goals'));
    expect(setDismissSimilar).toHaveBeenCalledTimes(1);
  });

  it('renders nothing if menu is forced close', () => {
    render(
      <RenderTest dismissSimilar />,
    );

    const similarDiv = document.querySelector('.ttahub-similar-goals');
    expect(similarDiv).toBeNull();
  });

  it('renders nothing if no similar goals are passed in', () => {
    render(
      <RenderTest similar={[]} />,
    );

    const similarDiv = document.querySelector('.ttahub-similar-goals');
    expect(similarDiv).toBeNull();
  });
});
