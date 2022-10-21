import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import Objective from '../Objective';

const defaultObjective = {
  id: 1,
  resources: [],
  topics: [],
  title: 'This is an objective title',
  ttaProvided: '<p><ul><li>What</li></ul></p>',
  status: 'Not started',
};

const RenderObjective = ({
  // eslint-disable-next-line react/prop-types
  objective = defaultObjective, onRemove = () => {},
}) => {
  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues: {
      objective,
      collaborators: [],
      author: {
        role: 'Central office',
      },
    },
  });

  hookForm.register('goals');
  hookForm.register('objective');
  const val = hookForm.watch('objective');

  const onUpdate = (obj) => {
    hookForm.setValue('objective', obj);
  };

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <Objective
        objective={val}
        topicOptions={[]}
        options={[]}
        index={1}
        remove={onRemove}
        fieldArrayName="objective"
        goalId={1}
        onRemove={onRemove}
        onUpdate={onUpdate}
        parentLabel="goals"
        objectiveAriaLabel="1 on goal 1"
        goalIndex={0}
        objectiveIndex={0}
        status="In progress"
        errors={{}}
        onObjectiveChange={jest.fn()}
        onSaveDraft={jest.fn()}
        parentGoal={{ status: 'In Progress' }}
        initialObjectiveStatus="Not Started"
        reportId={98123}
      />
    </FormProvider>
  );
};

describe('Objective', () => {
  it('renders an objective', async () => {
    render(<RenderObjective />);
    expect(await screen.findByText(/This is an objective title/i, { selector: 'textarea' })).toBeVisible();
  });
});
