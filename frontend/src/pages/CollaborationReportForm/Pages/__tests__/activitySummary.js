/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import NetworkContext from '../../../../NetworkContext';
import activitySummary from '../activitySummary';

const RenderActivitySummary = () => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: {},
  });

  const additionalData = {
    collaborators: [{ id: 1, name: 'test', roles: [] }, { id: 2, name: 'test2', roles: [] }],
  };

  return (
    <NetworkContext.Provider value={{ connectionActive: true, localStorageAvailable: true }}>
      <FormProvider {...hookForm}>
        {activitySummary.render(
          additionalData,
          {},
          1,
          null,
          jest.fn(),
          jest.fn(),
          jest.fn(),
          false,
          '',
          jest.fn(),
          () => <></>,
        )}
      </FormProvider>
    </NetworkContext.Provider>
  );
};

describe('CollabReport Activity Summary Page', () => {
  it('renders', () => {
    render(<RenderActivitySummary />);

    expect(screen.getByText('Activity name')).toBeInTheDocument();
  });
});
