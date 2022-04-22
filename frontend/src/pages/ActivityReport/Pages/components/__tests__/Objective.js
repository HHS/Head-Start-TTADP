/* eslint-disable no-unused-vars */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import Objective from '../Objective';

const RenderObjective = ({
  // eslint-disable-next-line react/prop-types
  defaultObjective, onRemove = () => {},
}) => {
  const hookForm = useForm({
    defaultValues: {
      objective: defaultObjective,
      collaborators: [],
      author: {
        role: 'Central office',
      },
    },
  });

  hookForm.register('goals');
  hookForm.register('objective');
  const objective = hookForm.watch('objective');

  const onUpdate = (obj) => {
    hookForm.setValue('objective', obj);
  };

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <Objective
        objective={objective}
        topicOption={[]}
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
      />
    </FormProvider>
  );
};

describe('Objective', () => {

});
