/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import UserContext from '../../../../../UserContext';
import NextStepsRepeater from '../NextStepsRepeater';

const history = createMemoryHistory();

describe('NextStepsRepeater', () => {
  const TheRepeater = (props, hookFormValues) => {
    const hookForm = useForm({
      mode: 'onChange',
      defaultValues: {
        specialistNextSteps: [{ id: null, note: '' }],
        recipientNextSteps: [{ id: null, note: '' }],
      },
    });
    const formValues = { ...hookForm, ...hookFormValues };

    return (
      <Router history={history}>
        <UserContext.Provider value={{ user: { id: 1, flags: [] } }}>
          <FormProvider {...formValues}>
            <NextStepsRepeater {...props} />
          </FormProvider>
        </UserContext.Provider>
      </Router>
    );
  };

  const renderRepeater = (props, hookFormValues) => {
    const defaultProps = {
      name: 'specialistNextSteps',
      ariaName: 'Specialist Next Steps',
      recipientType: 'recipient',
      required: false,
    };
    const theProps = { ...defaultProps, ...props };
    render(<TheRepeater hookFormValues={hookFormValues} {...theProps} />);
  };

  it('renders without crashing', () => {
    renderRepeater();
    expect(screen.getByLabelText('Step 1')).toBeInTheDocument();
  });

  it('shows required asterisk when required is true', () => {
    renderRepeater({ required: true });
    expect(screen.getByLabelText('Step 1 *')).toBeInTheDocument();
  });
});
