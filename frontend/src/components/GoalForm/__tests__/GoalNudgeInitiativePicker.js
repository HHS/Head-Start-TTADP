import React, { useRef } from 'react';
import fetchMock from 'fetch-mock';
import {
  render, screen,
} from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import GoalNudgeInitiativePicker from '../GoalNudgeInitiativePicker';

describe('GoalNudgeInitiativePicker', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  const Test = (props) => {
    const hookForm = useForm({
      mode: 'onBlur',
      defaultValues: {},
      shouldUnregister: false,
    });

    const initiativeRef = useRef();

    const defaultProps = {
      goalTemplates: [],
      useOhsInitiativeGoal: true,
      initiativeRef,
    };

    return (
      // eslint-disable-next-line react/jsx-props-no-spreading
      <FormProvider {...hookForm}>
        <GoalNudgeInitiativePicker
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...{ ...defaultProps, ...props }}
        />
        <input type="text" id="tab-stop" />
      </FormProvider>
    );
  };

  const renderTest = (props) => {
    render(
      // eslint-disable-next-line react/jsx-props-no-spreading
      <Test {...props} />,
    );
  };

  it('bombs out if useOhsInitiativeGoal is false', async () => {
    renderTest({ useOhsInitiativeGoal: false });
    expect(screen.queryByText(/Recipient's goal/)).not.toBeInTheDocument();
  });

  it('renders without errors', async () => {
    renderTest();
    expect(await screen.findByText(/OHS initiative goal/)).toBeInTheDocument();
  });
});
